# ไฟล์นี้ไม่ได้ใช้ — ระบบนี้ใช้ Traefik labels แทน nginx
# Grafana ถูก route ผ่าน Traefik labels ใน docker-compose.monitoring.dev.yml
# ดู: monitoring/docker-compose.monitoring.dev.yml (grafana service labels)


# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name monitor.osp101.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;

    server_name monitor.osp101.com;

    # SSL Certificate (ออก cert ด้วย: sudo certbot --nginx -d monitor.osp101.com)
    ssl_certificate /etc/letsencrypt/live/monitor.osp101.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.osp101.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    include snippets/ssl-params.conf;

    # -------------------------------------------------------------------------
    # Grafana Dashboard
    # -------------------------------------------------------------------------
    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for Grafana live (WebSocket)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 600s;
        proxy_send_timeout 600s;

        # Grafana needs this for proper redirect
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # -------------------------------------------------------------------------
    # Block access to internal Prometheus API from public
    # (Grafana still connects internally via Docker network)
    # -------------------------------------------------------------------------
    location /api/datasources/proxy {
        deny all;
        return 403;
    }
}
