# 10 - Realtime Events

## Scope
`Implemented`: derived from socket/push code paths:
- `back-end/src/config/socket.js`
- `back-end/src/controllers/queue.controller.js`
- `back-end/src/controllers/attendance.controller.js`
- `back-end/src/utils/queueAssignmentWorker.js`
- `back-end/src/utils/redisQueueService.js`
- `front-end/contexts/SocketContext.tsx`
- `front-end/app/attendance/[id]/session/[sessionId]/live/page.tsx`
- `front-end/app/check-in/[sessionId]/page.tsx`
- `front-end/app/queue/book/page.tsx`
- `front-end/app/queue/projector/[sessionId]/page.tsx`
- `front-end/app/(instructor)/classroom/[id]/queue/[sessionId]/worker/page.tsx`
- `front-end/contexts/NotificationContext.tsx`
- `front-end/public/firebase-messaging-sw.js`
- `back-end/src/utils/fcmService.js`

`Inferred`: event contract intent and channel ownership.

`Needs verification`: legacy listeners/events that appear partially unused or mismatched.

## Realtime Channels
`Implemented` channels in the legacy system:
- Socket.IO channel (`/socket.io`) for bidirectional realtime updates
- Firebase Cloud Messaging (FCM) for browser push notifications
- Polling fallback in some queue pages (`queue/book`, worker page) when socket updates are delayed

## Socket Room Naming Conventions
`Implemented` in `back-end/src/config/socket.js`:
- `attendance-{sessionId}`
- `instructor-{sessionId}`
- `user-courses-{userId}`
- `global-courses`
- `classroom-{classroomId}`
- `global-updates`
- `queue-{sessionId}`
- `worker-{userId}`
- `booking-{bookingId}`

## Client -> Server Socket Events (Ingress)
`Implemented` handlers in `socket.js`:
- room membership: `join-*` / `leave-*` for attendance, instructor, classroom, global updates, queue, worker, booking, user-courses
- change broadcasts:
  - `course-change` (rebroadcast as `course-updated`)
  - `classroom-change` (rebroadcast as `classroom-updated`)
  - `data-change` (rebroadcast as `data-updated`)

## Server -> Client Socket Events (Egress)
### Generic sync events
| Event | Producer | Room/Target | Typical Consumer |
|---|---|---|---|
| `data-updated` | `socket.js` (`data-change` flow + helpers) | `global-updates` | `front-end/contexts/SocketContext.tsx` subscribers |
| `course-updated` | `socket.js` | `global-courses` | legacy course sync listeners |
| `classroom-updated` | `socket.js` | `classroom-{id}` | classroom editor/observer pages |

### Attendance events
| Event | Producer | Room/Target | Evidence |
|---|---|---|---|
| `session-updated` | `attendance.controller` via `emitToAttendance` | `attendance-{id}` and `instructor-{id}` | `back-end/src/controllers/attendance.controller.js` |
| `session-activated` | `attendance.controller` via `emitToAttendance` | `attendance-{id}` and `instructor-{id}` | same |
| `session-closed` | `attendance.controller` via `emitToAttendance` | `attendance-{id}` and `instructor-{id}` | same |
| `record-updated` | `attendance.controller` via `emitToAttendance` | `attendance-{id}` and `instructor-{id}` | same |
| `student-checked-in` | `attendance.controller` via `emitToInstructor` | `instructor-{id}` | same |

### Queue events
| Event | Producer | Room/Target | Evidence |
|---|---|---|---|
| `session-status-changed` | `queue.controller` | `queue-{sessionId}` | `back-end/src/controllers/queue.controller.js` |
| `pin-changed` | `queue.controller` | `queue-{sessionId}` | same |
| `worker-joined` | `queue.controller` | `queue-{sessionId}` | same |
| `worker-paused` | `queue.controller` | `queue-{sessionId}` | same |
| `worker-left` | `queue.controller` | `queue-{sessionId}` | same |
| `new-booking` | `queue.controller` | `queue-{sessionId}` | same |
| `booking-assigned` | `queue.controller` / `queueAssignmentWorker` | `queue-{sessionId}`, `booking-{bookingId}` | controller + worker files |
| `new-task` | `queue.controller` / `queueAssignmentWorker` | `worker-{userId}` | controller + worker files |
| `booking-cancelled` | `queue.controller` | `queue-{sessionId}`, `booking-{bookingId}`, optional `worker-{userId}` | controller |
| `booking-completed` | `queue.controller` | `queue-{sessionId}` | controller |
| `your-booking-completed` | `queue.controller` | `booking-{bookingId}` | controller |
| `queue-position-updated` | `queue.controller` | `queue-{sessionId}` | controller |
| `booking-skipped` | `queue.controller` | `queue-{sessionId}` | controller |

## Frontend Socket Consumers
### Generic provider
`Implemented` in `front-end/contexts/SocketContext.tsx`:
- auto joins `global-updates` on connect
- listens to `data-updated`, `course-updated`
- emits `data-change` for cross-page sync

### Attendance pages
`Implemented`:
- instructor live page joins `instructor-{sessionId}` and listens to:
  - `student-checked-in`
  - `session-closed`
  - `attendance-updated` (see verification note)
- student check-in page joins `attendance-{sessionId}` and listens to `session-closed`

### Queue pages
`Implemented`:
- booking page joins `booking-{bookingId}` and `queue-{sessionId}`; listens to `booking-assigned`, `your-booking-completed`, `queue-position-updated`
- projector page joins `queue-{sessionId}`; listens to `new-booking`, `booking-assigned`, `booking-completed`, `booking-skipped`, `booking-cancelled`, `session-status-changed`, `pin-changed`
- worker page joins `queue-{sessionId}` and `worker-{userId}`; listens to `new-task`, `session-status-changed`, `booking-completed`

## Push Notification Event Types (FCM)
`Implemented` send types in `back-end/src/utils/fcmService.js`:
- `new-task`
- `queue-ready`
- `booking-completed`
- `session-closed`

`Implemented` click routing in service worker (`front-end/public/firebase-messaging-sw.js`):
- `new-task` -> worker URL
- `queue-ready` -> booking URL
- fallback -> payload URL or `/`

## Delivery Characteristics
`Implemented`:
- socket events are best-effort, room-scoped broadcasts
- queue logic uses Redis + background worker for assignment and then emits socket updates
- frontend queue pages include periodic polling as fallback in addition to socket listeners

`Inferred`:
- polling fallback mitigates missed socket events or temporary disconnects.

## Known Contract Gaps
### Needs verification
- `front-end/app/attendance/[id]/session/[sessionId]/live/page.tsx` listens for `attendance-updated`, while backend attendance emits `record-updated`/`session-updated`/`student-checked-in`.
- `front-end/app/check-in/[sessionId]/page.tsx` emits `student-check-in` socket event, but `back-end/src/config/socket.js` has no explicit `student-check-in` listener.
- coexistence of legacy `tryAssignBooking` logic and Redis-worker path in `queue.controller.js` suggests partial transition; active path priority should be confirmed.

## Recommended Future Behavior (V2)
`Recommended`:
- define a versioned realtime event schema registry (event name, payload shape, producer, consumer).
- enforce event typing/tests in both frontend and backend to catch mismatched names.
- consolidate queue assignment emits to one authoritative producer path.
- add event delivery telemetry (sent/received counters, dropped/reconnect metrics).

## V2 Migration Notes
### What must be preserved
- room naming contracts used by deployed frontend pages (`queue-*`, `worker-*`, `booking-*`, `attendance-*`, `instructor-*`).
- queue critical event sequence (`new-booking` -> `booking-assigned` -> completion/cancel updates).
- attendance instructor visibility (`student-checked-in`, session close/update notifications).

### What can be redesigned
- transport internals (Socket.IO adapter/scaling approach), as long as event semantics remain compatible.
- push provider abstraction (FCM wrapper/service boundaries).
- generic sync channel strategy (`data-updated`/`course-updated`) if consumers are migrated safely.

### What is risky to rewrite
- queue realtime flow coupled to Redis assignment and booking lifecycle updates.
- mixed socket+polling behavior in student/worker queue pages.
- push token lifecycle and target binding (`session_id`/`booking_id`) in notification registration.

### What business logic is critical
- session-state-driven broadcast behavior (active/paused/closed transitions).
- worker assignment notifications and booking ownership updates.
- student-facing completion/cancellation notifications that affect classroom operations.

## Needs Verification
- full compatibility matrix of all consumers for each event name (including historical clients).
- cross-instance/socket scaling behavior (no Redis Socket.IO adapter configuration observed in current code).