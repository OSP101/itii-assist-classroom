# 09 - Business Rules

## Scope
`Implemented`: rules directly enforced in backend middleware/controllers/models.

`Inferred`: rule intent derived from route grouping and status models.

`Needs verification`: policy-level rules not explicitly codified.

## Rule Catalog

## A) Access And Security Rules

| ID | Rule | Enforcement Evidence | Type |
|---|---|---|---|
| BR-A1 | Only authenticated users can access protected APIs. | `back-end/src/middlewares/auth.js` (`authenticate`), route-level `router.use(authenticate)` in most `*.routes.js`. | Implemented |
| BR-A2 | Only active users are allowed after JWT auth. | `authenticate` rejects `!user.is_active`. | Implemented |
| BR-A3 | Role-based access is enforced with explicit allow-lists. | `authorize(...roles)` middleware and many route declarations (e.g. `course.routes.js`, `classroom.routes.js`). | Implemented |
| BR-A4 | Refresh tokens are rotated and old tokens revoked on refresh. | `auth.controller.js` (`refresh` revokes old token and creates new token). | Implemented |
| BR-A5 | Password change revokes all active sessions. | `auth.controller.js` (`changePassword`, `forceChangePassword`) updates `RefreshToken.revoked`. | Implemented |
| BR-A6 | 2FA methods are limited to TOTP or email and support backup codes. | `twoFactor.controller.js`, `User.two_factor_method` enum, backup code logic. | Implemented |
| BR-A7 | Password reset requests only operate on active users and use expiring tokens. | `auth.controller.js` (`forgotPassword`, `validateResetToken`, `resetPassword`), `PasswordResetToken`. | Implemented |

## B) Course Lifecycle And Write Protection

| ID | Rule | Enforcement Evidence | Type |
|---|---|---|---|
| BR-B1 | Write operations tied to a course can be blocked when course is inactive. | `checkCourseActive` middleware in `middlewares/auth.js`; applied to routes such as assignments, scores, queue, teams, score-edit requests, exam scores. | Implemented |
| BR-B2 | Course-related admin operations are role-scoped (admin/instructor/ta by endpoint). | `course.routes.js` `authorize(...)` chains. | Implemented |
| BR-B3 | Course has an activation state used by downstream workflows. | `Course.is_active` in model and middleware checks. | Implemented |

## C) Attendance Rules

| ID | Rule | Enforcement Evidence | Type |
|---|---|---|---|
| BR-C1 | Attendance sessions are lifecycle-based (`draft`, `active`, `closed`). | `AttendanceSession.status` enum; `computeSessionStatus` and lifecycle actions in `attendance.controller.js`. | Implemented |
| BR-C2 | Student check-in endpoints are public but separated from protected instructor/TA operations. | `attendance.routes.js` declares public check-in endpoints before `router.use(authenticate)`. | Implemented |
| BR-C3 | Check-in status classification uses time windows and late threshold logic. | `attendance.controller.js` (`computeLateThreshold`, `classifyCheckIn`). | Implemented |
| BR-C4 | Manual `leave` statuses are preserved during time-rule recalculation. | `attendance.controller.js` preview/apply sections exclude `status = 'leave'` during re-evaluation. | Implemented |
| BR-C5 | Attendance can be location-aware with configurable radius and optional PIN flow. | `AttendanceSession` fields (`check_location`, `location_lat/lng`, `radius_meters`, `pin_code`), check-in flow in controller. | Implemented |

## D) Scoring And Score-Edit Rules

| ID | Rule | Enforcement Evidence | Type |
|---|---|---|---|
| BR-D1 | Score submission requires required identifiers and score bounds (0..max). | `score.controller.js` (`submitScore`, `submitBulkScores`, `submitGroupScore`) validates required fields and max score constraints. | Implemented |
| BR-D2 | Assignment sub-item scoring respects sub-item max score. | `score.controller.js` resolves `sub_item_id` and validates against sub-item max. | Implemented |
| BR-D3 | Attendance-linked assignments can block scoring for absent students. | Attendance linkage checks in `score.controller.js` (attendance status and `can_score`). | Implemented |
| BR-D4 | Score edit requests begin as `pending`, then instructor approves/rejects or requester cancels. | `scoreEditRequest.controller.js`, `ScoreEditRequest.status` enum. | Implemented |
| BR-D5 | Duplicate pending score edit requests for same assignment/student are blocked. | `findPendingRequestForStudentAssignment` and duplicate checks in `scoreEditRequest.controller.js`. | Implemented |
| BR-D6 | Batch approve/reject operations only target pending requests. | `batchApproveEditRequests` / `batchRejectEditRequests` query `status: 'pending'`. | Implemented |

## E) Queue Rules

| ID | Rule | Enforcement Evidence | Type |
|---|---|---|---|
| BR-E1 | Queue sessions follow valid transitions only (`draft->active`, `active->paused/closed`, `paused->active/closed`). | `queue.controller.js` `updateQueueSessionStatus` transition map. | Implemented |
| BR-E2 | Queue session deletion is blocked if waiting or in-progress bookings exist. | `queue.controller.js` checks for booking statuses `waiting`, `in_progress` before delete. | Implemented |
| BR-E3 | Workers can join only when session is `active` or `paused`. | `joinAsWorker` in `queue.controller.js`. | Implemented |
| BR-E4 | Worker leave behavior depends on active work: paused if task exists, otherwise offline. | `leaveAsWorker` in `queue.controller.js` and Redis state updates. | Implemented |
| BR-E5 | Queue booking requires valid PIN and session state; duplicate active booking per student/session is blocked. | `createBooking` in `queue.controller.js`. | Implemented |
| BR-E6 | Students cannot book teacher desks. | `createBooking` filters desk type (`type != 'teacher'`). | Implemented |
| BR-E7 | Queue real-time state is Redis-first; MySQL stores persistence/history. | Controller and utility comments/implementation in `queue.controller.js`, `redisQueueService.js`, `queueAssignmentWorker.js`. | Implemented |

## F) Feedback And Operational Rules

| ID | Rule | Enforcement Evidence | Type |
|---|---|---|---|
| BR-F1 | Feedback type/status/priority are constrained to fixed enums. | `feedback.validation.js` and `Feedback` model enums. | Implemented |
| BR-F2 | System metrics and system logs are admin-only protected endpoints. | `system.routes.js` and `systemLog.routes.js` include `authenticate` + `authorize('admin')`. | Implemented |
| BR-F3 | Monitoring endpoints are mounted under both `/api/metrics` and `/api/monitoring`. | `routes/index.js` mounts same monitoring route module on two prefixes. | Implemented |

## Cross-Cutting Invariants
- Status fields (`draft/active/closed`, `pending/approved/rejected`, `waiting/in_progress/...`) are central to workflow correctness.
- Role enforcement and course-active checks are critical guards on data mutation.
- Score and queue modules apply additional business checks beyond simple CRUD.

## Recommended Future Behavior (V2)
`Recommended`:
- Move rule definitions into a machine-readable policy catalog (rule ID, trigger, expected outcome, owner) and link each rule to automated tests.
- Add explicit transition guards at a shared domain layer (not only controllers) for attendance, queue, and score-edit statuses.
- Introduce audit-grade event trails for manual overrides and approvals with immutable metadata.
- Add negative-path regression suites for security and integrity rules (inactive course writes, unauthorized actions, duplicate pending requests).

## V2 Migration Notes

### What must be preserved
- Role authorization semantics and protected/public endpoint boundaries.
- Status transition logic for attendance, score-edit, and queue workflows.
- Course-active gating behavior for mutation paths.

### What can be redesigned
- Internal controller decomposition and helper structure.
- Error message wording/localization format, as long as semantic outcomes remain the same.

### What is risky to rewrite
- Queue orchestration and Redis/MySQL consistency paths.
- Attendance re-evaluation logic for time-threshold changes.
- Score-edit approval and duplicate-pending prevention logic.

### What business logic is critical
- Auth/session integrity and token revocation.
- Eligibility rules for scoring and booking.
- Instructor approval control over score change requests.

## Needs Verification
- Institutional policies not directly encoded (e.g., grading appeal SLA, manual override governance).
- Whether additional external consumers depend on undocumented side effects in current controllers.
