# 02 - Business Domain

## Scope
`Implemented`: derived from backend models/routes/controllers and frontend route/service structure.

`Inferred`: domain interpretation based on module boundaries and data relationships.

`Needs verification`: process details not explicitly enforced in code.

## Domain Summary
ITII Assist Classroom is a classroom/lab operations platform that combines:
- identity and access control for staff roles (`admin`, `instructor`, `ta`)
- course and section administration
- attendance tracking and check-in
- assignment and exam scoring
- score edit request workflow
- realtime queue management in lab classrooms
- feedback intake and operational monitoring

Primary code evidence:
- `back-end/src/models/*.js`
- `back-end/src/routes/*.routes.js`
- `back-end/src/controllers/*.controller.js`
- `front-end/app/**/page.tsx`
- `front-end/services/*.service.ts`

## Actors And Personas

### Implemented actors
- `admin`
  - Role value from `back-end/src/models/User.js` (`role` enum)
  - UI surfaces under `front-end/app/admin/*`
  - Manages users, students, courses, classrooms, logs, monitoring
- `instructor`
  - Role value from `User.role`
  - UI surfaces under `front-end/app/(instructor)/*`
  - Owns teaching workflows (attendance, scores, queue sessions)
- `ta`
  - Role value from `User.role`
  - Shares operational teaching workflows with instructor where route authorization allows
- `student` (domain entity)
  - Data entity in `back-end/src/models/Student.js`
  - Student-facing pages include `front-end/app/check-in/[sessionId]/page.tsx`, `front-end/app/queue/book/page.tsx`, `front-end/app/myscore/page.tsx`

### Needs verification
- Whether students authenticate via `users` table or exclusively via student identity + public check-in flows in all deployments.

## Bounded Contexts

### 1) Identity And Access
Implemented modules:
- Models: `User`, `RefreshToken`, `TwoFactorPending`, `UserOAuthAccount`, `PasswordResetToken`
- Routes: `auth.routes.js`, `twoFactor.routes.js`, `oauth.routes.js`
- Controllers: `auth.controller.js`, `twoFactor.controller.js`, `oauth.controller.js`

Core capabilities:
- local login + JWT access/refresh token rotation
- OAuth login/linking (`google`, `github`, `apple`)
- session listing and revocation
- password reset flow
- optional 2FA (`totp` or `email`) with backup codes

### 2) Academic Structure
Implemented modules:
- Models: `Course`, `CourseSection`, `CourseInstructor`, `CourseTA`, `CourseSectionStudent`, `Student`
- Routes: `course.routes.js`, `student.routes.js`, `user.routes.js`

Core capabilities:
- course CRUD and activation status
- assign instructors/TAs
- section and enrollment management
- student master data and import/search

### 3) Classroom Layout And Lab Assets
Implemented modules:
- Models: `Classroom`, `Desk`, `Zone`
- Routes: `classroom.routes.js`

Core capabilities:
- classroom CRUD with soft/active toggles
- desk layout editing and zoning

### 4) Attendance
Implemented modules:
- Models: `AttendanceSession`, `AttendanceSessionSection`, `AttendanceRecord`
- Routes: `attendance.routes.js`
- Controller: `attendance.controller.js`

Core capabilities:
- attendance session lifecycle (`draft`, `active`, `closed`)
- public check-in endpoints (`/api/attendance/check-in/*`)
- optional location + PIN checks
- instructor/TA attendance record override and time-rule recalculation

### 5) Assessment And Grading
Implemented modules:
- Models: `Assignment`, `AssignmentSubItem`, `AssignmentAttendanceLink`, `Score`, `ScoreEditRequest`, `BonusScore`, `ExamSetting`, `ExamScore`, `StudentGroup`, `StudentGroupMember`
- Routes: `assignment.routes.js`, `score.routes.js`, `scoreEditRequest.routes.js`, `bonusScore.routes.js`, `examScore.routes.js`, `team.routes.js`

Core capabilities:
- assignment definitions with optional attendance linkage
- individual and group scoring
- exam setting matrix (midterm/final x lecture/lab)
- score edit request workflow with instructor approval/rejection
- bonus score awarding

### 6) Queue Operations (Lab Help/Grading)
Implemented modules:
- Models: `QueueSession`, `QueueWorker`, `QueueBooking`, `QueueDeskStatus`
- Realtime/infra: `back-end/src/config/socket.js`, `back-end/src/config/redis.js`, `back-end/src/utils/redisQueueService.js`, `back-end/src/utils/queueAssignmentWorker.js`
- Routes: `queue.routes.js`, `queuePublic.routes.js`

Core capabilities:
- queue session lifecycle (`draft`, `active`, `paused`, `closed`)
- worker presence and assignment orchestration
- booking by PIN with desk constraints
- realtime projector/worker/student status updates

### 7) Feedback, Notifications, And Observability
Implemented modules:
- Models: `Feedback`, `FcmToken`, `NotificationLog`, `SystemLog`, `CourseActivityLog`
- Routes: `feedback.routes.js`, `notification.routes.js`, `system.routes.js`, `systemLog.routes.js`, `monitoring.routes.js`, `courseActivityLog.routes.js`

Core capabilities:
- structured feedback lifecycle
- push token registration and delivery logs
- system/admin monitoring endpoints and operational logs

## Core Business Workflows

### A) Course setup to instruction
`admin/instructor` creates course -> configures sections -> enrolls students -> assigns TA/instructor collaborators -> course becomes active.

Evidence:
- `back-end/src/routes/course.routes.js`
- `back-end/src/controllers/course.controller.js`

### B) Attendance-assisted scoring
Instructor creates attendance session(s), students check in, then linked assignments enforce attendance-based score eligibility.

Evidence:
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/controllers/score.controller.js`
- `back-end/src/models/AssignmentAttendanceLink.js`

### C) Score correction governance
TA/instructor submits score edit request -> instructor approves/rejects (single or batch) -> score updates and request status changes.

Evidence:
- `back-end/src/controllers/scoreEditRequest.controller.js`
- `back-end/src/models/ScoreEditRequest.js`

### D) Queue-based lab operations
Students create bookings by queue PIN -> workers join/leave -> assignment worker performs matching -> realtime notifications update projector/worker/student clients.

Evidence:
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `back-end/src/utils/redisQueueService.js`

## Domain Invariants (High-Level)
- Role-constrained operations are enforced by route middleware (`authenticate`, `authorize`).
- Many write operations are blocked when course is inactive (`checkCourseActive`).
- Attendance, score, and queue modules have explicit lifecycle statuses and transitions.

## Recommended Future Behavior (V2)
`Recommended`:
- Keep bounded contexts explicit at code and API layers (`identity`, `academic-structure`, `attendance`, `scoring`, `queue`, `observability`) to reduce cross-module coupling.
- Introduce formal domain contracts for cross-context actions (for example, attendance eligibility checks used by scoring) so behavior is testable without controller-level inference.
- Preserve public student flows but isolate them behind dedicated policy components to make risk-sensitive checks auditable.
- Add traceable decision logs for instructor/TA critical actions (score overrides, queue/manual transitions, attendance status overrides).

## V2 Migration Notes

### What must be preserved
- Role model (`admin/instructor/ta`) and route-level permission intent.
- Attendance, scoring, score-edit, and queue domain boundaries.
- Data relationships among course/section/student/assignment/score/queue entities.

### What can be redesigned
- Internal layering and service abstraction style (current backend has thin `services`/`repositories` directories).
- Frontend module decomposition and page composition, provided route intent and API contracts remain equivalent.

### What is risky to rewrite
- Queue orchestration (`queue.controller.js`, `redisQueueService.js`, `queueAssignmentWorker.js`).
- Attendance-to-scoring coupling logic in `score.controller.js`.
- Auth/session/2FA integration paths in `auth.controller.js` and `twoFactor.controller.js`.

### What business logic is critical
- Course activation gating for write operations.
- Score submission bounds and approval governance.
- Attendance status computation and check-in classification.
- Queue session transition rules and worker assignment behavior.

## Needs Verification
- Institution-specific academic policy outside code (grading policy details, dispute SLA, attendance exception policy).
- Production-specific identity flows for student-facing pages where public endpoints are mixed with authenticated staff endpoints.
