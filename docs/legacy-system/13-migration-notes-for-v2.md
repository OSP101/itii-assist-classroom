# 13 - Migration Notes For V2

## Scope
`Implemented`: migration constraints grounded in existing legacy code/docs:
- `docs/legacy-system/02-business-domain.md` to `11-config-and-env.md`
- `docs/legacy-system/12-known-issues-and-technical-debt.md`
- `docs/legacy-system/16-source-map.md`
- `back-end/src/**/*`
- `front-end/**/*`

`Inferred`: migration sequencing and cutover strategy.

`Needs verification`: runtime topology and external consumers outside repository.

## Migration Objectives
1. Preserve critical business behavior while improving maintainability and safety.
2. Reduce security and contract drift debt before deep refactors.
3. Migrate by bounded context with measurable parity checks.
4. Keep rollback paths available until parity is proven.

## Recommended Migration Strategy
`Inferred`: use a staged strangler-style migration instead of big-bang rewrite.

- Keep legacy V1 running as compatibility baseline.
- Introduce V2 modules behind compatibility adapters.
- Cut over context-by-context (not file-by-file).
- Retain dual-run validation for high-risk domains (queue, attendance, scoring, auth).

## Non-Negotiable Compatibility Contracts
`Implemented` contracts to protect during migration:
- API routes and methods currently consumed by `front-end/services/*.service.ts`.
- Role/authorization semantics (`authenticate`, `authorize`, `checkCourseActive`).
- Workflow state models:
  - attendance session: `draft|active|closed`
  - queue session: `draft|active|paused|closed`
  - queue booking: `waiting|in_progress|completed|cancelled|no_show`
  - score edit request: `pending|approved|rejected`
- Realtime room naming and queue/attendance event intent (`queue-*`, `worker-*`, `booking-*`, `attendance-*`, `instructor-*`).

## Context-By-Context Migration Plan
| Phase | Focus | Key Actions | Exit Criteria | Rollback |
|---|---|---|---|---|
| 0 | Stabilize legacy baseline | Rotate leaked credentials, remove tracked secrets/log artifacts, freeze current route/event inventory. | No critical security debt remains open; source map and contract baseline are locked. | Keep V1 unchanged and block V2 traffic. |
| 1 | Contract harness | Add integration tests for auth, attendance, queue, scoring; add API/event contract snapshots. | Critical path tests pass against V1 and V2 compatibility adapters. | Disable V2 adapter and route traffic to V1 handlers. |
| 2 | Domain boundary extraction | Extract service-layer use-cases for course, attendance, score, queue without changing outward API. | Controller size/complexity drops; behavior parity proven by tests. | Rebind endpoints to legacy controllers. |
| 3 | Realtime/queue migration | Consolidate assignment path, normalize event names, add schema-versioned payloads. | Queue assignment correctness validated under concurrency test scenarios. | Re-enable legacy assignment worker/event emitters. |
| 4 | Auth/session hardening | Enforce strict config validation, remove fallback secrets, verify token/session revocation parity. | Auth flows (login, refresh, 2FA, OAuth, reset) pass compatibility suite. | Route auth endpoints back to legacy chain. |
| 5 | Cutover and deprecation | Shift traffic to V2 modules and deprecate duplicated endpoints/events with compatibility window. | Stable SLO period reached and no unresolved P1 parity gaps. | Re-route impacted context to V1 module set. |

## Data Migration Notes
### Persistent data (MySQL)
`Implemented`:
- Legacy schema contains core domain entities and workflow status enums (`back-end/src/models/*.js`, `back-end/migrations/project_ta_structure.sql`).

`Inferred` migration guidance:
- Keep enum semantics stable until client and business-policy migration is complete.
- Prefer additive migrations (new columns/tables) before destructive changes.
- For any table redesign, provide backward-compatible read models for existing APIs during transition.

### Operational runtime state (Redis)
`Implemented`:
- Queue runtime state and assignment lock semantics are Redis-centric (`back-end/src/utils/redisQueueService.js`, `queueAssignmentWorker.js`).

`Inferred` migration guidance:
- Do not redesign Redis keys/lock semantics and queue assignment algorithm simultaneously.
- Migrate assignment engine with replayable test fixtures and deterministic ordering checks.

## API Migration Notes
`Implemented` current realities:
- Some endpoint families are duplicated (for example queue public routes under both `/api/queue/*` and `/api/courses/:courseId/queue/*`).
- Monitoring routes are available under both `/api/metrics/*` and `/api/monitoring/*`.

`Inferred` migration guidance:
- Designate one canonical endpoint family per domain in V2.
- Keep aliases temporarily with deprecation headers and sunset timeline.
- Attach stable business error codes to reduce client coupling to message text.

## Realtime Migration Notes
`Implemented` current realities:
- Attendance and queue rely on Socket.IO room/event contracts.
- Event name mismatch exists between at least one frontend attendance listener and backend emit names.

`Inferred` migration guidance:
- Introduce event schema registry (name, payload schema, producer, consumer, version).
- Ship compatibility bridge events before removing legacy names.
- Add telemetry for emitted/received event counts and reconnect/fallback rates.

## Security And Config Migration Notes
`Implemented` risks:
- Committed secrets and hardcoded runtime config values exist in repository files.
- Backend config has fallback JWT/cookie secrets.

`Inferred` migration guidance:
- Move to secret-manager backed runtime injection.
- Add startup schema validation that fails hard on missing required secrets in non-local envs.
- Eliminate hardcoded frontend Firebase runtime config and drive from env contract.

## Recommended Cutover Order
1. Security and config hygiene baseline.
2. Contract tests and migration harness.
3. Low-risk domain refactors (`users`, `students`, `classrooms`, logs/monitoring APIs).
4. Attendance + scoring migration with parity tests.
5. Queue migration (last major domain).
6. Auth/session hardening and final cutover.

## Recommended Future Behavior (V2)
`Recommended`:
- Maintain one contract source of truth (OpenAPI + event schemas + DB migration history).
- Require parity test evidence before each domain cutover.
- Keep backward-compatibility windows explicit with deprecation dates.
- Use feature flags for domain-level rollout and rollback.

## V2 Migration Notes
### What must be preserved
- Core domain workflow semantics (auth, attendance, scoring, queue, course activation).
- Existing API path/method behavior needed by frontend services during compatibility period.
- Queue assignment correctness and realtime room/event intent.

### What can be redesigned
- Internal code structure and layering.
- Deployment topology, CI/CD tooling, and secret-management implementation.
- Observability internals and monitoring stack composition.

### What is risky to rewrite
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `back-end/src/utils/redisQueueService.js`
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/controllers/auth.controller.js` and `back-end/src/controllers/twoFactor.controller.js`

### What business logic is critical
- Authorization, active-course checks, and mutation guards.
- Attendance check-in classification and attendance-linked scoring eligibility.
- Score edit request approval/rejection governance.
- Queue session/booking/worker transition integrity under concurrency.

## Needs Verification
- All external clients that may rely on duplicate/legacy endpoints or event names.
- Production topology specifics (reverse proxy, env injection, scaling strategy for Socket.IO).
- Whether production schema contains hotfix drift not represented in tracked migration SQL.
