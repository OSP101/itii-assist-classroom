# Monitoring System

Production-ready monitoring stack for ITII Assist Classroom using **Prometheus**, **Grafana**, **Loki**, **Node Exporter**, **cAdvisor**, and **Alertmanager**.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    monitoring-network                     │
│                                                          │
│  ┌────────────┐   ┌──────────┐   ┌───────────────────┐  │
│  │ Prometheus │──▶│ Grafana  │   │   Alertmanager    │  │
│  │  :9090     │   │  :3030   │   │     :9093         │  │
│  └──────┬─────┘   └──────────┘   └───────────────────┘  │
│         │                                                │
│  ┌──────┴──────┐  ┌────────────┐  ┌────────────────┐   │
│  │ Node Export │  │  cAdvisor  │  │     Loki       │   │
│  │   :9100     │  │   :8080    │  │    :3100       │   │
│  └─────────────┘  └────────────┘  └───────┬────────┘   │
│                                           │             │
│                                   ┌───────┴────────┐   │
│                                   │   Promtail     │   │
│                                   └────────────────┘   │
└────────────┬─────────────────────────────────────────────┘
             │ itii-network (external)
┌────────────┴─────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Backend :3001  │  │ Frontend :3000│  │   Redis    │  │
│  │  /api/metrics   │  │              │  │            │  │
│  └─────────────────┘  └──────────────┘  └────────────┘  │
│                  Application Stack                       │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create environment file

```bash
cd monitoring
cp .env.example .env
# Edit .env with your values (SMTP, webhook URL, Grafana password)
```

### 2. Start the monitoring stack

```bash
cd monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

### 3. Install backend dependency

```bash
cd back-end
npm install prom-client
```

### 4. Set backend environment variable

Add to your backend `.env.prod` (or Docker env_file):

```env
PROMETHEUS_URL=http://itii-prometheus:9090
```

### 5. Access dashboards

| Service      | URL                    | Default Credentials       |
|-------------|------------------------|---------------------------|
| Grafana     | http://localhost:3030   | admin / (set in .env)     |
| Prometheus  | http://localhost:9090   | No auth                   |
| Alertmanager| http://localhost:9093   | No auth                   |

### 6. Next.js Admin Dashboard

Navigate to **Admin Panel → Monitoring** (`/admin/monitoring`) for the built-in real-time dashboard with 5-second auto-refresh.

---

## Components

### Infrastructure (Docker)

| Service          | Image              | Port  | Purpose                      |
|------------------|--------------------|-------|------------------------------|
| Prometheus       | prom/prometheus    | 9090  | Metrics collection & storage |
| Grafana          | grafana/grafana    | 3030  | Visualization dashboards     |
| Node Exporter    | prom/node-exporter | 9100  | Server hardware metrics      |
| cAdvisor         | gcr.io/cadvisor    | 8080  | Container metrics            |
| Loki             | grafana/loki       | 3100  | Log aggregation              |
| Promtail         | grafana/promtail   | —     | Log collector → Loki         |
| Alertmanager     | prom/alertmanager  | 9093  | Alert routing & notification |

### Backend API Endpoints

| Endpoint                      | Auth          | Description                        |
|-------------------------------|---------------|------------------------------------|
| `GET /api/metrics/prometheus` | None          | Raw Prometheus metrics (scraper)   |
| `GET /api/monitoring/system`  | JWT + Admin   | CPU, RAM, disk, network, load      |
| `GET /api/monitoring/containers` | JWT + Admin | Container CPU, memory, restarts |
| `GET /api/monitoring/website` | JWT + Admin   | Uptime, response time, error rate  |
| `POST /api/monitoring/webhook`| None (secret) | Alertmanager webhook receiver      |

### Frontend Components

| Component           | Path                                        |
|---------------------|---------------------------------------------|
| Dashboard Page      | `front-end/app/admin/monitoring/page.tsx`    |
| System Cards        | `front-end/components/monitoring/SystemCards.tsx` |
| Website Cards       | `front-end/components/monitoring/WebsiteCards.tsx` |
| Container Cards     | `front-end/components/monitoring/ContainerCards.tsx` |
| Shared Utilities    | `front-end/components/monitoring/shared.tsx`  |
| Monitoring Service  | `front-end/services/monitoring.service.ts`    |
| Data Hook           | `front-end/hooks/useMonitoringData.ts`        |

---

## Alert Rules

| Alert                  | Condition            | Duration | Severity |
|------------------------|----------------------|----------|----------|
| HighCpuUsage           | CPU > 85%            | 5 min    | Warning  |
| CriticalCpuUsage       | CPU > 95%            | 2 min    | Critical |
| HighMemoryUsage        | RAM > 90%            | 5 min    | Warning  |
| CriticalMemoryUsage    | RAM > 95%            | 2 min    | Critical |
| HighDiskUsage          | Disk > 90%           | 5 min    | Warning  |
| CriticalDiskUsage      | Disk > 95%           | 2 min    | Critical |
| HighLoadAverage        | Load > 1.5× cores    | 10 min   | Warning  |
| WebsiteDown            | Target down          | 1 min    | Critical |
| HighErrorRate          | 5xx > 5%             | 5 min    | Warning  |
| HighApiLatency         | p95 > 2s             | 5 min    | Warning  |
| ContainerRestarting    | > 3 restarts / 15min | —        | Warning  |
| ContainerHighMemory    | Memory > 90% limit   | 5 min    | Warning  |
| ContainerDown          | Container gone        | 1 min    | Critical |

---

## Data Retention

- **Prometheus**: 90 days, max 10 GB disk
- **Loki**: 90 days (2160h) log retention
- **Grafana**: Persistent volume for dashboards/users

---

## File Structure

```
monitoring/
├── docker-compose.monitoring.yml
├── .env.example
├── README.md
├── prometheus/
│   ├── prometheus.yml          # Scrape targets
│   └── alert.rules.yml         # Alert rules
├── alertmanager/
│   └── alertmanager.yml        # Alert routing
├── loki/
│   └── loki-config.yml         # Log storage config
├── promtail/
│   └── promtail-config.yml     # Log collection config
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── datasources.yml # Prometheus + Loki
    │   └── dashboards/
    │       └── dashboards.yml  # Dashboard provider
    └── dashboards/
        └── system-overview.json # Pre-built 12-panel dashboard
```

---

## Troubleshooting

### Prometheus can't scrape backend
- Ensure the backend container is on the `itii-network` Docker network
- Check that `/api/metrics/prometheus` returns valid text/plain response
- Verify container name matches the scrape target in `prometheus.yml`

### Grafana shows "No Data"
- Wait 30–60 seconds after startup for initial scrapes
- Check Prometheus targets at `http://localhost:9090/targets`
- Verify datasource is up in Grafana → Settings → Data Sources → Test

### Alerts not firing
- Check Alertmanager config at `http://localhost:9093`
- Verify SMTP credentials in `.env`
- Check webhook URL is reachable from the container network

### Frontend dashboard shows "Disconnected"
- Ensure you're logged in as admin
- Check browser console for 401/403 errors
- Verify `PROMETHEUS_URL` env var is set in backend

---

## Security Notes

- Monitoring ports (9090, 9093, 8080, 9100) should be **firewalled** in production
- Only Grafana (3030) should be exposed externally if needed
- The `/api/metrics/prometheus` endpoint has no auth (for Prometheus scraping) — restrict via firewall/network rules
- All `/api/monitoring/*` endpoints require JWT + admin role
- Grafana admin password should be changed from default

---

## Environment Variables

| Variable                | Default                        | Description                    |
|-------------------------|--------------------------------|--------------------------------|
| `GRAFANA_ADMIN_PASSWORD`| `admin`                        | Grafana admin password         |
| `ALERT_WEBHOOK_URL`     | `http://backend:3001/...`      | Alertmanager webhook endpoint  |
| `SMTP_HOST`             | `smtp.gmail.com`               | Alert email SMTP host          |
| `SMTP_PORT`             | `587`                          | SMTP port                      |
| `SMTP_USER`             | —                              | SMTP username                  |
| `SMTP_PASS`             | —                              | SMTP password                  |
| `ALERT_EMAIL_FROM`      | `monitoring@itii-assist.com`   | Alert sender address           |
| `ALERT_EMAIL_TO`        | `admin@itii-assist.com`        | Alert recipient address        |
| `PROMETHEUS_URL`        | `http://itii-prometheus:9090`  | Prometheus URL (backend)       |
