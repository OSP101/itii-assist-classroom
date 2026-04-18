# Legacy System Documentation (V1 Baseline)

## Purpose
This folder documents the current legacy implementation in `C:/osp101/test/itii-assist-classroom` as source material for V2 redesign.

The documentation follows `AGENTS.md` principles:
- prefer code-based truth
- do not hallucinate features
- mark unknowns as `Needs verification`
- use concrete file paths
- separate implemented behavior from inference and recommendation

## Current Document Index
- `docs/legacy-system/02-business-domain.md`
- `docs/legacy-system/04-system-architecture.md`
- `docs/legacy-system/05-folder-structure.md`
- `docs/legacy-system/06-database-schema.md`
- `docs/legacy-system/07-api-reference.md`
- `docs/legacy-system/08-workflows.md`
- `docs/legacy-system/09-business-rules.md`
- `docs/legacy-system/10-realtime-events.md`
- `docs/legacy-system/11-config-and-env.md`
- `docs/legacy-system/12-known-issues-and-technical-debt.md`
- `docs/legacy-system/13-migration-notes-for-v2.md`
- `docs/legacy-system/14-ai-handoff-summary.md`
- `docs/legacy-system/15-glossary.md`
- `docs/legacy-system/16-source-map.md`
- `docs/legacy-system/17-pre-v2-hardening-checklist.md`

## Evidence Labels Used
- `Implemented`: directly verified from repository files.
- `Inferred`: conclusion derived from multiple implemented files.
- `Needs verification`: missing file, ambiguous behavior, or deployment assumption not fully verifiable from this repo snapshot.

## V2 Migration Quick Guidance
### What must be preserved (`Inferred`)
- Core API module boundaries in `back-end/src/routes/*.routes.js` and their controller mappings in `back-end/src/controllers/*.controller.js`.
- Domain model coverage in `back-end/src/models/*.js` (course, classroom, attendance, scoring, queue, auth/session, logs).
- Realtime contracts centered in `back-end/src/config/socket.js` and `front-end/contexts/SocketContext.tsx`.
- Queue state architecture using Redis + worker (`back-end/src/config/redis.js`, `back-end/src/utils/redisQueueService.js`, `back-end/src/utils/queueAssignmentWorker.js`).

### What can be redesigned (`Inferred`)
- Service/repository layering in backend (both `back-end/src/services` and `back-end/src/repositories` are present but empty).
- Frontend route/module organization under `front-end/app` if URL behavior is preserved.
- CI/CD implementation details (Jenkins + compose orchestration) while keeping equivalent deploy outcomes.

### What is risky to rewrite (`Inferred`)
- Queue assignment and concurrency flow (Redis queue + assignment worker + socket notifications).
- Attendance live/check-in realtime synchronization paths.
- Auth/session/2FA flows spanning `auth`, `twoFactor`, OAuth, and refresh token persistence.

### What business logic is critical (`Inferred`)
- Role-based access and route protection (`authorize`, `authenticate`, course active checks).
- Score and score-edit-request lifecycle behavior.
- Queue booking lifecycle transitions (`waiting -> in_progress -> complete/cancel/skip`) and worker state transitions.
- Attendance session lifecycle and record updates.

## Known Gaps (`Needs verification`)
- `docker-compose.db.yml` references `./project_ta_prod.sql`, but that file is not present at repository root.
- No dedicated reverse-proxy config file (nginx/caddy/haproxy) found; reverse proxy appears embedded as Traefik service/labels in compose files.
