# 15 - Glossary

## Scope
`Implemented`: glossary terms are mapped to names found in legacy code and documentation.

`Inferred`: explanatory wording for readability.

`Needs verification`: institution-specific meaning not explicitly encoded in source.

## Domain Terms
| Term | Definition | Evidence | Type |
|---|---|---|---|
| Admin | Staff role with highest platform-level privileges. | `back-end/src/models/User.js`, `back-end/src/routes/user.routes.js` | Implemented |
| Instructor | Staff role for teaching workflows (course, attendance, scoring, queue operations). | `back-end/src/models/User.js`, `back-end/src/routes/course.routes.js` | Implemented |
| TA | Staff role supporting course operations and queue/scoring workflows. | `back-end/src/models/User.js`, `back-end/src/routes/queue.routes.js` | Implemented |
| Student | Academic participant entity identified in `students` domain data. | `back-end/src/models/Student.js` | Implemented |
| Course | Main academic container for sections, assignments, attendance, and queue sessions. | `back-end/src/models/Course.js` | Implemented |
| Course Section | Subdivision of a course used for enrollment and attendance grouping. | `back-end/src/models/CourseSection.js` | Implemented |
| Classroom | Physical/virtual room entity containing desks and zones. | `back-end/src/models/Classroom.js`, `Desk.js`, `Zone.js` | Implemented |
| Assignment | Grading artifact with optional sub-items and attendance linkage. | `back-end/src/models/Assignment.js`, `AssignmentSubItem.js`, `AssignmentAttendanceLink.js` | Implemented |
| Score | Grade record for student/group and assignment/sub-item context. | `back-end/src/models/Score.js` | Implemented |
| Score Edit Request | Approval workflow record for modifying an existing score. | `back-end/src/models/ScoreEditRequest.js` | Implemented |
| Bonus Score | Additional score entry granted by staff for course context. | `back-end/src/models/BonusScore.js` | Implemented |
| Attendance Session | Session used for check-in and attendance record lifecycle. | `back-end/src/models/AttendanceSession.js` | Implemented |
| Attendance Record | Per-student attendance result inside an attendance session. | `back-end/src/models/AttendanceRecord.js` | Implemented |
| Queue Session | Time-bounded queue operation for help/grading in a course/classroom context. | `back-end/src/models/QueueSession.js` | Implemented |
| Queue Booking | Student queue request linked to queue session and desk/worker state. | `back-end/src/models/QueueBooking.js` | Implemented |
| Queue Worker | Instructor/TA queue participation and runtime availability state. | `back-end/src/models/QueueWorker.js` | Implemented |
| Desk Status | Queue-facing state per desk for grading/help progress. | `back-end/src/models/QueueDeskStatus.js` | Implemented |
| FCM Token | Push notification token mapped to worker/student context. | `back-end/src/models/FcmToken.js` | Implemented |
| Notification Log | Delivery record for push notifications. | `back-end/src/models/NotificationLog.js` | Implemented |
| System Log | Security/access/error operational log record. | `back-end/src/models/SystemLog.js` | Implemented |
| Course Activity Log | Course-specific actor/audit-like activity record. | `back-end/src/models/CourseActivityLog.js` | Implemented |

## Workflow State Terms
| Term | Meaning | Evidence | Type |
|---|---|---|---|
| `course.is_active` | Gate controlling whether many mutation endpoints are allowed. | `back-end/src/middlewares/auth.js` (`checkCourseActive`) | Implemented |
| Attendance `draft` | Session created but not yet active for live check-in. | `back-end/src/models/AttendanceSession.js` | Implemented |
| Attendance `active` | Session accepts check-ins and emits live updates. | `AttendanceSession.js`, `attendance.controller.js` | Implemented |
| Attendance `closed` | Session finalized; check-in should stop. | `AttendanceSession.js`, `attendance.controller.js` | Implemented |
| Attendance `present/late/leave/absent` | Final per-record attendance status values. | `back-end/src/models/AttendanceRecord.js` | Implemented |
| Queue session `draft/active/paused/closed` | Queue lifecycle states with transition rules enforced in controller. | `back-end/src/models/QueueSession.js`, `queue.controller.js` | Implemented |
| Queue booking `waiting/in_progress/completed/cancelled/no_show` | Queue booking lifecycle statuses. | `back-end/src/models/QueueBooking.js` | Implemented |
| Queue worker `online/busy/offline` | Persistent worker status model values. | `back-end/src/models/QueueWorker.js` | Implemented |
| Score edit `pending/approved/rejected` | Approval lifecycle for score change requests. | `back-end/src/models/ScoreEditRequest.js` | Implemented |

## Security And Identity Terms
| Term | Definition | Evidence | Type |
|---|---|---|---|
| Access token | Short-lived JWT used for protected API authorization. | `back-end/src/controllers/auth.controller.js` | Implemented |
| Refresh token | Longer-lived session token persisted and revocable. | `back-end/src/models/RefreshToken.js`, `auth.controller.js` | Implemented |
| Session revocation | Invalidation flow for one/all refresh sessions. | `auth.controller.js` (`revokeSession`, `revokeAllSessions`) | Implemented |
| 2FA | Second-factor flow using TOTP or email code with backup codes. | `twoFactor.controller.js`, `User.two_factor_method` | Implemented |
| OAuth account link | External provider account linked to platform user. | `back-end/src/models/UserOAuthAccount.js`, `oauth.controller.js` | Implemented |
| Optional auth | Middleware that enriches `req.user` when token exists without hard-failing otherwise. | `back-end/src/middlewares/auth.js` (`optionalAuth`) | Implemented |

## Realtime And Infra Terms
| Term | Definition | Evidence | Type |
|---|---|---|---|
| Socket room | Named channel for scoped realtime events. | `back-end/src/config/socket.js` | Implemented |
| `attendance-{sessionId}` room | Attendance participant room. | `socket.js` | Implemented |
| `instructor-{sessionId}` room | Instructor-specific attendance update room. | `socket.js` | Implemented |
| `queue-{sessionId}` room | Session-wide queue update room. | `socket.js` | Implemented |
| `worker-{userId}` room | Worker-specific task notification room. | `socket.js` | Implemented |
| `booking-{bookingId}` room | Student booking-specific notification room. | `socket.js` | Implemented |
| Assignment worker | Background process matching waiting bookings to available workers. | `back-end/src/utils/queueAssignmentWorker.js` | Implemented |
| Redis queue state | Redis keyspace used for fast queue runtime state and locking. | `back-end/src/utils/redisQueueService.js` | Implemented |
| FCM | Firebase Cloud Messaging transport for browser push notifications. | `back-end/src/utils/fcmService.js`, `front-end/public/firebase-messaging-sw.js` | Implemented |

## API And Layering Terms
| Term | Definition | Evidence | Type |
|---|---|---|---|
| Route module | Express endpoint grouping under `back-end/src/routes/*.routes.js`. | `back-end/src/routes/index.js` | Implemented |
| Controller | Request orchestration layer used by route handlers. | `back-end/src/controllers/*.controller.js` | Implemented |
| Service layer (backend) | Intended abstraction folder currently empty. | `back-end/src/services` | Implemented |
| Repository layer (backend) | Intended persistence abstraction folder currently empty. | `back-end/src/repositories` | Implemented |
| Frontend service | TypeScript API client wrappers per domain. | `front-end/services/*.service.ts` | Implemented |
| API base URL | Frontend base for backend API calls. | `front-end/config/api.ts` (`NEXT_PUBLIC_API_URL`) | Implemented |

## Ambiguous Terms (Needs Verification)
| Term | Why Verification Is Needed |
|---|---|
| "Anonymous feedback" | Feedback route comment suggests anonymous support but middleware currently requires authentication. |
| "Public student identity model" | Student check-in/public APIs coexist with staff-authenticated flows; student auth model is mixed by use case. |
| "Canonical queue public API" | Two overlapping public queue endpoint families exist. |
| "Canonical attendance realtime update event" | Frontend/backend event names are not fully aligned in all listeners/emitters. |

## Acronyms
| Acronym | Expansion |
|---|---|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| 2FA | Two-Factor Authentication |
| OAuth | Open Authorization |
| FCM | Firebase Cloud Messaging |
| ORM | Object-Relational Mapping |
| CI/CD | Continuous Integration / Continuous Deployment |
| SLA | Service Level Agreement |

## Recommended Future Behavior (V2)
`Recommended`:
- Maintain a controlled glossary in-repo and update it whenever model enums or API/event contracts change.
- Link glossary terms to machine-readable schema references (OpenAPI components, event schema IDs, DB migration IDs).
- Enforce consistent terminology in API responses, UI labels, and docs.

## V2 Migration Notes
### What must be preserved
- Core domain vocabulary that carries business meaning (`course`, `attendance session`, `queue booking`, `score edit request`).
- Status terms and transition semantics used by existing rules and clients.
- Role terminology (`admin`, `instructor`, `ta`) and authorization implications.

### What can be redesigned
- Internal naming conventions for code structure if external contracts and business semantics are preserved.
- Documentation format and glossary structure.
- Translation/localization presentation of user-facing terms.

### What is risky to rewrite
- Renaming status values or event/API identifiers without compatibility bridge.
- Changing role labels/meanings without coordinated policy and migration.
- Altering queue/attendance/scoring terminology that clients or reports rely on.

### What business logic is critical
- Correct interpretation of state/status terms in workflow transitions.
- Role semantics in authorization checks.
- Contract terms shared between frontend services and backend routes/events.
