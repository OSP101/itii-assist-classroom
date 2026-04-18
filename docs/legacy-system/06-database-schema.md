# 06 - Database Schema

## Scope
`Implemented`: extracted from:
- `back-end/migrations/project_ta_structure.sql`
- Sequelize model metadata from `back-end/src/models/*.js`
- associations in `back-end/src/models/index.js`

`Inferred`: domain grouping and migration recommendations.

`Needs verification`: environment-specific schema drift not represented in repository.

## Database Technology
- Engine: MySQL 8 (`docker-compose.db.yml` uses `mysql:8.0`)
- ORM: Sequelize (`back-end/src/config/database.js`)
- Naming style: snake_case columns, timestamp columns (`created_at`, `updated_at`) across most tables.

## Schema Inventory
- Total Sequelize-backed domain tables detected: `36`
- Table metadata matrix:
| Table | Model | Cols | PK | Key Columns | Enum Fields | FK References |
|---|---:|---:|---|---|---|---|
| assignment_attendance_links | AssignmentAttendanceLink | 4 | id | id, assignment_id, attendance_session_id, created_at | - | assignment_id->assignments.id; attendance_session_id->attendance_sessions.id |
| assignments | Assignment | 16 | id | id, course_id, assignment_type, linked_attendance_session_id, is_active, created_by, created_at, updated_at | assignment_type(individual/permanent_group/weekly_group/assignment); attendance_condition(and/or) | course_id->courses.id; linked_attendance_session_id->attendance_sessions.id; created_by->users.id |
| assignment_sub_items | AssignmentSubItem | 7 | id | id, assignment_id, created_at, updated_at | - | assignment_id->assignments.id |
| attendance_records | AttendanceRecord | 16 | id | id, attendance_session_id, student_id, status, updated_by, created_at, updated_at | status(present/late/leave/absent) | attendance_session_id->attendance_sessions.id; student_id->students.id; updated_by->users.id |
| attendance_sessions | AttendanceSession | 17 | id | id, course_id, course_section_id, session_type, status, created_by, created_at, updated_at | session_type(lecture/lab/online); status(draft/active/closed) | course_id->courses.id; course_section_id->course_sections.id; created_by->users.id |
| attendance_session_sections | AttendanceSessionSection | 4 | id | id, attendance_session_id, course_section_id, created_at | - | attendance_session_id->attendance_sessions.id; course_section_id->course_sections.id |
| bonus_scores | BonusScore | 9 | id | id, course_id, student_id, given_by, created_at, updated_at | - | course_id->courses.id; student_id->students.id; given_by->users.id |
| classrooms | Classroom | 10 | id | id, is_active, created_by, created_at, updated_at | - | created_by->users.id |
| course_activity_logs | CourseActivityLog | 10 | id | id, course_id, actor_user_id, created_at | - | course_id->courses.id; actor_user_id->users.id |
| course_instructors | CourseInstructor | 5 | id | id, course_id, user_id | - | course_id->courses.id; user_id->users.id |
| courses | Course | 12 | id | id, instructor_id, is_active, created_at, updated_at | - | instructor_id->users.id |
| course_sections | CourseSection | 5 | id | id, course_id, created_at | - | course_id->courses.id |
| course_section_students | CourseSectionStudent | 4 | id | id, course_section_id, student_id | - | course_section_id->course_sections.id; student_id->students.id |
| course_tas | CourseTA | 4 | id | id, course_id, user_id | - | course_id->courses.id; user_id->users.id |
| desks | Desk | 9 | id | id, classroom_id, created_at, updated_at | type(computer/normal/teacher) | classroom_id->classrooms.id |
| exam_scores | ExamScore | 9 | id | id, exam_setting_id, student_id, graded_by, created_at, updated_at | - | exam_setting_id->exam_settings.id; student_id->students.id; graded_by->users.id |
| exam_settings | ExamSetting | 9 | id | id, course_id, exam_type, component, is_active, created_at, updated_at | exam_type(midterm/final); component(lab/lecture) | course_id->courses.id |
| fcm_tokens | FcmToken | 12 | id | id, user_type, user_id, booking_id, session_id, is_active, created_at, updated_at | user_type(worker/student) | user_id->users.id; booking_id->queue_bookings.id; session_id->queue_sessions.id |
| feedbacks | Feedback | 14 | id | id, user_id, status, resolved_by, created_at, updated_at | type(bug/feature/improvement/other); status(pending/reviewing/resolved/rejected); priority(low/medium/high/critical) | user_id->users.id; resolved_by->users.id |
| notification_logs | NotificationLog | 11 | id | id, fcm_token_id, notification_type, status, created_at | notification_type(new-task/queue-ready/booking-completed/session-closed/other); status(pending/sent/failed/delivered) | fcm_token_id->fcm_tokens.id |
| password_reset_tokens | PasswordResetToken | 6 | id | id, user_id, created_at | - | user_id->users.id |
| queue_bookings | QueueBooking | 18 | id | id, queue_session_id, student_id, desk_id, booking_type, status, assigned_worker_id, created_at, updated_at | booking_type(grading/help); status(waiting/in_progress/completed/cancelled/no_show) | queue_session_id->queue_sessions.id; student_id->students.id; desk_id->desks.id; assigned_worker_id->users.id |
| queue_desk_status | QueueDeskStatus | 8 | id | id, queue_session_id, desk_id, updated_at | grading_status(not_started/waiting/in_progress/completed); help_status(none/waiting/in_progress) | queue_session_id->queue_sessions.id; desk_id->desks.id |
| queue_sessions | QueueSession | 15 | id | id, course_id, classroom_id, linked_assignment_id, linked_attendance_session_id, status, created_by, created_at, updated_at | status(draft/active/paused/closed) | course_id->courses.id; classroom_id->classrooms.id; linked_assignment_id->assignments.id; linked_attendance_session_id->attendance_sessions.id; created_by->users.id |
| queue_workers | QueueWorker | 12 | id | id, queue_session_id, user_id, status, created_at, updated_at | status(online/busy/offline) | queue_session_id->queue_sessions.id; user_id->users.id |
| refresh_tokens | RefreshToken | 7 | id | id, user_id, created_at | - | user_id->users.id |
| score_edit_requests | ScoreEditRequest | 13 | id | id, score_id, status, requested_by, reviewed_by, created_at, updated_at | status(pending/approved/rejected) | score_id->scores.id; requested_by->users.id; reviewed_by->users.id |
| scores | Score | 12 | id | id, assignment_id, student_id, group_id, sub_item_id, graded_by, status, created_at, updated_at | status(pending/graded) | assignment_id->assignments.id; student_id->students.id; group_id->student_groups.id; sub_item_id->assignment_sub_items.id; graded_by->users.id |
| student_group_members | StudentGroupMember | 4 | id | id, group_id, student_id | - | group_id->student_groups.id; student_id->students.id |
| student_groups | StudentGroup | 6 | id | id, course_id, group_type, created_at | group_type(permanent/temporary) | course_id->courses.id |
| students | Student | 8 | id | id, is_active, created_at, updated_at | - | - |
| system_logs | SystemLog | 28 | id | id, actor_user_id, created_at | log_type(access/error/auth/security); severity(debug/info/warn/error/critical) | actor_user_id->users.id |
| two_factor_pending | TwoFactorPending | 8 | id | id, created_at | method(totp/email) | - |
| user_oauth_accounts | UserOAuthAccount | 13 | id | id, user_id, created_at, updated_at | provider(google/github/apple) | user_id->users.id |
| users | User | 18 | id | id, role, is_active, created_at, updated_at | role(admin/instructor/ta); provider(local/google/github); two_factor_method(totp/email) | - |
| zones | Zone | 10 | id | id, classroom_id, created_at, updated_at | - | classroom_id->classrooms.id |

## Relationship Highlights

### Academic core
- `courses` -> `course_sections` -> `course_section_students` -> `students`
- `courses` -> `course_instructors` / `course_tas` -> `users`

### Attendance and scoring
- `attendance_sessions` -> `attendance_records`
- `assignments` -> `assignment_sub_items`
- `scores` references `assignments`, `students`, optional `student_groups`, optional `assignment_sub_items`
- `score_edit_requests` references `scores` and reviewer/requester users

### Queue domain
- `queue_sessions` -> `queue_workers`, `queue_bookings`, `queue_desk_status`
- `queue_bookings` references `students`, `desks`, optional assigned worker (`users`)

### Identity and security
- `users` -> `refresh_tokens`, `password_reset_tokens`, `user_oauth_accounts`
- `users` -> `two_factor_pending` (via unique pending setup rows)

## Important Enumerations
`Implemented` from model definitions:
- `users.role`: `admin | instructor | ta`
- `attendance_sessions.status`: `draft | active | closed`
- `scores.status`: `pending | graded`
- `score_edit_requests.status`: `pending | approved | rejected`
- `queue_sessions.status`: `draft | active | paused | closed`
- `queue_bookings.status`: `waiting | in_progress | completed | cancelled | no_show`
- `feedbacks.status`: `pending | reviewing | resolved | rejected`
- `exam_settings.exam_type`: `midterm | final`
- `exam_settings.component`: `lab | lecture`

## Constraints And Keys (Selected)
`Implemented` examples:
- unique user identity keys: `users.username`, `students.student_id`
- token uniqueness: `refresh_tokens.jti`, `password_reset_tokens.token`
- queue uniqueness: `queue_workers(queue_session_id,user_id)`, `queue_desk_status(queue_session_id,desk_id)`
- attendance/assignment link uniqueness via bridge tables (`assignment_attendance_links`, `attendance_session_sections`)

## Source-Of-Truth Files
- DDL snapshot: `back-end/migrations/project_ta_structure.sql`
- Model definitions: `back-end/src/models/*.js`
- Association graph: `back-end/src/models/index.js`

## Recommended Future Behavior (V2)
`Recommended`:
- Keep schema-as-code in a single migration pipeline and avoid unmanaged production-only SQL drift.
- Preserve current enum/state semantics but externalize state transition rules in versioned docs and test fixtures.
- Add explicit unique and foreign-key constraint tests in CI to prevent accidental contract regression.
- Define retention and archival strategy for high-volume tables (`system_logs`, queue runtime history, notification logs).

## V2 Migration Notes

### What must be preserved
- Foreign-key intent between course, student, assignment, attendance, score, and queue tables.
- Status enums that drive business workflows and API behavior.
- Unique constraints preventing duplicate enrollments/links/worker rows.

### What can be redesigned
- Physical indexing strategy and partitioning.
- Naming conventions and normalization depth, as long as domain semantics and constraints are retained.
- Migration framework/tooling (Sequelize migrations vs alternative), if parity is maintained.

### What is risky to rewrite
- Queue tables (`queue_sessions`, `queue_workers`, `queue_bookings`, `queue_desk_status`) due realtime coupling.
- Score-edit and attendance-linked scoring tables due approval/compliance impact.
- Auth/session/token tables due security and session-revocation behavior.

### What business logic is critical
- Course activation, attendance eligibility, score edit approvals, queue assignment state machine.
- Role-separated ownership fields (`created_by`, `given_by`, `reviewed_by`, `assigned_worker_id`).

## Needs Verification
- Whether production schema has hotfix columns/indexes not committed to `project_ta_structure.sql`.
- Charset/collation consistency issues visible in historical dump comments.
- `docker-compose.db.yml` references root `project_ta_prod.sql`, while migration SQL currently resides under `back-end/migrations/`.
