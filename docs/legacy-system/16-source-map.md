# 16 - Source Map

## Scope
`Implemented`: repository inspection of `C:/osp101/test/itii-assist-classroom` with file-level mapping.

`Inferred`: migration guidance derived from existing file structure and module wiring.

`Needs verification`: unresolved references or architecture intent that cannot be proven by static file presence alone.

## 1) Frontend Entry Points

### Startup / runtime entry
- `front-end/package.json` (`dev`, `build`, `start`)
- `front-end/app/layout.tsx` (root layout)
- `front-end/app/page.tsx` (root route)
- `front-end/app/providers.tsx` (global provider tree: UI/theme/socket/notification/auth sync)
- `front-end/middleware.ts` (edge middleware routing guard)

### Primary route entry files (`page.tsx`)
- `front-end/app/page.tsx`
- `front-end/app/(instructor)/home/page.tsx`
- `front-end/app/(instructor)/home/closed/page.tsx`
- `front-end/app/(instructor)/classroom/[id]/page.tsx`
- `front-end/app/(instructor)/classroom/[id]/attendance/[sessionId]/summary/page.tsx`
- `front-end/app/(instructor)/classroom/[id]/queue/[sessionId]/worker/page.tsx`
- `front-end/app/admin/classrooms/page.tsx`
- `front-end/app/admin/courses/page.tsx`
- `front-end/app/admin/dashboard/page.tsx`
- `front-end/app/admin/feedback/page.tsx`
- `front-end/app/admin/logs/page.tsx`
- `front-end/app/admin/monitoring/page.tsx`
- `front-end/app/admin/profile/page.tsx`
- `front-end/app/admin/students/page.tsx`
- `front-end/app/admin/users/page.tsx`
- `front-end/app/attendance/[id]/session/[sessionId]/live/page.tsx`
- `front-end/app/auth/callback/page.tsx`
- `front-end/app/auth/link-callback/page.tsx`
- `front-end/app/auth/reset-password/page.tsx`
- `front-end/app/auth/verify-2fa/page.tsx`
- `front-end/app/check-in/[sessionId]/page.tsx`
- `front-end/app/login/page.tsx`
- `front-end/app/myscore/page.tsx`
- `front-end/app/permissions/page.tsx`
- `front-end/app/profile/page.tsx`
- `front-end/app/queue/book/page.tsx`
- `front-end/app/queue/projector/[sessionId]/page.tsx`

## 2) Backend Entry Points

### Process/API bootstrap
- `back-end/package.json` (`main: src/app.js`, scripts `start`, `dev`)
- `back-end/src/app.js` (Express app + HTTP server + Socket.IO + Redis worker startup)

### API route composition root
- `back-end/src/routes/index.js` (mounts all route modules under `/api`)

## 3) Model Files

### Backend Sequelize models (`back-end/src/models`)
- `Assignment.js`
- `AssignmentAttendanceLink.js`
- `AssignmentSubItem.js`
- `AttendanceRecord.js`
- `AttendanceSession.js`
- `AttendanceSessionSection.js`
- `BonusScore.js`
- `Classroom.js`
- `Course.js`
- `CourseActivityLog.js`
- `CourseInstructor.js`
- `CourseSection.js`
- `CourseSectionStudent.js`
- `CourseTA.js`
- `Desk.js`
- `ExamScore.js`
- `ExamSetting.js`
- `FcmToken.js`
- `Feedback.js`
- `NotificationLog.js`
- `PasswordResetToken.js`
- `QueueBooking.js`
- `QueueDeskStatus.js`
- `QueueSession.js`
- `QueueWorker.js`
- `RefreshToken.js`
- `Score.js`
- `ScoreEditRequest.js`
- `Student.js`
- `StudentGroup.js`
- `StudentGroupMember.js`
- `SystemLog.js`
- `TwoFactorPending.js`
- `User.js`
- `UserOAuthAccount.js`
- `Zone.js`
- `index.js`

### Frontend type model surface
- `front-end/types/index.ts`

## 4) Route Files

### Backend route modules (`back-end/src/routes`)
- `assignment.routes.js`
- `attendance.routes.js`
- `auth.routes.js`
- `bonusScore.routes.js`
- `classroom.routes.js`
- `course.routes.js`
- `courseActivityLog.routes.js`
- `examScore.routes.js`
- `feedback.routes.js`
- `monitoring.routes.js`
- `notification.routes.js`
- `oauth.routes.js`
- `queue.routes.js`
- `queuePublic.routes.js`
- `score.routes.js`
- `scoreEditRequest.routes.js`
- `student.routes.js`
- `system.routes.js`
- `systemLog.routes.js`
- `team.routes.js`
- `twoFactor.routes.js`
- `user.routes.js`
- `index.js`

### Backend mount map (`back-end/src/routes/index.js`)
- `/auth` -> `auth.routes.js`
- `/auth/2fa` -> `twoFactor.routes.js`
- `/oauth` -> `oauth.routes.js`
- `/system` -> `system.routes.js`
- `/logs` -> `systemLog.routes.js`
- `/users` -> `user.routes.js`
- `/students` -> `student.routes.js`
- `/courses` -> `course.routes.js`
- `/courses/:id/teams` -> `team.routes.js`
- `/courses/:courseId/queue` -> `queue.routes.js`
- `/courses/:courseId/activity-logs` -> `courseActivityLog.routes.js`
- `/courses` -> `examScore.routes.js`
- `/queue` -> `queuePublic.routes.js`
- `/notifications` -> `notification.routes.js`
- `/classrooms` -> `classroom.routes.js`
- `/feedback` -> `feedback.routes.js`
- `/assignments` -> `assignment.routes.js`
- `/scores` -> `score.routes.js`
- `/score-edit-requests` -> `scoreEditRequest.routes.js`
- `/attendance` -> `attendance.routes.js`
- `/bonus-scores` -> `bonusScore.routes.js`
- `/metrics` and `/monitoring` -> `monitoring.routes.js`

### Frontend route handlers
- `Implemented`: no `front-end/app/**/route.ts` or `route.js` files found.
- `Inferred`: frontend currently acts as UI-only layer and calls backend APIs through service modules.

## 5) Controller Files

### Backend controllers (`back-end/src/controllers`)
- `assignment.controller.js`
- `attendance.controller.js`
- `auth.controller.js`
- `bonusScore.controller.js`
- `classroom.controller.js`
- `course.controller.js`
- `courseActivityLog.controller.js`
- `examScore.controller.js`
- `feedback.controller.js`
- `notification.controller.js`
- `oauth.controller.js`
- `queue.controller.js`
- `score.controller.js`
- `scoreEditRequest.controller.js`
- `student.controller.js`
- `system.controller.js`
- `systemLog.controller.js`
- `team.controller.js`
- `twoFactor.controller.js`
- `user.controller.js`
- `index.js`

## 6) Service Files

### Frontend service layer (`front-end/services`)
- `api.service.ts`
- `assignment.service.ts`
- `attendance.service.ts`
- `auth.service.ts`
- `bonusScore.service.ts`
- `classroom.service.ts`
- `course.service.ts`
- `courseActivityLog.service.ts`
- `examScore.service.ts`
- `feedback.service.ts`
- `monitoring.service.ts`
- `oauth.service.ts`
- `queue.service.ts`
- `score.service.ts`
- `scoreEditRequest.service.ts`
- `student.service.ts`
- `systemLog.service.ts`
- `twoFactor.service.ts`
- `user.service.ts`
- `index.ts`

### Backend service-like utility modules
- `back-end/src/utils/emailService.js`
- `back-end/src/utils/fcmService.js`
- `back-end/src/utils/redisQueueService.js`
- `back-end/src/utils/twoFactorService.js`

### Backend dedicated service directories
- `back-end/src/services` (empty)
- `back-end/src/repositories` (empty)
- `Needs verification`: whether these are placeholders for future layering or partially migrated architecture.

## 7) Socket / Realtime Files

### Backend realtime core
- `back-end/src/config/socket.js` (Socket.IO server, room join/leave/events, emit helpers)
- `back-end/src/config/redis.js` (Redis client + pub/sub client)
- `back-end/src/utils/redisQueueService.js` (queue/worker/desk real-time state in Redis)
- `back-end/src/utils/queueAssignmentWorker.js` (background assignment worker + socket emits)
- `back-end/src/app.js` (HTTP server + `initializeSocket(server)` + worker startup)

### Backend realtime consumers
- `back-end/src/controllers/attendance.controller.js` (attendance emits)
- `back-end/src/controllers/queue.controller.js` (queue and worker realtime notifications)

### Frontend realtime core
- `front-end/contexts/SocketContext.tsx` (Socket.IO client connection and event API)
- `front-end/app/providers.tsx` (wraps app with `SocketProvider`)

### Frontend realtime-heavy pages/components
- `front-end/app/attendance/[id]/session/[sessionId]/live/page.tsx`
- `front-end/app/check-in/[sessionId]/page.tsx`
- `front-end/app/queue/book/page.tsx`
- `front-end/app/queue/projector/[sessionId]/page.tsx`
- `front-end/app/(instructor)/classroom/[id]/queue/[sessionId]/worker/page.tsx`

## 8) Config / Env Files

### Backend config
- `back-end/src/config/index.js`
- `back-end/src/config/database.js`
- `back-end/src/config/passport.js`
- `back-end/src/config/redis.js`
- `back-end/src/config/socket.js`

### Backend env files
- `back-end/.env`
- `back-end/.env.example`
- `back-end/.env.firebase.example`
- `back-end/.env.template`
- `Needs verification`: runtime references to `back-end/.env.dev` and `back-end/.env.prod` are in compose/Jenkins but these files are generated during deployment and are not committed.

### Frontend config
- `front-end/config/api.ts`
- `front-end/config/design-tokens.ts`
- `front-end/config/firebase.ts`
- `front-end/config/fonts.ts`
- `front-end/config/site.ts`
- `front-end/next.config.js`
- `front-end/postcss.config.js`
- `front-end/tailwind.config.js`
- `front-end/tsconfig.json`
- `front-end/eslint.config.mjs`

### Frontend env files
- `front-end/.env.local`
- `front-end/.env.local.template`
- `front-end/.env.firebase.example`
- `Needs verification`: `front-end/.env.local.dev` and `.env.local.prod` are expected by compose/Jenkins but not committed (generated in pipeline).

### Monitoring config/env
- `monitoring/.env`
- `monitoring/.env.example`
- `monitoring/docker-compose.monitoring.yml`
- `monitoring/docker-compose.monitoring.dev.yml`
- `monitoring/prometheus/prometheus.yml`
- `monitoring/prometheus/prometheus.dev.yml`
- `monitoring/prometheus/alert.rules.yml`
- `monitoring/alertmanager/alertmanager.yml`
- `monitoring/alertmanager/alertmanager.dev.yml`
- `monitoring/promtail/promtail-config.yml`
- `monitoring/loki/loki-config.yml`
- `monitoring/grafana/provisioning/dashboards/dashboards.yml`
- `monitoring/grafana/provisioning/datasources/datasources.yml`
- `monitoring/grafana/provisioning/datasources/datasources.dev.yml`

## 9) Docker / Compose / CI / Reverse Proxy Files

### Dockerfiles
- `back-end/Dockerfile`
- `front-end/Dockerfile`

### Compose files
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `docker-compose.db.yml`
- `monitoring/docker-compose.monitoring.yml`
- `monitoring/docker-compose.monitoring.dev.yml`

### CI/CD files
- `Jenkinsfile.dev`
- `Jenkinsfile.prod`
- `.github/workflows/jenkins-dev-build-status.yml`
- `.github/workflows/jenkins-prod-build-status.yml`

### Reverse proxy files
- `Implemented`: Traefik is defined inside `docker-compose.dev.yml` via `traefik` service and route labels.
- `Needs verification`: no standalone reverse-proxy config file (for nginx/traefik dynamic file/caddy/haproxy) found in repo.
- `Needs verification`: `docker-compose.db.yml` references `./project_ta_prod.sql`, but that file is not present at repository root.

## V2 Migration Flags

### Preserve (`Inferred`)
- API route contract surfaces in `back-end/src/routes`.
- Domain model coverage in `back-end/src/models`.
- Socket event flow and room naming contracts between backend socket server and frontend socket context.
- Redis-backed queue state model and assignment worker semantics.

### Can redesign (`Inferred`)
- Backend internal layering (`services`/`repositories`) with no active implementation files.
- Frontend feature-module organization as long as route URLs and service contracts remain stable.
- Deployment tooling details (Jenkins/compose) if equivalent operational guarantees are retained.

### Risky to rewrite (`Inferred`)
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/utils/redisQueueService.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/controllers/auth.controller.js` + `twoFactor.controller.js` + token-related models

### Critical business logic (`Inferred`)
- Role/authorization and access control enforcement in route middleware usage.
- Attendance session lifecycle and live check-in processing.
- Queue booking/worker/desk state transitions and assignment locking.
- Score entry and score edit request approval/rejection flows.
