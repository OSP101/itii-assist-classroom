# 05 - Folder Structure

## Scope
`Implemented`: directory scan of repository at `C:/osp101/test/itii-assist-classroom` excluding interpretation of runtime behavior.

## Top-Level Structure
```text
.
|-- AGENTS.md
|-- CODE_STUDY_GUIDE.md
|-- DATA_DICTIONARY.md
|-- FEATURE_SUMMARY.md
|-- PROJECT_INFO.txt
|-- QUEUE_SYSTEM_DOCUMENTATION.txt
|-- REDIS_QUEUE_ARCHITECTURE.txt
|-- docker-compose.db.yml
|-- docker-compose.dev.yml
|-- docker-compose.prod.yml
|-- Jenkinsfile.dev
|-- Jenkinsfile.prod
|-- .github/
|   |-- workflows/
|   |   |-- jenkins-dev-build-status.yml
|   |   `-- jenkins-prod-build-status.yml
|   `-- skills/...
|-- back-end/
|-- front-end/
`-- monitoring/
```

## Backend (`back-end/`)
```text
back-end/
|-- Dockerfile
|-- package.json
|-- .env
|-- .env.example
|-- .env.firebase.example
|-- .env.template
|-- migrations/
|   |-- project_ta_data.sql
|   |-- project_ta_dev.sql
|   |-- project_ta_prod.sql
|   `-- project_ta_structure.sql
|-- postman/
|-- uploads/
|-- logs/
`-- src/
    |-- app.js
    |-- config/
    |-- controllers/
    |-- middlewares/
    |-- models/
    |-- routes/
    |-- validations/
    |-- seeds/
    |-- utils/
    |-- services/       (empty)
    `-- repositories/   (empty)
```

## Frontend (`front-end/`)
```text
front-end/
|-- Dockerfile
|-- package.json
|-- middleware.ts
|-- next.config.js
|-- tailwind.config.js
|-- postcss.config.js
|-- tsconfig.json
|-- .env.local
|-- .env.local.template
|-- .env.firebase.example
|-- app/
|   |-- layout.tsx
|   |-- page.tsx
|   |-- error.tsx
|   |-- not-found.tsx
|   |-- providers.tsx
|   |-- (instructor)/...
|   |-- admin/...
|   |-- attendance/[id]/session/[sessionId]/live/...
|   |-- auth/...
|   |-- check-in/[sessionId]/...
|   |-- login/...
|   |-- myscore/...
|   |-- permissions/...
|   |-- profile/...
|   `-- queue/...
|-- components/
|-- config/
|-- contexts/
|-- hooks/
|-- services/
|-- styles/
|-- types/
|-- public/
|   `-- images/
|-- .next/            (build output)
`-- node_modules/     (dependencies)
```

## Monitoring (`monitoring/`)
```text
monitoring/
|-- .env
|-- .env.example
|-- docker-compose.monitoring.yml
|-- docker-compose.monitoring.dev.yml
|-- README.md
|-- alertmanager/
|-- prometheus/
|-- promtail/
|-- loki/
`-- grafana/
    |-- dashboards/
    `-- provisioning/
        |-- dashboards/
        `-- datasources/
```

## Structure Notes
- `Implemented`: backend follows route/controller/model pattern centered on `back-end/src/app.js`.
- `Implemented`: frontend uses Next.js App Router (`front-end/app/**/page.tsx` and `layout.tsx`).
- `Implemented`: realtime concerns are split across socket config (`back-end/src/config/socket.js`) and Redis queue worker utilities (`back-end/src/utils/*queue*.js`).
- `Needs verification`: intent of empty backend layers `back-end/src/services` and `back-end/src/repositories` (reserved for refactor vs incomplete migration).
