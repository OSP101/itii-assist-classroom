# 08 - Workflows

## Scope
`Implemented`: derived from route/controller/service code:
- `back-end/src/routes/*.routes.js`
- `back-end/src/controllers/*.controller.js`
- `back-end/src/middlewares/auth.js`
- `front-end/services/*.service.ts`
- `front-end/app/**/page.tsx`

`Inferred`: orchestration interpretation across modules.

`Needs verification`: organization-specific policy decisions not encoded directly in source.

## Workflow Inventory
`Implemented` core operational workflows:
1. staff authentication and session lifecycle (with optional 2FA)
2. password reset flow
3. course setup and activation gating
4. attendance session lifecycle and student check-in
5. scoring and attendance-gated grading
6. score edit request approval/rejection
7. queue booking, worker assignment, and completion
8. notification token registration and push delivery

## 1) Staff Login And Session Flow
### Trigger
- user submits credentials from frontend login screen (`front-end/services/auth.service.ts` -> `POST /api/auth/login`)

### Steps (`Implemented`)
1. `auth.controller.login` validates local credentials via Passport local strategy.
2. if `user.two_factor_enabled === true`, API returns `requiresTwoFactor` response (no access token yet).
3. if 2FA is not required, API issues access/refresh tokens and persists refresh token (`RefreshToken`).
4. frontend stores tokens in localStorage via `api.service.ts`.
5. protected API calls use bearer token; on `401`, frontend attempts `POST /api/auth/refresh`.
6. backend `auth.controller.refresh` revokes old refresh token and issues a new pair.

### Evidence
- `back-end/src/controllers/auth.controller.js` (`login`, `refresh`, `logout`)
- `back-end/src/config/passport.js`
- `front-end/services/auth.service.ts`
- `front-end/services/api.service.ts`

## 2) Two-Factor Authentication Login Flow
### Trigger
- user account with enabled 2FA logs in.

### Steps (`Implemented`)
1. login returns `requiresTwoFactor`, method, and `userId`.
2. for email 2FA: frontend/backend calls `POST /api/auth/2fa/send-login-code`.
3. user submits code to `POST /api/auth/2fa/complete-login` (or verify endpoint first).
4. backend verifies method-specific code (TOTP/email) and fallback backup codes.
5. backend issues access/refresh tokens and stores refresh token session.

### Evidence
- `back-end/src/controllers/twoFactor.controller.js` (`sendLoginCode`, `verifyLogin`, `completeLogin`)
- `back-end/src/controllers/auth.controller.js` (`login`)

## 3) Password Reset Flow
### Trigger
- user requests reset from login page.

### Steps (`Implemented`)
1. `POST /api/auth/forgot-password` accepts email.
2. backend always returns generic success message to prevent account enumeration.
3. if user exists and active, backend creates `PasswordResetToken`, emails reset link.
4. frontend validates token via `POST /api/auth/validate-reset-token`.
5. frontend submits new password via `POST /api/auth/reset-password`.
6. backend updates password, marks token used, revokes all refresh sessions.

### Evidence
- `back-end/src/controllers/auth.controller.js` (`forgotPassword`, `validateResetToken`, `resetPassword`)
- `back-end/src/models/PasswordResetToken.js`

## 4) Course Setup And Activation Workflow
### Trigger
- admin/instructor prepares course before teaching operations.

### Steps (`Implemented`)
1. create course (`POST /api/courses`).
2. add sections and enroll students (`/sections`, `/students` endpoints).
3. assign TAs/instructors (`/tas`, `/instructors` endpoints).
4. toggle active/inactive (`PATCH /api/courses/:id/toggle-status`).
5. downstream write APIs are guarded by `checkCourseActive` middleware.

### Evidence
- `back-end/src/routes/course.routes.js`
- `back-end/src/controllers/course.controller.js`
- `back-end/src/middlewares/auth.js` (`checkCourseActive`)

## 5) Attendance Session Workflow
### Trigger
- instructor/TA opens attendance for selected sections.

### Steps (`Implemented`)
1. create session (`POST /api/attendance`) with selected sections and timing rules.
2. backend pre-creates attendance records (`status='absent'`) for enrolled students.
3. students call public check-in endpoint with PIN (+ optional location).
4. backend validates session status/time, student enrollment, PIN, optional geo-radius.
5. backend classifies as `present` or `late`, updates record, emits realtime update.
6. instructor may update records manually, preview/apply time-rule changes, close session.

### Evidence
- `back-end/src/controllers/attendance.controller.js` (`createAttendanceSession`, `studentCheckIn`, `updateAttendanceSession`, `previewTimeChange`, `applyTimeChange`, `closeSession`)
- `back-end/src/routes/attendance.routes.js`

## 6) Score Submission Workflow
### Trigger
- instructor/TA grades assignment or sub-item.

### Steps (`Implemented`)
1. submit single or bulk score via `/api/scores` endpoints.
2. backend validates assignment existence and course active status.
3. backend validates attendance eligibility when assignment is attendance-linked.
4. backend enforces score range (`0..max`) and sub-item max when relevant.
5. backend creates or updates score record with grader metadata.

### Evidence
- `back-end/src/controllers/score.controller.js` (`submitScore`, `submitBulkScores`, `submitGroupScore`)
- `back-end/src/models/AssignmentAttendanceLink.js`

## 7) Score Edit Request Workflow
### Trigger
- TA/instructor requests correction for an existing score.

### Steps (`Implemented`)
1. requester creates edit request (`pending`) with reason and optional image attachments.
2. backend blocks duplicate pending request for same student-assignment context.
3. instructor approves/rejects single or batch requests.
4. on approval, backend updates actual score and marks request reviewed.
5. requester can cancel only while request is pending.

### Evidence
- `back-end/src/controllers/scoreEditRequest.controller.js`
- `back-end/src/routes/scoreEditRequest.routes.js`

## 8) Queue Booking To Completion Workflow
### Trigger
- student books queue slot by session PIN.

### Steps (`Implemented`)
1. student verifies PIN (`verifyPIN`) and submits booking (`createBooking`).
2. backend validates session state, enrollment, attendance prerequisite, desk constraints, and duplicate active booking prevention.
3. booking is persisted in MySQL (`waiting`) and mirrored into Redis queue state.
4. background assignment worker or immediate trigger matches booking to available worker.
5. socket events notify projector/queue room, worker room, and booking room.
6. worker completes or skips booking; backend updates status, desk state, optional score, and emits completion/position updates.
7. cancellation path resets desk/booking state and emits cancellation events.

### Evidence
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/utils/redisQueueService.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `front-end/app/queue/book/page.tsx`
- `front-end/app/queue/projector/[sessionId]/page.tsx`
- `front-end/app/(instructor)/classroom/[id]/queue/[sessionId]/worker/page.tsx`

## 9) Notification Workflow (FCM)
### Trigger
- worker/student enables notifications in browser.

### Steps (`Implemented`)
1. frontend requests browser permission and gets FCM token.
2. frontend registers token to backend (`POST /api/notifications/register`).
3. queue events invoke backend notification service (new task, queue ready, completed, session closed).
4. service worker receives background notification and routes click actions by notification type.

### Evidence
- `front-end/contexts/NotificationContext.tsx`
- `front-end/public/firebase-messaging-sw.js`
- `back-end/src/controllers/notification.controller.js`
- `back-end/src/utils/fcmService.js`

## State-Driven Workflows
`Implemented` state machines driving behavior:
- attendance: `draft -> active -> closed` (computed from time windows)
- queue session: `draft -> active -> paused/closed`
- queue booking: `waiting -> in_progress -> completed/cancelled/no_show`
- score edit request: `pending -> approved/rejected` (or cancelled by requester)

Evidence:
- `back-end/src/models/*.js` enums
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/controllers/scoreEditRequest.controller.js`

## Recommended Future Behavior (V2)
`Recommended`:
- define canonical workflow specs with explicit preconditions/postconditions per endpoint.
- add integration tests per business workflow (auth+2FA, attendance check-in, queue assignment, score edit approval).
- publish event contract tests for queue and attendance realtime flows.
- add workflow-level idempotency and retry policies for critical write paths.

## V2 Migration Notes
### What must be preserved
- workflow semantics for auth/session, attendance validity, queue assignment, and score governance.
- course-active gating for mutation workflows.
- requester/reviewer separation in score edit flow.

### What can be redesigned
- UX flow details and page organization, provided workflow outcomes remain equivalent.
- internal orchestration split across controllers/services/workers.
- notification transport implementation (if user-visible behavior stays consistent).

### What is risky to rewrite
- queue booking/assignment/completion chain (Redis + worker + socket + persistence).
- attendance time-change re-evaluation flow and section-change impacts.
- 2FA and refresh token lifecycle handling.

### What business logic is critical
- policy checks before mutation (role, active course, enrollment, attendance eligibility).
- status transition integrity across queue/attendance/score edit.
- duplicate prevention rules (active booking, pending edit requests).

## Needs Verification
- institution-level SLA/policy overlays (e.g., score dispute window, attendance exception handling).
- whether additional external clients consume these workflows outside current frontend services.