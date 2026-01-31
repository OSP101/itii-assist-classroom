"use client";

import type { Course } from "@/services/course.service";
import { useSettingsTab, SettingsTabView } from "./settings";

interface SettingsTabProps {
    course: Course;
    onCourseUpdate: (updatedCourse: Course) => void;
}

/**
 * SettingsTab Container Component
 * 
 * This is a container component that:
 * 1. Uses the useSettingsTab hook to manage all state and business logic
 * 2. Passes data and handlers to the memoized SettingsTabView component
 * 
 * Benefits:
 * - Separation of concerns (logic vs presentation)
 * - Easier testing (can test hook and view separately)
 * - Reduced re-renders through React.memo in SettingsTabView
 */
export default function SettingsTab({ course, onCourseUpdate }: SettingsTabProps) {
    const {
        // State
        isEditing,
        isSaving,
        formData,
        // Computed
        hasWarningChanges,
        isDisablingCourse,
        stats,
        // Actions
        updateField,
        handleSave,
        handleCancel,
        startEditing,
        getSemesterText,
    } = useSettingsTab({ course, onCourseUpdate });

    return (
        <SettingsTabView
            course={course}
            isEditing={isEditing}
            isSaving={isSaving}
            formData={formData}
            hasWarningChanges={hasWarningChanges}
            isDisablingCourse={isDisablingCourse}
            stats={stats}
            onUpdateField={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
            onStartEditing={startEditing}
            getSemesterText={getSemesterText}
        />
    );
}
