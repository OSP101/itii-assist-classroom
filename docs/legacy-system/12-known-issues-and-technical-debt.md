# 12 - Known Issues And Technical Debt

## Scope
`Implemented`: findings directly observed from repository files and current documentation package.

`Inferred`: impact/risk interpretation for migration planning.

`Needs verification`: behavior that depends on deployment/runtime conditions outside the repository.

## Severity Scale
- `Critical`: security/compliance or high-probability production failure risk.
- `High`: major maintainability or correctness risk for V2 migration.
- `Medium`: design debt that slows delivery but has known workarounds.
- `Low`: documentation/structure inconsistency with limited runtime risk.

## Debt Register
| ID | Severity | Issue | Evidence | Type | Impact | V2 Direction |
|---|---|---|---|---|---|---|
| TD-SEC-01 | Critical | Sensitive credentials are committed in tracked env file. | `back-end/.env` | Implemented | Credential leakage risk and uncertain secret rotation history. | Immediate secret rotation and repo history cleanup before V2 cutover. |
| TD-SEC-02 | Critical | Database compose file contains hardcoded root password and static phpMyAdmin basic auth hash. | `docker-compose.db.yml` | Implemented | Security posture risk and weak environment separation. | Replace with external secret injection and non-root operational accounts. |
| TD-SEC-03 | High | Backend config allows default JWT/cookie secrets when env is absent. | `back-end/src/config/index.js` | Implemented | Misconfiguration can silently reduce auth security. | Enforce fail-fast config validation in non-local environments. |
| TD-CONF-01 | High | Firebase web config is hardcoded in frontend runtime files instead of full env wiring. | `front-end/config/firebase.ts`, `front-end/public/firebase-messaging-sw.js` | Implemented | Environment drift and difficult secret/config governance. | Move all Firebase web config to env-driven config contract. |
| TD-CONF-02 | Medium | Duplicate key definitions exist in backend env file (e.g., repeated monitoring URL). | `back-end/.env` | Implemented | Ambiguous runtime value source and debugging overhead. | Adopt typed config schema and duplicate-key lint checks. |
| TD-OPS-01 | High | Runtime log artifacts are present in repository (`combined.log`, `error.log`). | `back-end/logs/*` | Implemented | Potential sensitive-data exposure and repo bloat. | Keep logs out of VCS and centralize retention/rotation policy. |
| TD-OPS-02 | High | DB bootstrap compose references SQL path at repo root that is absent in documented migration location. | `docker-compose.db.yml`, `back-end/migrations/project_ta_prod.sql` | Implemented | Bootstrap failure risk and ambiguous operational source of truth. | Normalize DB bootstrap source path and document one authoritative flow. |
| TD-ARCH-01 | High | Controller files are very large and own mixed responsibilities (API, policy, orchestration, persistence side effects). | `back-end/src/controllers/queue.controller.js`, `course.controller.js`, `attendance.controller.js`, `score.controller.js` | Implemented | High regression probability during changes and low testability. | Split into domain services/use-cases with narrow responsibilities. |
| TD-ARCH-02 | Medium | Service/repository folders exist but are empty while controllers implement business logic directly. | `back-end/src/services`, `back-end/src/repositories` | Implemented | Architecture intent is incomplete and onboarding cost rises. | Either remove placeholder layers or complete intended layering in V2. |
| TD-API-01 | Medium | Monitoring routes are mounted on both `/metrics` and `/monitoring` with same handlers. | `back-end/src/routes/index.js` | Implemented | Duplicate API surface increases maintenance and client confusion. | Keep one canonical path and maintain compatibility alias during transition. |
| TD-API-02 | Medium | Queue public contracts exist in two route groups (`/courses/:courseId/queue/*` and `/queue/*`) with overlapping semantics. | `back-end/src/routes/queue.routes.js`, `back-end/src/routes/queuePublic.routes.js` | Implemented | Contract duplication can drift and complicate frontend/client assumptions. | Define canonical public queue contract and deprecate duplicate endpoints. |
| TD-RT-01 | High | Attendance realtime event naming mismatch: frontend listens to `attendance-updated`, backend emits `record-updated`/`session-updated`. | `front-end/app/attendance/[id]/session/[sessionId]/live/page.tsx`, `back-end/src/controllers/attendance.controller.js` | Implemented | Live UI may miss updates depending on fallback/polling behavior. | Add versioned event registry and compatibility event bridge in migration phase. |
| TD-RT-02 | High | Student check-in page emits `student-check-in` socket event but backend socket server has no corresponding listener. | `front-end/app/check-in/[sessionId]/page.tsx`, `back-end/src/config/socket.js` | Implemented | Dead realtime path and unclear contract ownership. | Remove dead event or implement listener with explicit schema/version. |
| TD-RT-03 | High | Queue assignment logic has mixed paths (`tryAssignBooking` plus background worker + Redis queue). | `back-end/src/controllers/queue.controller.js`, `back-end/src/utils/queueAssignmentWorker.js` | Implemented | Concurrency reasoning is harder and race-condition risk is higher. | Consolidate to one authoritative assignment flow with deterministic locking semantics. |
| TD-VAL-01 | High | Explicit request validation is concentrated in auth/feedback while many modules rely on controller-side checks. | `back-end/src/validations/*.js`, `back-end/src/routes/*.routes.js` | Implemented | Inconsistent error handling and higher malformed-input risk. | Add schema-first request validation for all write endpoints. |
| TD-QA-01 | High | Automated tests are effectively absent in repository despite backend `test` script declaration. | `back-end/package.json`, `back-end/postman/*`, lack of test suites in source trees | Implemented | Regression detection is weak for critical workflows. | Build contract/integration test baseline before major migration refactors. |
| TD-DOC-01 | Low | Some inline comments/docs conflict with implementation (example: feedback route comment says anonymous allowed while middleware uses `authenticate`). | `back-end/src/routes/feedback.routes.js` | Implemented | Confuses maintainers and AI agents. | Keep behavior comments synchronized with code as part of migration hygiene. |
| TD-DOC-02 | Low | Root API metadata says realtime is "coming soon" while Socket.IO is already active. | `back-end/src/app.js` | Implemented | Legacy status cues are outdated and can mislead system understanding. | Refresh system metadata text with actual runtime capabilities. |

## Cross-Cutting Technical Debt Themes
`Inferred`:
- Security and config governance debt (secrets handling, hardcoded defaults, committed runtime artifacts).
- Contract drift debt (duplicate APIs, inconsistent realtime event names).
- Layering debt (controller-heavy architecture and empty intended abstraction layers).
- Quality debt (limited validation breadth and missing automated regression suites).

## Remediation Priority For Stabilization Before Deep V2 Rewrite
1. `Critical`: secret rotation, credential hygiene, and VCS cleanup policy (`TD-SEC-01`, `TD-SEC-02`).
2. `High`: realtime/API contract alignment and queue assignment path consolidation (`TD-RT-*`, `TD-API-*`).
3. `High`: validation/test baseline for protected and public mutation endpoints (`TD-VAL-01`, `TD-QA-01`).
4. `Medium`: architecture decomposition strategy for oversized controllers (`TD-ARCH-*`).
5. `Low`: documentation and metadata alignment (`TD-DOC-*`).

## Recommended Future Behavior (V2)
`Recommended`:
- Add a technical-debt board keyed by stable IDs (for example `TD-SEC-01`) and tie each to acceptance tests.
- Enforce "no secret in repo" controls with pre-commit scanning and CI gates.
- Standardize API/event contracts with versioned schemas and compatibility policy.
- Establish minimum test gate for critical workflows (auth, attendance, score edit, queue state transitions).
- Refactor by bounded context and not by file-size alone.

## V2 Migration Notes
### What must be preserved
- Business-rule behavior around auth/roles, course-active gating, attendance/score/queue state transitions.
- Existing external API paths and realtime room/event intent until clients are migrated.
- Queue concurrency safeguards (lock semantics and assignment integrity).

### What can be redesigned
- Internal architecture layers (controller/service/repository boundaries).
- Deployment topology/tooling and secret-management implementation.
- Observability and documentation format for operational metadata.

### What is risky to rewrite
- Queue assignment flow (`queue.controller.js`, `queueAssignmentWorker.js`, `redisQueueService.js`).
- Attendance live update + check-in path (`attendance.controller.js`, socket contracts).
- Auth/session/2FA lifecycle (`auth.controller.js`, `twoFactor.controller.js`, token models).

### What business logic is critical
- Role authorization and active-course mutation guards.
- Attendance classification and score-eligibility coupling.
- Score edit approval workflow and duplicate pending-request prevention.
- Queue lifecycle transitions and worker/booking ownership correctness.

## Needs Verification
- Whether leaked secrets in history have already been rotated in all environments.
- Whether duplicate queue/monitoring endpoints are intentionally consumed by external clients.
- Runtime impact of attendance event name mismatch under current production traffic patterns.
- Which deployment path is authoritative outside Jenkins-generated env files.
