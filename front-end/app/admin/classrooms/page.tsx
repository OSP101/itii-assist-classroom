"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { Spinner } from "@heroui/spinner";
import { Tooltip } from "@heroui/tooltip";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
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
import dynamic from "next/dynamic";
import classroomService, {
    Classroom as APIClassroom,
    Desk as APIDesk,
    ClassroomStats,
} from "@/services/classroom.service";

// Dynamic import Canvas component (client-side only)
const CanvasEditor = dynamic(() => import("./CanvasEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-slate-100 rounded-xl">
            <div className="text-slate-400">กำลังโหลด...</div>
        </div>
    ),
});

// UI Interface (camelCase)
interface Desk {
    id: string;
    x: number;
    y: number;
    type: "computer" | "normal" | "teacher";
    isEnabled: boolean;
    number: number;
}

interface Classroom {
    id: string;
    name: string;
    building: string;
    floor: string;
    description?: string;
    desks: Desk[];
    createdAt: string;
    isActive: boolean;
    isDeleted: boolean;
}

// Transform functions between API (snake_case) and UI (camelCase)
const transformDeskFromAPI = (desk: APIDesk): Desk => ({
    id: desk.id,
    x: desk.x,
    y: desk.y,
    type: desk.type,
    isEnabled: desk.is_enabled,
    number: desk.number,
});

const transformDeskToAPI = (desk: Desk): Omit<APIDesk, "classroom_id"> => ({
    id: desk.id,
    x: desk.x,
    y: desk.y,
    type: desk.type,
    is_enabled: desk.isEnabled,
    number: desk.number,
});

const transformClassroomFromAPI = (classroom: APIClassroom): Classroom => ({
    id: classroom.id,
    name: classroom.name,
    building: classroom.building,
    floor: classroom.floor,
    description: classroom.description,
    desks: (classroom.desks || []).map(transformDeskFromAPI),
    createdAt: classroom.created_at,
    isActive: classroom.is_active ?? true,
    isDeleted: classroom.is_deleted,
});

const DESK_WIDTH = 60;
const DESK_HEIGHT = 60;
const TEACHER_DESK_WIDTH = 180;
const TEACHER_DESK_HEIGHT = 60;
const GRID_SIZE = 20;

// Table columns
const columns = [
    { key: "name", label: "ชื่อห้อง", sortable: true },
    { key: "building", label: "อาคาร", sortable: true },
    { key: "floor", label: "ชั้น", sortable: true },
    { key: "desks", label: "จำนวนโต๊ะ", sortable: false },
    { key: "status", label: "สถานะ", sortable: false },
    { key: "actions", label: "จัดการ", sortable: false },
];

export default function ClassroomsPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [stats, setStats] = useState<ClassroomStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLayoutModal, setShowLayoutModal] = useState(false);
    const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(
        null
    );
    const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
    const [showDeskModal, setShowDeskModal] = useState(false);
    const [showDeletedOnly, setShowDeletedOnly] = useState(false);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [floorFilter, setFloorFilter] = useState<string>("all");

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        building: "",
        floor: "",
        description: "",
    });

    // Fetch classrooms from API
    const fetchClassrooms = useCallback(async () => {
        try {
            setIsLoading(true);
            const [classroomsRes, statsRes] = await Promise.all([
                classroomService.getClassrooms({ showDeleted: "all" }),
                classroomService.getStats(),
            ]);
            
            if (classroomsRes.success && classroomsRes.data) {
                const transformedClassrooms = classroomsRes.data.classrooms.map(transformClassroomFromAPI);
                setClassrooms(transformedClassrooms);
            }
            
            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
        } catch (error: any) {
            console.error("Failed to fetch classrooms:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถโหลดข้อมูลห้องเรียนได้",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load data on mount
    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    // Helper function to refresh stats only (reduces duplicate code)
    const refreshStats = useCallback(async () => {
        try {
            const statsRes = await classroomService.getStats();
            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
        } catch (error) {
            console.error("Failed to refresh stats:", error);
        }
    }, []);

    // Update stage size based on container
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setStageSize({
                    width: rect.width - 48,
                    height: Math.max(800, window.innerHeight - 250),
                });
            }
        };

        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, [showLayoutModal]);

    // Snap to grid
    const snapToGrid = (value: number) => {
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    };

    // Handle create classroom
    const handleCreate = async () => {
        if (!formData.name || !formData.building || !formData.floor) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณากรอกข้อมูลให้ครบถ้วน",
                color: "warning",
            });
            return;
        }

        try {
            setIsSaving(true);
            const response = await classroomService.createClassroom({
                name: formData.name,
                building: formData.building,
                floor: formData.floor,
                description: formData.description || undefined,
            });

            if (!response.success || !response.data) {
                throw new Error(response.error || "Failed to create classroom");
            }

            const newClassroom = transformClassroomFromAPI(response.data);
            setClassrooms((prev) => [...prev, newClassroom]);
            setShowCreateModal(false);
            setFormData({
                name: "",
                building: "",
                floor: "",
                description: "",
            });

            // Open layout editor immediately
            setEditingClassroom(newClassroom);
            setShowLayoutModal(true);

            // Refresh stats in background (non-blocking)
            refreshStats();

            addToast({
                title: "สำเร็จ",
                description: "สร้างห้องเรียนแล้ว กรุณาจัดผังห้อง",
                color: "success",
            });
        } catch (error: any) {
            console.error("Failed to create classroom:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถสร้างห้องเรียนได้",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle delete (soft delete)
    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบห้องเรียนนี้ใช่หรือไม่?")) return;

        try {
            await classroomService.deleteClassroom(id);
            setClassrooms((prev) =>
                prev.map((c) => (c.id === id ? { ...c, isDeleted: true } : c))
            );

            // Refresh stats in background
            refreshStats();

            addToast({
                title: "สำเร็จ",
                description: "ลบห้องเรียนเรียบร้อยแล้ว",
                color: "success",
            });
        } catch (error: any) {
            console.error("Failed to delete classroom:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถลบห้องเรียนได้",
                color: "danger",
            });
        }
    };

    // Handle restore
    const handleRestore = async (id: string) => {
        try {
            await classroomService.restoreClassroom(id);
            setClassrooms((prev) =>
                prev.map((c) => (c.id === id ? { ...c, isDeleted: false } : c))
            );

            // Refresh stats in background
            refreshStats();

            addToast({
                title: "สำเร็จ",
                description: "กู้คืนห้องเรียนเรียบร้อยแล้ว",
                color: "success",
            });
        } catch (error: any) {
            console.error("Failed to restore classroom:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถกู้คืนห้องเรียนได้",
                color: "danger",
            });
        }
    };

    // Handle toggle status (enable/disable)
    const handleToggleStatus = async (id: string) => {
        try {
            const response = await classroomService.toggleStatus(id);
            if (response.success && response.data) {
                const updatedClassroom = transformClassroomFromAPI(response.data.data);
                setClassrooms((prev) =>
                    prev.map((c) => (c.id === id ? updatedClassroom : c))
                );

                addToast({
                    title: "สำเร็จ",
                    description: response.data.message,
                    color: "success",
                });
            }
        } catch (error: any) {
            console.error("Failed to toggle classroom status:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถเปลี่ยนสถานะห้องเรียนได้",
                color: "danger",
            });
        }
    };

    // Handle permanent delete
    const handlePermanentDelete = async (id: string) => {
        if (
            !confirm(
                "คุณต้องการลบห้องเรียนนี้ถาวรใช่หรือไม่? (ไม่สามารถกู้คืนได้)"
            )
        )
            return;

        try {
            await classroomService.deleteClassroom(id, true);
            setClassrooms((prev) => prev.filter((c) => c.id !== id));

            // Refresh stats in background
            refreshStats();

            addToast({
                title: "สำเร็จ",
                description: "ลบห้องเรียนถาวรเรียบร้อยแล้ว",
                color: "success",
            });
        } catch (error: any) {
            console.error("Failed to permanently delete classroom:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถลบห้องเรียนถาวรได้",
                color: "danger",
            });
        }
    };

    // Open layout editor
    const openLayoutEditor = async (classroom: Classroom) => {
        try {
            // Fetch full classroom with desks
            const response = await classroomService.getClassroom(classroom.id);
            if (!response.success || !response.data) {
                throw new Error(response.error || "Failed to load classroom");
            }
            setEditingClassroom(transformClassroomFromAPI(response.data));
            setShowLayoutModal(true);
        } catch (error: any) {
            console.error("Failed to load classroom:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถโหลดข้อมูลห้องเรียนได้",
                color: "danger",
            });
        }
    };

    // Add new desk
    const handleAddDesk = (type: "computer" | "normal" | "teacher") => {
        if (!editingClassroom) return;

        // นับเลขแยกตามประเภท: โต๊ะอาจารย์นับแยก, โต๊ะนักศึกษา (computer/normal) นับรวมกัน
        const isTeacherDesk = type === "teacher";
        const sameTypeDesks = editingClassroom.desks.filter((d) =>
            isTeacherDesk ? d.type === "teacher" : d.type !== "teacher"
        );
        const newDeskNumber = sameTypeDesks.length + 1;
        
        // โต๊ะใหม่จะอยู่ที่ตำแหน่งเดิมเสมอ ให้ผู้ใช้ลากจัดเรียงเอง
        const newDesk: Desk = {
            id: `desk_${Date.now()}`,
            x: 100,
            y: 100,
            type,
            isEnabled: true,
            number: newDeskNumber,
        };

        setEditingClassroom((prev) =>
            prev ? { ...prev, desks: [...prev.desks, newDesk] } : null
        );
    };

    // Handle desk drag
    const handleDeskDragEnd = (deskId: string, e: any) => {
        if (!editingClassroom) return;

        const newX = snapToGrid(e.target.x());
        const newY = snapToGrid(e.target.y());

        setEditingClassroom((prev) =>
            prev
                ? {
                      ...prev,
                      desks: prev.desks.map((d) =>
                          d.id === deskId ? { ...d, x: newX, y: newY } : d
                      ),
                  }
                : null
        );
    };

    // Handle desk click (for editing)
    const handleDeskClick = (desk: Desk) => {
        setSelectedDesk({ ...desk });
        setShowDeskModal(true);
    };

    // Update desk
    const handleUpdateDesk = () => {
        if (!editingClassroom || !selectedDesk) return;

        setEditingClassroom((prev) =>
            prev
                ? {
                      ...prev,
                      desks: prev.desks.map((d) =>
                          d.id === selectedDesk.id ? selectedDesk : d
                      ),
                  }
                : null
        );

        setShowDeskModal(false);
        setSelectedDesk(null);
    };

    // Delete desk
    const handleDeleteDesk = () => {
        if (!editingClassroom || !selectedDesk) return;

        const deletedType = selectedDesk.type;
        const isTeacher = deletedType === "teacher";

        setEditingClassroom((prev) => {
            if (!prev) return null;
            
            const remainingDesks = prev.desks.filter((d) => d.id !== selectedDesk.id);
            
            // Renumber แยกตามประเภท
            let teacherCount = 0;
            let studentCount = 0;
            
            const renumberedDesks = remainingDesks.map((d) => {
                if (d.type === "teacher") {
                    teacherCount++;
                    return { ...d, number: teacherCount };
                } else {
                    studentCount++;
                    return { ...d, number: studentCount };
                }
            });
            
            return { ...prev, desks: renumberedDesks };
        });

        setShowDeskModal(false);
        setSelectedDesk(null);
    };

    // Save layout
    const handleSaveLayout = async () => {
        if (!editingClassroom) return;

        try {
            setIsSaving(true);
            
            // Transform desks to API format
            const apiDesks = editingClassroom.desks.map(desk => ({
                id: desk.id,
                number: desk.number,
                x: desk.x,
                y: desk.y,
                type: desk.type,
                isEnabled: desk.isEnabled,
            }));
            
            await classroomService.updateLayout(editingClassroom.id, apiDesks);

            // Update local state
            setClassrooms((prev) =>
                prev.map((c) =>
                    c.id === editingClassroom.id ? editingClassroom : c
                )
            );

            // Refresh stats in background
            refreshStats();

            setShowLayoutModal(false);
            setEditingClassroom(null);

            addToast({
                title: "สำเร็จ",
                description: "บันทึกผังห้องเรียบร้อยแล้ว",
                color: "success",
            });
        } catch (error: any) {
            console.error("Failed to save layout:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถบันทึกผังห้องได้",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Get unique floors for filter (memoized)
    const uniqueFloors = useMemo(() => 
        Array.from(new Set(classrooms.map((c) => c.floor))).sort(),
        [classrooms]
    );

    // Filter classrooms (memoized)
    const filteredClassrooms = useMemo(() => classrooms.filter((c) => {
        // Deleted filter
        if (showDeletedOnly && !c.isDeleted) return false;
        if (!showDeletedOnly && c.isDeleted) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !c.name.toLowerCase().includes(query) &&
                !c.building.toLowerCase().includes(query) &&
                !(c.description?.toLowerCase().includes(query))
            ) {
                return false;
            }
        }

        // Floor filter
        if (floorFilter !== "all" && c.floor !== floorFilter) {
            return false;
        }

        return true;
    }), [classrooms, showDeletedOnly, searchQuery, floorFilter]);

    // Render cell content
    const renderCell = (classroom: Classroom, columnKey: string) => {
        switch (columnKey) {
            case "name":
                return (
                    <div>
                        <p className="font-semibold text-slate-800">{classroom.name}</p>
                        {classroom.description && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                                {classroom.description}
                            </p>
                        )}
                    </div>
                );
            case "building":
                return (
                    <Chip
                        size="sm"
                        variant="flat"
                        className="bg-blue-50 text-blue-600"
                        startContent={<Icon icon="solar:buildings-2-linear" className="text-xs" />}
                    >
                        {classroom.building}
                    </Chip>
                );
            case "floor":
                return (
                    <Chip
                        size="sm"
                        variant="flat"
                        className="bg-purple-50 text-purple-600"
                    >
                        ชั้น {classroom.floor}
                    </Chip>
                );
            case "desks":
                return (
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-700">
                            {classroom.desks.length} โต๊ะ
                        </span>
                        <div className="flex gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Icon icon="solar:monitor-linear" className="text-blue-500" />
                                {classroom.desks.filter(d => d.type === "computer").length}
                            </span>
                            <span className="flex items-center gap-1">
                                <Icon icon="solar:document-linear" className="text-emerald-500" />
                                {classroom.desks.filter(d => d.type === "normal").length}
                            </span>
                            <span className="flex items-center gap-1">
                                <Icon icon="solar:user-speak-linear" className="text-amber-500" />
                                {classroom.desks.filter(d => d.type === "teacher").length}
                            </span>
                        </div>
                    </div>
                );
            case "status":
                if (classroom.isDeleted) {
                    return (
                        <Chip size="sm" color="danger" variant="flat">
                            ลบแล้ว
                        </Chip>
                    );
                }
                return classroom.isActive ? (
                    <Chip
                        size="sm"
                        color="success"
                        variant="flat"
                        startContent={<Icon icon="solar:check-circle-bold" className="text-sm" />}
                    >
                        เปิดใช้งาน
                    </Chip>
                ) : (
                    <Chip
                        size="sm"
                        color="warning"
                        variant="flat"
                        startContent={<Icon icon="solar:pause-circle-bold" className="text-sm" />}
                    >
                        ปิดใช้งาน
                    </Chip>
                );
            case "actions":
                return (
                    <div className="flex items-center gap-1 justify-center">
                        {!classroom.isDeleted ? (
                            <>
                                <Tooltip content={classroom.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        color={classroom.isActive ? "warning" : "success"}
                                        onPress={() => handleToggleStatus(classroom.id)}
                                    >
                                        <Icon 
                                            icon={classroom.isActive ? "solar:power-bold" : "solar:power-linear"} 
                                            className="text-lg" 
                                        />
                                    </Button>
                                </Tooltip>
                                <Tooltip content="จัดการผัง">
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        onPress={() => openLayoutEditor(classroom)}
                                    >
                                        <Icon icon="solar:pen-linear" className="text-lg text-default-500" />
                                    </Button>
                                </Tooltip>
                                <Tooltip content="ลบ" color="danger">
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        color="danger"
                                        onPress={() => handleDelete(classroom.id)}
                                    >
                                        <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                                    </Button>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <Tooltip content="กู้คืน">
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        color="success"
                                        onPress={() => handleRestore(classroom.id)}
                                    >
                                        <Icon icon="solar:restart-bold" className="text-lg" />
                                    </Button>
                                </Tooltip>
                                <Tooltip content="ลบถาวร" color="danger">
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        color="danger"
                                        onPress={() => handlePermanentDelete(classroom.id)}
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-default-900">
                        จัดการห้องเรียน
                    </h1>
                    <p className="text-xs sm:text-sm text-default-500 mt-1">
                        สร้างและจัดการผังห้องเรียนสำหรับระบบจองคิวตรวจงาน
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        color={showDeletedOnly ? "default" : "primary"}
                        variant="flat"
                        startContent={<Icon icon="solar:trash-bin-2-bold" className="text-lg sm:text-xl" />}
                        onPress={() => setShowDeletedOnly(!showDeletedOnly)}
                        className="font-medium flex-1 sm:flex-none text-xs sm:text-sm"
                        size="md"
                    >
                        <span className="hidden sm:inline">{showDeletedOnly ? "แสดงห้องปกติ" : "ดูถังขยะ"}</span>
                        <span className="sm:hidden">{showDeletedOnly ? "ปกติ" : "ถังขยะ"}</span>
                    </Button>
                    <Button
                        color="primary"
                        startContent={<Icon icon="solar:add-circle-bold" className="text-lg sm:text-xl" />}
                        onPress={() => setShowCreateModal(true)}
                        className="font-medium flex-1 sm:flex-none sm:px-6 bg-gradient-to-r from-blue-400 to-indigo-500 text-xs sm:text-sm"
                        size="md"
                    >
                        <span className="hidden sm:inline">สร้างห้องเรียนใหม่</span>
                        <span className="sm:hidden">สร้างห้อง</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-blue-100 rounded-xl">
                            <Icon icon="solar:buildings-3-bold" className="text-xl sm:text-2xl text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-default-500">ห้องเรียนทั้งหมด</p>
                            <p className="text-xl sm:text-2xl font-bold text-default-900">{stats?.totalClassrooms ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-green-100 rounded-xl">
                            <Icon icon="solar:chair-bold" className="text-xl sm:text-2xl text-green-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-default-500">โต๊ะทั้งหมด</p>
                            <p className="text-xl sm:text-2xl font-bold text-default-900">{stats?.totalDesks ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-purple-100 rounded-xl">
                            <Icon icon="solar:monitor-bold" className="text-xl sm:text-2xl text-purple-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-default-500">โต๊ะคอมพิวเตอร์</p>
                            <p className="text-xl sm:text-2xl font-bold text-default-900">{stats?.computerDesks ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-red-100 rounded-xl">
                            <Icon icon="solar:trash-bin-2-bold" className="text-xl sm:text-2xl text-red-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-default-500">ถังขยะ</p>
                            <p className="text-xl sm:text-2xl font-bold text-default-900">{stats?.deletedClassrooms ?? 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Card with Filters */}
            <div className="bg-white rounded-xl border border-default-200 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-3 sm:pb-4">
                        <Input
                            placeholder="ค้นหาห้องเรียน..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            startContent={<Icon icon="solar:magnifer-linear" className="text-default-400" />}
                            isClearable
                            onClear={() => setSearchQuery("")}
                            className="flex-1"
                            size="md"
                            classNames={{
                                inputWrapper: "bg-slate-50 border-slate-200 hover:border-slate-300",
                            }}
                        />
                        <div className="flex gap-2 flex-wrap">
                            <Select
                                placeholder="เลือกชั้น"
                                selectedKeys={[floorFilter]}
                                onSelectionChange={(keys) => setFloorFilter(Array.from(keys)[0] as string)}
                                className="flex-1 min-w-[150px] sm:w-48"
                                size="md"
                                classNames={{
                                    trigger: "bg-slate-50 border-slate-200 hover:border-slate-300",
                                }}
                            >
                                {[
                                    <SelectItem key="all">ทุกชั้น</SelectItem>,
                                    ...uniqueFloors.map((floor) => (
                                        <SelectItem key={floor}>ชั้น {floor}</SelectItem>
                                    ))
                                ]}
                            </Select>
                        </div>
                    </div>

                    {/* Table with horizontal scroll */}
                    <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
                      <div className="min-w-[600px]">
                        <Table
                            aria-label="ตารางห้องเรียน"
                            removeWrapper
                            classNames={{
                                th: "bg-slate-50 text-slate-600 font-semibold text-xs sm:text-sm",
                                td: "py-2 sm:py-3",
                            }}
                        >
                            <TableHeader columns={columns}>
                                {(column) => (
                                    <TableColumn
                                        key={column.key}
                                        align={column.key === "actions" ? "center" : "start"}
                                    >
                                        {column.label}
                                    </TableColumn>
                                )}
                        </TableHeader>
                        <TableBody
                            items={filteredClassrooms}
                            isLoading={isLoading}
                            loadingContent={<Spinner color="primary" label="กำลังโหลด..." />}
                            emptyContent={
                                <div className="py-10">
                                    <Icon
                                        icon="solar:buildings-3-linear"
                                        className="text-5xl text-slate-300 mx-auto mb-4"
                                    />
                                    <p className="text-slate-500">
                                        {showDeletedOnly
                                            ? "ไม่มีห้องเรียนในถังขยะ"
                                            : "ยังไม่มีห้องเรียน"}
                                    </p>
                                </div>
                            }
                        >
                            {(classroom) => (
                                <TableRow key={classroom.id}>
                                    {(columnKey) => (
                                        <TableCell>
                                            {renderCell(classroom, columnKey as string)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )}
                        </TableBody>
                          </Table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Classroom Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setFormData({ name: "", building: "", floor: "", description: "" });
                }}
                size="lg"
                scrollBehavior="inside"
                classNames={{
                    base: "mx-2 sm:mx-4",
                }}
            >
                <ModalContent>
                    <ModalHeader>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl">
                                <Icon
                                    icon="solar:display-bold"
                                    className="text-xl sm:text-2xl text-white"
                                />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                                    สร้างห้องเรียนใหม่
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                                    กรอกข้อมูลห้องเรียน แล้วจัดผังในขั้นตอนถัดไป
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-4 sm:px-6 py-4">
                        <div className="space-y-4">
                            <Input
                                label="ชื่อห้อง"
                                labelPlacement="outside"
                                placeholder="เช่น ห้อง 306"
                                variant="bordered"
                                value={formData.name}
                                onValueChange={(val) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        name: val,
                                    }))
                                }
                                isRequired
                                startContent={
                                    <Icon
                                        icon="solar:display-linear"
                                        className="text-slate-400"
                                    />
                                }
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="อาคาร"
                                    labelPlacement="outside"
                                    placeholder="เช่น อาคาร IT"
                                    variant="bordered"
                                    value={formData.building}
                                    onValueChange={(val) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            building: val,
                                        }))
                                    }
                                    isRequired
                                    startContent={
                                        <Icon
                                            icon="solar:buildings-2-linear"
                                            className="text-slate-400"
                                        />
                                    }
                                />
                                <Input
                                    label="ชั้น"
                                    labelPlacement="outside"
                                    placeholder="เช่น 3"
                                    variant="bordered"
                                    value={formData.floor}
                                    onValueChange={(val) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            floor: val,
                                        }))
                                    }
                                    isRequired
                                    startContent={
                                        <Icon
                                            icon="solar:stairs-linear"
                                            className="text-slate-400"
                                        />
                                    }
                                />
                            </div>
                            <Textarea
                                label="รายละเอียดเพิ่มเติม"
                                labelPlacement="outside"
                                placeholder="ระบุข้อมูลเพิ่มเติมเกี่ยวกับห้องเรียน (ถ้ามี)"
                                variant="bordered"
                                value={formData.description}
                                onValueChange={(val) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        description: val,
                                    }))
                                }
                            />
                            <Card className="bg-blue-50 border-0">
                                <CardBody className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Icon
                                            icon="solar:info-circle-bold"
                                            className="text-blue-500 text-xl mt-0.5"
                                        />
                                        <div className="text-sm text-blue-700">
                                            <p className="font-semibold mb-1">
                                                ขั้นตอนถัดไป
                                            </p>
                                            <p>
                                                หลังจากสร้างห้องแล้ว
                                                คุณจะเข้าสู่หน้าจัดผังห้อง
                                                สามารถเพิ่มโต๊ะและลากวางตำแหน่งได้อิสระ
                                            </p>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={() => {
                                setShowCreateModal(false);
                                setFormData({ name: "", building: "", floor: "", description: "" });
                            }}
                            isDisabled={isSaving}
                        >
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleCreate}
                            isLoading={isSaving}
                        >
                            สร้างและจัดผัง
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Layout Editor Modal */}
            <Modal
                isOpen={showLayoutModal}
                onClose={() => {
                    setShowLayoutModal(false);
                    setEditingClassroom(null);
                }}
                size="full"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="border-b border-slate-200 p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-4 pr-0 sm:pr-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg sm:rounded-xl">
                                    <Icon
                                        icon="solar:display-bold"
                                        className="text-lg sm:text-2xl text-white"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-xl font-bold text-slate-800">
                                        <span className="hidden sm:inline">จัดผังห้อง: </span>
                                        <span className="sm:hidden">ผัง: </span>
                                        {editingClassroom?.name}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-normal hidden sm:block">
                                        ลากโต๊ะเพื่อจัดตำแหน่ง •
                                        คลิกเพื่อแก้ไขข้อมูล
                                    </p>
                                </div>
                            </div>
                                <Chip
                                    variant="flat"
                                    className="bg-emerald-50 text-emerald-600"
                                    startContent={<Icon icon="solar:chair-bold" />}
                                    size="sm"
                                >
                                    {editingClassroom?.desks.length || 0} โต๊ะ
                                </Chip>
                        </div>
                    </ModalHeader>
                    <ModalBody className="p-0">
                        {editingClassroom && (
                            <div className="flex flex-col lg:flex-row h-full">
                                {/* Toolbar - Hidden on mobile, shown as floating buttons instead */}
                                <div className="hidden lg:flex w-72 bg-slate-50 border-r border-slate-200 p-4 flex-col">
                                    <h4 className="font-semibold text-slate-800 mb-4">
                                        เพิ่มโต๊ะ
                                    </h4>
                                    <div className="space-y-3">
                                        <Button
                                            color="primary"
                                            variant="flat"
                                            className="w-full justify-start"
                                            startContent={
                                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                                    <Icon
                                                        icon="solar:monitor-bold"
                                                        className="text-white"
                                                    />
                                                </div>
                                            }
                                            onPress={() =>
                                                handleAddDesk("computer")
                                            }
                                        >
                                            โต๊ะคอม
                                        </Button>
                                        <Button
                                            color="success"
                                            variant="flat"
                                            className="w-full justify-start"
                                            startContent={
                                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                                    <Icon
                                                        icon="solar:document-bold"
                                                        className="text-white"
                                                    />
                                                </div>
                                            }
                                            onPress={() =>
                                                handleAddDesk("normal")
                                            }
                                        >
                                            โต๊ะเรียน
                                        </Button>
                                        <Button
                                            color="warning"
                                            variant="flat"
                                            className="w-full justify-start"
                                            startContent={
                                                <div className="w-10 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                                    <Icon
                                                        icon="solar:user-speak-bold"
                                                        className="text-white"
                                                    />
                                                </div>
                                            }
                                            onPress={() =>
                                                handleAddDesk("teacher")
                                            }
                                        >
                                            โต๊ะอาจารย์
                                        </Button>
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <h4 className="font-semibold text-slate-800 mb-3">
                                            สัญลักษณ์
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-blue-500 rounded" />
                                                <span className="text-sm text-slate-600">
                                                    โต๊ะคอม
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-emerald-500 rounded" />
                                                <span className="text-sm text-slate-600">
                                                    โต๊ะเรียน
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-amber-500 rounded" />
                                                <span className="text-sm text-slate-600">
                                                    โต๊ะอาจารย์
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-300 rounded" />
                                                <span className="text-sm text-slate-600">
                                                    ปิดใช้งาน
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tips */}
                                    <Card className="mt-6 bg-amber-50 border-0">
                                        <CardBody className="p-3">
                                            <div className="flex items-start gap-2">
                                                <Icon
                                                    icon="solar:lightbulb-bolt-bold"
                                                    className="text-amber-500 text-lg mt-0.5"
                                                />
                                                <div className="text-xs text-amber-700">
                                                    <p className="font-semibold mb-1">
                                                        Tips:
                                                    </p>
                                                    <ul className="space-y-1">
                                                        <li>
                                                            • ลากโต๊ะเพื่อย้ายตำแหน่ง
                                                        </li>
                                                        <li>
                                                            • คลิกโต๊ะเพื่อแก้ไขหรือลบ
                                                        </li>
                                                        <li>
                                                            • โต๊ะจะ snap ตาม grid
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                </div>

                                {/* Canvas Area */}
                                <div
                                    className="flex-1 p-3 sm:p-6 bg-white relative"
                                    ref={containerRef}
                                >
                                    {/* Mobile Floating Add Buttons */}
                                    <div className="lg:hidden absolute top-4 left-4 z-10 flex gap-2">
                                        <Button
                                            isIconOnly
                                            color="primary"
                                            size="sm"
                                            onPress={() => handleAddDesk("computer")}
                                        >
                                            <Icon icon="solar:monitor-bold" className="text-lg" />
                                        </Button>
                                        <Button
                                            isIconOnly
                                            color="success"
                                            size="sm"
                                            onPress={() => handleAddDesk("normal")}
                                        >
                                            <Icon icon="solar:document-bold" className="text-lg" />
                                        </Button>
                                        <Button
                                            isIconOnly
                                            color="warning"
                                            size="sm"
                                            onPress={() => handleAddDesk("teacher")}
                                        >
                                            <Icon icon="solar:user-speak-bold" className="text-lg" />
                                        </Button>
                                    </div>
                                    
                                    <div className="bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 overflow-auto">
                                        <CanvasEditor
                                            width={stageSize.width}
                                            height={stageSize.height}
                                            desks={editingClassroom.desks}
                                            gridSize={GRID_SIZE}
                                            deskWidth={DESK_WIDTH}
                                            deskHeight={DESK_HEIGHT}
                                            teacherDeskWidth={TEACHER_DESK_WIDTH}
                                            teacherDeskHeight={TEACHER_DESK_HEIGHT}
                                            onDeskDragEnd={handleDeskDragEnd}
                                            onDeskClick={handleDeskClick}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="border-t border-slate-200 p-3 sm:p-4">
                        <Button
                            variant="light"
                            onPress={() => {
                                setShowLayoutModal(false);
                                setEditingClassroom(null);
                            }}
                            isDisabled={isSaving}
                            size="sm"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleSaveLayout}
                            startContent={!isSaving && <Icon icon="solar:diskette-bold" />}
                            isLoading={isSaving}
                            className="bg-gradient-to-r from-blue-400 to-indigo-500"
                            size="sm"
                        >
                            บันทึกผัง
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Desk Modal */}
            <Modal
                isOpen={showDeskModal}
                onClose={() => {
                    setShowDeskModal(false);
                    setSelectedDesk(null);
                }}
                size="md"
                scrollBehavior="inside"
                classNames={{
                    base: "mx-2 sm:mx-4",
                }}
            >
                <ModalContent>
                    <ModalHeader>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div
                                className={`p-1.5 sm:p-2 rounded-xl ${
                                    selectedDesk?.type === "computer"
                                        ? "bg-blue-500"
                                        : selectedDesk?.type === "teacher"
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                }`}
                            >
                                <Icon
                                    icon={
                                        selectedDesk?.type === "computer"
                                            ? "solar:monitor-bold"
                                            : selectedDesk?.type === "teacher"
                                            ? "solar:user-speak-bold"
                                            : "solar:document-bold"
                                    }
                                    className="text-xl sm:text-2xl text-white"
                                />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                                แก้ไขโต๊ะ #{selectedDesk?.number}
                            </h3>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-4 sm:px-6 py-4">
                        {selectedDesk && (
                            <div className="space-y-4">
                                <Select
                                    label="ประเภทโต๊ะ"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    selectedKeys={[selectedDesk.type]}
                                    onChange={(e) =>
                                        setSelectedDesk({
                                            ...selectedDesk,
                                            type: e.target.value as
                                                | "computer"
                                                | "normal"
                                                | "teacher",
                                        })
                                    }
                                >
                                    <SelectItem
                                        key="computer"
                                        startContent={
                                            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                                                <Icon
                                                    icon="solar:monitor-bold"
                                                    className="text-white text-sm"
                                                />
                                            </div>
                                        }
                                    >
                                        โต๊ะคอม
                                    </SelectItem>
                                    <SelectItem
                                        key="normal"
                                        startContent={
                                            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                                                <Icon
                                                    icon="solar:document-bold"
                                                    className="text-white text-sm"
                                                />
                                            </div>
                                        }
                                    >
                                        โต๊ะเรียนปกติ
                                    </SelectItem>
                                    <SelectItem
                                        key="teacher"
                                        startContent={
                                            <div className="w-8 h-6 bg-amber-500 rounded flex items-center justify-center">
                                                <Icon
                                                    icon="solar:user-speak-bold"
                                                    className="text-white text-sm"
                                                />
                                            </div>
                                        }
                                    >
                                        โต๊ะอาจารย์
                                    </SelectItem>
                                </Select>

                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            สถานะการใช้งาน
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {selectedDesk.isEnabled
                                                ? "โต๊ะนี้สามารถใช้งานได้"
                                                : "โต๊ะนี้ถูกปิดใช้งาน"}
                                        </p>
                                    </div>
                                    <Switch
                                        isSelected={selectedDesk.isEnabled}
                                        onValueChange={(val) =>
                                            setSelectedDesk({
                                                ...selectedDesk,
                                                isEnabled: val,
                                            })
                                        }
                                        color="success"
                                    />
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            color="danger"
                            variant="flat"
                            onPress={handleDeleteDesk}
                            startContent={
                                <Icon icon="solar:trash-bin-trash-linear" />
                            }
                        >
                            ลบโต๊ะ
                        </Button>
                        <div className="flex-1" />
                        <Button
                            variant="light"
                            onPress={() => {
                                setShowDeskModal(false);
                                setSelectedDesk(null);
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button color="primary" onPress={handleUpdateDesk}>
                            บันทึก
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
