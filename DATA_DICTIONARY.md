# ITII Assist Classroom — Data Dictionary

> เอกสารนี้อธิบายโครงสร้างฐานข้อมูลทั้งหมดของระบบ ITII Assist Classroom
> ใช้ MySQL เป็น Database และ Sequelize เป็น ORM

---

## สารบัญ

### กลุ่ม 1: ผู้ใช้งานและการยืนยันตัวตน
1. [users — ผู้ใช้งานระบบ](#1-users--ผู้ใช้งานระบบ)
2. [refresh_tokens — JWT Refresh Tokens](#2-refresh_tokens--jwt-refresh-tokens)
3. [password_reset_tokens — Token รีเซ็ตรหัสผ่าน](#3-password_reset_tokens--token-รีเซ็ตรหัสผ่าน)
4. [two_factor_pending — ข้อมูล 2FA ที่รอยืนยัน](#4-two_factor_pending--ข้อมูล-2fa-ที่รอยืนยัน)
5. [user_oauth_accounts — บัญชี OAuth ที่เชื่อม](#5-user_oauth_accounts--บัญชี-oauth-ที่เชื่อม)

### กลุ่ม 2: นักศึกษา
6. [students — นักศึกษา](#6-students--นักศึกษา)
7. [student_groups — กลุ่มนักศึกษา](#7-student_groups--กลุ่มนักศึกษา)
8. [student_group_members — สมาชิกกลุ่ม](#8-student_group_members--สมาชิกกลุ่ม)

### กลุ่ม 3: รายวิชาและการลงทะเบียน
9. [courses — รายวิชา](#9-courses--รายวิชา)
10. [course_sections — กลุ่มเรียน (Section)](#10-course_sections--กลุ่มเรียน-section)
11. [course_section_students — การลงทะเบียนนักศึกษา](#11-course_section_students--การลงทะเบียนนักศึกษา)
12. [course_tas — TA ประจำรายวิชา](#12-course_tas--ta-ประจำรายวิชา)
13. [course_instructors — อาจารย์ประจำรายวิชา](#13-course_instructors--อาจารย์ประจำรายวิชา)

### กลุ่ม 4: ห้องเรียน
14. [classrooms — ห้องเรียน](#14-classrooms--ห้องเรียน)
15. [desks — โต๊ะ](#15-desks--โต๊ะ)
16. [zones — โซน](#16-zones--โซน)

### กลุ่ม 5: งานมอบหมายและคะแนน
17. [assignments — งานมอบหมาย](#17-assignments--งานมอบหมาย)
18. [assignment_sub_items — ข้อย่อยของงาน](#18-assignment_sub_items--ข้อย่อยของงาน)
19. [assignment_attendance_links — เชื่อมงานกับเช็คชื่อ](#19-assignment_attendance_links--เชื่อมงานกับเช็คชื่อ)
20. [scores — คะแนน](#20-scores--คะแนน)
21. [score_edit_requests — คำขอแก้ไขคะแนน](#21-score_edit_requests--คำขอแก้ไขคะแนน)
22. [bonus_scores — คะแนนโบนัส](#22-bonus_scores--คะแนนโบนัส)
23. [exam_settings — ตั้งค่าการสอบ](#23-exam_settings--ตั้งค่าการสอบ)
24. [exam_scores — คะแนนสอบ](#24-exam_scores--คะแนนสอบ)

### กลุ่ม 6: ระบบเช็คชื่อ
25. [attendance_sessions — รอบเช็คชื่อ](#25-attendance_sessions--รอบเช็คชื่อ)
26. [attendance_session_sections — Section ที่เข้าร่วมเช็คชื่อ](#26-attendance_session_sections--section-ที่เข้าร่วมเช็คชื่อ)
27. [attendance_records — ผลเช็คชื่อ](#27-attendance_records--ผลเช็คชื่อ)

### กลุ่ม 7: ระบบจองคิว
28. [queue_sessions — รอบจองคิว](#28-queue_sessions--รอบจองคิว)
29. [queue_bookings — การจองคิว](#29-queue_bookings--การจองคิว)
30. [queue_desk_status — สถานะโต๊ะในคิว](#30-queue_desk_status--สถานะโต๊ะในคิว)
31. [queue_workers — ผู้ตรวจงาน](#31-queue_workers--ผู้ตรวจงาน)

### กลุ่ม 8: การแจ้งเตือน
32. [fcm_tokens — FCM Push Tokens](#32-fcm_tokens--fcm-push-tokens)
33. [notification_logs — บันทึกการแจ้งเตือน](#33-notification_logs--บันทึกการแจ้งเตือน)

### กลุ่ม 9: Feedback
34. [feedbacks — ข้อเสนอแนะ](#34-feedbacks--ข้อเสนอแนะ)

### กลุ่ม 10: บันทึก Log
35. [system_logs — บันทึกระบบ](#35-system_logs--บันทึกระบบ)
36. [course_activity_logs — บันทึกกิจกรรมรายวิชา](#36-course_activity_logs--บันทึกกิจกรรมรายวิชา)

---

## กลุ่ม 1: ผู้ใช้งานและการยืนยันตัวตน

### 1. `users` — ผู้ใช้งานระบบ

**คำอธิบาย:** เก็บข้อมูลผู้ใช้งานระบบทั้งหมด (Admin, อาจารย์, TA)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | รหัสผู้ใช้ |
| username | VARCHAR(100) | ❌ | — | UQ | ชื่อผู้ใช้สำหรับล็อกอิน |
| password_hash | VARCHAR(255) | ❌ | — | — | รหัสผ่านที่เข้ารหัส (bcrypt) |
| role | ENUM('admin','instructor','ta') | ❌ | — | — | บทบาท |
| full_name | VARCHAR(255) | ✅ | NULL | — | ชื่อ-นามสกุล |
| email | VARCHAR(255) | ✅ | NULL | — | อีเมล |
| google_id | VARCHAR(255) | ✅ | NULL | — | Google Account ID |
| provider | ENUM('local','google') | ❌ | 'local' | — | วิธีสร้างบัญชี |
| is_active | BOOLEAN | ❌ | true | — | สถานะเปิด/ปิดใช้งาน |
| must_change_password | BOOLEAN | ❌ | false | — | ต้องเปลี่ยนรหัสผ่านเมื่อล็อกอินครั้งแรก |
| avatar | LONGTEXT | ✅ | NULL | — | รูปโปรไฟล์ (base64 หรือ URL) |
| two_factor_enabled | BOOLEAN | ❌ | false | — | เปิดใช้ 2FA หรือไม่ |
| two_factor_method | ENUM('totp','email') | ✅ | NULL | — | วิธี 2FA ที่ใช้ |
| two_factor_secret | TEXT | ✅ | NULL | — | Secret key สำหรับ TOTP |
| two_factor_backup_codes | JSON | ✅ | NULL | — | Backup codes (JSON array) |
| two_factor_confirmed_at | DATETIME | ✅ | NULL | — | วันเวลาที่ยืนยัน 2FA |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Hooks:** beforeCreate/beforeUpdate จะ hash password อัตโนมัติ

**ความสัมพันธ์:**
- → `refresh_tokens` (1:N) — มี refresh token หลายตัว
- → `password_reset_tokens` (1:N) — มี token รีเซ็ตรหัสผ่านหลายตัว
- → `user_oauth_accounts` (1:N) — เชื่อม OAuth หลายบัญชี
- → `courses` (1:N via instructor_id) — เป็นเจ้าของรายวิชา
- → `courses` (M:N via course_instructors) — เป็นอาจารย์ประจำรายวิชา
- → `courses` (M:N via course_tas) — เป็น TA ประจำรายวิชา
- → `classrooms` (1:N via created_by) — สร้างห้องเรียน
- → `feedbacks` (1:N) — ส่ง feedback
- → `bonus_scores` (1:N via given_by) — ให้คะแนนโบนัส
- → `queue_sessions` (1:N via created_by) — สร้าง queue session
- → `queue_workers` (1:N) — เป็น worker ในคิว
- → `queue_bookings` (1:N via assigned_worker_id) — รับมอบหมายตรวจงาน
- → `fcm_tokens` (1:N) — ลงทะเบียน push token
- → `exam_scores` (1:N via graded_by) — ให้คะแนนสอบ
- → `system_logs` (1:N via actor_user_id) — สร้าง system log

---

### 2. `refresh_tokens` — JWT Refresh Tokens

**คำอธิบาย:** เก็บ refresh token สำหรับต่ออายุ JWT access token

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| jti | VARCHAR(100) | ❌ | — | UQ | JWT Token ID (unique identifier) |
| user_id | BIGINT | ❌ | — | FK → users.id | เจ้าของ token |
| revoked | BOOLEAN | ❌ | false | — | ถูกยกเลิกหรือไม่ |
| expires_at | DATETIME | ❌ | — | — | วันหมดอายุ |
| meta | JSON | ✅ | NULL | — | ข้อมูลเพิ่มเติม (device, IP) |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

---

### 3. `password_reset_tokens` — Token รีเซ็ตรหัสผ่าน

**คำอธิบาย:** เก็บ token สำหรับรีเซ็ตรหัสผ่านที่ส่งทางอีเมล

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| user_id | BIGINT | ❌ | — | FK → users.id | เจ้าของ token |
| token | VARCHAR(255) | ❌ | — | UQ | Token สำหรับรีเซ็ต |
| expires_at | DATETIME | ❌ | — | — | วันหมดอายุ |
| used_at | DATETIME | ✅ | NULL | — | วันเวลาที่ใช้ token |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

---

### 4. `two_factor_pending` — ข้อมูล 2FA ที่รอยืนยัน

**คำอธิบาย:** เก็บข้อมูลระหว่างขั้นตอนตั้งค่า 2FA ที่ยังไม่ยืนยัน

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| user_id | BIGINT | ❌ | — | FK → users.id | ผู้ใช้ที่กำลังตั้งค่า |
| method | ENUM('totp','email') | ❌ | — | — | วิธี 2FA |
| secret | TEXT | ❌ | — | — | Secret key |
| email_code | VARCHAR(6) | ✅ | NULL | — | รหัสยืนยันทางอีเมล |
| email_code_expires_at | DATETIME | ✅ | NULL | — | วันหมดอายุรหัสอีเมล |
| expires_at | DATETIME | ❌ | NOW + 15 นาที | — | วันหมดอายุ pending |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**Indexes:** UNIQUE(`user_id`, `method`), INDEX(`expires_at`)

---

### 5. `user_oauth_accounts` — บัญชี OAuth ที่เชื่อม

**คำอธิบาย:** เก็บข้อมูลบัญชี OAuth (Google, GitHub, Apple) ที่เชื่อมกับผู้ใช้

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| user_id | BIGINT | ❌ | — | FK → users.id | ผู้ใช้เจ้าของ |
| provider | ENUM('google','github','apple') | ❌ | — | — | ผู้ให้บริการ OAuth |
| provider_user_id | VARCHAR(255) | ❌ | — | — | ID จาก provider |
| provider_email | VARCHAR(255) | ✅ | NULL | — | อีเมลจาก provider |
| provider_avatar | VARCHAR(500) | ✅ | NULL | — | รูปจาก provider |
| provider_name | VARCHAR(255) | ✅ | NULL | — | ชื่อจาก provider |
| access_token | TEXT | ✅ | NULL | — | Access token |
| refresh_token | TEXT | ✅ | NULL | — | Refresh token |
| token_expires_at | DATETIME | ✅ | NULL | — | วันหมดอายุ token |
| linked_at | DATETIME | ❌ | NOW | — | วันเวลาที่เชื่อม |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**OnDelete:** CASCADE (ลบ user → ลบ OAuth accounts ทั้งหมด)

---

## กลุ่ม 2: นักศึกษา

### 6. `students` — นักศึกษา

**คำอธิบาย:** เก็บข้อมูลนักศึกษาทั้งหมดในระบบ

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | รหัสภายใน |
| student_id | VARCHAR(50) | ❌ | — | UQ | รหัสนักศึกษา (เช่น 65070501001) |
| full_name | VARCHAR(255) | ❌ | — | — | ชื่อ-นามสกุล |
| email | VARCHAR(255) | ✅ | NULL | — | อีเมล |
| extra | JSON | ✅ | NULL | — | ข้อมูลเพิ่มเติม (JSON) |
| is_active | BOOLEAN | ❌ | true | — | สถานะ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- → `course_sections` (M:N via course_section_students) — ลงทะเบียน Section
- → `student_groups` (M:N via student_group_members) — เป็นสมาชิกกลุ่ม
- → `scores` (1:N) — มีคะแนนหลายรายการ
- → `attendance_records` (1:N) — มีผลเช็คชื่อ
- → `bonus_scores` (1:N) — ได้รับคะแนนโบนัส
- → `queue_bookings` (1:N) — จองคิว
- → `exam_scores` (1:N) — มีคะแนนสอบ

---

### 7. `student_groups` — กลุ่มนักศึกษา

**คำอธิบาย:** เก็บข้อมูลกลุ่ม/ทีมของนักศึกษาในรายวิชา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชาที่สังกัด |
| name | VARCHAR(255) | ❌ | — | — | ชื่อกลุ่ม |
| group_type | ENUM('permanent','temporary') | — | 'permanent' | — | ประเภท (ถาวร/ชั่วคราว) |
| week_number | INTEGER | ✅ | NULL | — | สัปดาห์ (สำหรับกลุ่มรายสัปดาห์) |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**ความสัมพันธ์:**
- ← `courses` (N:1) — สังกัดรายวิชา
- → `students` (M:N via student_group_members) — มีสมาชิก

---

### 8. `student_group_members` — สมาชิกกลุ่ม

**คำอธิบาย:** ตารางเชื่อม (junction table) ระหว่างกลุ่มกับนักศึกษา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| group_id | BIGINT | ❌ | — | FK → student_groups.id | กลุ่ม |
| student_id | BIGINT | ❌ | — | FK → students.id | นักศึกษา |
| joined_at | DATETIME | — | NOW | — | วันเวลาที่เข้าร่วม |

---

## กลุ่ม 3: รายวิชาและการลงทะเบียน

### 9. `courses` — รายวิชา

**คำอธิบาย:** เก็บข้อมูลรายวิชาทั้งหมด

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | VARCHAR(21) | ❌ | nanoid() | PK | รหัสรายวิชา (nanoid) |
| code | VARCHAR(100) | ❌ | — | — | รหัสวิชา (เช่น 06016409) |
| name | VARCHAR(255) | ❌ | — | — | ชื่อวิชา |
| year | SMALLINT | ❌ | — | — | ปีการศึกษา |
| semester | TINYINT | ❌ | — | — | ภาคเรียน (1, 2, 3) |
| instructor_id | BIGINT | ✅ | NULL | FK → users.id | อาจารย์เจ้าของวิชา |
| description | TEXT | ✅ | NULL | — | คำอธิบายรายวิชา |
| image | LONGTEXT | ✅ | NULL | — | รูปปก (base64/URL) |
| is_active | BOOLEAN | ❌ | true | — | สถานะ |
| attention_threshold | TINYINT UNSIGNED | ❌ | 60 | — | เกณฑ์แจ้งเตือนนักศึกษาเสี่ยง (%) |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- ← `users` (N:1 via instructor_id) — อาจารย์เจ้าของ
- → `users` (M:N via course_instructors) — อาจารย์ผู้สอน
- → `course_sections` (1:N) — มี Section
- → `users` (M:N via course_tas) — มี TA
- → `student_groups` (1:N) — มีกลุ่มนักศึกษา
- → `assignments` (1:N) — มีงานมอบหมาย
- → `attendance_sessions` (1:N) — มีรอบเช็คชื่อ
- → `bonus_scores` (1:N) — มีคะแนนโบนัส
- → `queue_sessions` (1:N) — มี Queue session
- → `exam_settings` (1:N) — มีตั้งค่าการสอบ

---

### 10. `course_sections` — กลุ่มเรียน (Section)

**คำอธิบาย:** Section ภายในรายวิชา (เช่น Section 1, 2, 3)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชาที่สังกัด |
| section_no | VARCHAR(50) | ❌ | — | — | หมายเลข Section |
| note | VARCHAR(255) | ✅ | NULL | — | หมายเหตุ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**Indexes:** UNIQUE(`course_id`, `section_no`)

**ความสัมพันธ์:**
- ← `courses` (N:1) — สังกัดรายวิชา
- → `students` (M:N via course_section_students) — นักศึกษาที่ลงทะเบียน
- → `attendance_sessions` (1:N via course_section_id) — เช็คชื่อเฉพาะ Section (legacy)
- → `attendance_sessions` (M:N via attendance_session_sections) — เข้าร่วมเช็คชื่อ

---

### 11. `course_section_students` — การลงทะเบียนนักศึกษา

**คำอธิบาย:** ตารางเชื่อมนักศึกษากับ Section (ลงทะเบียนเรียน)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_section_id | BIGINT | ❌ | — | FK → course_sections.id | Section |
| student_id | BIGINT | ❌ | — | FK → students.id | นักศึกษา |
| enrolled_at | DATETIME | — | NOW | — | วันเวลาที่ลงทะเบียน |

---

### 12. `course_tas` — TA ประจำรายวิชา

**คำอธิบาย:** กำหนด TA ให้กับรายวิชา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_id | BIGINT | ❌ | — | FK → courses.id | รายวิชา |
| user_id | BIGINT | ❌ | — | FK → users.id | ผู้ใช้ (TA) |
| assigned_at | DATETIME | — | NOW | — | วันเวลาที่กำหนด |

---

### 13. `course_instructors` — อาจารย์ประจำรายวิชา

**คำอธิบาย:** กำหนดอาจารย์เพิ่มเติม (นอกเหนือเจ้าของวิชา) ให้กับรายวิชา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชา |
| user_id | BIGINT | ❌ | — | FK → users.id | อาจารย์ |
| is_primary | BOOLEAN | ❌ | false | — | เป็นอาจารย์หลักหรือไม่ |
| assigned_at | DATETIME | ❌ | NOW | — | วันเวลาที่กำหนด |

**Indexes:** UNIQUE(`course_id`, `user_id`)

---

## กลุ่ม 4: ห้องเรียน

### 14. `classrooms` — ห้องเรียน

**คำอธิบาย:** เก็บข้อมูลห้องเรียนจริง พร้อมตำแหน่งอาคาร ชั้น

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | VARCHAR(21) | ❌ | nanoid() | PK | รหัสห้อง (nanoid) |
| name | VARCHAR(100) | ❌ | — | — | ชื่อห้อง (เช่น ห้อง 306) |
| building | VARCHAR(100) | ❌ | — | — | อาคาร (เช่น อาคาร IT) |
| floor | VARCHAR(20) | ❌ | — | — | ชั้น |
| description | TEXT | ✅ | NULL | — | รายละเอียดเพิ่มเติม |
| is_active | BOOLEAN | ❌ | true | — | สถานะ |
| is_deleted | BOOLEAN | ❌ | false | — | Soft delete flag |
| created_by | BIGINT | ✅ | NULL | FK → users.id | ผู้สร้าง |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** INDEX(`building`), INDEX(`is_deleted`)

**ความสัมพันธ์:**
- ← `users` (N:1 via created_by) — ผู้สร้าง
- → `desks` (1:N) — มีโต๊ะหลายตัว
- → `zones` (1:N) — มีโซนหลายโซน
- → `queue_sessions` (1:N) — ใช้ในคิว

---

### 15. `desks` — โต๊ะ

**คำอธิบาย:** โต๊ะภายในห้องเรียน พร้อมตำแหน่งบน Canvas

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | VARCHAR(21) | ❌ | nanoid() | PK | รหัสโต๊ะ (nanoid) |
| classroom_id | VARCHAR(21) | ❌ | — | FK → classrooms.id | ห้องเรียน |
| number | INTEGER | ❌ | — | — | หมายเลขโต๊ะ |
| x | INTEGER | ❌ | 0 | — | ตำแหน่ง X บน canvas (px) |
| y | INTEGER | ❌ | 0 | — | ตำแหน่ง Y บน canvas (px) |
| type | ENUM('computer','normal','teacher') | ❌ | 'normal' | — | ประเภทโต๊ะ |
| is_enabled | BOOLEAN | ❌ | true | — | เปิด/ปิดใช้งาน |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** INDEX(`classroom_id`), INDEX(`classroom_id`, `number`)

**ความสัมพันธ์:**
- ← `classrooms` (N:1) — สังกัดห้อง
- → `queue_bookings` (1:N) — มีคิวจอง
- → `queue_desk_status` (1:N) — มีสถานะในคิว

---

### 16. `zones` — โซน

**คำอธิบาย:** โซนพื้นที่ภายในห้องเรียน สำหรับจัดกลุ่มโต๊ะ

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | VARCHAR(21) | ❌ | nanoid() | PK | รหัสโซน (nanoid) |
| classroom_id | VARCHAR(21) | ❌ | — | FK → classrooms.id | ห้องเรียน |
| name | VARCHAR(100) | ❌ | — | — | ชื่อโซน (เช่น โซน A, แถวหน้า) |
| x | INTEGER | ❌ | 0 | — | ตำแหน่ง X บน canvas (px) |
| y | INTEGER | ❌ | 0 | — | ตำแหน่ง Y บน canvas (px) |
| width | INTEGER | ❌ | 400 | — | ความกว้าง (px) |
| height | INTEGER | ❌ | 300 | — | ความสูง (px) |
| color | VARCHAR(30) | ❌ | 'rgba(99,102,241,0.15)' | — | สีพื้นหลัง |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** INDEX(`classroom_id`)

---

## กลุ่ม 5: งานมอบหมายและคะแนน

### 17. `assignments` — งานมอบหมาย

**คำอธิบาย:** งานมอบหมาย (Lab, การบ้าน, งานกลุ่ม) ภายในรายวิชา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชา |
| name | VARCHAR(255) | ❌ | — | — | ชื่องาน |
| description | TEXT | ✅ | NULL | — | คำอธิบาย |
| assignment_type | ENUM('individual','permanent_group','weekly_group','assignment') | ❌ | 'individual' | — | ประเภท: เดี่ยว, กลุ่มถาวร, กลุ่มรายสัปดาห์, การบ้าน |
| week_number | INTEGER | ✅ | NULL | — | สัปดาห์ (สำหรับงานกลุ่มรายสัปดาห์) |
| linked_attendance_session_id | INTEGER | ✅ | NULL | FK → attendance_sessions.id | เชื่อมเช็คชื่อ (legacy) |
| attendance_condition | ENUM('and','or') | ✅ | 'or' | — | เงื่อนไข: and=ทุกรอบ, or=อย่างน้อย 1 รอบ |
| max_score | DECIMAL(5,2) | ✅ | 10 | — | คะแนนเต็ม |
| due_date | DATE | ✅ | NULL | — | กำหนดส่ง |
| order_index | INTEGER | ✅ | 0 | — | ลำดับการแสดงผล |
| is_active | BOOLEAN | ✅ | true | — | สถานะ |
| is_score_visible | BOOLEAN | ✅ | true | — | นักศึกษาเห็นคะแนนงานนี้หรือไม่ |
| created_by | BIGINT | ✅ | NULL | FK → users.id | ผู้สร้าง |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- ← `courses` (N:1) — สังกัดรายวิชา
- ← `users` (N:1 via created_by) — ผู้สร้าง
- → `assignment_sub_items` (1:N) — มีข้อย่อย
- → `attendance_sessions` (M:N via assignment_attendance_links) — เชื่อมเช็คชื่อ
- → `scores` (1:N) — มีคะแนน
- → `queue_sessions` (1:N via linked_assignment_id) — เชื่อมกับคิว

---

### 18. `assignment_sub_items` — ข้อย่อยของงาน

**คำอธิบาย:** ข้อย่อย/เกณฑ์ย่อยของงานมอบหมาย แต่ละข้อมีคะแนนเต็มแยก

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| assignment_id | INTEGER | ❌ | — | FK → assignments.id | งานมอบหมาย |
| name | VARCHAR(255) | ❌ | — | — | ชื่อข้อย่อย |
| max_score | DECIMAL(10,2) | ✅ | 10 | — | คะแนนเต็ม |
| order_index | INTEGER | ✅ | 0 | — | ลำดับ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

---

### 19. `assignment_attendance_links` — เชื่อมงานกับเช็คชื่อ

**คำอธิบาย:** ตารางเชื่อม (junction table) ระหว่างงานมอบหมายกับรอบเช็คชื่อ

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| assignment_id | INTEGER | ❌ | — | FK → assignments.id | งานมอบหมาย |
| attendance_session_id | INTEGER | ❌ | — | FK → attendance_sessions.id | รอบเช็คชื่อ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**Indexes:** UNIQUE(`assignment_id`, `attendance_session_id`)

---

### 20. `scores` — คะแนน

**คำอธิบาย:** คะแนนของนักศึกษาสำหรับแต่ละงานมอบหมาย

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| assignment_id | INTEGER | ❌ | — | FK → assignments.id | งานมอบหมาย |
| student_id | BIGINT | ✅ | NULL | FK → students.id | นักศึกษา (งานเดี่ยว) |
| group_id | BIGINT | ✅ | NULL | FK → student_groups.id | กลุ่ม (งานกลุ่ม) |
| sub_item_id | INTEGER | ✅ | NULL | FK → assignment_sub_items.id | ข้อย่อย (null = คะแนนรวม) |
| score | DECIMAL(5,2) | ✅ | NULL | — | คะแนนที่ได้ |
| comment | TEXT | ✅ | NULL | — | ความเห็น |
| graded_by | BIGINT | ✅ | NULL | FK → users.id | ผู้ให้คะแนน |
| graded_at | DATETIME | ✅ | NULL | — | วันเวลาให้คะแนน |
| status | ENUM('pending','graded') | ✅ | 'pending' | — | สถานะ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- ← `assignments` (N:1) — ของงานมอบหมาย
- ← `students` (N:1) — ของนักศึกษา
- ← `student_groups` (N:1) — ของกลุ่ม
- ← `assignment_sub_items` (N:1) — ของข้อย่อย
- ← `users` (N:1 via graded_by) — ผู้ให้คะแนน
- → `score_edit_requests` (1:N) — มีคำขอแก้ไข

---

### 21. `score_edit_requests` — คำขอแก้ไขคะแนน

**คำอธิบาย:** คำขอแก้ไขคะแนนจาก TA ไปยังอาจารย์เพื่ออนุมัติ

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| score_id | INTEGER | ❌ | — | FK → scores.id | คะแนนที่ขอแก้ไข |
| old_score | DECIMAL(5,2) | ✅ | NULL | — | คะแนนเดิม |
| new_score | DECIMAL(5,2) | ❌ | — | — | คะแนนใหม่ที่ขอ |
| reason | TEXT | ✅ | NULL | — | เหตุผล |
| images | JSON | ✅ | NULL | — | รูปประกอบ (JSON array ของ file paths) |
| status | ENUM('pending','approved','rejected') | ✅ | 'pending' | — | สถานะคำขอ |
| requested_by | BIGINT | ❌ | — | FK → users.id | ผู้ขอ (TA) |
| reviewed_by | BIGINT | ✅ | NULL | FK → users.id | ผู้ตรวจสอบ (อาจารย์) |
| reviewed_at | DATETIME | ✅ | NULL | — | วันเวลาตรวจสอบ |
| review_comment | TEXT | ✅ | NULL | — | ความเห็นจากผู้ตรวจ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

---

### 22. `bonus_scores` — คะแนนโบนัส

**คำอธิบาย:** คะแนนพิเศษที่ให้นักศึกษาสำหรับการมีส่วนร่วมในชั้นเรียน

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_id | BIGINT | ❌ | — | FK → courses.id | รายวิชา |
| student_id | BIGINT | ❌ | — | FK → students.id | นักศึกษา |
| score | DECIMAL(5,2) | ❌ | 1.00 | — | คะแนน (ค่าเริ่มต้น 1) |
| reason | VARCHAR(255) | ✅ | NULL | — | เหตุผล (เช่น ตอบคำถาม) |
| given_by | BIGINT | ❌ | — | FK → users.id | ผู้ให้คะแนน |
| given_at | DATETIME | ❌ | NOW | — | วันเวลาที่ให้ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

---

### 23. `exam_settings` — ตั้งค่าการสอบ

**คำอธิบาย:** ตั้งค่าการสอบ (กลางภาค/ปลายภาค) แยกตาม Component (Lab/Lecture)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชา |
| exam_type | ENUM('midterm','final') | ❌ | — | — | ประเภทสอบ |
| component | ENUM('lab','lecture') | ❌ | — | — | องค์ประกอบ |
| max_score | DECIMAL(5,2) | ❌ | 0 | — | คะแนนเต็ม |
| is_visible | BOOLEAN | ❌ | false | — | แสดงให้นักศึกษาเห็น |
| is_active | BOOLEAN | ❌ | true | — | เปิดใช้งาน |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- ← `courses` (N:1) — สังกัดรายวิชา
- → `exam_scores` (1:N) — มีคะแนนสอบหลายรายการ

---

### 24. `exam_scores` — คะแนนสอบ

**คำอธิบาย:** คะแนนสอบของนักศึกษาแต่ละคน

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | INTEGER | ❌ | Auto Increment | PK, AI | — |
| exam_setting_id | INTEGER | ❌ | — | FK → exam_settings.id | ตั้งค่าการสอบ |
| student_id | BIGINT | ❌ | — | FK → students.id | นักศึกษา |
| score | DECIMAL(5,2) | ✅ | NULL | — | คะแนนที่ได้ |
| comment | TEXT | ✅ | NULL | — | หมายเหตุ |
| graded_by | BIGINT | ✅ | NULL | FK → users.id | ผู้ให้คะแนน |
| graded_at | DATETIME | ✅ | NULL | — | วันเวลาให้คะแนน |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

---

## กลุ่ม 6: ระบบเช็คชื่อ

### 25. `attendance_sessions` — รอบเช็คชื่อ

**คำอธิบาย:** รอบการเช็คชื่อ สร้างโดยอาจารย์/TA พร้อมเวลาเริ่ม/สิ้นสุด และ PIN

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชา |
| course_section_id | BIGINT | ✅ | NULL | FK → course_sections.id | Section เฉพาะ (legacy, null = ทุก Section) |
| title | VARCHAR(255) | ❌ | — | — | ชื่อรอบ (เช่น Lab01, Lecture Week 1) |
| pin_code | VARCHAR(10) | ✅ | NULL | — | รหัส PIN 6 หลัก |
| session_type | ENUM('lecture','lab','online') | — | 'lecture' | — | รูปแบบการเรียน |
| check_location | BOOLEAN | — | false | — | ตรวจสอบ GPS หรือไม่ |
| location_lat | DECIMAL(10,7) | ✅ | NULL | — | ละติจูดศูนย์กลาง |
| location_lng | DECIMAL(10,7) | ✅ | NULL | — | ลองจิจูดศูนย์กลาง |
| radius_meters | INTEGER | — | 50 | — | รัศมีที่อนุญาต (เมตร) |
| start_time | DATETIME | ❌ | — | — | เวลาเริ่ม |
| end_time | DATETIME | ❌ | — | — | เวลาสิ้นสุด |
| late_threshold_minutes | INTEGER | — | 15 | — | เกณฑ์เวลาสาย (นาที) |
| status | ENUM('draft','active','closed') | — | 'draft' | — | สถานะ: draft/active/closed |
| created_by | BIGINT | ✅ | NULL | FK → users.id | ผู้สร้าง |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- ← `courses` (N:1) — สังกัดรายวิชา
- ← `course_sections` (N:1 via course_section_id) — Section เฉพาะ (legacy)
- → `course_sections` (M:N via attendance_session_sections) — Sections ที่เข้าร่วม
- ← `users` (N:1 via created_by) — ผู้สร้าง
- → `attendance_records` (1:N) — มีผลเช็คชื่อ
- → `assignments` (1:N via linked_attendance_session_id) — เชื่อมงานมอบหมาย (legacy)
- → `assignments` (M:N via assignment_attendance_links) — เชื่อมงานมอบหมาย
- → `queue_sessions` (1:N via linked_attendance_session_id) — เชื่อมคิว

---

### 26. `attendance_session_sections` — Section ที่เข้าร่วมเช็คชื่อ

**คำอธิบาย:** ตารางเชื่อมรอบเช็คชื่อกับ Section ที่เข้าร่วม (รองรับหลาย Section)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| attendance_session_id | BIGINT | ❌ | — | FK → attendance_sessions.id | รอบเช็คชื่อ |
| course_section_id | BIGINT | ❌ | — | FK → course_sections.id | Section |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**Indexes:** UNIQUE(`attendance_session_id`, `course_section_id`)

---

### 27. `attendance_records` — ผลเช็คชื่อ

**คำอธิบาย:** ผลการเช็คชื่อรายบุคคลของนักศึกษา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| attendance_session_id | BIGINT | ❌ | — | FK → attendance_sessions.id | รอบเช็คชื่อ |
| student_id | BIGINT | ❌ | — | FK → students.id | นักศึกษา |
| check_in_time | DATETIME | ✅ | NULL | — | เวลาที่เช็คชื่อ |
| status | ENUM('present','late','leave','absent') | — | 'absent' | — | สถานะ: มา/สาย/ลา/ขาด |
| google_email | VARCHAR(255) | ✅ | NULL | — | อีเมล Google ที่ใช้ยืนยัน |
| google_id | VARCHAR(255) | ✅ | NULL | — | Google ID ที่ใช้ยืนยัน |
| pin_verified | BOOLEAN | — | false | — | ยืนยัน PIN แล้ว |
| location_verified | BOOLEAN | — | false | — | ยืนยันตำแหน่งแล้ว |
| location_lat | DECIMAL(10,7) | ✅ | NULL | — | ละติจูดของนักศึกษา |
| location_lng | DECIMAL(10,7) | ✅ | NULL | — | ลองจิจูดของนักศึกษา |
| distance_meters | INTEGER | ✅ | NULL | — | ระยะห่างจากจุดเช็คชื่อ (เมตร) |
| note | TEXT | ✅ | NULL | — | หมายเหตุ |
| updated_by | BIGINT | ✅ | NULL | FK → users.id | ผู้แก้ไขสถานะ (อาจารย์/TA) |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

---

## กลุ่ม 7: ระบบจองคิว

### 28. `queue_sessions` — รอบจองคิว

**คำอธิบาย:** รอบจองคิวสำหรับตรวจงาน/ขอความช่วยเหลือ

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | VARCHAR(21) | ❌ | nanoid() | PK | รหัสรอบ (nanoid) |
| course_id | VARCHAR(21) | ❌ | — | FK → courses.id | รายวิชา |
| classroom_id | VARCHAR(21) | ❌ | — | FK → classrooms.id | ห้องเรียน |
| title | VARCHAR(255) | ❌ | — | — | ชื่อรอบ (เช่น Lab01 - ตรวจงาน) |
| description | TEXT | ✅ | NULL | — | รายละเอียด |
| pin_code | VARCHAR(10) | ❌ | — | — | รหัส PIN 6 หลัก |
| linked_assignment_id | BIGINT | ✅ | NULL | FK → assignments.id | งานที่เชื่อม (สำหรับลงคะแนน) |
| require_attendance | BOOLEAN | — | false | — | ต้องเช็คชื่อก่อนจอง |
| linked_attendance_session_id | BIGINT | ✅ | NULL | FK → attendance_sessions.id | รอบเช็คชื่อที่เชื่อม |
| status | ENUM('draft','active','paused','closed') | — | 'draft' | — | สถานะ |
| start_time | DATETIME | ✅ | NULL | — | เวลาเริ่มรับจอง |
| end_time | DATETIME | ✅ | NULL | — | เวลาสิ้นสุด |
| created_by | BIGINT | ✅ | NULL | FK → users.id | ผู้สร้าง |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** INDEX(`course_id`), INDEX(`classroom_id`), INDEX(`status`), INDEX(`pin_code`)

**ความสัมพันธ์:**
- ← `courses` (N:1) — สังกัดรายวิชา
- ← `classrooms` (N:1) — ใช้ห้องเรียน
- ← `assignments` (N:1 via linked_assignment_id) — เชื่อมงาน
- ← `attendance_sessions` (N:1 via linked_attendance_session_id) — เชื่อมเช็คชื่อ
- ← `users` (N:1 via created_by) — ผู้สร้าง
- → `queue_workers` (1:N) — มี worker
- → `queue_bookings` (1:N) — มีการจอง
- → `queue_desk_status` (1:N) — มีสถานะโต๊ะ
- → `fcm_tokens` (1:N) — มี FCM tokens

---

### 29. `queue_bookings` — การจองคิว

**คำอธิบาย:** รายละเอียดการจองคิวของนักศึกษา

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| queue_session_id | VARCHAR(21) | ❌ | — | FK → queue_sessions.id | รอบจองคิว |
| student_id | BIGINT | ❌ | — | FK → students.id | นักศึกษาที่จอง |
| desk_id | VARCHAR(21) | ❌ | — | FK → desks.id | โต๊ะที่จอง |
| desk_number | INTEGER | ❌ | — | — | เลขโต๊ะ (สำเนาข้อมูล) |
| booking_type | ENUM('grading','help') | ❌ | — | — | ประเภท: ตรวจงาน/ขอช่วยเหลือ |
| queue_number | INTEGER | ❌ | — | — | หมายเลขคิว |
| note | TEXT | ✅ | NULL | — | หมายเหตุ |
| status | ENUM('waiting','in_progress','completed','cancelled','no_show') | — | 'waiting' | — | สถานะคิว |
| assigned_worker_id | BIGINT | ✅ | NULL | FK → users.id | TA ที่รับตรวจ |
| assigned_at | DATETIME | ✅ | NULL | — | เวลาที่มอบหมาย |
| started_at | DATETIME | ✅ | NULL | — | เวลาเริ่มตรวจ |
| completed_at | DATETIME | ✅ | NULL | — | เวลาตรวจเสร็จ |
| score | DECIMAL(5,2) | ✅ | NULL | — | คะแนนที่ได้ |
| score_comment | TEXT | ✅ | NULL | — | ความเห็นเรื่องคะแนน |
| worker_note | TEXT | ✅ | NULL | — | บันทึกจากผู้ตรวจ |
| created_at | DATETIME | — | NOW | — | วันเวลาที่จอง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** INDEX(`queue_session_id`), INDEX(`student_id`), INDEX(`desk_id`), INDEX(`status`), INDEX(`booking_type`), INDEX(`queue_session_id`, `queue_number`)

---

### 30. `queue_desk_status` — สถานะโต๊ะในคิว

**คำอธิบาย:** สถานะปัจจุบันของโต๊ะแต่ละตัวใน queue session (สำหรับหน้า Projector)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| queue_session_id | VARCHAR(21) | ❌ | — | FK → queue_sessions.id | รอบจองคิว |
| desk_id | VARCHAR(21) | ❌ | — | FK → desks.id | โต๊ะ |
| grading_status | ENUM('not_started','waiting','in_progress','completed') | — | 'not_started' | — | สถานะการตรวจงาน |
| grading_booking_id | BIGINT | ✅ | NULL | — | Booking ID ของการตรวจปัจจุบัน |
| help_status | ENUM('none','waiting','in_progress') | — | 'none' | — | สถานะขอความช่วยเหลือ |
| help_booking_id | BIGINT | ✅ | NULL | — | Booking ID ของ help ปัจจุบัน |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** UNIQUE(`queue_session_id`, `desk_id`), INDEX(`queue_session_id`), INDEX(`grading_status`), INDEX(`help_status`)

---

### 31. `queue_workers` — ผู้ตรวจงาน (Worker)

**คำอธิบาย:** TA ที่เข้าร่วมเป็น worker ใน queue session

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| queue_session_id | VARCHAR(21) | ❌ | — | FK → queue_sessions.id | รอบจองคิว |
| user_id | BIGINT | ❌ | — | FK → users.id | อาจารย์/TA |
| accept_grading | BOOLEAN | — | true | — | รับตรวจงานหรือไม่ |
| accept_help | BOOLEAN | — | true | — | รับช่วยเหลือหรือไม่ |
| status | ENUM('online','busy','offline') | — | 'offline' | — | สถานะ worker |
| current_booking_id | BIGINT | ✅ | NULL | — | งานที่กำลังทำ |
| total_grading_completed | INTEGER | — | 0 | — | จำนวนตรวจงานสำเร็จ |
| total_help_completed | INTEGER | — | 0 | — | จำนวนช่วยเหลือสำเร็จ |
| last_active_at | DATETIME | ✅ | NULL | — | เวลา active ล่าสุด |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**Indexes:** UNIQUE(`queue_session_id`, `user_id`), INDEX(`queue_session_id`), INDEX(`user_id`), INDEX(`status`)

---

## กลุ่ม 8: การแจ้งเตือน

### 32. `fcm_tokens` — FCM Push Tokens

**คำอธิบาย:** เก็บ Firebase Cloud Messaging token สำหรับส่ง push notification

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| fcm_token | VARCHAR(500) | ❌ | — | UQ | FCM token |
| user_type | ENUM('worker','student') | ❌ | — | — | ประเภทผู้ใช้ |
| user_id | BIGINT | ✅ | NULL | FK → users.id | ผู้ใช้ (สำหรับ worker) |
| student_id | VARCHAR(20) | ✅ | NULL | — | รหัสนักศึกษา |
| booking_id | BIGINT | ✅ | NULL | FK → queue_bookings.id | Booking ที่เชื่อม |
| session_id | VARCHAR(21) | ✅ | NULL | FK → queue_sessions.id | Queue session ที่เชื่อม |
| device_info | JSON | ✅ | NULL | — | ข้อมูล browser/อุปกรณ์ |
| is_active | BOOLEAN | — | true | — | สถานะ |
| last_used_at | DATETIME | ✅ | NULL | — | วันเวลาใช้ล่าสุด |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

**ความสัมพันธ์:**
- ← `users` (N:1) — เจ้าของ (worker)
- ← `queue_sessions` (N:1) — เชื่อม session
- ← `queue_bookings` (N:1) — เชื่อม booking
- → `notification_logs` (1:N) — มีบันทึกการส่ง

---

### 33. `notification_logs` — บันทึกการแจ้งเตือน

**คำอธิบาย:** บันทึกการส่ง push notification ทุกครั้ง พร้อมสถานะการส่ง

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| fcm_token_id | BIGINT | ✅ | NULL | FK → fcm_tokens.id | FCM token ที่ส่งไป |
| notification_type | ENUM('new-task','queue-ready','booking-completed','session-closed','other') | ❌ | — | — | ประเภท notification |
| title | VARCHAR(255) | ❌ | — | — | หัวข้อ |
| body | TEXT | ✅ | NULL | — | เนื้อหา |
| data | JSON | ✅ | NULL | — | ข้อมูลเพิ่มเติม |
| status | ENUM('pending','sent','failed','delivered') | — | 'pending' | — | สถานะการส่ง |
| error_message | TEXT | ✅ | NULL | — | ข้อผิดพลาด (ถ้ามี) |
| sent_at | DATETIME | ✅ | NULL | — | เวลาส่ง |
| delivered_at | DATETIME | ✅ | NULL | — | เวลาถึงปลายทาง |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

---

## กลุ่ม 9: Feedback

### 34. `feedbacks` — ข้อเสนอแนะ

**คำอธิบาย:** ข้อเสนอแนะจากผู้ใช้ (แจ้งบัก, ขอฟีเจอร์, เสนอปรับปรุง)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| user_id | BIGINT | ✅ | NULL | FK → users.id | ผู้ส่ง |
| type | ENUM('bug','feature','improvement','other') | ❌ | 'other' | — | ประเภท |
| title | VARCHAR(255) | ❌ | — | — | หัวข้อ |
| description | TEXT | ❌ | — | — | รายละเอียด |
| attachments | JSON | ✅ | [] | — | ไฟล์แนบ (JSON array ของ URLs) |
| status | ENUM('pending','reviewing','resolved','rejected') | ❌ | 'pending' | — | สถานะ |
| priority | ENUM('low','medium','high','critical') | ❌ | 'medium' | — | ระดับความสำคัญ |
| admin_notes | TEXT | ✅ | NULL | — | บันทึกจาก admin |
| resolved_at | DATETIME | ✅ | NULL | — | วันเวลาแก้ไข |
| resolved_by | BIGINT | ✅ | NULL | FK → users.id | ผู้แก้ไข |
| contact_email | VARCHAR(255) | ✅ | NULL | — | อีเมลติดต่อกลับ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |
| updated_at | DATETIME | — | NOW | — | วันเวลาแก้ไขล่าสุด |

---

## กลุ่ม 10: บันทึก Log

### 35. `system_logs` — บันทึกระบบ

**คำอธิบาย:** บันทึก log ระบบทั้งหมด ตาม พ.ร.บ. คอมพิวเตอร์ พ.ศ. 2560 (access, error, auth, security)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| log_type | ENUM('access','error','auth','security') | ❌ | 'access' | — | ประเภท log |
| severity | ENUM('debug','info','warn','error','critical') | ❌ | 'info' | — | ระดับความรุนแรง |
| actor_user_id | BIGINT | ✅ | NULL | FK → users.id | ผู้กระทำ |
| session_id | VARCHAR(128) | ✅ | NULL | — | Session ID |
| auth_method | VARCHAR(50) | ✅ | NULL | — | วิธียืนยันตัวตน |
| action | VARCHAR(255) | ❌ | — | — | การกระทำ |
| http_method | VARCHAR(10) | ✅ | NULL | — | HTTP Method (GET, POST ฯลฯ) |
| url | VARCHAR(2048) | ✅ | NULL | — | URL ที่เข้าถึง |
| query_params | JSON | ✅ | NULL | — | Query parameters |
| status_code | INTEGER | ✅ | NULL | — | HTTP status code |
| response_time_ms | INTEGER | ✅ | NULL | — | เวลาตอบกลับ (ms) |
| detail | JSON | ✅ | NULL | — | รายละเอียดเพิ่มเติม |
| error_message | TEXT | ✅ | NULL | — | ข้อความ error |
| error_stack | TEXT | ✅ | NULL | — | Error stack trace |
| error_code | VARCHAR(50) | ✅ | NULL | — | Error code |
| resource_type | VARCHAR(100) | ✅ | NULL | — | ประเภท resource |
| resource_id | VARCHAR(255) | ✅ | NULL | — | ID ของ resource |
| request_body | JSON | ✅ | NULL | — | Request body |
| request_size | INTEGER | ✅ | NULL | — | ขนาด request (bytes) |
| response_size | INTEGER | ✅ | NULL | — | ขนาด response (bytes) |
| ip_address | VARCHAR(64) | ✅ | NULL | — | IP Address |
| user_agent | VARCHAR(512) | ✅ | NULL | — | User Agent |
| referer | VARCHAR(2048) | ✅ | NULL | — | Referer |
| device_type | VARCHAR(50) | ✅ | NULL | — | ประเภทอุปกรณ์ |
| browser | VARCHAR(100) | ✅ | NULL | — | Browser |
| os | VARCHAR(100) | ✅ | NULL | — | ระบบปฏิบัติการ |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**Indexes:** INDEX(`created_at`), INDEX(`log_type`, `created_at`), INDEX(`actor_user_id`, `created_at`)

---

### 36. `course_activity_logs` — บันทึกกิจกรรมรายวิชา

**คำอธิบาย:** บันทึกกิจกรรมทุกอย่างที่เกิดขึ้นภายในรายวิชา (audit trail)

| คอลัมน์ | ชนิดข้อมูล | NULL | ค่าเริ่มต้น | คีย์ | คำอธิบาย |
|---|---|---|---|---|---|
| id | BIGINT | ❌ | Auto Increment | PK, AI | — |
| course_id | VARCHAR(100) | ❌ | — | FK → courses.id | รายวิชา |
| actor_user_id | BIGINT | ❌ | — | FK → users.id | ผู้กระทำ |
| action | VARCHAR(50) | ❌ | — | — | ประเภทการกระทำ |
| category | VARCHAR(30) | ❌ | 'general' | — | หมวดหมู่: course, people, assignment, score, attendance, queue |
| target_type | VARCHAR(50) | ✅ | NULL | — | ประเภทเป้าหมาย (student, assignment, score ฯลฯ) |
| target_id | VARCHAR(100) | ✅ | NULL | — | ID ของเป้าหมาย |
| target_name | VARCHAR(255) | ✅ | NULL | — | ชื่อเป้าหมาย |
| detail | JSON | ✅ | NULL | — | รายละเอียดเพิ่มเติม |
| created_at | DATETIME | — | NOW | — | วันเวลาสร้าง |

**Indexes:** INDEX(`course_id`), INDEX(`actor_user_id`), INDEX(`action`), INDEX(`category`), INDEX(`created_at`), INDEX(`course_id`, `action`), INDEX(`course_id`, `created_at`)

---

## Entity Relationship Diagram (สรุปความสัมพันธ์)

```
users ─────────┬─── refresh_tokens
               ├─── password_reset_tokens
               ├─── two_factor_pending
               ├─── user_oauth_accounts
               ├─── system_logs (actor)
               ├─── course_activity_logs (actor)
               ├─── feedbacks (user / resolver)
               ├─── fcm_tokens
               │
               ├───── courses (instructor_id)
               ├─M:N─ courses (via course_instructors)
               ├─M:N─ courses (via course_tas)
               │
               ├─── classrooms (created_by)
               ├─── bonus_scores (given_by)
               ├─── queue_sessions (created_by)
               ├─── queue_workers (user_id)
               ├─── queue_bookings (assigned_worker_id)
               ├─── exam_scores (graded_by)
               └─── scores (graded_by)

courses ───────┬─── course_sections ──── course_section_students ──── students
               ├─── assignments ────┬─── assignment_sub_items
               │                    ├─── scores
               │                    └─── assignment_attendance_links
               ├─── attendance_sessions ──┬─── attendance_session_sections
               │                          └─── attendance_records
               ├─── queue_sessions ──┬─── queue_bookings
               │                     ├─── queue_desk_status
               │                     ├─── queue_workers
               │                     └─── fcm_tokens
               ├─── exam_settings ──── exam_scores
               ├─── bonus_scores
               └─── student_groups ──── student_group_members

classrooms ────┬─── desks ──┬─── queue_bookings
               │            └─── queue_desk_status
               └─── zones

scores ────── score_edit_requests

fcm_tokens ── notification_logs

students ──┬─M:N─ course_sections (via course_section_students)
           ├─M:N─ student_groups (via student_group_members)
           ├─── scores
           ├─── attendance_records
           ├─── bonus_scores
           ├─── queue_bookings
           └─── exam_scores
```

---

## หมายเหตุ

- **PK** = Primary Key, **AI** = Auto Increment, **FK** = Foreign Key, **UQ** = Unique
- **nanoid()** ใช้สร้าง primary key แบบ string สำหรับ courses, classrooms, desks, zones, queue_sessions
- **Soft Delete** ใช้เฉพาะ classrooms (is_deleted flag)
- **Timestamps** ส่วนใหญ่ใช้ `created_at` และ `updated_at` บางตารางมีเฉพาะ `created_at`
- **JSON columns** ใช้สำหรับเก็บข้อมูลที่ไม่มีโครงสร้างตายตัว (extra, attachments, device_info ฯลฯ)
- ตาราง junction (เชื่อม M:N) ได้แก่: `course_section_students`, `course_tas`, `course_instructors`, `student_group_members`, `assignment_attendance_links`, `attendance_session_sections`
