"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { addToast } from "@heroui/toast";
import { courseService } from "@/services/course.service";
import type { Course } from "@/services/course.service";

export interface SettingsFormData {
    code: string;
    name: string;
    year: number;
    semester: number;
    description: string;
    attention_threshold: number;
    is_active: boolean;
}

interface UseSettingsTabProps {
    course: Course;
    onCourseUpdate: (updatedCourse: Course) => void;
}

export function useSettingsTab({ course, onCourseUpdate }: UseSettingsTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<SettingsFormData>(() => ({
        code: course.code || "",
        name: course.name || "",
        year: course.year || new Date().getFullYear() + 543,
        semester: course.semester || 1,
        description: course.description || "",
        attention_threshold: course.attention_threshold ?? 60,
        is_active: course.is_active ?? true,
    }));

    // Reset form when course changes
    useEffect(() => {
        setFormData({
            code: course.code || "",
            name: course.name || "",
            year: course.year || new Date().getFullYear() + 543,
            semester: course.semester || 1,
            description: course.description || "",
            attention_threshold: course.attention_threshold ?? 60,
            is_active: course.is_active ?? true,
        });
    }, [course]);

    // Check if form has changes that trigger warning
    const hasWarningChanges = useMemo(() => {
        return formData.code !== course.code || 
               formData.year !== course.year || 
               formData.semester !== course.semester;
    }, [formData.code, formData.year, formData.semester, course.code, course.year, course.semester]);

    // Check if disabling course
    const isDisablingCourse = useMemo(() => {
        return !formData.is_active && course.is_active;
    }, [formData.is_active, course.is_active]);

    // Computed statistics
    const stats = useMemo(() => ({
        totalStudents: course.sections?.reduce((acc, s) => acc + (s.studentCount || 0), 0) || 0,
        sectionsCount: course.sections?.length || 0,
        instructorsCount: course.instructors?.length || (course.instructor ? 1 : 0),
        tasCount: course.tas?.length || 0,
        primaryInstructor: course.instructors?.find(i => (i as any).CourseInstructor?.is_primary)?.full_name 
            || course.instructor?.full_name 
            || '-',
    }), [course.sections, course.instructors, course.instructor, course.tas]);

    // Update single form field
    const updateField = useCallback(<K extends keyof SettingsFormData>(
        field: K, 
        value: SettingsFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!formData.code.trim() || !formData.name.trim()) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "รหัสวิชาและชื่อวิชาจำเป็นต้องกรอก",
                color: "warning",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        setIsSaving(true);
        try {
            const response = await courseService.updateCourse(course.id, {
                code: formData.code,
                name: formData.name,
                year: formData.year,
                semester: formData.semester,
                description: formData.description || undefined,
                attention_threshold: formData.attention_threshold,
                is_active: formData.is_active,
            });

            if (response.success && response.data) {
                addToast({
                    title: "สำเร็จ",
                    description: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
                    color: "success",
                    timeout: 3000,
                shouldShowTimeoutProgress: true,
                });
                onCourseUpdate(response.data);
                setIsEditing(false);
            } else {
                const errorMessage = typeof response.error === 'object' && response.error !== null
                    ? (response.error as { message?: string }).message
                    : response.error || response.message || "ไม่สามารถบันทึกได้";
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: errorMessage,
                    color: "danger",
                    timeout: 3000,
                shouldShowTimeoutProgress: true,
                });
            }
        } catch (error: any) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถบันทึกการตั้งค่าได้",
                color: "danger",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
        } finally {
            setIsSaving(false);
        }
    }, [course.id, formData, onCourseUpdate]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        setFormData({
            code: course.code || "",
            name: course.name || "",
            year: course.year || new Date().getFullYear() + 543,
            semester: course.semester || 1,
            description: course.description || "",
            attention_threshold: course.attention_threshold ?? 60,
            is_active: course.is_active ?? true,
        });
        setIsEditing(false);
    }, [course]);

    // Start editing
    const startEditing = useCallback(() => {
        setIsEditing(true);
    }, []);

    // Get semester text
    const getSemesterText = useCallback((semester: number) => {
        switch (semester) {
            case 1: return "ภาคเรียนที่ 1";
            case 2: return "ภาคเรียนที่ 2";
            case 3: return "ภาคฤดูร้อน";
            default: return `ภาคเรียนที่ ${semester}`;
        }
    }, []);

    return {
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
    };
}

export type UseSettingsTabReturn = ReturnType<typeof useSettingsTab>;
