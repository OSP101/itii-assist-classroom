# Modal Dialog Audit Report

> **Generated for:** `itii-assist-classroom` frontend  
> **Total Modals Found:** 47 distinct modal instances across 20 files  
> **UI Framework:** HeroUI (`@heroui/modal`)

---

## Table of Contents

1. [Admin Pages](#1-admin-pages)
2. [Instructor Pages](#2-instructor-pages)
3. [Login / Auth Pages](#3-login--auth-pages)
4. [Queue Pages](#4-queue-pages)
5. [Attendance Pages](#5-attendance-pages)
6. [Component Files (Shared)](#6-component-files-shared)
7. [Color Scheme Summary](#7-color-scheme-summary)

---

## 1. Admin Pages

### 1.1 `app/admin/students/page.tsx` — 5 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L766 | **Create** student | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` (icon on gradient) | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L869 | **Edit** student | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` (icon on gradient) | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 3 | L963 | **Toggle status** (activate/deactivate) | Conditional: active → `from-amber-500 to-orange-600`, inactive → `from-emerald-500 to-teal-600` | `text-white` (icon on gradient), body icon: `text-amber-600` / `text-emerald-600` | Conditional: `color="warning"` + `from-amber-500 to-orange-500` OR `color="success"` + `from-emerald-500 to-teal-500` |
| 4 | L1016 | **Delete** student | `bg-gradient-to-br from-red-500 to-rose-600` | `text-white` (header), `text-red-500` (body icon) | `color="danger"` + `bg-gradient-to-r from-red-500 to-rose-600` |
| 5 | L1063 | **Import** students (Excel paste) | `bg-gradient-to-br from-emerald-500 to-teal-600` | `text-white` (icon on gradient), `text-emerald-500` (body icons) | `color="success"` + `bg-gradient-to-r from-emerald-500 to-teal-600` |

---

### 1.2 `app/admin/users/page.tsx` — 6 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L797 | **Create** user | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L978 | **Edit** user | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 3 | L1152 | **Toggle status** (activate/deactivate) | Conditional: active → `from-amber-500 to-orange-600`, inactive → `from-emerald-500 to-teal-600` | `text-white` (header), body: `text-amber-600`/`text-emerald-600` | Conditional: `color="warning"` + `from-amber-500 to-orange-500` OR `color="success"` + `from-emerald-500 to-teal-500` |
| 4 | L1204 | **Delete** user | `bg-gradient-to-br from-red-500 to-rose-600` | `text-white` (header), `text-red-500` (body icon) | `color="danger"` + `bg-gradient-to-r from-red-500 to-rose-600` |
| 5 | L1251 | **Credentials** (post-creation, show password) | `bg-gradient-to-br from-green-500 to-emerald-600` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 6 | — | **Import** users (referenced from L1251 modal area) | Uses `bg-amber-50` warning, `bg-blue-50` info | `text-amber-500`, `text-blue-500` | `color="primary"` |

---

### 1.3 `app/admin/courses/page.tsx` — 5 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L918 | **Create** course | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L1172 | **Edit** course | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500 text-white` |
| 3 | L1418 | **Delete** course | `bg-gradient-to-br from-red-500 to-rose-600` | `text-white` | `color="danger"` (no custom gradient) |
| 4 | L1467 | **Toggle status** (activate/deactivate) | Conditional: active → `from-amber-500 to-orange-600`, inactive → `from-emerald-500 to-teal-600` | `text-white` (header), body: `text-amber-600`/`text-emerald-600` | Conditional: `color="warning"` + `from-amber-500 to-orange-500` OR `color="success"` + `from-emerald-500 to-teal-500` |
| 5 | L1530 | **Duplicate warning** (cannot activate) | `bg-gradient-to-br from-red-500 to-rose-600` | `text-white` | `color="primary"` (acknowledge only) |

---

### 1.4 `app/admin/classrooms/page.tsx` — 5 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L1215 | **Create** classroom | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L1368 | **Edit layout** (full screen, desk arrangement) | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"`, `color="success"`, `color="danger"` (various toolbar buttons) |
| 3 | L1758 | **Edit desk** (single desk properties) | Conditional by type: computer → `bg-blue-500`, teacher → `bg-amber-500`, normal → `bg-emerald-500` | `text-white` | `color="danger"` (delete), `color="primary"` (save) |
| 4 | L1911 | **Edit classroom info** (name/building/floor) | `bg-gradient-to-br from-amber-400 to-orange-500` | `text-white` | `color="primary"` |
| 5 | L1986 | **Add zone** | `bg-gradient-to-br from-indigo-400 to-purple-500` | `text-white` | `color="primary"` |

---

### 1.5 `app/admin/feedback/page.tsx` — 2 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L574 | **View feedback** detail | None (flat bg). Conditional: bug → `bg-red-100`, feature → `bg-blue-100`, improvement → `bg-amber-100` | Conditional: `text-red-600`/`text-blue-600`/`text-amber-600` | `color="primary"` |
| 2 | L735 | **Delete** feedback | None (plain ModalHeader text) | None | `color="danger"` |

---

### 1.6 `app/admin/logs/page.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L673 | **View log** detail | None. Uses `bg-primary/10` rounded-lg | `text-primary` | No footer buttons (read-only) |

---

## 2. Instructor Pages

### 2.1 `app/(instructor)/home/page.tsx` — 4 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L1028 | **Create** course | `bg-gradient-to-br from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L1307 | **Edit** course | `bg-gradient-to-br from-amber-500 to-orange-600` | `text-white` | `color="warning"` + `bg-gradient-to-r from-amber-500 to-orange-600 text-white` |
| 3 | L1593 | **Toggle status** (archive/restore) | None (flat `bg-amber-100` or `bg-green-100`) | `text-amber-600`/`text-green-600` | Conditional: `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` (archive) OR `color="success"` (restore) |
| 4 | L1699 | **Duplicate warning** (cannot activate) | None (flat `bg-amber-100`) | `text-amber-600` | `color="primary"` |

---

### 2.2 `app/(instructor)/classroom/[id]/page.tsx` — 9 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L1305 | **Add section** (group) | `bg-gradient-to-r from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L1370 | **Add TA** (teaching assistant) | `bg-gradient-to-r from-blue-400 to-indigo-500` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 3 | L1568 | **Add instructor** | `bg-gradient-to-r from-indigo-400 to-purple-500` | `text-white` | `color="secondary"` + `bg-gradient-to-r from-indigo-400 to-purple-500` |
| 4 | L1754 | **Add student** (select or paste from Excel) | `bg-gradient-to-r from-cyan-400 to-blue-500` | `text-white` | Select mode: `color="primary"` + `from-cyan-400 to-blue-500`; Paste mode: `color="success"` + `from-emerald-400 to-teal-500` |
| 5 | L1961 | **Delete** (student/section/team/TA/instructor) | `bg-gradient-to-br from-red-500 to-rose-600` | `text-white` | `color="danger"` + `bg-red-500` |
| 6 | L2201 | **Bulk delete** teams | `bg-gradient-to-br from-red-500 to-rose-600` | `text-white` | `color="danger"` + `bg-red-500` |
| 7 | L2310 | **Create team** (manual or random) | Conditional: permanent → `from-purple-500 to-indigo-600`, weekly → `from-emerald-500 to-teal-600` | `text-white` | Conditional: `color="secondary"` + `bg-purple-500` OR `color="success"` + `bg-emerald-500` |
| 8 | L2740 | **Edit team** | `bg-gradient-to-br from-amber-500 to-orange-600` | `text-white` | `color="warning"` + `bg-gradient-to-r from-amber-500 to-orange-600 text-white` |
| 9 | L2893 | **Group score** modal | `bg-gradient-to-r from-indigo-400 to-purple-500` | `text-white` | `color="secondary"` + `bg-gradient-to-r from-indigo-400 to-purple-500` |

*(Also references `ScoreModal` and `BonusScoreModal` as child components at L1282 and L1299)*

---

### 2.3 `app/(instructor)/classroom/[id]/queue/[sessionId]/worker/page.tsx` — 2 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L1295 | **Complete booking** (record grading result) | None (plain header) | `text-emerald-500` (check icon) | `color="success"` |
| 2 | L1542 | **Skip queue** | None (plain header) | `text-amber-500` (skip icon) | `color="warning"` |

---

### 2.4 `app/(instructor)/classroom/[id]/attendance/[sessionId]/summary/page.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L520 | **Edit attendance status** | None (plain text header) | None | `color="primary"` |

---

## 3. Login / Auth Pages

### 3.1 `app/login/page.tsx` — 2 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L545 | **Force change password** (first login) | `bg-gradient-to-br from-blue-500 to-indigo-600` | `text-white` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| 2 | L698 | **Forgot password** | `bg-gradient-to-br from-amber-500 to-orange-600` | `text-white` | `color="warning"` + `bg-gradient-to-r from-amber-500 to-orange-500 text-white` (send) / `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` (return) |

---

## 4. Queue Pages

### 4.1 `app/queue/book/page.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L672 | **Desk notice** (projector warning) | None. Circular `bg-amber-100` | `text-amber-600` | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |

---

### 4.2 `app/queue/projector/[sessionId]/page.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L791 | **Desk action** (cancel booking) | None (plain header) | `text-blue-500` | `color="danger"` |

---

## 5. Attendance Pages

### 5.1 `app/attendance/[id]/session/[sessionId]/live/page.tsx` — 2 modals

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L790 | **QR code** display (full screen) | None (full white bg) | None | None (no footer buttons) |
| 2 | L853 | **Edit check-in status** | None (plain header) | `text-blue-500` | `color="primary"` |

---

## 6. Component Files (Shared)

### 6.1 `components/profile/ProfilePage.tsx` — 1 modal (+ 2 child component modals)

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L465 | **Revoke all sessions** | None (plain text header) | None | `color="danger"` |
| — | L486 | Renders `<ChangePasswordModal>` (see 6.3) | — | — | — |
| — | L492 | Renders `<ConfirmPasswordModal>` (see 6.4) | — | — | — |

---

### 6.2 `components/profile/TwoFactorSetupModal.tsx` — 1 modal (multi-step)

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L542 | **2FA setup** (4 steps: select → setup → verify → backup) | None. Flat `bg-primary-100` rounded-lg | `text-primary` (shield icon) | Various per step: `color="primary"`, `color="success"` |

---

### 6.3 `components/profile/TwoFactorDisableModal.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L136 | **Disable 2FA** | None. Flat `bg-danger-100` rounded-lg | `text-danger` (shield warning icon) | `color="danger"` |

---

### 6.4 `components/profile/RegenerateBackupCodesModal.tsx` — 1 modal (multi-step)

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L241 | **Regenerate backup codes** (2 steps: confirm → codes) | None. Flat `bg-warning-100` rounded-lg | `text-warning` (refresh icon) | Step 1: `color="warning"`, Step 2: `color="primary"` |

---

### 6.5 `components/profile/ConfirmPasswordModal.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L67 | **Confirm password** (before profile update) | None. Flat `bg-warning-100` rounded-lg | `text-warning-600` (lock icon) | `color="primary"` + `bg-gradient-to-br from-blue-400 to-indigo-500` |

---

### 6.6 `components/profile/ChangePasswordModal.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L134 | **Change password** | None (plain text header) | None | `color="primary"` + `bg-gradient-to-br from-blue-400 to-indigo-500` |

---

### 6.7 `components/auth/TwoFactorVerifyModal.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L134 | **2FA verify** (OTP/recovery input) | None (no ModalHeader, text in ModalBody) | None | `color="primary"` |

---

### 6.8 `components/feedback/FeedbackButton.tsx` — 1 modal

| # | Line | Purpose | Header Gradient | Icon Color | Button Color |
|---|------|---------|----------------|------------|--------------|
| 1 | L187 | **Submit feedback** | None. Flat `bg-primary-100` rounded-lg | `text-primary` | `color="primary"` |

---

## 7. Color Scheme Summary

### Standard Design Patterns Used

| Action Type | Header Gradient | Icon Bg | Button Config |
|-------------|----------------|---------|---------------|
| **Create / Add** | `from-blue-400 to-indigo-500` | Same gradient | `color="primary"` + `bg-gradient-to-r from-blue-400 to-indigo-500` |
| **Edit** | `from-blue-400 to-indigo-500` (admin) or `from-amber-500 to-orange-600` (instructor) | Same gradient | `color="primary"` or `color="warning"` with matching gradient |
| **Delete** | `from-red-500 to-rose-600` | Same gradient | `color="danger"` + `bg-gradient-to-r from-red-500 to-rose-600` or `bg-red-500` |
| **Toggle ON→OFF** (deactivate) | `from-amber-500 to-orange-600` | Same gradient | `color="warning"` + `from-amber-500 to-orange-500` |
| **Toggle OFF→ON** (activate) | `from-emerald-500 to-teal-600` | Same gradient | `color="success"` + `from-emerald-500 to-teal-500` |
| **Import** | `from-emerald-500 to-teal-600` | Same gradient | `color="success"` + `from-emerald-500 to-teal-600` |
| **Instructor-specific** (add instructor) | `from-indigo-400 to-purple-500` | Same gradient | `color="secondary"` + `from-indigo-400 to-purple-500` |

### Inconsistencies Found

| Issue | Files Affected | Details |
|-------|---------------|---------|
| **Edit modal header inconsistency** | admin pages vs instructor pages | Admin edit modals use blue-indigo gradient; instructor edit uses amber-orange gradient |
| **Delete button gradient inconsistency** | `admin/courses` L1418 vs others | Courses delete modal uses plain `color="danger"` without custom gradient; all other admin delete modals add `bg-gradient-to-r from-red-500 to-rose-600` |
| **Plain header modals** | `admin/feedback` L735, `admin/logs` L673, worker/page, attendance/summary | Several modals use plain text headers without the gradient icon badge pattern |
| **Profile modals use HeroUI semantic colors** | `components/profile/*` | Use `bg-primary-100`, `bg-danger-100`, `bg-warning-100` instead of Tailwind gradient pattern |
| **Mixed gradient directions** | Various | Most admin modals use `bg-gradient-to-br`, some instructor modals use `bg-gradient-to-r` |
| **Force change password shadow mismatch** | `login/page.tsx` L556 | Header uses `shadow-amber-500/30` but gradient is blue-to-indigo (should be `shadow-blue-500/30`) |
| **Credentials modal gradient inconsistency** | `admin/users` L1271 | Header uses green-emerald gradient but footer button uses blue-indigo gradient |
| **2FA verify modal has no header** | `TwoFactorVerifyModal.tsx` | Only uses ModalBody (no ModalHeader or ModalFooter), unlike all other modals |
| **Feedback modals differ in style** | admin/feedback vs components/feedback | Admin view feedback uses conditional bg colors; the submit feedback button uses HeroUI semantic `bg-primary-100` |
