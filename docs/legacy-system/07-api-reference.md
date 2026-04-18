# 07 - API Reference

## Scope
`Implemented`: generated from backend route files and mount wiring:
- `back-end/src/routes/index.js`
- `back-end/src/routes/*.routes.js`

`Inferred`: request/response semantics where route names imply behavior.

`Needs verification`: payload fields for endpoints without explicit validation schema in code.

## Base URL
- Default backend API base: `http://localhost:3001/api` (from `front-end/config/api.ts` and backend default port config).

## Common Conventions

### Authentication
- Bearer JWT via `Authorization: Bearer <accessToken>`
- Access token refresh endpoint: `POST /api/auth/refresh`
- Session revocation endpoints under `/api/auth/sessions/*`

### Response Envelope
- Success responses are generally shaped as:
  - `{ success: true, data: ..., message?: string }`
- Error responses from global error handler:
  - `{ success: false, error: { code: number, message: string, stack?: string } }`
  - see `back-end/src/middlewares/errorHandler.js`

### Validation Modules (explicit)
- `back-end/src/validations/auth.validation.js`
- `back-end/src/validations/feedback.validation.js`

## Endpoint Catalog
Legend:
- `Auth`: `public`, `optional`, or `required`
- `Roles`: parsed from `authorize(...)` middleware when present
- `Middleware`: route middleware chain visible in route definitions
### /assignments
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/assignments` | required | - | authenticate | `assignmentController.getAssignments` |
| POST | `/api/assignments` | required | - | authenticate, checkCourseActive | `assignmentController.createAssignment` |
| DELETE | `/api/assignments/:id` | required | - | authenticate, checkCourseActive | `assignmentController.deleteAssignment` |
| GET | `/api/assignments/:id` | required | - | authenticate | `assignmentController.getAssignment` |
| PUT | `/api/assignments/:id` | required | - | authenticate, checkCourseActive | `assignmentController.updateAssignment` |
| PUT | `/api/assignments/reorder/batch` | required | - | authenticate, checkCourseActive | `assignmentController.reorderAssignments` |

### /attendance
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/attendance` | required | - | authenticate | `attendanceController.getAttendanceSessions` |
| POST | `/api/attendance` | required | - | authenticate, checkCourseActive | `attendanceController.createAttendanceSession` |
| POST | `/api/attendance/check-in/:sessionId` | public | - | - | `attendanceController.studentCheckIn` |
| GET | `/api/attendance/check-in/:sessionId/info` | public | - | - | `attendanceController.getSessionInfo` |
| DELETE | `/api/attendance/:id` | required | - | authenticate | `attendanceController.deleteAttendanceSession` |
| GET | `/api/attendance/:id` | required | - | authenticate | `attendanceController.getAttendanceSession` |
| PUT | `/api/attendance/:id` | required | - | authenticate | `attendanceController.updateAttendanceSession` |
| POST | `/api/attendance/:id/activate` | required | - | authenticate | `attendanceController.activateSession` |
| POST | `/api/attendance/:id/apply-time-change` | required | - | authenticate | `attendanceController.applyTimeChange` |
| POST | `/api/attendance/:id/close` | required | - | authenticate | `attendanceController.closeSession` |
| POST | `/api/attendance/:id/preview-section-change` | required | - | authenticate | `attendanceController.previewSectionChange` |
| POST | `/api/attendance/:id/preview-time-change` | required | - | authenticate | `attendanceController.previewTimeChange` |
| GET | `/api/attendance/:id/records` | required | - | authenticate | `attendanceController.getAttendanceRecords` |
| PUT | `/api/attendance/:id/records/:recordId` | required | - | authenticate | `attendanceController.updateAttendanceRecord` |
| POST | `/api/attendance/verify-student` | public | - | - | `attendanceController.verifyStudent` |

### /auth
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| POST | `/api/auth/apple` | public | - | - | `passport.authenticate('apple', { session: false, })` |
| POST | `/api/auth/apple/callback` | public | - | - | `authController.appleCallback` |
| DELETE | `/api/auth/avatar` | required | - | authenticate | `authController.removeAvatar` |
| POST | `/api/auth/avatar` | required | - | authenticate, handleAvatarUpload | `authController.uploadUserAvatar` |
| POST | `/api/auth/change-password` | required | - | authenticate, validate(authValidation.changePassword) | `authController.changePassword` |
| POST | `/api/auth/force-change-password` | required | - | authenticate | `authController.forceChangePassword` |
| POST | `/api/auth/forgot-password` | public | - | - | `authController.forgotPassword` |
| GET | `/api/auth/github` | public | - | inline-middleware | `passport.authenticate('github', { scope: ['user:email'], session: false, })` |
| GET | `/api/auth/github/callback` | public | - | - | `authController.githubCallback` |
| GET | `/api/auth/google` | public | - | inline-middleware | `passport.authenticate('google', { scope: ['profile', 'email'], session: false, })` |
| GET | `/api/auth/google/callback` | public | - | - | `authController.googleCallback` |
| POST | `/api/auth/login` | public | - | validate(authValidation.login) | `authController.login` |
| POST | `/api/auth/logout` | public | - | - | `authController.logout` |
| GET | `/api/auth/me` | required | - | authenticate | `authController.getMe` |
| PUT | `/api/auth/profile` | required | - | authenticate, validate(authValidation.updateProfile) | `authController.updateProfile` |
| POST | `/api/auth/refresh` | public | - | validate(authValidation.refreshToken) | `authController.refresh` |
| POST | `/api/auth/reset-password` | public | - | - | `authController.resetPassword` |
| GET | `/api/auth/sessions` | required | - | authenticate | `authController.getSessions` |
| POST | `/api/auth/sessions/revoke-all` | required | - | authenticate | `authController.revokeAllSessions` |
| DELETE | `/api/auth/sessions/:sessionId` | required | - | authenticate | `authController.revokeSession` |
| POST | `/api/auth/validate-reset-token` | public | - | - | `authController.validateResetToken` |

### /auth/2fa
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| POST | `/api/auth/2fa/backup-codes` | required | - | authenticate | `twoFactorController.regenerateBackupCodes` |
| POST | `/api/auth/2fa/complete-login` | public | - | - | `twoFactorController.completeLogin` |
| POST | `/api/auth/2fa/disable` | required | - | authenticate | `twoFactorController.disable` |
| POST | `/api/auth/2fa/resend-email` | required | - | authenticate | `twoFactorController.resendEmailCode` |
| POST | `/api/auth/2fa/send-login-code` | public | - | - | `twoFactorController.sendLoginCode` |
| POST | `/api/auth/2fa/setup/email` | required | - | authenticate | `twoFactorController.setupEmail` |
| POST | `/api/auth/2fa/setup/totp` | required | - | authenticate | `twoFactorController.setupTOTP` |
| GET | `/api/auth/2fa/status` | required | - | authenticate | `twoFactorController.getStatus` |
| POST | `/api/auth/2fa/verify` | required | - | authenticate | `twoFactorController.verifyAndEnable` |
| POST | `/api/auth/2fa/verify-login` | public | - | - | `twoFactorController.verifyLogin` |

### /bonus-scores
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| POST | `/api/bonus-scores` | required | instructor, ta | authenticate, authorize('instructor', 'ta'), checkCourseActive | `bonusScoreController.giveBonusScore` |
| GET | `/api/bonus-scores/course/:courseId` | required | instructor, ta | authenticate, authorize('instructor', 'ta') | `bonusScoreController.getBonusScoresByCourse` |
| GET | `/api/bonus-scores/course/:courseId/students` | required | instructor, ta | authenticate, authorize('instructor', 'ta') | `bonusScoreController.getEnrolledStudentsForBonus` |
| GET | `/api/bonus-scores/course/:courseId/student/:studentId` | required | instructor, ta | authenticate, authorize('instructor', 'ta') | `bonusScoreController.getStudentBonusHistory` |
| GET | `/api/bonus-scores/course/:courseId/summary` | required | instructor, ta | authenticate, authorize('instructor', 'ta') | `bonusScoreController.getBonusScoreSummary` |
| DELETE | `/api/bonus-scores/:id` | required | instructor, ta | authenticate, authorize('instructor', 'ta'), checkCourseActive | `bonusScoreController.deleteBonusScore` |

### /classrooms
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/classrooms` | required | - | authenticate | `classroomController.getClassrooms` |
| POST | `/api/classrooms` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `classroomController.createClassroom` |
| DELETE | `/api/classrooms/:id` | required | admin | authenticate, authorize('admin') | `classroomController.deleteClassroom` |
| GET | `/api/classrooms/:id` | required | - | authenticate | `classroomController.getClassroomById` |
| PUT | `/api/classrooms/:id` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `classroomController.updateClassroom` |
| PUT | `/api/classrooms/:id/layout` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `classroomController.updateLayout` |
| POST | `/api/classrooms/:id/restore` | required | admin | authenticate, authorize('admin') | `classroomController.restoreClassroom` |
| PATCH | `/api/classrooms/:id/toggle-status` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `classroomController.toggleStatus` |
| GET | `/api/classrooms/stats` | required | - | authenticate | `classroomController.getStats` |

### /courses
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/courses` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `courseController.getCourses` |
| POST | `/api/courses` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `courseController.createCourse` |
| GET | `/api/courses/:courseId/exam-scores` | required | - | authenticate | `examScoreController.getExamScores` |
| POST | `/api/courses/:courseId/exam-scores` | required | - | authenticate, checkCourseActive | `examScoreController.saveExamScore` |
| POST | `/api/courses/:courseId/exam-scores/bulk` | required | - | authenticate, checkCourseActive | `examScoreController.bulkSaveExamScores` |
| DELETE | `/api/courses/:courseId/exam-scores/:scoreId` | required | - | authenticate, checkCourseActive | `examScoreController.deleteExamScore` |
| GET | `/api/courses/:courseId/exam-scores/stats` | required | - | authenticate | `examScoreController.getExamScoreStats` |
| GET | `/api/courses/:courseId/exam-settings` | required | - | authenticate | `examScoreController.getExamSettings` |
| PUT | `/api/courses/:courseId/exam-settings/:settingId` | required | - | authenticate, checkCourseActive | `examScoreController.updateExamSetting` |
| DELETE | `/api/courses/:id` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `courseController.deleteCourse` |
| GET | `/api/courses/:id` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `courseController.getCourseById` |
| PUT | `/api/courses/:id` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `courseController.updateCourse` |
| POST | `/api/courses/:id/instructors` | required | admin, instructor | authenticate, authorize('admin', 'instructor'), checkCourseActive | `courseController.addInstructor` |
| POST | `/api/courses/:id/instructors/bulk` | required | admin, instructor | authenticate, authorize('admin', 'instructor'), checkCourseActive | `courseController.bulkAddInstructors` |
| DELETE | `/api/courses/:id/instructors/:userId` | required | admin, instructor | authenticate, authorize('admin', 'instructor'), checkCourseActive | `courseController.removeInstructor` |
| GET | `/api/courses/:id/overview` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `courseController.getCourseOverview` |
| POST | `/api/courses/:id/sections` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `courseController.addSection` |
| DELETE | `/api/courses/:id/sections/:sectionId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `courseController.removeSection` |
| PUT | `/api/courses/:id/sections/:sectionId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `courseController.updateSection` |
| GET | `/api/courses/:id/sections/:sectionId/students` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `courseController.getSectionStudents` |
| POST | `/api/courses/:id/sections/:sectionId/students` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `courseController.addStudentToSection` |
| POST | `/api/courses/:id/sections/:sectionId/students/bulk` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `courseController.bulkAddStudentsToSection` |
| DELETE | `/api/courses/:id/sections/:sectionId/students/:studentId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `courseController.removeStudentFromSection` |
| POST | `/api/courses/:id/tas` | required | admin, instructor | authenticate, authorize('admin', 'instructor'), checkCourseActive | `courseController.addTA` |
| POST | `/api/courses/:id/tas/bulk` | required | admin, instructor | authenticate, authorize('admin', 'instructor'), checkCourseActive | `courseController.bulkAddTAs` |
| DELETE | `/api/courses/:id/tas/:userId` | required | admin, instructor | authenticate, authorize('admin', 'instructor'), checkCourseActive | `courseController.removeTA` |
| PATCH | `/api/courses/:id/toggle-status` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `courseController.toggleCourseStatus` |
| GET | `/api/courses/instructors` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `courseController.getInstructors` |
| GET | `/api/courses/my-courses` | required | instructor, ta | authenticate, authorize('instructor', 'ta') | `courseController.getMyCourses` |
| GET | `/api/courses/my-courses/stats` | required | instructor, ta | authenticate, authorize('instructor', 'ta') | `courseController.getMyCoursesStats` |
| GET | `/api/courses/stats` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `courseController.getCourseStats` |
| GET | `/api/courses/tas-list` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `courseController.getTAsList` |

### /courses/:courseId/activity-logs
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/courses/:courseId/activity-logs` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `ctrl.getActivityLogs` |
| GET | `/api/courses/:courseId/activity-logs/filters` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `ctrl.getActivityFilters` |
| GET | `/api/courses/:courseId/activity-logs/stats` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `ctrl.getActivityStats` |
| GET | `/api/courses/:courseId/activity-logs/ta-stats` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `ctrl.getTAStats` |
| GET | `/api/courses/:courseId/activity-logs/ta-stats/:userId` | required | admin, instructor | authenticate, authorize('admin', 'instructor') | `ctrl.getTADetail` |

### /courses/:courseId/queue
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| POST | `/api/courses/:courseId/queue/bookings` | public | - | checkCourseActive | `queueController.createBooking` |
| POST | `/api/courses/:courseId/queue/bookings/:bookingId/cancel` | public | - | checkCourseActive | `queueController.cancelBooking` |
| GET | `/api/courses/:courseId/queue/bookings/:bookingId/status` | public | - | - | `queueController.getBookingStatus` |
| GET | `/api/courses/:courseId/queue/sessions` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `queueController.getQueueSessions` |
| POST | `/api/courses/:courseId/queue/sessions` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.createQueueSession` |
| DELETE | `/api/courses/:courseId/queue/sessions/:sessionId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.deleteQueueSession` |
| GET | `/api/courses/:courseId/queue/sessions/:sessionId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `queueController.getQueueSession` |
| PUT | `/api/courses/:courseId/queue/sessions/:sessionId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.updateQueueSession` |
| GET | `/api/courses/:courseId/queue/sessions/:sessionId/bookings` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `queueController.getSessionBookings` |
| POST | `/api/courses/:courseId/queue/sessions/:sessionId/bookings/:bookingId/complete` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.completeBooking` |
| POST | `/api/courses/:courseId/queue/sessions/:sessionId/bookings/:bookingId/skip` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.skipBooking` |
| GET | `/api/courses/:courseId/queue/sessions/:sessionId/desk-statuses` | public | - | - | `queueController.getDeskStatuses` |
| POST | `/api/courses/:courseId/queue/sessions/:sessionId/regenerate-pin` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.regeneratePIN` |
| POST | `/api/courses/:courseId/queue/sessions/:sessionId/status` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.updateQueueSessionStatus` |
| GET | `/api/courses/:courseId/queue/sessions/:sessionId/workers` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `queueController.getWorkers` |
| GET | `/api/courses/:courseId/queue/sessions/:sessionId/workers/current-booking` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `queueController.getWorkerCurrentBooking` |
| POST | `/api/courses/:courseId/queue/sessions/:sessionId/workers/join` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.joinAsWorker` |
| POST | `/api/courses/:courseId/queue/sessions/:sessionId/workers/leave` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `queueController.leaveAsWorker` |
| POST | `/api/courses/:courseId/queue/verify-pin` | public | - | checkCourseActive | `queueController.verifyPIN` |

### /courses/:id/teams
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/courses/:id/teams` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta') | `teamController.getTeams` |
| POST | `/api/courses/:id/teams` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.createTeam` |
| POST | `/api/courses/:id/teams/bulk` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.bulkCreateTeams` |
| POST | `/api/courses/:id/teams/bulk-delete` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.bulkDeleteTeams` |
| DELETE | `/api/courses/:id/teams/:teamId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.deleteTeam` |
| PUT | `/api/courses/:id/teams/:teamId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.updateTeam` |
| POST | `/api/courses/:id/teams/:teamId/members` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.addMemberToTeam` |
| DELETE | `/api/courses/:id/teams/:teamId/members/:studentId` | required | admin, instructor, ta | authenticate, authorize('admin', 'instructor', 'ta'), checkCourseActive | `teamController.removeMemberFromTeam` |

### /feedback
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/feedback` | required | - | authenticate, isAdmin, validate(feedbackValidation.getFeedbacks) | `feedbackController.getFeedbacks` |
| POST | `/api/feedback` | required | - | authenticate, // Optional auth - will get user if logged in validate(feedbackValidation.createFeedback) | `feedbackController.createFeedback` |
| DELETE | `/api/feedback/:id` | required | - | authenticate, isAdmin | `feedbackController.deleteFeedback` |
| GET | `/api/feedback/:id` | required | - | authenticate, isAdmin | `feedbackController.getFeedbackById` |
| PUT | `/api/feedback/:id` | required | - | authenticate, isAdmin, validate(feedbackValidation.updateFeedback) | `feedbackController.updateFeedback` |
| GET | `/api/feedback/my` | required | - | authenticate | `feedbackController.getMyFeedbacks` |
| GET | `/api/feedback/stats` | required | - | authenticate, isAdmin | `feedbackController.getFeedbackStats` |

### /logs
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/logs` | required | admin | authenticate, authorize('admin') | `systemLogController.getLogs` |
| POST | `/api/logs/cleanup` | required | admin | authenticate, authorize('admin') | `systemLogController.cleanupLogs` |
| GET | `/api/logs/errors/recent` | required | admin | authenticate, authorize('admin') | `systemLogController.getRecentErrors` |
| GET | `/api/logs/export` | required | admin | authenticate, authorize('admin') | `systemLogController.exportLogs` |
| GET | `/api/logs/filters` | required | admin | authenticate, authorize('admin') | `systemLogController.getFilterOptions` |
| GET | `/api/logs/:id` | required | admin | authenticate, authorize('admin') | `systemLogController.getLogById` |
| GET | `/api/logs/security/recent` | required | admin | authenticate, authorize('admin') | `systemLogController.getRecentSecurityEvents` |
| GET | `/api/logs/stats` | required | admin | authenticate, authorize('admin') | `systemLogController.getLogStats` |
| GET | `/api/logs/timeline` | required | admin | authenticate, authorize('admin') | `systemLogController.getLogsTimeline` |

### /metrics
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/metrics/containers` | required | admin | authenticate, authorize('admin') | `async (req, res) => { try { // Get list of all containers (running + stopped) const containerList = await dockerApiGe...` |
| GET | `/api/metrics/prometheus` | public | - | - | `async (req, res) => { try { res.set('Content-Type', register.contentType); res.end(await register.metrics()); } catch...` |
| GET | `/api/metrics/system` | required | admin | authenticate, authorize('admin') | `async (req, res) => { try { // Fire all queries in parallel for speed const [ cpuResult, memResult, memTotalResult, m...` |
| POST | `/api/metrics/webhook` | public | - | - | `inline-middleware` |
| GET | `/api/metrics/website` | required | admin | authenticate, authorize('admin') | `async (req, res) => { try { const [ uptimeResult, p50Result, p95Result, p99Result, requestRateResult, errorRateResult...` |

### /monitoring
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/monitoring/containers` | required | admin | authenticate, authorize('admin') | `async (req, res) => { try { // Get list of all containers (running + stopped) const containerList = await dockerApiGe...` |
| GET | `/api/monitoring/prometheus` | public | - | - | `async (req, res) => { try { res.set('Content-Type', register.contentType); res.end(await register.metrics()); } catch...` |
| GET | `/api/monitoring/system` | required | admin | authenticate, authorize('admin') | `async (req, res) => { try { // Fire all queries in parallel for speed const [ cpuResult, memResult, memTotalResult, m...` |
| POST | `/api/monitoring/webhook` | public | - | - | `inline-middleware` |
| GET | `/api/monitoring/website` | required | admin | authenticate, authorize('admin') | `async (req, res) => { try { const [ uptimeResult, p50Result, p95Result, p99Result, requestRateResult, errorRateResult...` |

### /notifications
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/notifications/logs` | required | - | authenticate | `notificationController.getNotificationLogs` |
| POST | `/api/notifications/register` | optional | - | optionalAuth | `notificationController.registerToken` |
| GET | `/api/notifications/tokens` | required | - | authenticate | `notificationController.getUserTokens` |
| POST | `/api/notifications/unregister` | optional | - | optionalAuth | `notificationController.unregisterToken` |
| POST | `/api/notifications/update-booking` | public | - | - | `notificationController.updateBookingForToken` |

### /oauth
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/oauth/admin/user/:userId` | required | admin | authenticate, authorize('admin') | `oauthController.getAccountsForUser` |
| DELETE | `/api/oauth/admin/user/:userId/:provider` | required | admin | authenticate, authorize('admin') | `oauthController.adminUnlinkAccount` |
| POST | `/api/oauth/link` | required | - | authenticate | `oauthController.linkAccount` |
| GET | `/api/oauth/linked` | required | - | authenticate | `oauthController.getLinkedAccounts` |
| DELETE | `/api/oauth/unlink/:provider` | required | - | authenticate | `oauthController.unlinkAccount` |

### /queue
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| POST | `/api/queue/bookings` | public | - | - | `queueController.createBooking` |
| POST | `/api/queue/bookings/:bookingId/cancel` | public | - | - | `queueController.cancelBooking` |
| GET | `/api/queue/bookings/:bookingId/status` | public | - | - | `queueController.getBookingStatus` |
| POST | `/api/queue/check-existing` | public | - | - | `queueController.checkExistingBooking` |
| GET | `/api/queue/sessions/:sessionId/desk-statuses` | public | - | - | `queueController.getDeskStatuses` |
| POST | `/api/queue/sessions/:sessionId/status` | public | - | - | `queueController.updateQueueSessionStatusPublic` |
| POST | `/api/queue/validate` | public | - | - | `queueController.validateBookingInfo` |
| POST | `/api/queue/verify-pin` | public | - | - | `queueController.verifyPIN` |

### /score-edit-requests
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/score-edit-requests` | required | - | authenticate | `scoreEditRequestController.getEditRequests` |
| POST | `/api/score-edit-requests` | required | - | authenticate, handleScoreEditImageUpload, checkCourseActive | `scoreEditRequestController.createEditRequest` |
| POST | `/api/score-edit-requests/batch` | required | - | authenticate, handleScoreEditImageUpload, checkCourseActive | `scoreEditRequestController.createBatchEditRequest` |
| POST | `/api/score-edit-requests/batch-approve` | required | - | authenticate, checkCourseActive | `scoreEditRequestController.batchApproveEditRequests` |
| POST | `/api/score-edit-requests/batch-reject` | required | - | authenticate, checkCourseActive | `scoreEditRequestController.batchRejectEditRequests` |
| POST | `/api/score-edit-requests/:id/approve` | required | - | authenticate, checkCourseActive | `scoreEditRequestController.approveEditRequest` |
| DELETE | `/api/score-edit-requests/:id/cancel` | required | - | authenticate | `scoreEditRequestController.cancelEditRequest` |
| POST | `/api/score-edit-requests/:id/reject` | required | - | authenticate, checkCourseActive | `scoreEditRequestController.rejectEditRequest` |
| GET | `/api/score-edit-requests/pending-count` | required | - | authenticate | `scoreEditRequestController.getPendingCount` |

### /scores
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/scores` | required | - | authenticate | `scoreController.getScores` |
| POST | `/api/scores` | required | - | authenticate, checkCourseActive | `scoreController.submitScore` |
| POST | `/api/scores/bulk` | required | - | authenticate, checkCourseActive | `scoreController.submitBulkScores` |
| POST | `/api/scores/edit-request` | required | - | authenticate, checkCourseActive | `scoreController.requestScoreEdit` |
| GET | `/api/scores/edit-requests` | required | - | authenticate | `scoreController.getPendingEditRequests` |
| PUT | `/api/scores/edit-requests/:id` | required | - | authenticate | `scoreController.reviewEditRequest` |
| POST | `/api/scores/group` | required | - | authenticate, checkCourseActive | `scoreController.submitGroupScore` |
| GET | `/api/scores/groups` | required | - | authenticate | `scoreController.getGroupsForAssignment` |
| GET | `/api/scores/matrix` | required | - | authenticate | `scoreController.getScoreSummaryMatrix` |
| GET | `/api/scores/students/search` | required | - | authenticate | `scoreController.searchStudents` |
| GET | `/api/scores/summary` | required | - | authenticate | `scoreController.getStudentScoresSummary` |
| GET | `/api/scores/ungraded-summary` | required | - | authenticate | `scoreController.getUngradedSummary` |

### /students
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/students` | required | - | authenticate | `studentController.getStudents` |
| POST | `/api/students` | required | admin | authenticate, authorize('admin') | `studentController.createStudent` |
| DELETE | `/api/students/:id` | required | admin | authenticate, authorize('admin') | `studentController.deleteStudent` |
| GET | `/api/students/:id` | required | - | authenticate | `studentController.getStudentById` |
| PUT | `/api/students/:id` | required | admin | authenticate, authorize('admin') | `studentController.updateStudent` |
| PATCH | `/api/students/:id/status` | required | admin | authenticate, authorize('admin') | `studentController.toggleStudentStatus` |
| POST | `/api/students/import` | required | admin | authenticate, authorize('admin') | `studentController.importStudents` |
| GET | `/api/students/lookup/:student_id` | public | - | - | `studentController.lookupStudentScores` |
| POST | `/api/students/search-by-ids` | required | - | authenticate | `studentController.searchStudentsByIds` |
| GET | `/api/students/stats` | required | - | authenticate | `studentController.getStudentStats` |

### /system
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/system/cpu` | required | admin | authenticate, authorize('admin') | `systemController.getCpuUsage` |
| GET | `/api/system/info` | required | admin | authenticate, authorize('admin') | `systemController.getServerInfo` |
| GET | `/api/system/memory` | required | admin | authenticate, authorize('admin') | `systemController.getMemoryUsage` |
| GET | `/api/system/metrics` | required | admin | authenticate, authorize('admin') | `systemController.getSystemMetrics` |

### /users
| Method | Endpoint | Auth | Roles | Middleware | Handler |
|---|---|---|---|---|---|
| GET | `/api/users` | required | admin | authenticate, authorize('admin') | `userController.getUsers` |
| POST | `/api/users` | required | admin | authenticate, authorize('admin') | `userController.createUser` |
| DELETE | `/api/users/:id` | required | admin | authenticate, authorize('admin') | `userController.deleteUser` |
| GET | `/api/users/:id` | required | admin | authenticate, authorize('admin') | `userController.getUserById` |
| PUT | `/api/users/:id` | required | admin | authenticate, authorize('admin') | `userController.updateUser` |
| PATCH | `/api/users/:id/status` | required | admin | authenticate, authorize('admin') | `userController.toggleUserStatus` |
| GET | `/api/users/stats` | required | admin | authenticate, authorize('admin') | `userController.getUserStats` |

## Coverage Notes
- `Implemented`: this catalog includes 217 mounted endpoints (`/api/metrics` and `/api/monitoring` intentionally expose the same monitoring handlers).
- `Needs verification`: route-level payload contracts for many modules rely on controller logic rather than Joi schemas.

## Key Public Endpoints
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/validate-reset-token`
- `GET /api/attendance/check-in/:sessionId/info`
- `POST /api/attendance/check-in/:sessionId`
- `POST /api/attendance/verify-student`
- Queue public flow under `/api/queue/*` (verify pin, booking creation/status, desk statuses)

## Recommended Future Behavior (V2)
`Recommended`:
- Publish and version an OpenAPI specification generated from code or validated against route tests.
- Normalize authorization annotations per endpoint (required role, optional auth, and policy intent) to remove ambiguity from inline comments.
- Define stable error codes for business-rule failures (`course_inactive`, `invalid_state_transition`, `duplicate_pending_request`) and keep them backward compatible.
- Add contract tests from `front-end/services/*.service.ts` to detect breaking API changes before deployment.

## V2 Migration Notes

### What must be preserved
- Path contracts and HTTP methods for existing frontend integrations in `front-end/services/*.service.ts`.
- Auth/session/2FA endpoint behavior (`/auth`, `/auth/2fa`, `/oauth`).
- Queue and attendance public/staff endpoint separation.

### What can be redesigned
- Internal controller/service/repository organization and implementation details.
- Response enrichment details, as long as required frontend fields remain compatible.

### What is risky to rewrite
- Auth refresh + session revocation flow.
- Queue endpoint behavior coupled with Redis/socket worker internals.
- Attendance and scoring endpoints with implicit policy checks.

### What business logic is critical
- Role/authorization middleware intent per endpoint.
- Course-active write protections (`checkCourseActive`).
- Score edit approval pipeline and queue lifecycle transitions.

## Needs Verification
- Exact request body schemas for modules without Joi validation files.
- Any undocumented legacy consumers (external clients, scripts, integrations) beyond current frontend services.
