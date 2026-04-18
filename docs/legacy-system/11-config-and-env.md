# 11 - Config And Env

## Scope
`Implemented`: derived from config/env/deploy files:
- `back-end/src/config/index.js`
- `back-end/src/config/database.js`
- `back-end/src/config/passport.js`
- `back-end/src/config/socket.js`
- `back-end/src/routes/monitoring.routes.js`
- `back-end/src/utils/emailService.js`
- `back-end/src/utils/fcmService.js`
- `front-end/config/api.ts`
- `front-end/config/firebase.ts`
- `front-end/contexts/NotificationContext.tsx`
- `front-end/public/firebase-messaging-sw.js`
- `.env*` templates in `back-end/`, `front-end/`, `monitoring/`
- `docker-compose*.yml`
- `Jenkinsfile.dev`, `Jenkinsfile.prod`

`Inferred`: recommended environment governance for V2.

`Needs verification`: runtime values managed outside repository (Jenkins credentials store, server-level env, uncommitted env files).

## Configuration Sources
### Backend
`Implemented` config modules:
- `back-end/src/config/index.js` (central env mapping)
- `back-end/src/config/database.js` (Sequelize config)
- `back-end/src/config/passport.js` (JWT/local/OAuth)
- `back-end/src/config/socket.js` (socket CORS and transport options)

### Frontend
`Implemented` config modules:
- `front-end/config/api.ts` (`NEXT_PUBLIC_API_URL`)
- `front-end/config/firebase.ts` (FCM init, VAPID env)
- `front-end/next.config.js` (build/runtime config, optimization)

### Monitoring
`Implemented` config files:
- `monitoring/prometheus/*.yml`
- `monitoring/alertmanager/*.yml`
- `monitoring/loki/loki-config.yml`
- `monitoring/promtail/promtail-config.yml`
- `monitoring/grafana/provisioning/**/*`

## Env Loading Behavior
### Backend loader behavior
`Implemented` in `back-end/src/config/index.js`:
1. if `process.env.DB_NAME` is already set (for example via compose `env_file`), it does not load local dotenv file.
2. otherwise, it attempts:
   - `.env.prod` when `NODE_ENV=production`
   - `.env.dev` otherwise
3. if DB vars still missing, fallback to `.env`.

### Frontend env behavior
`Implemented`:
- frontend reads `process.env.NEXT_PUBLIC_*` variables at build/runtime for API/socket URLs.
- compose passes build args and env files (`.env.local.dev` / `.env.local.prod`).

### CI-generated env files
`Implemented` via Jenkins:
- development pipeline writes:
  - `back-end/.env.dev`
  - `front-end/.env.local.dev`
  - root `.env`
- production pipeline writes:
  - `back-end/.env.prod`
  - `front-end/.env.local.prod`
  - root `.env`

Evidence:
- `Jenkinsfile.dev`
- `Jenkinsfile.prod`

## Backend Environment Variables
### Server/Database/Redis
`Implemented` usage:
- `NODE_ENV`, `PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`

Evidence:
- `back-end/src/config/index.js`
- `back-end/src/config/database.js`
- `back-end/src/config/redis.js`

### Auth/Security
`Implemented` usage:
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `COOKIE_SECRET`

Evidence:
- `back-end/src/config/index.js`
- `back-end/src/config/passport.js`

### OAuth
`Implemented` usage:
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
- Apple: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`, `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL`

Evidence:
- `back-end/src/config/index.js`
- `back-end/src/config/passport.js`

### Email and 2FA
`Implemented` usage:
- provider selection: `EMAIL_PROVIDER`, `RESEND_API_KEY`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- 2FA branding: `TWO_FACTOR_APP_NAME`, `TWO_FACTOR_ISSUER`

Evidence:
- `back-end/src/utils/emailService.js`
- `back-end/src/config/index.js`

### Push/Notifications (Backend)
`Implemented` usage:
- Firebase admin credentials: `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS`

Evidence:
- `back-end/src/utils/fcmService.js`

### Monitoring integration
`Implemented` usage:
- `PROMETHEUS_URL`
- `ALERT_WEBHOOK_SECRET`
- `DOCKER_SOCKET` (optional override, default `/var/run/docker.sock`)

Evidence:
- `back-end/src/config/index.js`
- `back-end/src/routes/monitoring.routes.js`

## Frontend Environment Variables
### Actively referenced in app/runtime code
`Implemented` usage:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_FRONTEND_URL`
- `NEXT_PUBLIC_CLOUD`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `NODE_ENV` (build optimization path in `next.config.js`)

Evidence:
- `front-end/config/api.ts`
- `front-end/contexts/SocketContext.tsx`
- `front-end/contexts/NotificationContext.tsx`
- `front-end/services/auth.service.ts`
- `front-end/config/firebase.ts`
- `front-end/next.config.js`

### Firebase web config variables in templates
`Implemented` in templates but currently not fully consumed in code:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

`Implemented` code observation:
- `front-end/config/firebase.ts` and `front-end/public/firebase-messaging-sw.js` currently contain hardcoded Firebase config values; only `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is env-driven.

## Monitoring Stack Environment Variables
`Implemented` from `monitoring/.env.example` and compose usage:
- ports: `PROMETHEUS_PORT`, `GRAFANA_PORT`, `NODE_EXPORTER_PORT`, `CADVISOR_PORT`, `LOKI_PORT`, `ALERTMANAGER_PORT`
- Grafana auth/smtp: `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`, `GF_SMTP_*`, `GF_SMTP_FROM`
- Alertmanager smtp: `SMTP_HOST`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`
- alert destinations: `ALERT_WEBHOOK_URL`, `ALERT_EMAIL_TO`

Evidence:
- `monitoring/.env.example`
- `monitoring/docker-compose.monitoring.yml`
- `monitoring/docker-compose.monitoring.dev.yml`

## Docker/Compose And Env Wiring
`Implemented`:
- app stacks use `env_file`:
  - backend: `./back-end/.env.dev` or `./back-end/.env.prod`
  - frontend: `./front-end/.env.local.dev` or `./front-end/.env.local.prod`
- frontend image build args receive `NEXT_PUBLIC_*` values from root `.env`
- Redis host/port are set explicitly in compose service `environment`

Evidence:
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`

## Config Risks And Observations
`Implemented` observations:
- backend defaults include fallback secrets if env is absent (`config/index.js`).
- `docker-compose.db.yml` includes hardcoded DB root password and references root `project_ta_prod.sql`.
- frontend Firebase config is hardcoded in runtime files.

`Needs verification`:
- whether hardcoded Firebase web config is intentionally shared across environments.
- whether `GOOGLE_SECRET` in `front-end/.env.local.template` is still used (no active references found).
- whether `.env.dev` / `.env.prod` generation is guaranteed in all deployment paths outside Jenkins.

## Recommended Future Behavior (V2)
`Recommended`:
- enforce strict env schema validation at startup (required/optional types, fail-fast in prod).
- remove hardcoded Firebase web config; source all deploy-specific values from env.
- centralize secret management (vault/secret manager) and avoid fallback default secrets in production.
- align template files with actual code usage and remove dead env keys.
- version and document config profiles for local/dev/prod/staging with parity checks.

## V2 Migration Notes
### What must be preserved
- key env contracts used by backend and frontend runtime (`NEXT_PUBLIC_API_URL`, JWT secrets, DB/Redis connectivity).
- CI behavior that generates deployment-specific env files and compose build args.
- monitoring integration endpoints and scrape/export conventions.

### What can be redesigned
- internal config module layout and loading strategy.
- CI tooling and secret injection implementation details.
- runtime config source (env files vs secret manager), if functional parity is maintained.

### What is risky to rewrite
- auth/token/OAuth environment wiring across backend/passport/frontend callback URLs.
- queue/redis host wiring and monitoring docker socket integrations.
- FCM credential and token registration flow.

### What business logic is critical
- security-sensitive configs (JWT/cookie/email/OAuth credentials).
- environment-specific base URLs affecting redirects, CORS, and socket connections.
- notification credentials and endpoint mappings for queue operations.

## Needs Verification
- authoritative production env matrix (including values only present in Jenkins credentials store).
- whether any non-Jenkins deployment path exists and how it injects env files.
- final policy for rotating secrets and revoking leaked credentials.