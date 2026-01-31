/**
 * AttendanceTab - Optimized with Container/Presentational Pattern
 * 
 * Performance optimizations:
 * - Separated logic into useAttendanceTab hook
 * - Memoized computed values (sessionsWithComputedStatus, filteredSessions, stats)
 * - Memoized handlers with useCallback
 * - Sub-components wrapped with React.memo
 * - Auto-update uses tick counter instead of full re-render
 * 
 * Structure:
 * - attendance/config.ts - Types, constants, utility functions
 * - attendance/useAttendanceTab.ts - Custom hook with all state/logic
 * - attendance/AttendanceTabView.tsx - Memoized view component
 * - attendance/components/index.tsx - Sub-components
 */

"use client";

import { useAttendanceTab, AttendanceTabView, type Course } from "./attendance";

interface AttendanceTabProps {
    course: Course;
    isLoading: boolean;
    onAttendanceChanged?: () => void;
}

export default function AttendanceTab({ course, isLoading, onAttendanceChanged }: AttendanceTabProps) {
    // All state and logic handled by custom hook
    const hook = useAttendanceTab(course, onAttendanceChanged);
    
    // Render view with hook data
    return <AttendanceTabView course={course} isLoading={isLoading} hook={hook} />;
}

