# 17 - Pre-V2 Hardening Checklist

## Scope
`Implemented`: this checklist is based on current code and docs in this repository:
- `docs/legacy-system/07-api-reference.md`
- `docs/legacy-system/08-workflows.md`
- `docs/legacy-system/09-business-rules.md`
- `docs/legacy-system/10-realtime-events.md`
- `docs/legacy-system/11-config-and-env.md`
- `docs/legacy-system/12-known-issues-and-technical-debt.md`
- `back-end/src/**/*`
- `front-end/**/*`

`Inferred`: hardening sequence before major V2 rewrite.

`Needs verification`: production/runtime behavior outside this repository.

## How To Use
- Suggested status per item: `Not Started` / `In Progress` / `Done` / `Blocked`.
- An item is complete only with attached evidence (`test report`, `payload sample`, `run log`, `sign-off`).
- If uncertain, mark clearly as `Needs verification`.

## Gate A - Security And Config Hardening
Status: `Not Started`

- [ ] Rotate all exposed secrets (at minimum from `back-end/.env` and `docker-compose.db.yml`).
- [ ] Move secrets to runtime injection (CI/secret manager); no hardcoded runtime secrets in repo.
- [ ] Remove fallback JWT/cookie secrets for non-local runtime (`back-end/src/config/index.js`).
- [ ] Remove runtime log artifacts from VCS (`back-end/logs/combined.log`, `back-end/logs/error.log`).
- [ ] Add pre-commit or CI secret scanning gate.
- [ ] Publish environment config matrix for `dev/staging/prod` (required vs optional keys).

Evidence required:
- Secret rotation record with timestamp
- CI run showing secret scan pass
- Approved env matrix document

## Gate B - API Contract Test Baseline
Status: `Not Started`

Critical flows that must have contract tests:
- [ ] Auth: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- [ ] 2FA: critical login completion paths under `POST /api/auth/2fa/*`
- [ ] Attendance: create, activate, check-in, close, record update
- [ ] Score: single, bulk, group submission and summary paths
- [ ] Score edit request: create, approve, reject, cancel, batch
- [ ] Queue: verify pin, booking create/cancel/status, worker join/leave, complete/skip
- [ ] Course-active protections on endpoints using `checkCourseActive`

Checklist:
- [ ] Define request/response schemas for critical endpoints
- [ ] Add negative tests (unauthorized, inactive course, invalid transition)
- [ ] Add stable business error-code mapping
- [ ] Store test artifacts for each run

Evidence required:
- Test execution report
- Contract snapshot/version
- Endpoint coverage summary for critical set

## Gate C - Realtime Contract Verification
Status: `Not Started`

Checklist:
- [ ] Build event matrix: producer, consumer, room, payload schema
- [ ] Resolve event name gaps:
- [ ] `attendance-updated` vs `record-updated` / `session-updated`
- [ ] frontend-emitted `student-check-in` without backend listener
- [ ] Validate reconnect and polling fallback behavior on queue pages
- [ ] Add baseline telemetry: emitted vs received counters
- [ ] Add compatibility bridge before removing or renaming events

Evidence required:
- Event compatibility report
- Realtime test logs/captures
- Closed mismatch tracking list

## Gate D - Database Migration Rehearsal
Status: `Not Started`

Checklist:
- [ ] Confirm one source of truth for DB bootstrap SQL path
- [ ] Rehearse restore from actual dump
- [ ] Rehearse migration up and down on staging-like environment
- [ ] Verify enum and state parity against legacy models
- [ ] Verify critical FK and unique constraints (attendance, score, queue, auth)
- [ ] Validate backup and rollback runbook end-to-end

Evidence required:
- Migration rehearsal log
- Schema and critical data parity diff report
- Rollback proof

## Gate E - Workflow UAT Checklist
Status: `Not Started`

Critical workflows:
- [ ] Staff login, refresh, optional 2FA
- [ ] Password reset end-to-end
- [ ] Course setup, section enrollment, active toggle
- [ ] Attendance lifecycle, student check-in, manual override
- [ ] Score submission with attendance-linked eligibility
- [ ] Score edit request approval and rejection
- [ ] Queue booking to assignment to complete/cancel/skip
- [ ] Notification registration and push handling

Checklist:
- [ ] Create UAT script per workflow (preconditions, steps, expected result, failure conditions)
- [ ] Execute role-based UAT (`admin`, `instructor`, `ta`, student-public flow)
- [ ] Add regression checklist for known recurring issues
- [ ] Obtain business owner sign-off for critical workflows

Evidence required:
- UAT execution logs
- Business sign-off records
- Open issues and risk acceptance list

## Gate F - Cutover Readiness
Status: `Not Started`

Checklist:
- [ ] Feature flag or traffic switch for domain-level rollback
- [ ] Canary rollout plan with measurable success criteria
- [ ] Incident playbook for auth, queue, and attendance
- [ ] Freeze window and communication plan
- [ ] Post-cutover validation script for first 24 hours

Evidence required:
- Approved cutover plan
- Rollback drill result
- Go/no-go decision record

## Minimum Definition Of Done (Before Major V2 Rewrite)
- [ ] Gate A complete
- [ ] Gate B covers critical endpoint set
- [ ] Gate C closes major mismatches or has compatibility bridge
- [ ] Gate D completes at least one full rehearsal
- [ ] Gate E has business sign-off for critical workflows
- [ ] Gate F has tested rollback path

## Recommended Working Artifacts
- API contract pack: `docs/legacy-system/evidence/api-contracts/`
- Realtime contract pack: `docs/legacy-system/evidence/realtime-contracts/`
- Migration rehearsal logs: `docs/legacy-system/evidence/migration-rehearsal/`
- UAT reports: `docs/legacy-system/evidence/uat/`

`Implemented`: these evidence directories are created in this update with starter `README.md` files.

## V2 Migration Notes
### What must be preserved
- Critical business rules for authorization, active-course gating, and workflow state transitions
- API and realtime contracts used by existing frontend clients
- Queue assignment correctness under concurrency

### What can be redesigned
- Internal architecture layering (`controller`/`service`/`repository`)
- Deployment tooling and observability implementation
- Test framework used to implement contract suites

### What is risky to rewrite
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `back-end/src/utils/redisQueueService.js`
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/controllers/auth.controller.js`
- `back-end/src/controllers/twoFactor.controller.js`

### What business logic is critical
- Auth and session integrity
- Attendance classification and validity checks
- Score governance and score-edit approval workflow
- Queue lifecycle and worker/booking ownership integrity
