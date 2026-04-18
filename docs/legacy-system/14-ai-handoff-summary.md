# 14 - AI Handoff Summary

## Purpose
This document is the fast-start handoff for future AI coding agents and developers working on V2 migration from the V1 legacy system.

## Scope
`Implemented`: summary is based on the current repository and `docs/legacy-system` package.

`Inferred`: execution guidance for safe migration and refactoring.

`Needs verification`: environment/runtime assumptions not visible in this repository snapshot.

## System Snapshot (Read This First)
- Frontend: Next.js App Router under `front-end/app`, service layer under `front-end/services`.
- Backend: Express app under `back-end/src/app.js`, route/controller/model pattern.
- Primary persistence: MySQL via Sequelize models in `back-end/src/models`.
- Realtime runtime: Socket.IO + Redis + background assignment worker for queue operations.
- High-risk domains: `auth`, `attendance`, `score`, `score-edit-request`, `queue`.

## Recommended Reading Order For New Agents
1. `AGENTS.md`
2. `docs/legacy-system/16-source-map.md`
3. `docs/legacy-system/09-business-rules.md`
4. `docs/legacy-system/08-workflows.md`
5. `docs/legacy-system/12-known-issues-and-technical-debt.md`
6. Source hotspots:
   - `back-end/src/routes/index.js`
   - `back-end/src/controllers/queue.controller.js`
   - `back-end/src/controllers/attendance.controller.js`
   - `back-end/src/controllers/auth.controller.js`
   - `back-end/src/utils/queueAssignmentWorker.js`
   - `back-end/src/utils/redisQueueService.js`
   - `front-end/contexts/SocketContext.tsx`

## Critical Invariants (Do Not Break)
`Implemented`:
- Route-level authorization semantics and active-course write protection.
- Status transition semantics for attendance, queue, and score edit workflows.
- Queue assignment ownership and worker/booking consistency.
- Token/session revocation behavior for auth security flows.
- Public vs protected endpoint split for student/staff workflows.

## Safe Change Zones (Lower Risk)
`Inferred`:
- Documentation updates in `docs/legacy-system`.
- Isolated UI-only enhancements that do not alter API/event contracts.
- Internal utility cleanup where behavior is covered by tests/verification.
- Non-critical monitoring/dashboard presentation changes.

## Danger Zones (High Regression Risk)
`Implemented` hotspots:
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `back-end/src/utils/redisQueueService.js`
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/controllers/score.controller.js`
- `back-end/src/controllers/auth.controller.js`
- `back-end/src/controllers/twoFactor.controller.js`

## Known Contract Gaps To Handle Carefully
`Implemented`:
- Attendance frontend listens to `attendance-updated` while backend emits `record-updated`/`session-updated`.
- Check-in frontend emits `student-check-in` while backend socket server has no listener for that event.
- Queue public APIs exist in two endpoint families with overlapping intent.

## Practical Agent Workflow
1. Build a minimal evidence set first (routes, models, controllers, socket/events).
2. Classify each statement as `Implemented`, `Inferred`, or `Needs verification`.
3. For risky changes, preserve existing API/event contract first, then refactor internals.
4. Validate with targeted workflow tests:
   - login + refresh + 2FA
   - attendance create/check-in/close
   - score submit + score edit approve/reject
   - queue book/assign/complete/cancel
5. Only remove compatibility code after parity evidence is documented.

## Verification Checklist Before Merging Risky Changes
- Role and auth guards still enforce the same access boundaries.
- `checkCourseActive` gating still blocks writes to inactive courses.
- Queue session and booking transitions still follow allowed state machine.
- Attendance check-in classification still produces expected statuses.
- Score edit request lifecycle still enforces pending-only review transitions.
- Realtime event names and payloads match active frontend listeners.
- No new secrets or runtime artifacts are committed to repository.

## Operational Risks For AI Agents
`Implemented`:
- Security/config debt exists in current repo snapshot (tracked env/log artifacts, hardcoded config values).
- Validation and test coverage are uneven across modules.
- Controller-heavy code means single-file edits can create side effects.

`Inferred`:
- High-context domains should be migrated with contract tests before structural rewrites.
- Queue and auth require rollback-ready deployment strategy.

## Escalation Triggers (Pause And Reconfirm)
- Any change to queue assignment, locking, or worker state transitions.
- Any change to token/refresh/session revocation behavior.
- Any change that alters public endpoint contracts used by student flows.
- Any change that renames or removes realtime events without compatibility bridge.

## Recommended Future Behavior (V2)
`Recommended`:
- Keep an explicit migration board keyed by domain and contract status.
- Maintain a canonical API spec and event schema registry.
- Track each critical invariant with automated tests and parity reports.
- Require security/config checks as hard CI gates.

## V2 Migration Notes
### What must be preserved
- Critical workflow semantics and domain invariants (auth, attendance, scoring, queue).
- Existing API/event behavior until dependent clients are migrated.
- Authorization and course-active enforcement logic.

### What can be redesigned
- Internal layering, module boundaries, and infrastructure implementation details.
- Frontend component composition and UX structure (without contract breakage).
- CI/CD and deployment tooling.

### What is risky to rewrite
- Queue orchestration and realtime assignment stack.
- Attendance live/check-in and scoring coupling.
- Auth + 2FA + refresh-token/session lifecycle.

### What business logic is critical
- Access control and write gating.
- Status transition integrity across attendance/queue/score edit.
- Student-facing notification and lifecycle correctness.

## Needs Verification
- External integrations or legacy clients beyond current frontend services.
- Production topology details not committed in repository.
- Final deprecation window requirements for duplicate endpoints/events.
