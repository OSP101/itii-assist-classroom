"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Skeleton } from "@heroui/skeleton";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import {
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
} from "@heroui/table";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import attendanceService, {
    type AttendanceSession,
    type CreateAttendanceData,
} from "@/services/attendance.service";
import { useSocket } from "@/contexts/SocketContext";
import { now, getLocalTimeZone, parseAbsolute, type DateValue } from "@internationalized/date";

// Lazy load LocationPicker (contains Leaflet which doesn't work well with SSR)
const LocationPicker = lazy(() => import("@/components/map/LocationPicker"));

// Types for the component
interface Section {
    id: number;
    section_no: string;
    note?: string | null;
    studentCount?: number;
}

interface Course {
    id: string;
    code: string;
    name: string;
    sections?: Section[];
}

interface AttendanceTabProps {
    course: Course;
    isLoading: boolean;
    onAttendanceChanged?: () => void;
}

// Loading Skeleton
function AttendanceTableSkeleton() {
    return (
        <Card className="shadow-sm border border-slate-200">
            <CardBody className="p-2">
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="w-48 h-4 rounded-lg" />
                                <Skeleton className="w-32 h-3 rounded-lg" />
                            </div>
                            <Skeleton className="w-20 h-6 rounded-full" />
                            <Skeleton className="w-24 h-8 rounded-lg" />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}

// Format date for display
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Format time for display
function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Format datetime for display
function formatDateTime(dateString: string): string {
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

// Session type display
const sessionTypeDisplay: Record<string, { label: string; color: "primary" | "secondary" | "success" | "warning" | "danger"; icon: string }> = {
    lecture: { label: "บรรยาย", color: "primary", icon: "solar:presentation-graph-bold" },
    lab: { label: "ปฏิบัติ", color: "success", icon: "solar:test-tube-bold" },
    online: { label: "ออนไลน์", color: "secondary", icon: "solar:laptop-bold" },
};

// Status display
const statusDisplay: Record<string, { label: string; color: "default" | "primary" | "secondary" | "success" | "warning" | "danger" }> = {
    draft: { label: "ฉบับร่าง", color: "default" },
    active: { label: "กำลังเปิด", color: "success" },
    closed: { label: "ปิดแล้ว", color: "danger" },
};

export default function AttendanceTab({ course, isLoading, onAttendanceChanged }: AttendanceTabProps) {
    const router = useRouter();
    const { emitDataUpdate } = useSocket();
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [isSessionsLoading, setIsSessionsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<AttendanceSession | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AttendanceSession | null>(null);
    const [closeTarget, setCloseTarget] = useState<AttendanceSession | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states - default to all sections
    const allSectionIds = (course.sections || []).map(s => s.id);
    const [formData, setFormData] = useState<CreateAttendanceData>({
        course_id: course.id,
        course_section_id: null,
        course_section_ids: allSectionIds, // Default: all sections selected
        title: "",
        session_type: "lecture",
        check_location: false,
        location_lat: undefined,
        location_lng: undefined,
        radius_meters: 10,
        start_time: "",
        end_time: "",
        late_threshold_minutes: 15,
    });

    // Date/time picker states - initialize with current time
    const [startDateTime, setStartDateTime] = useState<DateValue>(now(getLocalTimeZone()));
    const [endDateTime, setEndDateTime] = useState<DateValue>(now(getLocalTimeZone()).add({ hours: 2 }));

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        setIsSessionsLoading(true);
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
            setIsSessionsLoading(false);
        }
    }, [course.id]);

    const fetchSessionsNew = useCallback(async () => {
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
        }
    }, [course.id]);

    useEffect(() => {
        if (course.id) {
            fetchSessions();
        }
    }, [course.id, fetchSessions]);

    // Helper function to compute real-time status based on current time
    const getComputedStatus = useCallback((session: AttendanceSession): "draft" | "active" | "closed" => {
        // If status is manually set to closed, keep it closed
        if (session.status === "closed") return "closed";

        const now = new Date();
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time);

        if (now < startTime) {
            return "draft"; // ยังไม่ถึงเวลาเริ่ม
        } else if (now >= startTime && now <= endTime) {
            return "active"; // อยู่ในช่วงเวลา
        } else {
            return "closed"; // หมดเวลาแล้ว
        }
    }, []);

    // State for current time to trigger re-renders
    const [currentTime, setCurrentTime] = useState(new Date());

    // Auto-update status every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Compute sessions with real-time status
    const sessionsWithComputedStatus = sessions.map((session) => ({
        ...session,
        status: getComputedStatus(session),
    }));

    // Filter sessions
    const filteredSessions = sessionsWithComputedStatus.filter((session) => {
        const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || session.status === statusFilter;
        const matchesType = typeFilter === "all" || session.session_type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    // Stats - use computed status
    const stats = {
        total: sessionsWithComputedStatus.length,
        active: sessionsWithComputedStatus.filter((s) => s.status === "active").length,
        draft: sessionsWithComputedStatus.filter((s) => s.status === "draft").length,
        closed: sessionsWithComputedStatus.filter((s) => s.status === "closed").length,
    };

    // Handle create session
    const handleCreateSession = async () => {
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
            // Convert DateValue to ISO string using toDate method
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
                setIsCreateModalOpen(false);
                resetForm();
                fetchSessionsNew();
                
                // Emit real-time update and refresh overview
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
    };

    // Handle delete session
    const handleDeleteSession = async () => {
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
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                fetchSessionsNew();
                
                // Emit real-time update and refresh overview
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
    };

    // Handle activate session - now just opens the live page
    const handleActivateSession = async (session: AttendanceSession) => {
        // If session is draft (before start time), update start time to now
        const computedStatus = getComputedStatus(session);
        if (computedStatus === "draft") {
            try {
                await attendanceService.activateSession(session.id);
                addToast({
                    title: "สำเร็จ",
                    description: "เริ่มเปิดรอบเช็คชื่อแล้ว",
                    color: "success",
                });
                fetchSessionsNew();
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
        // Open live page in new tab
        window.open(`/classroom/${course.id}/attendance/${session.id}/live`, "_blank");
    };

    // Handle close session - opens confirmation modal
    const handleCloseSession = (session: AttendanceSession) => {
        setCloseTarget(session);
        setIsCloseModalOpen(true);
    };

    // Confirm close session - sets end_time to now
    const confirmCloseSession = async () => {
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
                setIsCloseModalOpen(false);
                setCloseTarget(null);
                fetchSessionsNew();
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
    };

    // Open edit modal with session data
    const openEditModal = (session: AttendanceSession) => {
        setEditTarget(session);
        // Prepare section IDs - use sections array if available, fallback to single section_id
        const sectionIds = session.sections?.map(s => s.id) ||
            (session.course_section_id ? [session.course_section_id] : []);
        setFormData({
            course_id: course.id,
            course_section_id: session.course_section_id,
            course_section_ids: sectionIds, // Set multi-select array
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
        // Set date pickers - convert ISO string to DateValue
        setStartDateTime(parseAbsolute(session.start_time, getLocalTimeZone()));
        setEndDateTime(parseAbsolute(session.end_time, getLocalTimeZone()));
        setIsEditModalOpen(true);
    };

    // Handle update session
    const handleUpdateSession = async () => {
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
            // Convert DateValue to ISO string
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

            // Use course_section_ids (multi-select) if available
            if (formData.course_section_ids && formData.course_section_ids.length > 0) {
                data.course_section_ids = formData.course_section_ids;
                // Also set legacy field for backward compatibility
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
                setIsEditModalOpen(false);
                setEditTarget(null);
                resetForm();
                fetchSessionsNew();
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
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            course_id: course.id,
            course_section_id: null,
            course_section_ids: (course.sections || []).map(s => s.id), // ให้มันลงได้ทุก sec น่าจะใช้ได้แล้วมั้ง
            title: "",
            session_type: "lecture",
            check_location: false,
            location_lat: undefined,
            location_lng: undefined,
            radius_meters: 100,
            start_time: "",
            end_time: "",
            late_threshold_minutes: 15,
        });
        setStartDateTime(now(getLocalTimeZone()));
        setEndDateTime(now(getLocalTimeZone()).add({ hours: 2 }));
        setEditTarget(null);
    };

    // GPS loading state
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Get current location with high accuracy GPS
    const getCurrentLocation = () => {
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

                const accuracy = position.coords.accuracy;
                // addToast({
                //     title: "ดึงตำแหน่ง GPS สำเร็จ",
                //     description: `ความแม่นยำ: ${accuracy < 50 ? '🟢 ดีมาก' : accuracy < 100 ? '🟡 ปานกลาง' : '🔴 ต่ำ'} (±${Math.round(accuracy)} เมตร)`,
                //     color: "success",
                // });
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
                enableHighAccuracy: true, // บังคับใช้ GPS chip
                timeout: 15000,           // รอสูงสุด 15 วินาที
                maximumAge: 0             // ไม่ใช้ตำแหน่งที่ cache ไว้
            }
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">การเช็คชื่อเข้าเรียน</h2>
                    <p className="text-sm text-slate-500">จัดการรอบการเช็คชื่อและดูสถิติการเข้าเรียน</p>
                </div>
                <Button
                    color="primary"
                    startContent={<Icon icon="solar:add-circle-bold" />}
                    onPress={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-400/25"
                >
                    สร้างรอบเช็คชื่อ
                </Button>
            </div>

            {/* Loading state */}
            {isLoading || isSessionsLoading ? (
                <>
                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="shadow-sm border border-slate-200">
                                <CardBody className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-12 h-12 rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="w-20 h-3 rounded-lg" />
                                            <Skeleton className="w-8 h-6 rounded-lg" />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                    <AttendanceTableSkeleton />
                </>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 rounded-xl">
                                        <Icon icon="solar:calendar-bold" className="text-2xl text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">ทั้งหมด</p>
                                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                                        <Icon icon="solar:play-circle-bold" className="text-2xl text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">กำลังเปิด</p>
                                        <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-100 rounded-xl">
                                        <Icon icon="solar:document-bold" className="text-2xl text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">ฉบับร่าง</p>
                                        <p className="text-2xl font-bold text-slate-800">{stats.draft}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-red-100 rounded-xl">
                                        <Icon icon="solar:stop-circle-bold" className="text-2xl text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">ปิดแล้ว</p>
                                        <p className="text-2xl font-bold text-slate-800">{stats.closed}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="p-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Input
                                    placeholder="ค้นหาชื่อรอบการเช็คชื่อ..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                    startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                    className="flex-1"
                                    size="md"
                                    variant="bordered"
                                    isClearable
                                    classNames={{
                                        inputWrapper: "border-blue-200 hover:border-blue-300 focus-within:!border-blue-400",
                                        label: "text-blue-400 text-sm",
                                    }}
                                />
                                <Select
                                    placeholder="สถานะ"
                                    selectedKeys={[statusFilter]}
                                    onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string)}
                                    className="w-full sm:w-40"
                                    variant="bordered"
                                    size="md"
                                >
                                    <SelectItem key="all">ทุกสถานะ</SelectItem>
                                    <SelectItem key="draft">ฉบับร่าง</SelectItem>
                                    <SelectItem key="active">กำลังเปิด</SelectItem>
                                    <SelectItem key="closed">ปิดแล้ว</SelectItem>
                                </Select>
                                <Select
                                    placeholder="ประเภท"
                                    selectedKeys={[typeFilter]}
                                    onSelectionChange={(keys) => setTypeFilter(Array.from(keys)[0] as string)}
                                    className="w-full sm:w-40"
                                    variant="bordered"
                                    size="md"
                                >
                                    <SelectItem key="all">ทุกประเภท</SelectItem>
                                    <SelectItem key="lecture">บรรยาย</SelectItem>
                                    <SelectItem key="lab">ปฏิบัติ</SelectItem>
                                    <SelectItem key="online">ออนไลน์</SelectItem>
                                </Select>
                            </div>
                        </CardBody>
                    </Card>


                    {/* Empty state when no sessions at all */}
                    {sessions.length === 0 ? (
                        <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
                            <CardBody className="text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                    <Icon
                                        icon="solar:clipboard-check-bold-duotone"
                                        className="text-5xl text-blue-500"
                                    />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีรอบการเช็คชื่อ</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    สร้างรอบการเช็คชื่อเพื่อให้นักศึกษาสามารถเช็คชื่อเข้าเรียนได้
                                </p>
                                <Button
                                    color="primary"
                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                    onPress={() => setIsCreateModalOpen(true)}
                                    className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-400/25"
                                >
                                    สร้างรอบเช็คชื่อแรก
                                </Button>
                            </CardBody>
                        </Card>
                    ) : (
                        < Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-2">
                                <div className="overflow-x-auto">
                                    <Table
                                        aria-label="Attendance sessions table"
                                        removeWrapper
                                        classNames={{
                                            th: "bg-slate-50 text-slate-600 font-semibold text-sm",
                                            td: "py-3",
                                        }}
                                    >
                                        <TableHeader>
                                            <TableColumn>รอบการเช็คชื่อ</TableColumn>
                                            <TableColumn>เซคชัน</TableColumn>
                                            <TableColumn>ประเภท</TableColumn>
                                            <TableColumn>วันเวลา</TableColumn>
                                            <TableColumn>สถานะ</TableColumn>
                                            <TableColumn>สถิติ</TableColumn>
                                            <TableColumn align="center">จัดการ</TableColumn>
                                        </TableHeader>
                                        <TableBody
                                            emptyContent={
                                                <div className="py-10 text-center">
                                                    <Icon
                                                        icon="solar:clipboard-list-linear"
                                                        className="text-5xl text-slate-300 mx-auto mb-3"
                                                    />
                                                    <p className="text-slate-400">ยังไม่มีรอบการเช็คชื่อ</p>
                                                    <Button
                                                        color="primary"
                                                        variant="flat"
                                                        size="sm"
                                                        className="mt-3"
                                                        onPress={() => setIsCreateModalOpen(true)}
                                                    >
                                                        สร้างรอบเช็คชื่อแรก
                                                    </Button>
                                                </div>
                                            }
                                        >
                                            {filteredSessions.map((session) => (
                                                <TableRow key={session.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {/* <div
                                                            className={`p-2 rounded-xl ${session.session_type === "lecture"
                                                                ? "bg-blue-100"
                                                                : session.session_type === "lab"
                                                                    ? "bg-emerald-100"
                                                                    : "bg-violet-100"
                                                                }`}
                                                        >
                                                            <Icon
                                                                icon={sessionTypeDisplay[session.session_type].icon}
                                                                className={`text-xl ${session.session_type === "lecture"
                                                                    ? "text-blue-600"
                                                                    : session.session_type === "lab"
                                                                        ? "text-emerald-600"
                                                                        : "text-violet-600"
                                                                    }`}
                                                            />
                                                        </div> */}
                                                            <div>
                                                                <p className="font-medium text-slate-800">{session.title}</p>
                                                                {session.check_location && (
                                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                                        {/* <Icon icon="solar:map-point-bold" className="text-sm" /> */}
                                                                        <span>ตรวจสอบตำแหน่ง</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {session.sections && session.sections.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {session.sections.map((sec) => (
                                                                    <Chip key={sec.id} size="sm" variant="flat" color="default">
                                                                        {sec.section_no}
                                                                    </Chip>
                                                                ))}
                                                            </div>
                                                        ) : session.section ? (
                                                            <Chip size="sm" variant="flat" color="default">
                                                                {session.section.section_no}
                                                            </Chip>
                                                        ) : (
                                                            <span className="text-slate-500 text-sm">ทุกเซคชัน</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="sm"
                                                            color={sessionTypeDisplay[session.session_type].color}
                                                            variant="flat"
                                                        >
                                                            {sessionTypeDisplay[session.session_type].label}
                                                        </Chip>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <p className="text-slate-800">{formatDate(session.start_time)}</p>
                                                            <p className="text-slate-500">
                                                                {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="sm"
                                                            color={statusDisplay[session.status].color}
                                                            variant="flat"
                                                            startContent={
                                                                session.status === "active" ? (
                                                                    <span className="relative flex h-2 w-2 mr-1">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                                    </span>
                                                                ) : undefined
                                                            }
                                                        >
                                                            {statusDisplay[session.status].label}
                                                        </Chip>
                                                    </TableCell>
                                                    <TableCell>
                                                        {session.stats ? (
                                                            <div className="flex items-center gap-2">
                                                                <Tooltip content="มาเรียน">
                                                                    <Chip size="sm" color="success" variant="flat">
                                                                        {session.stats.present + session.stats.late}
                                                                    </Chip>
                                                                </Tooltip>
                                                                <Tooltip content="สาย">
                                                                    <Chip size="sm" color="warning" variant="flat">
                                                                        {session.stats.late}
                                                                    </Chip>
                                                                </Tooltip>
                                                                <Tooltip content="ขาด">
                                                                    <Chip size="sm" color="danger" variant="flat">
                                                                        {session.stats.absent}
                                                                    </Chip>
                                                                </Tooltip>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {session.status === "draft" && (
                                                                <>
                                                                    <Tooltip content="เริ่มเปิดเช็คชื่อทันที">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="success"
                                                                            onPress={() => handleActivateSession(session)}
                                                                        >
                                                                            <Icon icon="solar:play-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                    <Tooltip content="แก้ไข">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="primary"
                                                                            onPress={() => openEditModal(session)}
                                                                        >
                                                                            <Icon icon="solar:pen-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                    <Tooltip content="ลบ" color="danger">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="danger"
                                                                            onPress={() => {
                                                                                setDeleteTarget(session);
                                                                                setIsDeleteModalOpen(true);
                                                                            }}
                                                                        >
                                                                            <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                            {session.status === "active" && (
                                                                <>
                                                                    <Tooltip content="ดูหน้าเช็คชื่อ">
                                                                        <Link
                                                                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                                                                            href={`/attendance/${course.id}/session/${session.id}/live`}
                                                                            target="_blank"
                                                                        >
                                                                            <Icon icon="solar:eye-bold" className="text-lg text-blue-600" />
                                                                        </Link>
                                                                    </Tooltip>
                                                                    <Tooltip content="ดูสรุป">
                                                                        <Link
                                                                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                                                                            href={`/classroom/${course.id}/attendance/${session.id}/summary`}
                                                                            target="_blank"
                                                                        >
                                                                            <Icon icon="solar:chart-bold" className="text-lg" />
                                                                        </Link>
                                                                    </Tooltip>
                                                                    <Tooltip content="แก้ไขเวลา">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="primary"
                                                                            onPress={() => openEditModal(session)}
                                                                        >
                                                                            <Icon icon="solar:pen-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                    <Tooltip content="ปิดทันที" color="danger">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="danger"
                                                                            onPress={() => handleCloseSession(session)}
                                                                        >
                                                                            <Icon icon="solar:stop-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                            {session.status === "closed" && (
                                                                <>
                                                                    <Tooltip content="ดูหน้าเช็คชื่อ">
                                                                        <Link
                                                                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                                                                            href={`/attendance/${course.id}/session/${session.id}/live`}
                                                                            target="_blank"
                                                                        >
                                                                            <Icon icon="solar:eye-bold" className="text-lg" />
                                                                        </Link>
                                                                    </Tooltip>

                                                                    <Tooltip content="ดูสรุป">
                                                                        <Link
                                                                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                                                                            href={`/classroom/${course.id}/attendance/${session.id}/summary`}
                                                                            target="_blank"
                                                                        >
                                                                            <Icon icon="solar:chart-bold" className="text-lg" />
                                                                        </Link>
                                                                    </Tooltip>
                                                                    <Tooltip content="แก้ไข/ขยายเวลา">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="primary"
                                                                            onPress={() => openEditModal(session)}
                                                                        >
                                                                            <Icon icon="solar:pen-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                    <Tooltip content="ลบ" color="danger">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="danger"
                                                                            onPress={() => {
                                                                                setDeleteTarget(session);
                                                                                setIsDeleteModalOpen(true);
                                                                            }}
                                                                        >
                                                                            <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardBody>
                        </Card>
                    )
                    }
                </>
            )}

            {/* Create Session Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                isDismissable={false}
                isKeyboardDismissDisabled={true}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <span>สร้างรอบการเช็คชื่อ</span>
                        <span className="text-sm font-normal text-slate-500">
                            กำหนดรายละเอียดการเช็คชื่อเข้าเรียน
                        </span>
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            {/* Title */}
                            <Input
                                label="ชื่อรอบการเช็คชื่อ"
                                value={formData.title}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                                isRequired
                                labelPlacement="outside-top"
                                variant="bordered"
                                size="md"
                            />

                            {/* Section - Multi-select */}
                            <Select
                                label="กลุ่มเรียน"
                                placeholder="เลือกกลุ่มเรียน"
                                selectionMode="multiple"
                                selectedKeys={new Set((formData.course_section_ids || []).map(String))}
                                labelPlacement="outside-top"
                                variant="bordered"
                                size="md"
                                onSelectionChange={(keys) => {
                                    const selectedIds = Array.from(keys).map(k => Number(k));
                                    setFormData((prev) => ({
                                        ...prev,
                                        course_section_ids: selectedIds,
                                        course_section_id: selectedIds.length === 1 ? selectedIds[0] : null,
                                    }));
                                }}
                            // description={
                            //     (formData.course_section_ids || []).length === allSectionIds.length
                            //         ? "เลือกทุกกลุ่มเรียนแล้ว"
                            //         : `เลือกแล้ว ${(formData.course_section_ids || []).length} จาก ${allSectionIds.length} กลุ่มเรียน`
                            // }
                            >
                                {(course.sections || []).map((section) => (
                                    <SelectItem key={String(section.id)} textValue={`${section.section_no}${section.note ? ` - ${section.note}` : ""}`}>
                                        {section.section_no}{section.note ? ` - ${section.note}` : ""}
                                    </SelectItem>
                                ))}
                            </Select>

                            {/* Session Type */}
                            <Select
                                label="ประเภทการเรียน"
                                selectedKeys={[formData.session_type]}
                                variant="bordered"
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as "lecture" | "lab" | "online";
                                    setFormData((prev) => ({ ...prev, session_type: selected }));
                                }}
                                isRequired
                                labelPlacement="outside-top"
                                size="md"
                            >
                                <SelectItem key="lecture" >
                                    บรรยาย (Lecture)
                                </SelectItem>
                                <SelectItem key="lab" >
                                    ปฏิบัติ (Lab)
                                </SelectItem>
                                <SelectItem key="online" >
                                    ออนไลน์ (Online)
                                </SelectItem>
                            </Select>

                            {/* Date Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DatePicker
                                    label="เวลาเริ่มต้น"
                                    variant="bordered"
                                    labelPlacement="outside"
                                    granularity="minute"
                                    hideTimeZone
                                    showMonthAndYearPickers
                                    value={startDateTime}
                                    onChange={(value) => value && setStartDateTime(value)}
                                    isRequired
                                    popoverProps={{
                                        placement: "bottom",
                                        classNames: {
                                            content: "z-[9999]",
                                        },
                                    }}
                                    calendarProps={{
                                        classNames: {
                                            base: "bg-white shadow-xl",
                                            headerWrapper: "pt-4 bg-white",
                                            prevButton: "border-1 border-default-200 rounded-small",
                                            nextButton: "border-1 border-default-200 rounded-small",
                                            gridHeader: "bg-white shadow-none",
                                            cellButton: [
                                                "data-[today=true]:bg-primary-100 data-[selected=true]:bg-primary",
                                            ],
                                        },
                                    }}
                                />
                                <DatePicker
                                    label="เวลาสิ้นสุด"
                                    variant="bordered"
                                    labelPlacement="outside"
                                    granularity="minute"
                                    hideTimeZone
                                    showMonthAndYearPickers
                                    value={endDateTime}
                                    onChange={(value) => value && setEndDateTime(value)}
                                    isRequired
                                    popoverProps={{
                                        placement: "bottom",
                                        classNames: {
                                            content: "z-[9999]",
                                        },
                                    }}
                                    calendarProps={{
                                        classNames: {
                                            base: "bg-white shadow-xl",
                                            headerWrapper: "pt-4 bg-white",
                                            prevButton: "border-1 border-default-200 rounded-small",
                                            nextButton: "border-1 border-default-200 rounded-small",
                                            gridHeader: "bg-white shadow-none",
                                            cellButton: [
                                                "data-[today=true]:bg-primary-100 data-[selected=true]:bg-primary",
                                            ],
                                        },
                                    }}
                                />
                            </div>

                            {/* Late Threshold */}
                            <Input
                                type="number"
                                label="เวลาสาย (นาที)"
                                labelPlacement="outside-top"
                                variant="bordered"
                                value={String(formData.late_threshold_minutes)}
                                onValueChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        late_threshold_minutes: parseInt(value) || 15,
                                    }))
                                }
                                description="หลังเวลาเริ่มต้นกี่นาทีจึงนับว่ามาสาย"
                                endContent={<span className="text-slate-400 text-sm">นาที</span>}
                                size="md"
                            />

                            {/* Location Check */}
                            <Card className="border border-slate-200 overflow-hidden">
                                <CardBody className="p-0">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-xl">
                                                <Icon icon="solar:map-point-bold" className="text-xl text-blue-600" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-800">ตรวจสอบตำแหน่ง GPS</span>
                                                <p className="text-xs text-slate-500">ให้นักศึกษาต้องอยู่ในบริเวณที่กำหนด</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={formData.check_location ? "solid" : "bordered"}
                                            color={formData.check_location ? "primary" : "default"}
                                            onPress={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    check_location: !prev.check_location,
                                                }))
                                            }
                                            startContent={
                                                <Icon
                                                    icon={formData.check_location ? "solar:check-circle-bold" : "solar:close-circle-linear"}
                                                    className="text-lg"
                                                />
                                            }
                                        >
                                            {formData.check_location ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                        </Button>
                                    </div>

                                    {formData.check_location && (
                                        <div className="p-4 space-y-4">
                                            {/* Location Method Selection */}
                                            <div className="w-full">
                                                {/* GPS Button */}
                                                <button
                                                    type="button"
                                                    onClick={getCurrentLocation}
                                                    disabled={isGettingLocation}
                                                    className={`group relative p-4 rounded-xl border-2 border-dashed transition-all duration-200 w-full ${isGettingLocation
                                                        ? "border-blue-400 bg-blue-50 cursor-wait"
                                                        : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
                                                        }`}
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className={`p-3 rounded-full transition-colors ${isGettingLocation
                                                            ? "bg-blue-200 animate-pulse"
                                                            : "bg-blue-100 group-hover:bg-blue-200"
                                                            }`}>
                                                            <Icon
                                                                icon={isGettingLocation ? "solar:gps-bold" : "solar:gps-bold"}
                                                                className={`text-2xl text-blue-600 ${isGettingLocation ? "animate-spin" : ""}`}
                                                            />
                                                        </div>
                                                        <span className="font-medium text-slate-700">
                                                            {isGettingLocation ? "กำลังดึง GPS..." : "ดึงจาก GPS ของเครื่อง"}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {isGettingLocation ? "รอสักครู่..." : "ใช้ GPS ความแม่นยำสูง"}
                                                        </span>
                                                    </div>
                                                    {isGettingLocation && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/50 rounded-xl">
                                                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </button>

                                            </div>

                                            {/* Location Status */}
                                            {formData.location_lat && formData.location_lng ? (
                                                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-green-100 rounded-lg">
                                                            <Icon icon="solar:map-point-wave-bold" className="text-xl text-green-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <Icon icon="solar:check-circle-bold" className="text-green-600" />
                                                                <span className="font-medium text-green-700">กำหนดตำแหน่งแล้ว</span>
                                                            </div>
                                                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-slate-500">Lat:</span>
                                                                    <code className="px-1.5 py-0.5 bg-white rounded text-green-700 font-mono text-xs">
                                                                        {Number(formData.location_lat).toFixed(6)}
                                                                    </code>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-slate-500">Lng:</span>
                                                                    <code className="px-1.5 py-0.5 bg-white rounded text-green-700 font-mono text-xs">
                                                                        {Number(formData.location_lng).toFixed(6)}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="danger"
                                                            onPress={() => setFormData((prev) => ({
                                                                ...prev,
                                                                location_lat: undefined,
                                                                location_lng: undefined,
                                                            }))}
                                                        >
                                                            <Icon icon="solar:trash-bin-trash-bold" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-amber-100 rounded-lg">
                                                            <Icon icon="solar:map-point-search-bold" className="text-xl text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-amber-700">ยังไม่ได้กำหนดตำแหน่ง</span>
                                                            <p className="text-xs text-amber-600 mt-0.5">กรุณาเลือกวิธีกำหนดตำแหน่งด้านบน</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Map Section */}
                                            <div id="map-section" className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Icon icon="solar:map-bold" className="text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-600">แผนที่ (คลิกเพื่อปักหมุด)</span>
                                                </div>
                                                <Suspense fallback={
                                                    <div className="h-[280px] bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="p-4 bg-white rounded-full shadow-sm">
                                                                <Icon icon="solar:map-bold" className="text-4xl text-slate-400 animate-pulse" />
                                                            </div>
                                                            <span className="text-sm text-slate-500">กำลังโหลดแผนที่...</span>
                                                        </div>
                                                    </div>
                                                }>
                                                    <LocationPicker
                                                        latitude={formData.location_lat}
                                                        longitude={formData.location_lng}
                                                        radius={formData.radius_meters}
                                                        onLocationChange={(lat, lng) => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                location_lat: lat,
                                                                location_lng: lng,
                                                            }));
                                                        }}
                                                    />
                                                </Suspense>
                                            </div>

                                            {/* Radius Setting */}
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="p-2 bg-violet-100 rounded-lg">
                                                        <Icon icon="solar:ruler-angular-bold" className="text-lg text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-slate-700">รัศมีที่อนุญาต</span>
                                                        <p className="text-xs text-slate-500">ระยะห่างจากจุดกำหนดที่อนุญาตให้เช็คชื่อได้</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        type="number"
                                                        variant="bordered"
                                                        value={String(formData.radius_meters)}
                                                        onValueChange={(value) =>
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                radius_meters: parseInt(value) || 10,
                                                            }))
                                                        }
                                                        size="sm"
                                                        endContent={<span className="text-slate-400 text-sm">เมตร</span>}
                                                        className="max-w-[150px]"
                                                    />
                                                    <div className="flex gap-1.5">
                                                        {[10, 50, 100, 200].map((r) => (
                                                            <Button
                                                                key={r}
                                                                size="sm"
                                                                variant={formData.radius_meters === r ? "solid" : "flat"}
                                                                color={formData.radius_meters === r ? "primary" : "default"}
                                                                onPress={() => setFormData((prev) => ({ ...prev, radius_meters: r }))}
                                                                className="min-w-0 px-3"
                                                            >
                                                                {r}m
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={() => {
                                setIsCreateModalOpen(false);
                                resetForm();
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleCreateSession}
                            isLoading={isSubmitting}
                            className="bg-gradient-to-r from-blue-400 to-indigo-500"
                        >
                            สร้างรอบเช็คชื่อ
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="sm">
                <ModalContent>
                    <ModalHeader>ยืนยันการลบ</ModalHeader>
                    <ModalBody>
                        <p>
                            คุณต้องการลบรอบการเช็คชื่อ <strong>{deleteTarget?.title}</strong> หรือไม่?
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsDeleteModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button color="danger" onPress={handleDeleteSession} isLoading={isSubmitting}>
                            ลบ
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Close Session Confirmation Modal */}
            <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} size="sm">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Icon icon="solar:stop-bold" className="text-xl text-red-600" />
                            </div>
                            <span>ยืนยันการปิดรอบเช็คชื่อ</span>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        <p>
                            คุณต้องการปิดรอบการเช็คชื่อ <strong>{closeTarget?.title}</strong> ทันทีหรือไม่?
                        </p>
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Icon icon="solar:danger-triangle-bold" className="text-amber-500 text-lg mt-0.5" />
                                <div className="text-sm text-amber-700">
                                    <p className="font-medium">หลังจากปิดแล้ว:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>นักศึกษาจะไม่สามารถเช็คชื่อได้อีก</li>
                                        <li>สถานะจะเปลี่ยนเป็น &quot;ปิดแล้ว&quot;</li>
                                        <li>สามารถเปิดใหม่ได้โดยการขยายเวลา</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsCloseModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button color="danger" onPress={confirmCloseSession} isLoading={isSubmitting}>
                            <Icon icon="solar:stop-bold" className="text-lg" />
                            ปิดรอบเช็คชื่อ
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Session Modal */}
            <Modal
                isOpen={isEditModalOpen}
                isDismissable={false}
                isKeyboardDismissDisabled={true}
                onClose={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                }}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">
                        <span>แก้ไขรอบการเช็คชื่อ</span>
                        <span className="text-sm font-normal text-slate-500">
                            แก้ไขรายละเอียดการเช็คชื่อ: {editTarget?.title}
                        </span>
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            {/* Title */}
                            <Input
                                label="ชื่อรอบการเช็คชื่อ"
                                value={formData.title}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                                isRequired
                                labelPlacement="outside-top"
                                variant="bordered"
                                size="md"
                            />

                            {/* Section - Multi-select */}
                            <Select
                                label="กลุ่มเรียน"
                                placeholder="เลือกกลุ่มเรียน"
                                selectionMode="multiple"
                                selectedKeys={new Set((formData.course_section_ids || []).map(String))}
                                labelPlacement="outside-top"
                                variant="bordered"
                                size="md"
                                onSelectionChange={(keys) => {
                                    const selectedIds = Array.from(keys).map(k => Number(k));
                                    setFormData((prev) => ({
                                        ...prev,
                                        course_section_ids: selectedIds,
                                        course_section_id: selectedIds.length === 1 ? selectedIds[0] : null,
                                    }));
                                }}
                                description={
                                    (formData.course_section_ids || []).length === allSectionIds.length
                                        ? "เลือกทุกกลุ่มเรียนแล้ว"
                                        : `เลือกแล้ว ${(formData.course_section_ids || []).length} จาก ${allSectionIds.length} กลุ่มเรียน`
                                }
                                classNames={{
                                    trigger: "min-h-[50px]",
                                }}
                            >
                                {(course.sections || []).map((section) => (
                                    <SelectItem key={String(section.id)} textValue={`${section.section_no}${section.note ? ` - ${section.note}` : ""}`}>
                                        {section.section_no}{section.note ? ` - ${section.note}` : ""}
                                    </SelectItem>
                                ))}
                            </Select>

                            {/* Session Type */}
                            <Select
                                label="ประเภทการสอน"
                                selectedKeys={[formData.session_type]}
                                labelPlacement="outside-top"
                                variant="bordered"
                                size="md"
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as "lecture" | "lab" | "online";
                                    setFormData((prev) => ({ ...prev, session_type: selected }));
                                }}
                            >
                                <SelectItem key="lecture" startContent={<Icon icon="solar:presentation-graph-bold" />}>
                                    บรรยาย
                                </SelectItem>
                                <SelectItem key="lab" startContent={<Icon icon="solar:test-tube-bold" />}>
                                    ปฏิบัติ
                                </SelectItem>
                                <SelectItem key="online" startContent={<Icon icon="solar:laptop-bold" />}>
                                    ออนไลน์
                                </SelectItem>
                            </Select>

                            {/* Time Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DatePicker
                                    label="เวลาเริ่มต้น"
                                    value={startDateTime}
                                    onChange={(value) => value && setStartDateTime(value)}
                                    granularity="minute"
                                    hideTimeZone
                                    labelPlacement="outside-top"
                                    variant="bordered"
                                />
                                <DatePicker
                                    label="เวลาสิ้นสุด"
                                    value={endDateTime}
                                    onChange={(value) => value && setEndDateTime(value)}
                                    granularity="minute"
                                    hideTimeZone
                                    labelPlacement="outside-top"
                                    variant="bordered"
                                />
                            </div>

                            {/* Late Threshold */}
                            <div>
                                <label className="text-sm text-slate-700 mb-2 block">
                                    เวลาสายหลังเริ่มต้น (นาที)
                                </label>
                                <div className="flex gap-2">
                                    {[5, 10, 15, 20, 30].map((mins) => (
                                        <Button
                                            key={mins}
                                            size="sm"
                                            variant={formData.late_threshold_minutes === mins ? "solid" : "flat"}
                                            color={formData.late_threshold_minutes === mins ? "primary" : "default"}
                                            onPress={() => setFormData((prev) => ({ ...prev, late_threshold_minutes: mins }))}
                                        >
                                            {mins} นาที
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Location Check */}
                            <Card className="border border-slate-200">
                                <CardBody className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="font-medium text-slate-700">ตรวจสอบตำแหน่ง GPS</p>
                                            <p className="text-sm text-slate-500">ให้นักศึกษาเช็คชื่อได้เฉพาะในพื้นที่ที่กำหนด</p>
                                        </div>
                                        <Button
                                            color={formData.check_location ? "primary" : "default"}
                                            variant={formData.check_location ? "solid" : "flat"}
                                            onPress={() => setFormData((prev) => ({ ...prev, check_location: !prev.check_location }))}
                                        >
                                            {formData.check_location ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                        </Button>
                                    </div>

                                    {formData.check_location && (
                                        <div className="space-y-4">
                                            {/* Map */}
                                            <div className="rounded-xl overflow-hidden border border-slate-200">
                                                <Suspense fallback={
                                                    <div className="h-64 bg-slate-100 flex items-center justify-center">
                                                        <span className="text-slate-400">กำลังโหลดแผนที่...</span>
                                                    </div>
                                                }>
                                                    <LocationPicker
                                                        latitude={formData.location_lat || 16.4728}
                                                        longitude={formData.location_lng || 102.8233}
                                                        radius={formData.radius_meters || 50}
                                                        onLocationChange={(lat, lng) => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                location_lat: lat,
                                                                location_lng: lng,
                                                            }));
                                                        }}
                                                    />
                                                </Suspense>
                                            </div>

                                            {/* Location Controls */}
                                            <div className="flex flex-wrap gap-3">
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color="primary"
                                                    startContent={isGettingLocation ? null : <Icon icon="solar:map-point-wave-bold" />}
                                                    onPress={getCurrentLocation}
                                                    isLoading={isGettingLocation}
                                                >
                                                    {isGettingLocation ? "กำลังระบุตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน (GPS)"}
                                                </Button>
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-500">
                                                        ตำแหน่ง: {formData.location_lat ? Number(formData.location_lat).toFixed(6) : "-"}, {formData.location_lng ? Number(formData.location_lng).toFixed(6) : "-"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Radius */}
                                            <div>
                                                <p className="text-sm text-slate-600 mb-2">รัศมีการเช็คชื่อ</p>
                                                <div className="flex gap-1.5">
                                                    {[10, 50, 100, 200].map((r) => (
                                                        <Button
                                                            key={r}
                                                            size="sm"
                                                            variant={formData.radius_meters === r ? "solid" : "flat"}
                                                            color={formData.radius_meters === r ? "primary" : "default"}
                                                            onPress={() => setFormData((prev) => ({ ...prev, radius_meters: r }))}
                                                            className="min-w-0 px-3"
                                                        >
                                                            {r}m
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={() => {
                                setIsEditModalOpen(false);
                                resetForm();
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleUpdateSession}
                            isLoading={isSubmitting}
                            className="bg-gradient-to-r from-blue-400 to-indigo-500"
                        >
                            บันทึกการแก้ไข
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div >
    );
}
