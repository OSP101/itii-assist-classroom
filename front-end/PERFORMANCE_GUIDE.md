# Performance Optimization Guide - ITII Assist Classroom

## สรุปปัญหา Performance ที่พบ

### 🔴 ปัญหาหลัก

1. **[page.tsx](../app/(instructor)/classroom/[id]/page.tsx) มีขนาดใหญ่เกินไป (5,785 บรรทัด)**
   - มี 50+ `useState` ใน component เดียว
   - มี 10+ `useEffect` ที่ทำงานซ้ำซ้อน
   - ทุก state change ทำให้ทั้ง component re-render

2. **useEffect dependencies ไม่ถูกต้อง**
   - มีการใช้ `// eslint-disable-next-line` เพื่อปิด warning
   - ทำให้เกิด unnecessary re-renders

3. **ไม่มี Data Caching**
   - เปลี่ยน tab ทุกครั้ง = fetch ใหม่
   - ไม่มีกลไกป้องกัน duplicate requests

---

## ✅ สิ่งที่แก้ไขแล้ว

### 1. สร้าง Custom Hooks เพื่อแยก Logic

```
front-end/app/(instructor)/classroom/[id]/hooks/
├── index.ts              # Export all hooks
├── useClassroomData.ts   # Data fetching & caching
├── useScores.ts          # Score management
└── useModalStates.ts     # All modal states
```

**useClassroomData.ts:**
- ✅ รวม data fetching ทั้งหมด
- ✅ มี caching mechanism (60 วินาที)
- ✅ จัดการ real-time updates
- ✅ แยก loading states แต่ละ resource

**useScores.ts:**
- ✅ แยก score management logic
- ✅ มี save/fetch functions พร้อม error handling

**useModalStates.ts:**
- ✅ รวม modal states ทั้งหมด (~30 states)
- ✅ มี reset functions สำหรับแต่ละ modal

### 2. ปรับปรุง next.config.js

- ✅ เพิ่ม `optimizePackageImports` สำหรับ tree-shaking
- ✅ เพิ่ม `removeConsole` สำหรับ production
- ✅ เพิ่ม Webpack splitChunks สำหรับแยก vendor/heroui/icons
- ✅ เพิ่ม Cache headers สำหรับ static assets
- ✅ เปิด `reactStrictMode`

### 3. แก้ไข Re-render Issues

- ✅ แก้ `useAnimatedCounter` ใน OverviewTab.tsx
- ✅ แก้ `useRealtimeSync` ใน SocketContext.tsx
  - ใช้ `useRef` เก็บ callback แทนการใส่ใน dependency array

---

## 📋 สิ่งที่ควรทำต่อ (Manual Refactoring)

### 1. Refactor page.tsx เพื่อใช้ Custom Hooks

**ก่อน (ปัจจุบัน):**
```tsx
export default function ClassroomDetailPage() {
    const [course, setCourse] = useState<Course | null>(null);
    const [overview, setOverview] = useState<CourseOverview | null>(null);
    // ... 50+ more states
    
    useEffect(() => {
        fetchCourse();
        fetchOverview();
        // ... many fetches
    }, [courseId]);
    // ... 10+ more useEffects
}
```

**หลัง (แนะนำ):**
```tsx
import { useClassroomData, useScores, useModalStates } from "./hooks";

export default function ClassroomDetailPage() {
    const params = useParams();
    const courseId = params.id as string;
    
    // ใช้ custom hooks แทน
    const {
        course, overview, assignments, // data
        isLoading, isOverviewLoading,  // loading states
        fetchCourse, refreshForTab,    // actions
        emitUpdate,
    } = useClassroomData(courseId);
    
    const {
        selectedAssignment, scoresData,
        fetchScores, saveAllScores,
    } = useScores({ 
        onOverviewRefresh: () => refreshForTab("overview"),
        emitUpdate 
    });
    
    const {
        sectionModal, teamModal, deleteModal,
        scoreModals, isSubmitting,
    } = useModalStates();
    
    // Initial load
    useEffect(() => {
        initializeData();
    }, [courseId]);
    
    // ... rest of the component (UI only)
}
```

### 2. แยก Tab Content เป็น Components แยก

ตอนนี้มี lazy loading อยู่แล้ว แต่ควรแยก state management ด้วย:

```tsx
// components/AssignmentsTabContainer.tsx
export function AssignmentsTabContainer({ courseId }: { courseId: string }) {
    // State สำหรับ assignments tab อยู่ที่นี่
    const [localState, setLocalState] = useState(...);
    
    return <AssignmentsTab {...props} />;
}
```

### 3. ใช้ React.memo สำหรับ Heavy Components

```tsx
// components/ScoresTab.tsx
export default React.memo(function ScoresTab({ ... }) {
    // ...
});
```

### 4. ใช้ useMemo สำหรับ Computed Values

```tsx
// แทนที่จะคำนวณใน render
const totalStudents = useMemo(() => {
    return course?.sections?.reduce(
        (acc, section) => acc + (section.studentCount || 0), 
        0
    ) || 0;
}, [course?.sections]);
```

---

## 🔧 การใช้งาน Custom Hooks

### useClassroomData

```tsx
const {
    // Data
    course, overview, assignments, attendanceSessions,
    permanentTeams, weeklyTeams,
    tasList, studentsList, instructorsList, sectionStudents,
    userRole, currentUserId, pendingApprovalCount,
    
    // Loading states
    isLoading, isOverviewLoading, isAssignmentsLoading,
    isTeamsLoading, isPeopleLoading, isStudentsLoading,
    
    // Actions
    fetchCourse, fetchOverview, fetchAssignments,
    fetchTeams, refreshForTab, initializeData,
    emitUpdate, invalidateCache,
} = useClassroomData(courseId);
```

### useScores

```tsx
const {
    selectedAssignment, setSelectedAssignment,
    scoresData, scoreEntries, setScoreEntries,
    isLoading, isSaving,
    groupsForScore, selectedGroup, groupScoreValue,
    
    fetchScores, saveScore, saveAllScores, saveGroupScore,
} = useScores({
    onOverviewRefresh: () => fetchOverview(true),
    emitUpdate,
});
```

### useModalStates

```tsx
const {
    sectionModal,    // { isOpen, setIsOpen, sectionNo, reset, ... }
    teamModal,       // { isOpen, type, name, members, reset, ... }
    editTeamModal,   // { isOpen, team, open, reset, ... }
    taModal,         // { isOpen, selectedIds, searchQuery, reset }
    instructorModal, // { isOpen, selectedIds, reset }
    studentModal,    // { isOpen, sectionId, studentId, reset }
    deleteModal,     // { isOpen, type, target, open, reset }
    scoreModals,     // { isScoreModalOpen, isBonusScoreModalOpen }
    isSubmitting, setIsSubmitting,
} = useModalStates();

// Usage example
<Button onClick={() => sectionModal.setIsOpen(true)}>
    เพิ่มกลุ่มเรียน
</Button>
```

---

## 📊 Expected Performance Improvements

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| Initial Bundle Size | ~2MB | ~1.5MB (-25%) |
| Re-renders per state change | Entire page | Affected component only |
| API calls on tab switch | Always | Cached (60s) |
| Time to Interactive | ~3s | ~2s |

---

## 🧪 การทดสอบ Performance

1. **React DevTools Profiler**
   - ตรวจสอบ re-render counts
   - หา components ที่ render บ่อยเกินไป

2. **Network Tab**
   - ดู duplicate API calls
   - ตรวจสอบ caching ทำงาน

3. **Lighthouse**
   - วัด Performance score
   - ดู Time to Interactive (TTI)

---

## Notes

- Custom hooks ถูกสร้างไว้แล้วใน `hooks/` folder
- ยังต้อง refactor page.tsx manually เพื่อใช้ hooks
- แนะนำให้ทำทีละ step และ test หลังแต่ละ step
