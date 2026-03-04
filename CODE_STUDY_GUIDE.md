# 📚 คู่มือศึกษาโค้ด — ITII Assist Classroom

## ระบบจัดการรายวิชา, เช็คชื่อ, เก็บคะแนน และจองคิวตรวจงาน

> เอกสารนี้จัดทำเพื่อให้สามารถศึกษา ทำความเข้าใจ และอธิบายโค้ดของโปรเจกต์ได้อย่างละเอียด
> เหมาะสำหรับการเตรียมตัวสอบป้องกัน (Defense) — ตอบคำถามกรรมการ, แก้ไขโค้ดโชว์, เสนอแนวทางพัฒนาต่อ

---

## สารบัญ

1. [ภาพรวมสถาปัตยกรรมของระบบ](#1-ภาพรวมสถาปัตยกรรมของระบบ)
2. [Technology Stack](#2-technology-stack)
3. [โครงสร้างโฟลเดอร์ทั้งหมด](#3-โครงสร้างโฟลเดอร์ทั้งหมด)
4. [จุดเริ่มต้น — เริ่มอ่านโค้ดจากตรงไหน](#4-จุดเริ่มต้น--เริ่มอ่านโค้ดจากตรงไหน)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [วงจรชีวิตของ Request (Request Lifecycle)](#7-วงจรชีวิตของ-request-request-lifecycle)
8. [ระบบ Authentication & Authorization](#8-ระบบ-authentication--authorization)
9. [Real-time Communication (Socket.IO)](#9-real-time-communication-socketio)
10. [ระบบคิวตรวจงาน (Queue System)](#10-ระบบคิวตรวจงาน-queue-system)
11. [Database & Model Associations](#11-database--model-associations)
12. [DevOps — Docker & CI/CD](#12-devops--docker--cicd)
13. [Design Patterns ที่ใช้ในโปรเจกต์](#13-design-patterns-ที่ใช้ในโปรเจกต์)
14. [วิธีเพิ่มฟีเจอร์ใหม่ (Step-by-Step)](#14-วิธีเพิ่มฟีเจอร์ใหม่-step-by-step)
15. [วิธีแก้ไขฟีเจอร์เดิม](#15-วิธีแก้ไขฟีเจอร์เดิม)
16. [คำถามที่กรรมการมักถาม & แนวทางตอบ](#16-คำถามที่กรรมการมักถาม--แนวทางตอบ)
17. [แนวทางพัฒนาต่อในอนาคต](#17-แนวทางพัฒนาต่อในอนาคต)

---

## 1. ภาพรวมสถาปัตยกรรมของระบบ

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            Next.js 15 Frontend (TypeScript)                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │   │
│  │  │  Pages   │  │ Services │  │ Contexts │  │ Components │  │   │
│  │  │ (App     │  │ (API     │  │ (Socket, │  │ (HeroUI +  │  │   │
│  │  │  Router) │  │  Client) │  │  Auth)   │  │  Tailwind) │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────────┘  │   │
│  └───────┼──────────────┼─────────────┼────────────────────────┘   │
│          │              │             │                              │
└──────────┼──────────────┼─────────────┼──────────────────────────────┘
           │   HTTP/REST  │  Socket.IO  │
           ▼              ▼             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy (Traefik / Nginx)                    │
│                    - SSL Termination (Let's Encrypt)                  │
│                    - Load Balancing                                   │
└────────────┬───────────────────────────────┬─────────────────────────┘
             │                               │
             ▼                               ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│    Express.js Backend     │   │     Socket.IO Server         │
│    (Node.js API Server)   │   │  (same process as Express)   │
│                           │   │                              │
│  ┌─────────────────────┐  │   │  Rooms:                      │
│  │  Middleware Chain:   │  │   │  - attendance-{sessionId}    │
│  │  helmet → cors →    │  │   │  - queue-{sessionId}         │
│  │  rateLimit → body   │  │   │  - worker-{userId}           │
│  │  → cookie → morgan  │  │   │  - classroom-{id}            │
│  │  → passport → routes│  │   │  - global-updates            │
│  └─────────┬───────────┘  │   │  - global-courses            │
│            │               │   └──────────────────────────────┘
│            ▼               │
│  ┌─────────────────────┐  │
│  │  Route → Controller  │  │
│  │  → Model → Response  │  │
│  └────┬────────────┬───┘  │
│       │            │       │
│       ▼            ▼       │
│  ┌─────────┐  ┌────────┐  │
│  │  MySQL  │  │ Redis  │  │
│  │Sequelize│  │ioredis │  │
│  │  ORM    │  │(Queue) │  │
│  └─────────┘  └────────┘  │
└───────────────────────────┘

┌───────────────────────────────────────┐
│       Background Worker               │
│  queueAssignmentWorker.js             │
│  - Polls Redis queue every 100ms      │
│  - Assigns bookings to workers        │
│  - Emits Socket events                │
│  - Syncs to MySQL for persistence     │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│       Monitoring Stack (Optional)     │
│  Prometheus → Grafana → Loki          │
│  - Metrics: prom-client               │
│  - Dashboards: Grafana                │
│  - Logs: Loki + Winston               │
└───────────────────────────────────────┘
```

### หลักการออกแบบ

ระบบใช้สถาปัตยกรรมแบบ **Client-Server** โดยแยก Frontend กับ Backend เป็นอิสระจากกัน:

- **Frontend** (Next.js) — Render หน้าเว็บ, จัดการ UI, เรียก API
- **Backend** (Express.js) — ให้บริการ REST API, จัดการ Business Logic, เชื่อมต่อ Database
- **Real-time** (Socket.IO) — สื่อสารแบบ bidirectional สำหรับอัปเดตข้อมูลแบบเรียลไทม์
- **Background Worker** — ประมวลผลคิวตรวจงานแบบ async แยกจาก request/response cycle
- **Redis** — ใช้เป็น Message Queue สำหรับระบบคิว (ไม่ใช้เป็น Cache ทั่วไป)

---

## 2. Technology Stack

### Frontend

| เทคโนโลยี | Version | หน้าที่ |
|-----------|---------|--------|
| **Next.js** | 15.5.9 | React Framework, App Router, SSR/CSR |
| **TypeScript** | - | Type-safe JavaScript |
| **HeroUI** (NextUI v2) | 2.x | UI Component Library |
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **Socket.IO Client** | 4.x | Real-time communication |
| **Iconify React** | 6.x | ไอคอน |
| **Leaflet** | - | แผนที่ (Map) สำหรับ check-in |
| **Firebase** | - | FCM Push Notifications |
| **Recharts** | - | กราฟ/แผนภูมิ |
| **XLSX** | - | Export Excel |

### Backend

| เทคโนโลยี | Version | หน้าที่ |
|-----------|---------|--------|
| **Express.js** | 4.18.2 | Web Framework |
| **Sequelize** | 6.35.2 | MySQL ORM |
| **MySQL2** | 3.6.5 | Database Driver |
| **Passport.js** | 0.7.0 | Authentication (JWT, Local, Google, GitHub, Apple) |
| **jsonwebtoken** | 9.0.2 | JWT Token generation/verification |
| **ioredis** | 5.9.2 | Redis client (Queue system) |
| **Socket.IO** | - | Real-time server |
| **bcryptjs** | 2.4.3 | Password hashing |
| **multer** | 1.4.5 | File upload handling |
| **joi** | 17.11.0 | Request validation |
| **express-validator** | 7.3.1 | Request validation |
| **nodemailer** | 8.0.1 | Email sending |
| **firebase-admin** | 13.6.0 | FCM Push Notifications |
| **otplib** | 13.3.0 | TOTP 2FA |
| **qrcode** | 1.5.4 | QR Code generation |
| **prom-client** | 15.1.0 | Prometheus metrics |
| **helmet** | 7.1.0 | Security headers |
| **express-rate-limit** | 7.1.5 | Rate limiting |
| **morgan** / **winston** | - | Logging |

### DevOps

| เทคโนโลยี | หน้าที่ |
|-----------|--------|
| **Docker Compose** | Container orchestration (dev + prod) |
| **Jenkins** | CI/CD Pipeline |
| **Traefik** | Reverse Proxy + SSL (dev environment) |
| **Nginx** | Reverse Proxy (prod environment) |
| **Prometheus + Grafana** | Monitoring & Dashboards |
| **Loki** | Log aggregation |

---

## 3. โครงสร้างโฟลเดอร์ทั้งหมด

### Root Level

```
itii-assist-classroom/
├── back-end/                    # ← Express.js API Server
├── front-end/                   # ← Next.js Frontend
├── nginx/                       # ← Nginx config (production)
├── docker-compose.dev.yml       # Docker สำหรับ development
├── docker-compose.prod.yml      # Docker สำหรับ production
├── docker-compose.db.yml        # Docker สำหรับ database อย่างเดียว
├── Jenkinsfile.dev              # CI/CD pipeline (dev)
├── Jenkinsfile.prod             # CI/CD pipeline (prod)
├── FEATURE_SUMMARY.md           # สรุปฟีเจอร์ทั้งหมด
├── DATA_DICTIONARY.md           # พจนานุกรมข้อมูล (ER + ตาราง)
└── CODE_STUDY_GUIDE.md          # เอกสารนี้
```

### Backend (`back-end/src/`)

```
src/
├── app.js                       # ★ จุดเริ่มต้น — Express app + server startup
├── config/                      # การตั้งค่าทั้งหมด
│   ├── index.js                 #   ★ Config หลัก (อ่าน .env, export settings)
│   ├── database.js              #   ★ Sequelize connection + pool settings
│   ├── passport.js              #   ★ Authentication strategies (JWT, Local, OAuth)
│   ├── redis.js                 #   Redis connection (สำหรับ Queue)
│   └── socket.js                #   ★ Socket.IO setup + all room handlers
├── controllers/                 # ★ Business Logic ทั้งหมด
│   ├── index.js                 #   Export ทุก controller
│   ├── auth.controller.js       #   Login, Register, Token Refresh, Profile
│   ├── course.controller.js     #   CRUD รายวิชา, Sections, TAs, Students
│   ├── assignment.controller.js #   CRUD งาน, Sub-items
│   ├── attendance.controller.js #   เช็คชื่อ, Sessions, Records
│   ├── score.controller.js      #   ให้/แก้ไขคะแนน
│   ├── examScore.controller.js  #   คะแนนสอบ
│   ├── queue.controller.js      #   ระบบคิวตรวจงาน
│   ├── classroom.controller.js  #   จัดการห้องเรียน
│   ├── student.controller.js    #   จัดการนักศึกษา
│   ├── user.controller.js       #   จัดการผู้ใช้ (Admin)
│   ├── feedback.controller.js   #   ระบบ Feedback
│   ├── team.controller.js       #   จัดกลุ่ม/ทีม
│   ├── bonusScore.controller.js #   คะแนนโบนัส
│   ├── scoreEditRequest.controller.js  # คำขอแก้ไขคะแนน
│   ├── notification.controller.js      # FCM Push Notifications
│   ├── twoFactor.controller.js  #   2FA Setup & Verification
│   ├── oauth.controller.js      #   OAuth callback handlers
│   ├── system.controller.js     #   System metrics & info
│   ├── systemLog.controller.js  #   Activity logs (Admin)
│   └── courseActivityLog.controller.js # Course activity logs
├── middlewares/                  # Middleware chain
│   ├── index.js                 #   Export ทุก middleware
│   ├── auth.js                  #   ★ authenticate, authorize, isAdmin
│   ├── errorHandler.js          #   ★ Global error handling (3 layers)
│   ├── validate.js              #   Request validation middleware
│   ├── upload.js                #   Multer file upload config
│   ├── requestLogger.js         #   Activity logging middleware
│   ├── performance.middleware.js#   Request timeout, slow query logger
│   └── metrics.js               #   Prometheus metrics collection
├── models/                      # ★ Sequelize Models (36 ตาราง)
│   ├── index.js                 #   ★ โหลดทุก Model + กำหนด Associations
│   ├── User.js                  #   ผู้ใช้ (admin, instructor, ta)
│   ├── Student.js               #   นักศึกษา
│   ├── Course.js                #   รายวิชา
│   ├── CourseSection.js         #   Section ของรายวิชา
│   ├── CourseSectionStudent.js  #   นักศึกษาในแต่ละ Section
│   ├── CourseTA.js              #   TA ของรายวิชา
│   ├── CourseInstructor.js      #   ผู้สอนของรายวิชา
│   ├── Classroom.js             #   ห้องเรียน
│   ├── Desk.js                  #   โต๊ะในห้องเรียน
│   ├── Zone.js                  #   โซนในห้องเรียน
│   ├── Assignment.js            #   งาน/การบ้าน
│   ├── AssignmentSubItem.js     #   รายการย่อยของงาน
│   ├── Score.js                 #   คะแนน
│   ├── ScoreEditRequest.js      #   คำขอแก้ไขคะแนน
│   ├── AttendanceSession.js     #   Session เช็คชื่อ
│   ├── AttendanceSessionSection.js  # Section ที่เปิดเช็คชื่อ
│   ├── AttendanceRecord.js      #   บันทึกการเช็คชื่อ
│   ├── BonusScore.js            #   คะแนนโบนัส
│   ├── ExamSetting.js           #   ตั้งค่าการสอบ
│   ├── ExamScore.js             #   คะแนนสอบ
│   ├── StudentGroup.js          #   กลุ่มนักศึกษา
│   ├── StudentGroupMember.js    #   สมาชิกกลุ่ม
│   ├── QueueSession.js          #   Session คิวตรวจงาน
│   ├── QueueWorker.js           #   TA/ผู้ตรวจในคิว
│   ├── QueueBooking.js          #   การจองคิว
│   ├── QueueDeskStatus.js       #   สถานะโต๊ะในคิว
│   ├── Feedback.js              #   Feedback
│   ├── FcmToken.js              #   FCM Token
│   ├── NotificationLog.js       #   Log การส่ง Notification
│   ├── RefreshToken.js          #   Refresh Token (JWT)
│   ├── SystemLog.js             #   System Activity Log
│   ├── CourseActivityLog.js     #   Course Activity Log
│   ├── AssignmentAttendanceLink.js  # เชื่อมงานกับ Attendance
│   ├── TwoFactorPending.js      #   2FA Pending verification
│   ├── UserOAuthAccount.js      #   OAuth linked accounts
│   └── PasswordResetToken.js    #   Token สำหรับ reset password
├── routes/                      # ★ Route Definitions
│   ├── index.js                 #   ★ Mount ทุก route → /api/*
│   ├── auth.routes.js           #   /api/auth/*
│   ├── twoFactor.routes.js      #   /api/auth/2fa/*
│   ├── oauth.routes.js          #   /api/oauth/*
│   ├── user.routes.js           #   /api/users/*
│   ├── student.routes.js        #   /api/students/*
│   ├── course.routes.js         #   /api/courses/*
│   ├── classroom.routes.js      #   /api/classrooms/*
│   ├── assignment.routes.js     #   /api/assignments/*
│   ├── score.routes.js          #   /api/scores/*
│   ├── scoreEditRequest.routes.js   # /api/score-edit-requests/*
│   ├── attendance.routes.js     #   /api/attendance/*
│   ├── bonusScore.routes.js     #   /api/bonus-scores/*
│   ├── examScore.routes.js      #   /api/courses/*  (exam endpoints)
│   ├── queue.routes.js          #   /api/courses/:courseId/queue/*
│   ├── queuePublic.routes.js    #   /api/queue/* (public, ไม่ต้อง courseId)
│   ├── team.routes.js           #   /api/courses/:id/teams/*
│   ├── feedback.routes.js       #   /api/feedback/*
│   ├── notification.routes.js   #   /api/notifications/*
│   ├── courseActivityLog.routes.js  # /api/courses/:courseId/activity-logs/*
│   ├── system.routes.js         #   /api/system/*
│   ├── systemLog.routes.js      #   /api/logs/*
│   └── monitoring.routes.js     #   /api/metrics/*, /api/monitoring/*
├── utils/                       # Utility Functions
│   ├── index.js                 #   Export ทุก utility
│   ├── ApiError.js              #   ★ Custom Error class (400, 401, 403, 404, 500)
│   ├── asyncHandler.js          #   ★ Wrap async functions เพื่อ catch errors
│   ├── jwt.js                   #   ★ Token generation & verification
│   ├── logger.js                #   Winston logger configuration
│   ├── cache.js                 #   In-memory cache utility
│   ├── concurrency.js           #   Concurrency control (optimistic locking)
│   ├── queryHelpers.js          #   Pagination, sorting, filtering helpers
│   ├── emailService.js          #   Email sending (Resend / Nodemailer)
│   ├── fcmService.js            #   Firebase Cloud Messaging
│   ├── twoFactorService.js      #   TOTP generation & verification
│   ├── courseActivityLogger.js  #   Course activity log helper
│   ├── queueAssignmentWorker.js #   ★ Background worker (Redis → MySQL)
│   └── redisQueueService.js     #   ★ Redis operations สำหรับ Queue
├── validations/                 # Request Validation Rules
│   ├── index.js
│   ├── auth.validation.js       #   Login, register, change password rules
│   └── feedback.validation.js   #   Feedback validation rules
├── services/                    # (ว่าง — Business logic อยู่ใน controllers)
├── repositories/                # (ว่าง — Data access อยู่ใน controllers)
└── seeds/                       # Seed data
```

### Frontend (`front-end/`)

```
front-end/
├── middleware.ts                 # ★ Next.js Middleware (route protection pattern)
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── app/                         # ★ App Router (Pages)
│   ├── layout.tsx               #   ★ Root Layout — โหลด Providers ทั้งหมด
│   ├── providers.tsx            #   ★ Provider Stack (HeroUI, Theme, Socket, Notification, Auth)
│   ├── page.tsx                 #   หน้าหลัก (redirect ตาม role)
│   ├── globals.css              #   CSS Global styles
│   ├── error.tsx                #   Error Boundary
│   ├── not-found.tsx            #   404 Page
│   │
│   ├── login/                   #   หน้า Login
│   │   └── page.tsx
│   │
│   ├── auth/                    #   Authentication flows
│   │   ├── callback/            #     OAuth callback
│   │   ├── link-callback/       #     OAuth link account callback
│   │   ├── verify-2fa/          #     2FA verification
│   │   └── reset-password/      #     Reset password
│   │
│   ├── (instructor)/            #   ★ Route Group — หน้าสำหรับ Instructor/TA
│   │   ├── layout.tsx           #     Layout + Sidebar + Auth guard
│   │   ├── home/                #     Dashboard (รายวิชาของฉัน)
│   │   │   └── page.tsx
│   │   └── classroom/[id]/      #     ★ หน้าหลักของรายวิชา (Tab-based)
│   │       ├── page.tsx         #       ★ Main page — 3,000+ lines, Tab management
│   │       ├── layout.tsx
│   │       ├── hooks/           #       Custom hooks สำหรับแต่ละ feature
│   │       ├── components/      #       ★ Tab Components ทั้งหมด
│   │       │   ├── OverviewTab.tsx         # ภาพรวมรายวิชา
│   │       │   ├── SectionsTab.tsx         # จัดการ Sections
│   │       │   ├── PeopleTab.tsx           # จัดการนักศึกษา
│   │       │   ├── AssignmentsTab.tsx      # จัดการงาน/การบ้าน
│   │       │   ├── AttendanceTab.tsx       # ระบบเช็คชื่อ
│   │       │   ├── ScoreSummaryTab.tsx     # สรุปคะแนน
│   │       │   ├── ScoreApprovalTab.tsx    # อนุมัติแก้ไขคะแนน
│   │       │   ├── QueueTab.tsx            # ระบบคิวตรวจงาน
│   │       │   ├── TAStatsTab.tsx          # สถิติ TA
│   │       │   ├── ActivityLogTab.tsx      # Log กิจกรรม
│   │       │   ├── SettingsTab.tsx         # ตั้งค่ารายวิชา
│   │       │   ├── ScoreModal.tsx          # Modal ให้คะแนน
│   │       │   ├── BonusScoreModal.tsx     # Modal คะแนนโบนัส
│   │       │   ├── Skeletons.tsx           # Loading skeletons
│   │       │   ├── types.ts               # Shared types
│   │       │   ├── index.ts               # Exports
│   │       │   ├── overview/              # Sub-components ของ Overview
│   │       │   ├── sections/              # Sub-components ของ Sections
│   │       │   ├── assignments/           # Sub-components ของ Assignments
│   │       │   ├── attendance/            # Sub-components ของ Attendance
│   │       │   ├── exam-scores/           # Sub-components ของ Exam Scores
│   │       │   ├── score-summary/         # Sub-components ของ Score Summary
│   │       │   └── settings/              # Sub-components ของ Settings
│   │       ├── attendance/                # Live attendance monitoring page
│   │       └── queue/                     # Queue management page
│   │
│   ├── admin/                   #   หน้า Admin Panel
│   │   ├── layout.tsx           #     Admin Layout + Auth guard
│   │   ├── dashboard/           #     Admin Dashboard
│   │   ├── users/               #     จัดการผู้ใช้
│   │   ├── students/            #     จัดการนักศึกษา
│   │   ├── courses/             #     จัดการรายวิชา
│   │   ├── classrooms/          #     จัดการห้องเรียน
│   │   ├── feedback/            #     ดู Feedback
│   │   ├── logs/                #     ดู System Logs
│   │   ├── monitoring/          #     ★ System Monitoring (CPU, Memory, Containers)
│   │   └── profile/             #     แก้ไขโปรไฟล์
│   │
│   ├── myscore/                 #   นักศึกษาดูคะแนนตัวเอง
│   ├── attendance/              #   หน้า Live Attendance Monitor
│   ├── check-in/                #   นักศึกษาเช็คชื่อ (Public page)
│   ├── queue/                   #   ระบบคิว
│   │   ├── book/                #     นักศึกษาจองคิว
│   │   └── projector/           #     แสดงผลบน Projector
│   ├── profile/                 #   แก้ไขโปรไฟล์
│   └── permissions/             #   หน้าแสดง Permission denied
│
├── services/                    # ★ API Service Layer
│   ├── api.service.ts           #   ★ Base HTTP Client (fetch + auto token refresh)
│   ├── auth.service.ts          #   Authentication API calls
│   ├── user.service.ts          #   User management API
│   ├── student.service.ts       #   Student management API
│   ├── course.service.ts        #   Course management API
│   ├── classroom.service.ts     #   Classroom management API
│   ├── assignment.service.ts    #   Assignment management API
│   ├── score.service.ts         #   Score management API
│   ├── examScore.service.ts     #   Exam score API
│   ├── attendance.service.ts    #   Attendance API
│   ├── queue.service.ts         #   Queue system API
│   ├── bonusScore.service.ts    #   Bonus score API
│   ├── scoreEditRequest.service.ts  # Score edit request API
│   ├── team.service.ts          #   Team management API
│   ├── feedback.service.ts      #   Feedback API
│   ├── notification.service.ts  #   FCM Notification API
│   ├── system.service.ts        #   System info API
│   ├── systemLog.service.ts     #   System logs API
│   └── twoFactor.service.ts     #   2FA API
│
├── contexts/                    # React Contexts
│   ├── SocketContext.tsx         #   ★ Socket.IO connection + real-time events
│   ├── NotificationContext.tsx   #   FCM Push notification handling
│   └── AdminContext.tsx          #   Admin panel state management
│
├── hooks/                       # Custom React Hooks
│   ├── index.ts
│   ├── useApiCache.ts           #   Cache hook สำหรับ API responses
│   ├── useDebounce.ts           #   Debounce hook
│   ├── useMonitoringData.ts     #   Monitoring data polling
│   └── useVirtualList.ts        #   Virtual scrolling สำหรับ list ขนาดใหญ่
│
├── components/                  # Shared Components
│   ├── icons.tsx                #   SVG icons
│   ├── primitives.ts            #   Tailwind class helpers
│   ├── theme-switch.tsx         #   Dark/Light mode toggle
│   ├── counter.tsx              #   Animated counter
│   ├── auth/                    #   Auth guard components
│   ├── feedback/                #   Feedback components
│   ├── map/                     #   Map components (Leaflet)
│   ├── monitoring/              #   Monitoring charts
│   └── profile/                 #   Profile components
│
├── config/                      # Frontend Configuration
│   ├── api.ts                   #   ★ API URL + all endpoints
│   ├── design-tokens.ts         #   Design system tokens
│   ├── firebase.ts              #   Firebase config (FCM)
│   ├── fonts.ts                 #   Font configuration
│   └── site.ts                  #   Site metadata
│
├── types/                       # TypeScript Types
│   └── index.ts                 #   Shared type definitions
│
└── styles/                      # Global Styles
    └── globals.css
```

---

## 4. จุดเริ่มต้น — เริ่มอ่านโค้ดจากตรงไหน

### ลำดับการอ่านโค้ดที่แนะนำ

#### ขั้น 1: ทำความเข้าใจ Entry Points (เริ่มจากจุดเข้า)

| ลำดับ | ไฟล์ | เหตุผล |
|-------|------|--------|
| 1 | `back-end/src/app.js` | **เริ่มจากที่นี่เลย** — เป็น entry point ของ backend ทั้งหมด จะเห็น middleware chain, route mounting, server startup |
| 2 | `back-end/src/config/index.js` | ดูว่าระบบใช้ environment variables อะไรบ้าง |
| 3 | `back-end/src/routes/index.js` | ดู routing map ทั้งหมด — API endpoint ไหนไปที่ controller ไหน |
| 4 | `front-end/app/layout.tsx` | Entry point ของ frontend — Root Layout |
| 5 | `front-end/app/providers.tsx` | เข้าใจว่า Provider ถูกซ้อนกันอย่างไร |

#### ขั้น 2: ทำความเข้าใจ Core Patterns

| ลำดับ | ไฟล์ | เหตุผล |
|-------|------|--------|
| 6 | `back-end/src/middlewares/auth.js` | เข้าใจระบบ Auth — authenticate, authorize, optionalAuth |
| 7 | `back-end/src/utils/asyncHandler.js` | เข้าใจว่า error handling ทำงานอย่างไร — สำคัญมาก! |
| 8 | `back-end/src/utils/ApiError.js` | Custom Error class ที่ใช้ทั่วทั้งระบบ |
| 9 | `back-end/src/middlewares/errorHandler.js` | 3 layers ของ error handling |
| 10 | `front-end/services/api.service.ts` | **สำคัญมาก** — HTTP client ที่ทุก service ใช้ (auto refresh, retry, error handling) |

#### ขั้น 3: ศึกษา Feature ตัวอย่าง (Auth Flow)

| ลำดับ | ไฟล์ | เหตุผล |
|-------|------|--------|
| 11 | `back-end/src/routes/auth.routes.js` | ดู route definitions สำหรับ Auth |
| 12 | `back-end/src/controllers/auth.controller.js` | ดู business logic — login, register, token refresh |
| 13 | `back-end/src/config/passport.js` | ดู authentication strategies |
| 14 | `back-end/src/utils/jwt.js` | ดูการสร้าง/ตรวจสอบ JWT Token |
| 15 | `front-end/services/auth.service.ts` | ดูว่า frontend เรียก Auth API อย่างไร |
| 16 | `front-end/app/login/page.tsx` | ดูหน้า Login UI |

#### ขั้น 4: ศึกษา Database Layer

| ลำดับ | ไฟล์ | เหตุผล |
|-------|------|--------|
| 17 | `back-end/src/config/database.js` | Sequelize connection + pool |
| 18 | `back-end/src/models/index.js` | **สำคัญมาก** — Model associations ทั้งหมด (hasMany, belongsTo, belongsToMany) |
| 19 | `back-end/src/models/User.js` | ตัวอย่าง Model — ดู define, hooks, instance methods |
| 20 | `back-end/src/models/Course.js` | ตัวอย่างหลัก Model ที่มี relationships เยอะ |

#### ขั้น 5: ศึกษา Real-time & Queue

| ลำดับ | ไฟล์ | เหตุผล |
|-------|------|--------|
| 21 | `back-end/src/config/socket.js` | Socket.IO rooms ทั้งหมด + emit helpers |
| 22 | `front-end/contexts/SocketContext.tsx` | Socket connection ฝั่ง frontend + useRealtimeSync hook |
| 23 | `back-end/src/utils/redisQueueService.js` | Redis operations สำหรับ Queue |
| 24 | `back-end/src/utils/queueAssignmentWorker.js` | Background worker logic |

---

## 5. Backend Deep Dive

### 5.1 Entry Point — `app.js`

ไฟล์ `back-end/src/app.js` เป็นจุดเริ่มต้นของ backend ทั้งหมด ใช้จำนวนบรรทัดประมาณ 320 บรรทัด

**Middleware Chain (ลำดับสำคัญมาก):**

```
Request เข้ามา
  ↓
1. helmet()                 — Security headers (HTTPS, XSS, CSP)
2. cors(corsOptions)        — Cross-Origin Resource Sharing
3. rateLimit (120 req/min)  — ป้องกัน DDoS
4. authLimiter (login, 30 req/15min) — ป้องกัน brute force
5. express.json()           — Parse JSON body
6. cookieParser()           — Parse cookies
7. morgan()                 — HTTP logging
8. requestId()              — เพิ่ม unique ID ให้ทุก request (สำหรับ tracing)
9. requestTimeout(30000)    — Timeout 30 วินาที
10. slowQueryLogger(2000)   — Log request > 2 วินาที
11. passport.initialize()   — เตรียม authentication
12. express.static('/uploads') — Serve uploaded files
13. metricsMiddleware       — Prometheus metrics
14. requestLogger           — บันทึก POST/PUT/DELETE ลง SystemLog
15. routes (/api/*)         — ★ Route handlers
16. notFoundHandler         — จัดการ 404
17. errorConverter          — แปลง Error เป็น ApiError
18. errorHandler            — ส่ง JSON error response
```

**Server Startup:**

```javascript
// ลำดับการเริ่มต้น:
1. testConnection()          — ทดสอบ database connection
2. initializeRedis()         — เชื่อมต่อ Redis
3. startAssignmentWorker()   — เริ่ม background worker
4. server.listen()           — เปิดรับ HTTP + Socket.IO
5. setInterval(cleanup)      — ตั้ง scheduler ล้าง expired sessions ทุก 1 ชั่วโมง
```

### 5.2 Route → Controller Pattern

ทุก API endpoint ใช้ pattern เดียวกัน:

**Route file** (`routes/auth.routes.js`):
```javascript
// Pattern: router.METHOD(path, ...middlewares, controller)
router.post('/login', validate(authValidation.login), authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validate(authValidation.changePassword), authController.changePassword);
```

**หลักการ:**
1. **`validate(schema)`** — ตรวจสอบ request body/params ตาม Joi/express-validator schema
2. **`authenticate`** — ตรวจสอบ JWT token (จาก `Authorization: Bearer <token>`)
3. **`authorize('admin', 'instructor')`** — ตรวจสอบ role ของผู้ใช้
4. **`checkCourseActive`** — ตรวจสอบว่ารายวิชายังเปิดอยู่ (สำหรับ write operations)
5. **`controller.method`** — Business logic

**Controller function** (`controllers/auth.controller.js`):
```javascript
const login = asyncHandler(async (req, res, next) => {
  // 1. ดึง input จาก req.body
  // 2. Validate / Query database
  // 3. ทำ business logic
  // 4. ส่ง response
  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken }
  });
});
```

**Response format มาตรฐาน (ทุก API ใช้เหมือนกัน):**
```json
// Success
{ "success": true, "message": "...", "data": { ... } }

// Error
{ "success": false, "error": { "code": 400, "message": "..." } }
```

### 5.3 Error Handling — 3 ชั้น

1. **`asyncHandler(fn)`** — ครอบ async function: ถ้า throw error จะ `catch(next)` อัตโนมัติ
2. **`errorConverter`** — แปลง Error ธรรมดาเป็น `ApiError`
3. **`errorHandler`** — ส่ง JSON error response (production จะซ่อน stack trace)

**วิธีใช้ในทุก controller:**
```javascript
// ถ้าเจอ error → throw ApiError
if (!user) {
  throw ApiError.notFound('User not found');
}

// asyncHandler จะ catch ให้อัตโนมัติ → ไม่ต้อง try/catch ทุก function
```

### 5.4 Model — Sequelize ORM

**ตัวอย่าง Model (`models/User.js`):**
```javascript
const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'instructor', 'ta'), allowNull: false },
  // ... more fields
}, {
  tableName: 'users', // ชื่อตารางใน MySQL
  timestamps: true,   // auto-add created_at, updated_at
  underscored: true,  // ใช้ snake_case (ไม่ใช่ camelCase)
});
```

**Associations (`models/index.js`):**
```javascript
// One-to-Many: User มีหลาย Course
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'instructorCourses' });
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// Many-to-Many: Course มีหลาย Students (through CourseSectionStudent)
Course.belongsToMany(Student, { through: 'course_section_students', ... });
```

**การ Query ใน Controller:**
```javascript
const course = await Course.findByPk(id, {
  include: [
    { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
    { model: CourseSection, as: 'sections', include: [...] }
  ]
});
```

### 5.5 Utils ที่สำคัญ

| Utility | ไฟล์ | หน้าที่ |
|---------|------|--------|
| `asyncHandler` | `utils/asyncHandler.js` | ครอบ async → auto catch errors |
| `ApiError` | `utils/ApiError.js` | Custom Error class (400, 401, 403, 404, 409, 500) |
| `jwt` | `utils/jwt.js` | สร้าง/ตรวจสอบ Access Token + Refresh Token |
| `logger` | `utils/logger.js` | Winston logger (console + file) |
| `queryHelpers` | `utils/queryHelpers.js` | Pagination, sorting, filtering helpers |
| `emailService` | `utils/emailService.js` | ส่ง email (Resend API / Nodemailer) |
| `fcmService` | `utils/fcmService.js` | Firebase Push Notification |
| `twoFactorService` | `utils/twoFactorService.js` | TOTP generation (speakeasy) |
| `courseActivityLogger` | `utils/courseActivityLogger.js` | บันทึก activity log ของรายวิชา |
| `concurrency` | `utils/concurrency.js` | Optimistic locking สำหรับ concurrent updates |
| `cache` | `utils/cache.js` | In-memory cache (TTL-based) |

---

## 6. Frontend Deep Dive

### 6.1 Entry Point & Provider Stack

**เส้นทางการ Render:**
```
layout.tsx (Root Layout)
  └── providers.tsx (Provider Stack)
        ├── HeroUIProvider         — UI components + router
        ├── NextThemesProvider     — Dark/Light theme
        ├── SocketProvider         — Socket.IO connection
        ├── NotificationProvider   — FCM push notifications
        ├── AuthSyncProvider       — Cross-tab auth sync
        └── ToastProvider          — Toast notifications
              └── {children}       — Page content
```

### 6.2 Page Structure (App Router)

Next.js 15 ใช้ **App Router** — แต่ละโฟลเดอร์ใน `app/` = 1 route:

```
app/page.tsx                     →  /             (หน้าหลัก, redirect ตาม role)
app/login/page.tsx               →  /login
app/(instructor)/home/page.tsx   →  /home          (dashboard)
app/(instructor)/classroom/[id]  →  /classroom/123  (รายวิชา)
app/admin/dashboard/page.tsx     →  /admin/dashboard
app/check-in/[sessionId]         →  /check-in/456   (public)
app/queue/book/page.tsx          →  /queue/book
app/queue/projector/[sessionId]  →  /queue/projector/789
```

**Route Group `(instructor)/`:**
- วงเล็บ `()` ไม่ปรากฏใน URL — เป็นแค่การจัดกลุ่ม
- ใช้ `layout.tsx` ร่วมกัน (มี Sidebar, Auth guard)

### 6.3 Service Layer Pattern

ทุกหน้าเรียก API ผ่าน **Service** ไม่เรียก fetch โดยตรง:

```
Page (UI)
  ↓ เรียก
Service (เช่น courseService.getCourse(id))
  ↓ ใช้
apiService.get('/courses/123')     ← api.service.ts (singleton)
  ↓
fetch('http://backend:3001/api/courses/123', {
  headers: { Authorization: 'Bearer <token>' }
})
```

**ตัวอย่าง Service (`services/course.service.ts`):**
```typescript
class CourseService {
  async getMyCourses() {
    return apiService.get<Course[]>(API_ENDPOINTS.COURSES.MY_COURSES);
  }

  async getCourse(id: string) {
    return apiService.get<Course>(API_ENDPOINTS.COURSES.BY_ID(id));
  }

  async createCourse(data: CreateCourseData) {
    return apiService.post(API_ENDPOINTS.COURSES.CREATE, data);
  }
}

export const courseService = new CourseService();
```

**เรียกใช้ใน Page:**
```tsx
const response = await courseService.getMyCourses();
if (response.success) {
  setCourses(response.data);
}
```

### 6.4 API Service — Auto Token Refresh

`api.service.ts` เป็นตัวกลางที่จัดการ:
1. **แนบ JWT Token** อัตโนมัติ (`Authorization: Bearer <token>`)
2. **Auto Refresh Token** — ถ้าได้ 401 จะ refresh แล้ว retry request
3. **Rate Limit Retry** — ถ้าได้ 429 จะ retry พร้อม exponential backoff
4. **Network Error Retry** — retry สูงสุด 3 ครั้ง
5. **Redirect to Login** — ถ้า refresh ไม่ได้จะส่งไปหน้า Login

### 6.5 Instructor Dashboard — หน้าหลักของระบบ

**ไฟล์:** `app/(instructor)/classroom/[id]/page.tsx` (~3,000 บรรทัด)

นี่คือหน้าที่ซับซ้อนที่สุดของระบบ เป็น **Tab-based dashboard** ที่มี:

| Tab | Component | หน้าที่ |
|-----|-----------|--------|
| ภาพรวม | `OverviewTab.tsx` | สรุปข้อมูลรายวิชา, สถิติ, กราฟ |
| เซคชัน | `SectionsTab.tsx` | จัดการ Section + นักศึกษา |
| รายชื่อ | `PeopleTab.tsx` | ดูรายชื่อทั้งหมด |
| งาน | `AssignmentsTab.tsx` | CRUD งาน, Sub-items |
| เช็คชื่อ | `AttendanceTab.tsx` | สร้าง/จัดการ Session เช็คชื่อ |
| คะแนนรวม | `ScoreSummaryTab.tsx` | ดูคะแนนรวมทุกงาน |
| อนุมัติ | `ScoreApprovalTab.tsx` | อนุมัติคำขอแก้ไขคะแนน |
| คิว | `QueueTab.tsx` | จัดการ Queue session |
| สถิติ TA | `TAStatsTab.tsx` | ดูสถิติการทำงานของ TA |
| บันทึก | `ActivityLogTab.tsx` | Activity logs |
| ตั้งค่า | `SettingsTab.tsx` | ตั้งค่ารายวิชา |

**Performance Optimization:**
- Tab components ใช้ `dynamic(() => import(...), { ssr: false })` — **Lazy Load**
- โหลดเฉพาะ Tab ที่ผู้ใช้กดดู ไม่โหลดทั้งหมดพร้อมกัน
- มี Loading Skeleton สำหรับแต่ละ Tab

### 6.6 Real-time Sync (SocketContext)

```tsx
// วิธีใช้ real-time sync ใน Page หรือ Component:
import { useRealtimeSync } from "@/contexts/SocketContext";

function MyComponent() {
  const { isConnected } = useRealtimeSync(
    ['course', 'student'],   // resources ที่ต้องการ subscribe
    () => {                   // callback เมื่อมีการ update
      fetchData();            // โหลดข้อมูลใหม่
    }
  );
}
```

**Flow:**
1. Frontend `emit('data-change', { resource: 'course', action: 'update', id: '123' })`
2. Backend Socket.IO broadcast ไปทุก client ใน room `global-updates`
3. Frontend ทุกตัวที่ subscribe `course` จะได้รับ event → โหลดข้อมูลใหม่

---

## 7. วงจรชีวิตของ Request (Request Lifecycle)

### ตัวอย่าง: ผู้ใช้กดดูรายวิชา

```
┌──────────────────────────────────────────────────────────────────┐
│  ① Frontend: User clicks on a course                            │
│                                                                  │
│  courseService.getCourse('5')                                    │
│    ↓                                                            │
│  apiService.get('/courses/5')                                   │
│    ↓                                                            │
│  fetch('http://backend/api/courses/5', {                        │
│    headers: { Authorization: 'Bearer eyJhbGc...' }              │
│  })                                                              │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP GET
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ② Backend: Middleware Chain                                     │
│                                                                  │
│  helmet → cors → rateLimit → json() → cookie                    │
│  → morgan → requestId → timeout → slowQuery                     │
│  → passport → metricsMiddleware → requestLogger                 │
│    ↓                                                            │
│  Route matching: GET /api/courses/5                              │
│    ↓                                                            │
│  routes/course.routes.js:                                       │
│    router.get('/:id', authenticate, courseController.getCourse)  │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ③ authenticate middleware (middlewares/auth.js)                 │
│                                                                  │
│  passport.authenticate('jwt', ...) → ดึง token จาก Header      │
│    ↓                                                            │
│  passport.js JwtStrategy → jwt.verify(token) → User.findByPk   │
│    ↓                                                            │
│  ถ้าสำเร็จ: req.user = user → next()                           │
│  ถ้าล้มเหลว: ApiError.unauthorized('Invalid token')            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ④ Controller (controllers/course.controller.js)                │
│                                                                  │
│  const getCourse = asyncHandler(async (req, res) => {           │
│    const course = await Course.findByPk(req.params.id, {        │
│      include: [                                                  │
│        { model: User, as: 'instructor' },                       │
│        { model: CourseSection, as: 'sections' }                 │
│      ]                                                          │
│    });                                                          │
│                                                                  │
│    if (!course) throw ApiError.notFound('Course not found');     │
│                                                                  │
│    res.json({ success: true, data: course });                   │
│  });                                                            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ⑤ Sequelize ORM → MySQL                                       │
│                                                                  │
│  SELECT c.*, u.id, u.full_name                                  │
│  FROM courses c                                                  │
│  LEFT JOIN users u ON c.instructor_id = u.id                    │
│  WHERE c.id = 5;                                                │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ⑥ Response → Frontend                                         │
│                                                                  │
│  { success: true, data: { id: 5, name: "...", ... } }          │
│    ↓                                                            │
│  apiService receives response → return data to courseService     │
│    ↓                                                            │
│  Page setState → React re-render → แสดงข้อมูล                  │
└──────────────────────────────────────────────────────────────────┘
```

### ตัวอย่าง: Error Flow

```
Controller: throw ApiError.notFound('Course not found')
  ↓
asyncHandler catch → next(error)
  ↓
errorConverter: (ไม่ต้องแปลง เพราะเป็น ApiError แล้ว) → next(error)
  ↓
errorHandler: res.status(404).json({
  success: false,
  error: { code: 404, message: 'Course not found' }
})
  ↓
Frontend apiService: receives { success: false, error: '...' }
  ↓
Page: shows error toast notification
```

---

## 8. ระบบ Authentication & Authorization

### 8.1 Login Flow (แบบเต็ม)

```
┌─── Frontend ────────────────────────────────────────────────┐
│  1. User กรอก username/password                             │
│  2. authService.login({ username, password })               │
│  3. apiService.post('/auth/login', body)                    │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─── Backend ─────────────────────────────────────────────────┐
│  4. POST /api/auth/login                                    │
│     → validate(authValidation.login)                        │
│       - ตรวจ username ไม่ว่าง                                │
│       - ตรวจ password ไม่ว่าง                                │
│     → authController.login                                  │
│                                                             │
│  5. passport.authenticate('local') ทำงาน:                   │
│     - User.findOne({ username })                            │
│     - user.comparePassword(password) → bcrypt.compare()     │
│     - ถ้าผิด → return error                               │
│                                                             │
│  6. ตรวจสอบ 2FA:                                            │
│     - ถ้าเปิด 2FA → return requiresTwoFactor: true          │
│     - ถ้าไม่ได้เปิด → ดำเนินการต่อ                          │
│                                                             │
│  7. สร้าง Tokens:                                           │
│     - Access Token (JWT, หมดอายุ 15 นาที)                   │
│     - Refresh Token (JWT, หมดอายุ 1 วัน)                    │
│     - บันทึก RefreshToken ลง Database                       │
│                                                             │
│  8. บันทึก Login Log → SystemLog                            │
│                                                             │
│  9. Return response:                                        │
│     { success: true, data: {                                │
│       user: {...}, accessToken, refreshToken                │
│     }}                                                      │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─── Frontend ────────────────────────────────────────────────┐
│  10. เก็บ tokens ใน localStorage:                           │
│      - localStorage.setItem('accessToken', tokenA)          │
│      - localStorage.setItem('refreshToken', tokenR)         │
│      - localStorage.setItem('user', JSON.stringify(user))   │
│                                                             │
│  11. Redirect ไปหน้าหลักตาม role:                           │
│      - admin → /admin/dashboard                             │
│      - instructor/ta → /home                                │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Token Refresh Flow

```
Frontend เรียก API → ได้ 401 (token หมดอายุ)
  ↓
apiService ตรวจพบ 401:
  ↓
POST /api/auth/refresh { refreshToken }
  ↓
Backend:
  → verifyRefreshToken(token)
  → ตรวจ token ใน DB (ยังไม่ถูก revoke)
  → Revoke token เก่า
  → สร้าง token ใหม่ทั้งคู่
  → Return new { accessToken, refreshToken }
  ↓
apiService:
  → เก็บ token ใหม่ใน localStorage
  → Retry request เดิมด้วย token ใหม่
  → ถ้า refresh ไม่ได้ → redirect ไป /login
```

### 8.3 Authorization (Role-based)

```javascript
// ใน route file:
router.post('/users', authenticate, authorize('admin'), userController.create);
//                     ↑ ต้อง login  ↑ ต้องเป็น admin

// authorize middleware:
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('Access denied'));
  }
  next();
};
```

**Roles ในระบบ:**
| Role | สิทธิ์ |
|------|-------|
| `admin` | จัดการทุกอย่าง (users, courses, classrooms, system) |
| `instructor` | จัดการรายวิชาของตัวเอง, สร้าง attendance, ให้คะแนน |
| `ta` | จัดการรายวิชาที่ได้รับมอบหมาย, ตรวจงาน, เช็คชื่อ |
| (student) | ไม่มี User account — ใช้ student_id + check-in code |

### 8.4 OAuth Flow (Google, GitHub, Apple)

```
1. Frontend: window.open('/api/oauth/google')
2. Backend: passport.authenticate('google') → redirect to Google
3. Google: User ยืนยัน → redirect กลับ /api/oauth/google/callback
4. Backend: callback handler → หา/สร้าง User → สร้าง tokens
5. Backend: redirect ไป Frontend พร้อม tokens ผ่าน URL params
6. Frontend: /auth/callback → ดึง tokens → เก็บ localStorage
```

### 8.5 Two-Factor Authentication (2FA)

```
เปิดใช้ 2FA:
1. POST /api/auth/2fa/setup → สร้าง TOTP secret + QR code
2. User สแกน QR code ด้วย Google Authenticator
3. POST /api/auth/2fa/verify → ยืนยัน OTP ครั้งแรก

Login ด้วย 2FA:
1. POST /api/auth/login → return { requiresTwoFactor: true, userId }
2. User กรอก OTP
3. POST /api/auth/2fa/verify-login → ตรวจ OTP → return tokens
```

---

## 9. Real-time Communication (Socket.IO)

### 9.1 Architecture

```
Frontend (React)                    Backend (Node.js)
┌────────────────┐                 ┌────────────────┐
│ SocketContext   │  WebSocket     │ socket.js       │
│ ┌────────────┐ │ ◄────────────► │ ┌────────────┐  │
│ │   io()     │ │                │ │ io.on(conn) │  │
│ └────────────┘ │                │ └────────────┘  │
│                │                │                  │
│  emit('join-   │                │  Rooms:          │
│   attendance', │   ────────►   │  attendance-123  │
│   sessionId)   │                │  queue-456       │
│                │                │  worker-789      │
│  on('student-  │   ◄────────   │  global-updates  │
│   checked-in', │                │  global-courses  │
│   callback)    │                │                  │
└────────────────┘                └────────────────┘
```

### 9.2 Room Types

| Room | การใช้งาน | ตัวอย่าง |
|------|----------|---------|
| `attendance-{sessionId}` | เช็คชื่อ: ส่ง update เมื่อนักศึกษา check-in | นักศึกษา check-in → อาจารย์เห็นทันที |
| `instructor-{sessionId}` | อาจารย์: รับ update เช็คชื่อ | อาจารย์เห็นสถานะ realtime |
| `queue-{sessionId}` | คิวตรวจงาน: ส่ง update สถานะคิว | นักศึกษาเห็นลำดับคิวเปลี่ยน |
| `worker-{userId}` | TA: รับงานที่ถูก assign | TA ได้รับ notification มีงานใหม่ |
| `booking-{bookingId}` | นักศึกษา: รับ update สถานะจอง | นักศึกษาเห็นว่าถูกเรียกแล้ว |
| `classroom-{classroomId}` | ข้อมูลห้องเรียน: sync changes | หลาย tab เปิดพร้อมกัน → sync |
| `global-updates` | ทุก resource: generic data sync | หลาย user แก้ไขพร้อมกัน → เห็นเหมือนกัน |
| `global-courses` | รายวิชา: backward compatible | legacy event |

### 9.3 Emit Helpers (Backend)

```javascript
// จาก back-end/src/config/socket.js:

emitToAttendance(sessionId, 'student-checked-in', { studentId, status })
// → ส่งไป room: attendance-{sessionId} + instructor-{sessionId}

emitDataUpdate('course', 'update', courseId) 
// → ส่งไป room: global-updates

emitToClassroom(classroomId, 'desk-updated', { deskId, status })
// → ส่งไป room: classroom-{classroomId}
```

### 9.4 SocketContext (Frontend)

```tsx
// front-end/contexts/SocketContext.tsx

// Hook: useRealtimeSync — ใช้ง่ายสุด
const { isConnected } = useRealtimeSync(
  ['course', 'assignment'],     // resources
  () => fetchData(),            // callback เมื่อมีอัปเดต
);

// Hook: useSocket — ใช้ละเอียดกว่า  
const { socket, emit, on, emitDataUpdate, onResourceUpdate } = useSocket();

// ตัวอย่าง: ฟังเฉพาะ event ของ attendance
const { onResourceUpdate } = useSocket();
useEffect(() => {
  const unsubscribe = onResourceUpdate('attendance', (data) => {
    console.log('Attendance updated:', data);
    refreshAttendance();
  });
  return unsubscribe;
}, []);
```

---

## 10. ระบบคิวตรวจงาน (Queue System)

### 10.1 Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                     Queue System Architecture                      │
│                                                                   │
│  ① Student จองคิว:                                               │
│     POST /api/courses/:id/queue/bookings → เข้า Redis Queue      │
│                                                                   │
│  ② Background Worker (queueAssignmentWorker.js):                 │
│     ┌─────────────────────────────────────────────────┐           │
│     │  loop ทุก 100ms:                                 │           │
│     │  1. popNextBooking() จาก Redis                   │           │
│     │  2. popAvailableWorker() จาก Redis               │           │
│     │  3. assign booking → worker                      │           │
│     │  4. emit socket event → worker + student         │           │
│     │  5. sync to MySQL (async)                        │           │
│     └─────────────────────────────────────────────────┘           │
│                                                                   │
│  ③ TA/Worker รับงาน:                                              │
│     Socket event → worker-{userId} room                           │
│     TA เห็นชื่อนักศึกษา + โต๊ะที่ต้องไปตรวจ                       │
│                                                                   │
│  ④ TA ให้คะแนน:                                                  │
│     POST /api/courses/:id/queue/bookings/:id/complete             │
│     → อัปเดตคะแนน + ปล่อย worker → พร้อมรับงานใหม่               │
│                                                                   │
│  ⑤ Projector:                                                    │
│     /queue/projector/:sessionId                                   │
│     → แสดงสถานะคิวแบบ realtime บนจอ Projector                    │
└───────────────────────────────────────────────────────────────────┘
```

### 10.2 Data Flow in Redis

```
Redis Keys:
├── queue:{sessionId}:bookings    → Sorted Set (booking queue, sorted by time)
├── queue:{sessionId}:workers     → List (available workers/TAs)
├── queue:{sessionId}:worker:{id} → Hash (worker state: available/busy/offline)
├── queue:{sessionId}:desk:{id}   → Hash (desk state)
├── queue:{sessionId}:booking:{id}→ Hash (booking details)
├── queue:{sessionId}:active      → String (session active flag)
└── queue:{sessionId}:lock        → String (assignment lock, prevent race condition)
```

### 10.3 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `back-end/src/controllers/queue.controller.js` | API endpoints ทั้งหมดของ Queue |
| `back-end/src/routes/queue.routes.js` | Route definitions (protected) |
| `back-end/src/routes/queuePublic.routes.js` | Public routes (จอง, ดูสถานะ) |
| `back-end/src/utils/redisQueueService.js` | Redis operations |
| `back-end/src/utils/queueAssignmentWorker.js` | Background worker |
| `front-end/app/(instructor)/classroom/[id]/components/QueueTab.tsx` | UI สำหรับ instructor |
| `front-end/app/queue/book/page.tsx` | UI สำหรับนักศึกษาจองคิว |
| `front-end/app/queue/projector/[sessionId]/page.tsx` | UI สำหรับ Projector |
| `front-end/services/queue.service.ts` | Frontend API calls |

---

## 11. Database & Model Associations

### 11.1 Core Relationships

```
User (admin/instructor/ta)
  ├── has many → Course (instructor_id)
  ├── has many → RefreshToken (user_id)
  ├── has many → SystemLog (actor_user_id)
  ├── belongs to many → Course (through CourseInstructor)
  └── has many → CourseTA (user_id)

Student
  ├── belongs to many → CourseSection (through CourseSectionStudent)
  ├── has many → Score
  ├── has many → AttendanceRecord
  ├── has many → QueueBooking
  └── has many → ExamScore

Course
  ├── belongs to → User (instructor)
  ├── has many → CourseSection
  ├── has many → Assignment
  ├── has many → AttendanceSession
  ├── has many → QueueSession
  └── has many → CourseActivityLog

Assignment
  ├── belongs to → Course
  ├── has many → AssignmentSubItem
  ├── has many → Score
  └── has many → AssignmentAttendanceLink

AttendanceSession
  ├── belongs to → Course
  ├── has many → AttendanceRecord
  └── has many → AttendanceSessionSection
```

### 11.2 ดูรายละเอียดเพิ่ม

→ ดู **`DATA_DICTIONARY.md`** สำหรับข้อมูลทุกตาราง, ทุกคอลัมน์, ER Diagram เต็ม

→ ดู **`back-end/src/models/index.js`** สำหรับ Association Code ทั้งหมด (~870 บรรทัด)

---

## 12. DevOps — Docker & CI/CD

### 12.1 Docker Architecture

```
Development Environment (docker-compose.dev.yml):
┌──────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────┐
│  Traefik │  │   Backend     │  │   Frontend   │  │   Redis   │
│  (Proxy) │  │  (Express.js) │  │  (Next.js)   │  │  (Queue)  │
│  :80,:443│  │  :3001        │  │  :3000       │  │  :6379    │
└──────────┘  └───────────────┘  └──────────────┘  └───────────┘
     ↕ SSL          ↕                   ↕                ↕
  ─── itii-network (Docker Network) ───────────────────────

Production Environment (docker-compose.prod.yml):
┌───────────────┐  ┌──────────────┐  ┌───────────┐
│   Backend     │  │   Frontend   │  │   Redis   │
│  :3011→3001   │  │  :3010→3000  │  │  internal │
└───────────────┘  └──────────────┘  └───────────┘
     ↕                   ↕
  ─── itii-network ─── → Nginx (external reverse proxy)
```

### 12.2 Jenkins CI/CD Pipeline

```
Jenkinsfile.prod:

① Checkout        → git clone / pull
② Inject Secrets  → withCredentials() → สร้าง .env.prod
③ Build Images    → docker compose build (backend + frontend)
④ Deploy          → docker compose down → docker compose up -d
⑤ Health Check    → curl /api/health → ถ้า fail จะ rollback
⑥ Cleanup         → docker image prune (ลบ old images)
```

### 12.3 Environment Variables

Backend `.env`:
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
REDIS_HOST, REDIS_PORT
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
FRONTEND_URL
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
```

Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL          → Backend API URL
NEXT_PUBLIC_SOCKET_URL       → Socket.IO URL
NEXT_PUBLIC_FRONTEND_URL     → Frontend URL
NEXT_PUBLIC_GOOGLE_CLIENT_ID → Google OAuth
NEXT_PUBLIC_CLOUD            → Cloud storage setting
```

---

## 13. Design Patterns ที่ใช้ในโปรเจกต์

### 13.1 Backend Patterns

| Pattern | อธิบาย | ตัวอย่างในโค้ด |
|---------|--------|---------------|
| **MVC (Model-View-Controller)** | แยก Model, Controller, Routes | `models/` → `controllers/` → `routes/` |
| **Middleware Chain** | ผ่าน middleware หลายตัวก่อนถึง controller | `app.js` — helmet → cors → auth → route |
| **Async Handler** | ครอบ async function เพื่อ auto catch error | `utils/asyncHandler.js` |
| **Singleton** | Instance เดียวของ Sequelize, Redis, Socket.IO | `config/database.js`, `config/redis.js` |
| **Strategy Pattern** | Passport.js ใช้หลาย strategy (JWT, Local, Google, GitHub, Apple) | `config/passport.js` |
| **Observer Pattern** | Socket.IO emit/on events | `config/socket.js` |
| **Producer-Consumer** | API เป็น producer → Redis queue → Worker เป็น consumer | `queueAssignmentWorker.js` |
| **Factory Method** | `ApiError.notFound()`, `ApiError.unauthorized()` | `utils/ApiError.js` |
| **Repository Pattern** (implicit) | Sequelize Models ทำหน้าที่เป็น repository | `models/*.js` |

### 13.2 Frontend Patterns

| Pattern | อธิบาย | ตัวอย่างในโค้ด |
|---------|--------|---------------|
| **Service Layer** | แยก API calls ออกจาก UI components | `services/*.service.ts` |
| **Context Provider** | แชร์ state ระหว่าง components | `contexts/SocketContext.tsx` |
| **Custom Hooks** | Encapsulate logic เป็น reusable hooks | `hooks/useDebounce.ts`, `useApiCache.ts` |
| **Lazy Loading** | โหลด component ตอนที่ต้องการใช้ | `dynamic(() => import('./OverviewTab'))` |
| **Compound Components** | Tab components แยกเป็น sub-components | `components/attendance/`, `components/sections/` |
| **Render Props / Callbacks** | Pass functions ให้ child components | Tab components รับ callbacks |
| **Optimistic UI** | อัปเดต UI ก่อน → confirm กับ server ทีหลัง | Score editing, attendance marking |

---

## 14. วิธีเพิ่มฟีเจอร์ใหม่ (Step-by-Step)

### ตัวอย่าง: เพิ่มระบบ "ประกาศ (Announcement)" ให้อาจารย์ส่งข้อความไปยังนักศึกษา

#### Step 1: สร้าง Database Migration

สร้างไฟล์ `back-end/migrations/019_announcements.sql`:
```sql
CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Step 2: สร้าง Model

สร้างไฟล์ `back-end/src/models/Announcement.js`:
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  course_id: { type: DataTypes.BIGINT, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  created_by: { type: DataTypes.BIGINT, allowNull: false },
}, {
  tableName: 'announcements',
  timestamps: true,
  underscored: true,
});

module.exports = Announcement;
```

เพิ่มใน `back-end/src/models/index.js`:
```javascript
// Import
const Announcement = require('./Announcement');

// Associations
Course.hasMany(Announcement, { foreignKey: 'course_id', as: 'announcements' });
Announcement.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Announcement.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Export
module.exports = { ..., Announcement };
```

#### Step 3: สร้าง Controller

สร้างไฟล์ `back-end/src/controllers/announcement.controller.js`:
```javascript
const { Announcement, Course, User } = require('../models');
const { asyncHandler, ApiError } = require('../utils');

const getAnnouncements = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const announcements = await Announcement.findAll({
    where: { course_id: courseId },
    include: [{ model: User, as: 'creator', attributes: ['id', 'full_name'] }],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, data: announcements });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, content } = req.body;
  
  const announcement = await Announcement.create({
    course_id: courseId,
    title,
    content,
    created_by: req.user.id,
  });
  
  // Emit socket event for real-time
  const io = req.app.get('io');
  io.to(`global-updates`).emit('data-updated', {
    resource: 'announcement', action: 'create',
    id: announcement.id, timestamp: Date.now(),
  });
  
  res.status(201).json({ success: true, data: announcement });
});

module.exports = { getAnnouncements, createAnnouncement };
```

เพิ่มใน `back-end/src/controllers/index.js`:
```javascript
const announcementController = require('./announcement.controller');
module.exports = { ..., announcementController };
```

#### Step 4: สร้าง Route

สร้างไฟล์ `back-end/src/routes/announcement.routes.js`:
```javascript
const express = require('express');
const router = express.Router({ mergeParams: true });
const { announcementController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares');

router.get('/', authenticate, announcementController.getAnnouncements);
router.post('/', authenticate, authorize('admin', 'instructor'), announcementController.createAnnouncement);

module.exports = router;
```

เพิ่มใน `back-end/src/routes/index.js`:
```javascript
const announcementRoutes = require('./announcement.routes');
router.use('/courses/:courseId/announcements', announcementRoutes);
```

#### Step 5: สร้าง Frontend Service

สร้างไฟล์ `front-end/services/announcement.service.ts`:
```typescript
import apiService from './api.service';

class AnnouncementService {
  async getAnnouncements(courseId: string) {
    return apiService.get(`/courses/${courseId}/announcements`);
  }
  
  async createAnnouncement(courseId: string, data: { title: string; content: string }) {
    return apiService.post(`/courses/${courseId}/announcements`, data);
  }
}

export const announcementService = new AnnouncementService();
```

#### Step 6: สร้าง Frontend Component

สร้าง Tab component ใน `front-end/app/(instructor)/classroom/[id]/components/AnnouncementTab.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { announcementService } from "@/services/announcement.service";

export default function AnnouncementTab({ courseId }: { courseId: string }) {
  const [announcements, setAnnouncements] = useState([]);
  
  const fetchAnnouncements = async () => {
    const res = await announcementService.getAnnouncements(courseId);
    if (res.success) setAnnouncements(res.data);
  };
  
  useEffect(() => { fetchAnnouncements(); }, [courseId]);
  
  return (
    <div className="space-y-4">
      {announcements.map((a) => (
        <Card key={a.id}>
          <CardBody>
            <h3 className="font-bold">{a.title}</h3>
            <p>{a.content}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

#### Step 7: เพิ่ม Tab ในหน้าหลัก

แก้ไข `front-end/app/(instructor)/classroom/[id]/page.tsx`:
- Import `AnnouncementTab` ด้วย `dynamic`
- เพิ่มใน Tab list
- เพิ่ม Tab panel

#### สรุปไฟล์ที่ต้องสร้าง/แก้ไข:

| ไฟล์ | Action |
|------|--------|
| `back-end/migrations/019_announcements.sql` | สร้างใหม่ |
| `back-end/src/models/Announcement.js` | สร้างใหม่ |
| `back-end/src/models/index.js` | แก้ไข (เพิ่ม import + associations) |
| `back-end/src/controllers/announcement.controller.js` | สร้างใหม่ |
| `back-end/src/controllers/index.js` | แก้ไข (เพิ่ม export) |
| `back-end/src/routes/announcement.routes.js` | สร้างใหม่ |
| `back-end/src/routes/index.js` | แก้ไข (เพิ่ม mount) |
| `front-end/services/announcement.service.ts` | สร้างใหม่ |
| `front-end/app/.../AnnouncementTab.tsx` | สร้างใหม่ |
| `front-end/app/.../page.tsx` | แก้ไข (เพิ่ม Tab) |

---

## 15. วิธีแก้ไขฟีเจอร์เดิม

### ตัวอย่าง 1: แก้ไข Business Logic ของการเช็คชื่อ

1. **หา Controller:** `back-end/src/controllers/attendance.controller.js`
2. **หา Function:** ค้นหา function ที่เกี่ยวข้อง (เช่น `checkIn`, `createSession`)
3. **แก้ไข Logic:** ภายใน function นั้น
4. **ทดสอบ:** เรียก API ผ่าน Postman หรือ Frontend

### ตัวอย่าง 2: แก้ไข UI ของหน้าให้คะแนน

1. **หา Page:** `front-end/app/(instructor)/classroom/[id]/components/ScoreModal.tsx`
2. **ดูว่า Service อะไร:** ดู import → `score.service.ts`
3. **แก้ไข UI:** ใช้ HeroUI components
4. **ทดสอบ:** เปิด browser ดูหน้าที่แก้ไข

### ตัวอย่าง 3: เพิ่ม field ใหม่ให้กับ Student

1. **สร้าง Migration:** `back-end/migrations/019_add_field_to_students.sql`
   ```sql
   ALTER TABLE students ADD COLUMN phone VARCHAR(20) NULL;
   ```
2. **แก้ Model:** `back-end/src/models/Student.js` — เพิ่ม field
3. **แก้ Controller:** `back-end/src/controllers/student.controller.js` — รวม field ใหม่
4. **แก้ Frontend:** `front-end/services/student.service.ts` — เพิ่ม type
5. **แก้ UI:** หน้าที่แสดง/แก้ไขข้อมูลนักศึกษา

### วิธีค้นหาโค้ดที่เกี่ยวข้อง

```
1. รู้ API endpoint? → ค้นใน routes/ → หา controller → หา model
2. รู้หน้าจอ?       → ค้นใน app/ → หา component → หา service → หา API
3. รู้ database?     → ค้นใน models/ → หา controller ที่ใช้ → หา route
4. รู้ชื่อ feature?  → ค้นใน controllers/ โดยดูชื่อไฟล์
```

---

## 16. คำถามที่กรรมการมักถาม & แนวทางตอบ

### Q1: "ระบบนี้ใช้สถาปัตยกรรมอะไร?"

**แนวตอบ:** ใช้ **Client-Server Architecture** แบบ RESTful API
- Frontend: Next.js 15 (React) ทำหน้าที่ Render UI, เรียก API ผ่าน HTTP
- Backend: Express.js ให้บริการ REST API, จัดการ Business Logic
- Real-time: Socket.IO สำหรับ bidirectional communication (เช็คชื่อ, คิว)
- Database: MySQL + Sequelize ORM
- Caching/Queue: Redis สำหรับระบบคิวตรวจงาน

### Q2: "Authentication ทำอย่างไร?"

**แนวตอบ:** ใช้ **JWT (JSON Web Token)** + **Passport.js**
- Login → สร้าง Access Token (15 นาที) + Refresh Token (1 วัน)
- ทุก API call แนบ `Authorization: Bearer <token>` ผ่าน Header
- Token หมดอายุ → Auto refresh ผ่าน Refresh Token
- รองรับ OAuth: Google, GitHub, Apple Sign-in
- รองรับ 2FA: TOTP (Google Authenticator) + Email OTP
- **ดูโค้ด:** `back-end/src/config/passport.js`, `back-end/src/utils/jwt.js`

### Q3: "Security มีอะไรบ้าง?"

**แนวตอบ:**
- **Helmet.js** — HTTP Security Headers (XSS, CSP, HSTS)
- **CORS** — จำกัด origin ที่เรียกได้
- **Rate Limiting** — 120 req/min ปกติ, 30 req/15min สำหรับ login
- **Password Hashing** — bcrypt (salt rounds)
- **JWT** — Token-based auth, refresh token rotation
- **2FA** — TOTP + backup codes
- **SQL Injection Protection** — Sequelize ORM (parameterized queries)
- **Input Validation** — Joi + express-validator
- **SSL/TLS** — HTTPS via Traefik/Nginx
- **ดูโค้ด:** `back-end/src/app.js` บรรทัด 26-112

### Q4: "Real-time ทำอย่างไร?"

**แนวตอบ:** ใช้ **Socket.IO** (WebSocket with fallback to polling)
- Server-side: `back-end/src/config/socket.js` — จัดการ rooms + emit helpers
- Client-side: `front-end/contexts/SocketContext.tsx` — React Context + custom hooks
- ใช้ระบบ "Rooms" — แยกกลุ่ม event ตาม feature (attendance, queue, classroom)
- Emit helpers: `emitToAttendance()`, `emitDataUpdate()` — เรียกจาก Controller
- Frontend hook: `useRealtimeSync(['course'], callback)` — subscribe ง่ายๆ

### Q5: "Database Design เป็นอย่างไร?"

**แนวตอบ:** MySQL 36 ตาราง, ใช้ Sequelize ORM
- Relational Database Design — มี Foreign Keys, Indexes
- Normalized tables — ลด redundancy
- Many-to-Many relationships ใช้ junction tables (CourseSectionStudent, CourseInstructor)
- Soft delete ผ่าน `is_active` flag (ไม่ลบจริง)
- Timestamps ทุกตาราง (`created_at`, `updated_at`)
- **ดูโค้ด:** `DATA_DICTIONARY.md`, `back-end/src/models/index.js`

### Q6: "Performance Optimization ทำอะไรบ้าง?"

**แนวตอบ:**
- **Database:** Connection Pool (max 25), Performance Indexes, Optimistic Locking
- **Backend:** In-memory cache (30s TTL สำหรับ Queue sessions), Slow query logging
- **Frontend:** Lazy Loading (dynamic imports), Virtual Scrolling, Debouncing
- **Queue:** Redis-based queue ลด DB load, Background Worker แยก process
- **Monitoring:** Prometheus metrics + Grafana dashboards
- **ดูโค้ด:** `back-end/src/config/database.js`, `back-end/src/middlewares/performance.middleware.js`

### Q7: "Deploy อย่างไร?"

**แนวตอบ:** ใช้ **Docker Compose** + **Jenkins CI/CD**
- สร้าง Docker Image: Backend (Node.js) + Frontend (Next.js) + Redis
- Jenkins Pipeline: Checkout → Build → Deploy → Health Check
- Reverse Proxy: Traefik (dev) / Nginx (prod) — SSL, Load Balancing
- **ดูโค้ด:** `docker-compose.prod.yml`, `Jenkinsfile.prod`

### Q8: "ถ้าจะเพิ่มฟีเจอร์ X จะทำอย่างไร?"

**แนวตอบ:** ดูส่วน [วิธีเพิ่มฟีเจอร์ใหม่](#14-วิธีเพิ่มฟีเจอร์ใหม่-step-by-step) — ทำตาม pattern เดิม:
1. Migration → Model → Controller → Route (Backend)
2. Service → Component → เพิ่มใน Page (Frontend)
3. ถ้าต้องการ real-time → เพิ่ม Socket emit/on
4. ถ้าต้องการ background processing → เพิ่ม Worker logic

### Q9: "Error Handling ทำอย่างไร?"

**แนวตอบ:** ใช้ **3 ชั้น**:
1. `asyncHandler()` — ครอบ async function → auto catch
2. `errorConverter` — แปลง Error ทั่วไปเป็น ApiError
3. `errorHandler` — ส่ง JSON response, log error, ซ่อน stack trace ใน production
- Frontend: `api.service.ts` จัดการ HTTP errors (401 auto refresh, 429 retry)
- **ดูโค้ด:** `back-end/src/middlewares/errorHandler.js`, `back-end/src/utils/ApiError.js`

### Q10: "Concurrent Access จัดการอย่างไร?"

**แนวตอบ:**
- **Optimistic Locking:** ใช้ `version` field สำหรับ score editing (ป้องกัน lost updates)
- **Redis Distributed Lock:** ใช้ `acquireAssignmentLock()` สำหรับ Queue (ป้องกัน double assignment)
- **Database Unique Constraints:** ป้องกัน duplicate entries (เช่น จองคิวซ้ำ)
- **ดูโค้ด:** `back-end/src/utils/concurrency.js`, `back-end/src/utils/redisQueueService.js`

---

## 17. แนวทางพัฒนาต่อในอนาคต

### ฟีเจอร์ที่เพิ่มได้

| ฟีเจอร์ | ระดับความยาก | แนวทาง |
|---------|-------------|--------|
| **ระบบประกาศ (Announcements)** | ง่าย | CRUD + Socket emit (ดูตัวอย่างในส่วนที่ 14) |
| **ระบบแชท (Chat)** | ปานกลาง | ใช้ Socket.IO rooms ที่มีอยู่ + เพิ่ม Chat model + UI |
| **ระบบแจ้งเตือน In-App** | ง่าย | มี FCM อยู่แล้ว → เพิ่ม notification center UI |
| **Dashboard Analytics** | ปานกลาง | ใช้ Recharts + aggregate queries |
| **Export PDF รายงาน** | ปานกลาง | เพิ่ม library เช่น puppeteer หรือ pdfkit |
| **ระบบ Grading Rubric** | ปานกลาง | เพิ่ม Rubric model → link กับ Assignment → UI |
| **Mobile App** | ยาก | ใช้ API ที่มีอยู่ → React Native หรือ Flutter |
| **AI Grading Assistant** | ยาก | เพิ่ม AI service → เรียก API (OpenAI) → suggest score |
| **Multi-language Support** | ปานกลาง | ใช้ next-intl → แยก text ออกเป็น locale files |
| **Calendar View** | ง่าย | ใช้ library calendar → query attendance/assignments by date |

### Technical Improvements ที่ทำได้

| Improvement | แนวทาง |
|-------------|--------|
| **Unit Tests** | เพิ่ม Jest tests สำหรับ controllers |
| **API Documentation** | เพิ่ม Swagger/OpenAPI spec |
| **Caching Layer** | เพิ่ม Redis cache สำหรับ frequent queries |
| **GraphQL** | เพิ่ม GraphQL endpoint สำหรับ mobile |
| **Microservices** | แยก Queue, Notification ออกเป็น service ต่างหาก |
| **Kubernetes** | ย้ายจาก Docker Compose ไป K8s สำหรับ scaling |
| **CDN** | ใช้ Cloudflare/CloudFront สำหรับ static assets |

---

## Quick Reference — ไฟล์สำคัญที่ต้องจำ

### Backend (เรียงตามความสำคัญ)

| # | ไฟล์ | อ่านเพื่อเข้าใจ |
|---|------|-----------------|
| 1 | `src/app.js` | Entry point, middleware chain, server startup |
| 2 | `src/routes/index.js` | API routing map ทั้งหมด |
| 3 | `src/models/index.js` | Model associations ทั้งหมด |
| 4 | `src/middlewares/auth.js` | Authentication & Authorization |
| 5 | `src/utils/asyncHandler.js` | Error handling pattern |
| 6 | `src/config/socket.js` | Real-time rooms + helpers |
| 7 | `src/config/passport.js` | Auth strategies |
| 8 | `src/config/index.js` | All environment config |
| 9 | `src/utils/queueAssignmentWorker.js` | Queue background worker |
| 10 | `src/controllers/auth.controller.js` | Auth business logic |

### Frontend (เรียงตามความสำคัญ)

| # | ไฟล์ | อ่านเพื่อเข้าใจ |
|---|------|-----------------|
| 1 | `app/layout.tsx` | Root layout |
| 2 | `app/providers.tsx` | Provider stack |
| 3 | `services/api.service.ts` | HTTP client + auto refresh |
| 4 | `contexts/SocketContext.tsx` | Real-time hooks |
| 5 | `config/api.ts` | API endpoints map |
| 6 | `app/(instructor)/classroom/[id]/page.tsx` | Main dashboard |
| 7 | `services/auth.service.ts` | Auth service |
| 8 | `middleware.ts` | Route protection |
| 9 | `app/login/page.tsx` | Login UI |
| 10 | `contexts/NotificationContext.tsx` | Push notification |

---

## วิธีใช้เอกสารนี้

1. **อ่านครั้งแรก:** อ่านส่วน 1-4 เพื่อเข้าใจภาพรวม
2. **ศึกษาลึก:** เปิดไฟล์ตาม Quick Reference แล้วอ่านโค้ดจริง
3. **เตรียมสอบ:** อ่านส่วน 16 (คำถามกรรมการ) ซ้ำหลายรอบ
4. **ฝึกแก้โค้ด:** ทำตามส่วน 14-15 ลองเพิ่ม/แก้ไขฟีเจอร์จริง
5. **เสนอแนวทาง:** อ่านส่วน 17 เพื่อเตรียมตอบคำถามเรื่องพัฒนาต่อ

> **เอกสารที่เกี่ยวข้อง:**
> - `FEATURE_SUMMARY.md` — สรุปฟีเจอร์ทั้งหมด + API endpoints
> - `DATA_DICTIONARY.md` — พจนานุกรมข้อมูล + ER Diagram
> - `PERFORMANCE_OPTIMIZATION_REPORT.md` — รายงาน Performance tuning
> - `QUEUE_SYSTEM_DOCUMENTATION.txt` — เอกสารระบบคิว
> - `REDIS_QUEUE_ARCHITECTURE.txt` — สถาปัตยกรรม Redis Queue
