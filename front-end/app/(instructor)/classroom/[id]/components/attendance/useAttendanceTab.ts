/**
 * useAttendanceTab Hook
 * Contains all state management and business logic for AttendanceTab
 */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/toast";
import { now, getLocalTimeZone, parseAbsolute, type DateValue } from "@internationalized/date";
import attendanceService, { type AttendanceSession, type CreateAttendanceData } from "@/services/attendance.service";
import { useSocket } from "@/contexts/SocketContext";
import {
    type Course,
    type AttendanceStats,
    type SessionWithComputedStatus,
    type ModalTargets,
    type ModalStates,
    type FilterState,
    computeSessionStatus,
    filterSessions,
    calculateStats,
    getInitialFormData,
    AUTO_UPDATE_INTERVAL_MS,
} from "./config";

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseAttendanceTabReturn {
    // Data
    sessions: AttendanceSession[];
    sessionsWithComputedStatus: SessionWithComputedStatus[];
    filteredSessions: SessionWithComputedStatus[];
    stats: AttendanceStats;
    allSectionIds: number[];

    // Loading States
    isSessionsLoading: boolean;
    isSubmitting: boolean;
    isGettingLocation: boolean;

    // Filter State
    filters: FilterState;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: string) => void;
    setTypeFilter: (filter: string) => void;

    // Modal States
    modals: ModalStates;
    targets: ModalTargets;
    openCreateModal: () => void;
    closeCreateModal: () => void;
    openEditModal: (session: AttendanceSession) => void;
    closeEditModal: () => void;
    openDeleteModal: (session: AttendanceSession) => void;
    closeDeleteModal: () => void;
    openCloseSessionModal: (session: AttendanceSession) => void;
    closeCloseSessionModal: () => void;

    // Form State
    formData: CreateAttendanceData;
    setFormData: React.Dispatch<React.SetStateAction<CreateAttendanceData>>;
    startDateTime: DateValue;
    setStartDateTime: (value: DateValue) => void;
    endDateTime: DateValue;
    setEndDateTime: (value: DateValue) => void;
    resetForm: () => void;

    // Actions
    handleCreateSession: () => Promise<void>;
    handleUpdateSession: () => Promise<void>;
    handleDeleteSession: () => Promise<void>;
    handleActivateSession: (session: AttendanceSession) => Promise<void>;
    confirmCloseSession: () => Promise<void>;
    getCurrentLocation: () => void;

    // Context
    courseId: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAttendanceTab(
    course: Course,
    onAttendanceChanged?: () => void
): UseAttendanceTabReturn {
    const router = useRouter();
    const { emitDataUpdate } = useSocket();

    // ========================================================================
    // Memoized Values
    // ========================================================================

    const allSectionIds = useMemo(
        () => (course.sections || []).map((s) => s.id),
        [course.sections]
    );

    // ========================================================================
    // Core State
    // ========================================================================

    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [isSessionsLoading, setIsSessionsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // For triggering status updates (without causing full component re-renders)
    const [statusTick, setStatusTick] = useState(0);

    // ========================================================================
    // Filter State
    // ========================================================================

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    const filters = useMemo<FilterState>(
        () => ({
            searchQuery,
            statusFilter,
            typeFilter,
        }),
        [searchQuery, statusFilter, typeFilter]
    );

    // ========================================================================
    // Modal State
    // ========================================================================

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    const [editTarget, setEditTarget] = useState<AttendanceSession | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AttendanceSession | null>(null);
    const [closeTarget, setCloseTarget] = useState<AttendanceSession | null>(null);

    const modals = useMemo<ModalStates>(
        () => ({
            isCreateModalOpen,
            isEditModalOpen,
            isDeleteModalOpen,
            isCloseModalOpen,
        }),
        [isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isCloseModalOpen]
    );

    const targets = useMemo<ModalTargets>(
        () => ({
            editTarget,
            deleteTarget,
            closeTarget,
        }),
        [editTarget, deleteTarget, closeTarget]
    );

    // ========================================================================
    // Form State
    // ========================================================================

    const [formData, setFormData] = useState<CreateAttendanceData>(() =>
        getInitialFormData(course.id, allSectionIds)
    );

    const [startDateTime, setStartDateTime] = useState<DateValue>(now(getLocalTimeZone()));
    const [endDateTime, setEndDateTime] = useState<DateValue>(
        now(getLocalTimeZone()).add({ hours: 2 })
    );

    // Reset form when allSectionIds changes (initial load)
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!initializedRef.current && allSectionIds.length > 0) {
            setFormData((prev) => ({
                ...prev,
                course_section_ids: allSectionIds,
            }));
            initializedRef.current = true;
        }
    }, [allSectionIds]);

    // ========================================================================
    // Computed Values (Memoized)
    // ========================================================================

    const sessionsWithComputedStatus = useMemo<SessionWithComputedStatus[]>(
        () =>
            sessions.map((session) => ({
                ...session,
                status: computeSessionStatus(session),
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sessions, statusTick] // statusTick causes re-computation every 30 seconds
    );

    const filteredSessions = useMemo(
        () => filterSessions(sessionsWithComputedStatus, searchQuery, statusFilter, typeFilter),
        [sessionsWithComputedStatus, searchQuery, statusFilter, typeFilter]
    );

    const stats = useMemo(
        () => calculateStats(sessionsWithComputedStatus),
        [sessionsWithComputedStatus]
    );

    // ========================================================================
    // Data Fetching
    // ========================================================================

    const fetchSessions = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsSessionsLoading(true);
        }
        try {
            const data = await attendanceService.getSessions(course.id);
            setSessions(data);
        } catch (error) {
            console.error("Error fetching attendance sessions:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลการเช็คชื่อได้",
                color: "danger",
            });
        } finally {
            if (showLoading) {
                setIsSessionsLoading(false);
            }
        }
    }, [course.id]);

    // Initial fetch
    useEffect(() => {
        if (course.id) {
            fetchSessions(true);
        }
    }, [course.id, fetchSessions]);

    // Auto-update status every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setStatusTick((prev) => prev + 1);
        }, AUTO_UPDATE_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    // ========================================================================
    // Form Helpers
    // ========================================================================

    const resetForm = useCallback(() => {
        setFormData(getInitialFormData(course.id, allSectionIds));
        setStartDateTime(now(getLocalTimeZone()));
        setEndDateTime(now(getLocalTimeZone()).add({ hours: 2 }));
        setEditTarget(null);
    }, [course.id, allSectionIds]);

    // ========================================================================
    // Modal Handlers
    // ========================================================================

    const openCreateModal = useCallback(() => {
        setIsCreateModalOpen(true);
    }, []);

    const closeCreateModal = useCallback(() => {
        setIsCreateModalOpen(false);
        resetForm();
    }, [resetForm]);

    const openEditModal = useCallback((session: AttendanceSession) => {
        setEditTarget(session);
        const sectionIds = session.sections?.map((s) => s.id) ||
            (session.course_section_id ? [session.course_section_id] : []);
        
        setFormData({
            course_id: course.id,
            course_section_id: session.course_section_id,
            course_section_ids: sectionIds,
            title: session.title,
            session_type: session.session_type,
            check_location: session.check_location,
            location_lat: session.location_lat ?? undefined,
            location_lng: session.location_lng ?? undefined,
            radius_meters: session.radius_meters,
            start_time: session.start_time,
            end_time: session.end_time,
            late_threshold_minutes: session.late_threshold_minutes,
        });
        setStartDateTime(parseAbsolute(session.start_time, getLocalTimeZone()));
        setEndDateTime(parseAbsolute(session.end_time, getLocalTimeZone()));
        setIsEditModalOpen(true);
    }, [course.id]);

    const closeEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        resetForm();
    }, [resetForm]);

    const openDeleteModal = useCallback((session: AttendanceSession) => {
        setDeleteTarget(session);
        setIsDeleteModalOpen(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
    }, []);

    const openCloseSessionModal = useCallback((session: AttendanceSession) => {
        setCloseTarget(session);
        setIsCloseModalOpen(true);
    }, []);

    const closeCloseSessionModal = useCallback(() => {
        setIsCloseModalOpen(false);
        setCloseTarget(null);
    }, []);

    // ========================================================================
    // CRUD Handlers
    // ========================================================================

    const handleCreateSession = useCallback(async () => {
        if (!formData.title.trim()) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "กรุณากรอกชื่อรอบการเช็คชื่อ",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const startDate = startDateTime.toDate(getLocalTimeZone());
            const endDate = endDateTime.toDate(getLocalTimeZone());

            const data: CreateAttendanceData = {
                ...formData,
                course_id: course.id,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
            };

            const result = await attendanceService.createSession(data);
            if (result) {
                addToast({
                    title: "สำเร็จ",
                    description: "สร้างรอบการเช็คชื่อเรียบร้อยแล้ว",
                    color: "success",
                });
                closeCreateModal();
                fetchSessions(false);
                emitDataUpdate("attendance", "create", result.id);
                onAttendanceChanged?.();
            }
        } catch (error: unknown) {
            console.error("Error creating session:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error instanceof Error ? error.message : "ไม่สามารถสร้างรอบการเช็คชื่อได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, startDateTime, endDateTime, course.id, closeCreateModal, fetchSessions, emitDataUpdate, onAttendanceChanged]);

    const handleUpdateSession = useCallback(async () => {
        if (!editTarget) return;

        if (!formData.title.trim()) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "กรุณากรอกชื่อรอบการเช็คชื่อ",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const startDate = startDateTime.toDate(getLocalTimeZone());
            const endDate = endDateTime.toDate(getLocalTimeZone());

            const data: Partial<CreateAttendanceData> = {
                title: formData.title,
                session_type: formData.session_type,
                check_location: formData.check_location,
                location_lat: formData.check_location ? formData.location_lat : undefined,
                location_lng: formData.check_location ? formData.location_lng : undefined,
                radius_meters: formData.radius_meters,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                late_threshold_minutes: formData.late_threshold_minutes,
            };

            if (formData.course_section_ids && formData.course_section_ids.length > 0) {
                data.course_section_ids = formData.course_section_ids;
                data.course_section_id = formData.course_section_ids.length === 1
                    ? formData.course_section_ids[0]
                    : null;
            } else {
                data.course_section_ids = [];
                data.course_section_id = null;
            }

            const result = await attendanceService.updateSession(editTarget.id, data);
            if (result) {
                addToast({
                    title: "สำเร็จ",
                    description: "แก้ไขรอบการเช็คชื่อเรียบร้อยแล้ว",
                    color: "success",
                });
                closeEditModal();
                fetchSessions(false);
            }
        } catch (error: unknown) {
            console.error("Error updating session:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error instanceof Error ? error.message : "ไม่สามารถแก้ไขรอบการเช็คชื่อได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [editTarget, formData, startDateTime, endDateTime, closeEditModal, fetchSessions]);

    const handleDeleteSession = useCallback(async () => {
        if (!deleteTarget) return;

        setIsSubmitting(true);
        try {
            const success = await attendanceService.deleteSession(deleteTarget.id);
            if (success) {
                addToast({
                    title: "สำเร็จ",
                    description: "ลบรอบการเช็คชื่อเรียบร้อยแล้ว",
                    color: "success",
                });
                closeDeleteModal();
                fetchSessions(false);
                emitDataUpdate("attendance", "delete", deleteTarget.id);
                onAttendanceChanged?.();
            }
        } catch (error: unknown) {
            console.error("Error deleting session:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error instanceof Error ? error.message : "ไม่สามารถลบรอบการเช็คชื่อได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [deleteTarget, closeDeleteModal, fetchSessions, emitDataUpdate, onAttendanceChanged]);

    const handleActivateSession = useCallback(async (session: AttendanceSession) => {
        const computedStatus = computeSessionStatus(session);
        if (computedStatus === "draft") {
            try {
                await attendanceService.activateSession(session.id);
                addToast({
                    title: "สำเร็จ",
                    description: "เริ่มเปิดรอบเช็คชื่อแล้ว",
                    color: "success",
                });
                fetchSessions(false);
            } catch (error: unknown) {
                console.error("Error activating session:", error);
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: error instanceof Error ? error.message : "ไม่สามารถเปิดรอบเช็คชื่อได้",
                    color: "danger",
                });
                return;
            }
        }
        window.open(`/attendance/${course.id}/session/${session.id}/live`, "_blank");
    }, [course.id, fetchSessions]);

    const confirmCloseSession = useCallback(async () => {
        if (!closeTarget) return;

        setIsSubmitting(true);
        try {
            const result = await attendanceService.closeSession(closeTarget.id);
            if (result) {
                addToast({
                    title: "สำเร็จ",
                    description: "ปิดรอบการเช็คชื่อเรียบร้อยแล้ว",
                    color: "success",
                });
                closeCloseSessionModal();
                fetchSessions(false);
            }
        } catch (error: unknown) {
            console.error("Error closing session:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error instanceof Error ? error.message : "ไม่สามารถปิดรอบการเช็คชื่อได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [closeTarget, closeCloseSessionModal, fetchSessions]);

    // ========================================================================
    // GPS Handler
    // ========================================================================

    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            addToast({
                title: "ไม่รองรับ",
                description: "เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งที่ตั้ง",
                color: "danger",
            });
            return;
        }

        setIsGettingLocation(true);
        addToast({
            title: "กำลังดึงตำแหน่ง GPS...",
            description: "กรุณารอสักครู่ ระบบกำลังระบุตำแหน่งจาก GPS",
            color: "primary",
        });

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData((prev) => ({
                    ...prev,
                    location_lat: position.coords.latitude,
                    location_lng: position.coords.longitude,
                }));
                setIsGettingLocation(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "ไม่สามารถดึงตำแหน่งได้";

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "คุณไม่อนุญาตให้เข้าถึงตำแหน่ง GPS กรุณาเปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบว่าเปิด GPS แล้ว";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "หมดเวลารอการรับตำแหน่ง GPS กรุณาลองใหม่อีกครั้ง";
                        break;
                }

                addToast({
                    title: "ไม่สามารถดึงตำแหน่ง GPS ได้",
                    description: errorMessage,
                    color: "danger",
                });
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }, []);

    // ========================================================================
    // Return Hook Values
    // ========================================================================

    return {
        // Data
        sessions,
        sessionsWithComputedStatus,
        filteredSessions,
        stats,
        allSectionIds,

        // Loading States
        isSessionsLoading,
        isSubmitting,
        isGettingLocation,

        // Filter State
        filters,
        setSearchQuery,
        setStatusFilter,
        setTypeFilter,

        // Modal States
        modals,
        targets,
        openCreateModal,
        closeCreateModal,
        openEditModal,
        closeEditModal,
        openDeleteModal,
        closeDeleteModal,
        openCloseSessionModal,
        closeCloseSessionModal,

        // Form State
        formData,
        setFormData,
        startDateTime,
        setStartDateTime,
        endDateTime,
        setEndDateTime,
        resetForm,

        // Actions
        handleCreateSession,
        handleUpdateSession,
        handleDeleteSession,
        handleActivateSession,
        confirmCloseSession,
        getCurrentLocation,

        // Context
        courseId: course.id,
    };
}

export default useAttendanceTab;
