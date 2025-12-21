"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from "@heroui/table";
import { Pagination } from "@heroui/pagination";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Tooltip } from "@heroui/tooltip";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { courseService } from "@/services/course.service";
import type { Course, CreateCourseDto, UpdateCourseDto, CourseStats, Instructor } from "@/services/course.service";

// Column definitions
const columns = [
    { key: "code", label: "รหัสวิชา", sortable: true },
    { key: "name", label: "ชื่อวิชา", sortable: true },
    { key: "year_semester", label: "ปี/เทอม", sortable: true },
    { key: "instructor", label: "อาจารย์ผู้สอน", sortable: false },
    { key: "sections", label: "กลุ่มเรียน", sortable: false },
    { key: "status", label: "สถานะ", sortable: true },
    { key: "actions", label: "จัดการ", sortable: false },
];

const statusOptions = [
    { key: "all", label: "ทุกสถานะ" },
    { key: "active", label: "ใช้งาน" },
    { key: "inactive", label: "ปิดใช้งาน" },
];

const semesterOptions = [
    { key: "all", label: "ทุกภาคเรียน" },
    { key: "1", label: "ภาคเรียนที่ 1" },
    { key: "2", label: "ภาคเรียนที่ 2" },
    { key: "3", label: "ภาคฤดูร้อน" },
];

export default function CoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<CourseStats | null>(null);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState<string>("created_at");
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form data
    const [formData, setFormData] = useState<CreateCourseDto>({
        code: "",
        name: "",
        year: new Date().getFullYear() + 543,
        semester: 1,
        instructor_id: null,
        description: "",
        image: "",
    });

    // Image upload state
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Year options (current + 5 years back)
    const currentYear = new Date().getFullYear() + 543;
    const yearOptions = [
        { key: "all", label: "ทุกปีการศึกษา" },
        ...Array.from({ length: 6 }, (_, i) => ({
            key: (currentYear - i).toString(),
            label: `${currentYear - i}`,
        })),
    ];

    // Fetch courses
    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await courseService.getCourses({
                page,
                limit,
                search: search || undefined,
                year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
                semester: semesterFilter !== "all" ? parseInt(semesterFilter) : undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                sortBy,
                sortOrder,
            });

            if (response.success && response.data) {
                setCourses(response.data.courses);
                setTotalPages(response.data.pagination.totalPages);
                setTotalItems(response.data.pagination.totalItems);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, search, yearFilter, semesterFilter, statusFilter, sortBy, sortOrder]);

    // Fetch stats
    const fetchStats = async () => {
        try {
            const response = await courseService.getStats();
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    // Fetch instructors for dropdown
    const fetchInstructors = async () => {
        try {
            const response = await courseService.getInstructors();
            if (response.success && response.data) {
                setInstructors(response.data);
            }
        } catch (error) {
            console.error("Error fetching instructors:", error);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    useEffect(() => {
        fetchStats();
        fetchInstructors();
    }, []);

    // Handle sort
    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
        } else {
            setSortBy(column);
            setSortOrder("ASC");
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            code: "",
            name: "",
            year: currentYear,
            semester: 1,
            instructor_id: null,
            description: "",
            image: "",
        });
        setImagePreview(null);
    };

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                addToast({
                    title: "ไฟล์ใหญ่เกินไป",
                    description: "ขนาดไฟล์ต้องไม่เกิน 2MB",
                    color: "warning",
                });
                return;
            }

            // Check file type
            if (!file.type.startsWith("image/")) {
                addToast({
                    title: "ไฟล์ไม่ถูกต้อง",
                    description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
                    color: "warning",
                });
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setFormData({ ...formData, image: base64 });
                setImagePreview(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove image
    const handleRemoveImage = () => {
        setFormData({ ...formData, image: "" });
        setImagePreview(null);
    };

    // Open edit modal
    const openEditModal = (course: Course) => {
        setSelectedCourse(course);
        setFormData({
            code: course.code,
            name: course.name,
            year: course.year,
            semester: course.semester,
            instructor_id: course.instructor_id,
            description: course.description || "",
            image: course.image || "",
        });
        setImagePreview(course.image || null);
        setIsEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (course: Course) => {
        setSelectedCourse(course);
        setIsDeleteModalOpen(true);
    };

    // Handle create
    const handleCreate = async () => {
        if (!formData.code || !formData.name) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณากรอกรหัสวิชาและชื่อวิชา",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await courseService.createCourse(formData);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "สร้างรายวิชาสำเร็จ",
                    color: "success",
                });
                setIsCreateModalOpen(false);
                resetForm();
                fetchCourses();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถสร้างรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle update
    const handleUpdate = async () => {
        if (!selectedCourse || !formData.code || !formData.name) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณากรอกรหัสวิชาและชื่อวิชา",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const updateData: UpdateCourseDto = {
                code: formData.code,
                name: formData.name,
                year: formData.year,
                semester: formData.semester,
                instructor_id: formData.instructor_id,
                description: formData.description,
                image: formData.image,
            };

            const response = await courseService.updateCourse(selectedCourse.id, updateData);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "อัปเดตรายวิชาสำเร็จ",
                    color: "success",
                });
                setIsEditModalOpen(false);
                resetForm();
                setSelectedCourse(null);
                fetchCourses();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถอัปเดตรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!selectedCourse) return;

        setIsSubmitting(true);
        try {
            const response = await courseService.deleteCourse(selectedCourse.id);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "ลบรายวิชาสำเร็จ",
                    color: "success",
                });
                setIsDeleteModalOpen(false);
                setSelectedCourse(null);
                fetchCourses();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถลบรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle toggle status
    const handleToggleStatus = async (course: Course) => {
        try {
            const response = await courseService.toggleStatus(course.id);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: course.is_active ? "ปิดใช้งานรายวิชาแล้ว" : "เปิดใช้งานรายวิชาแล้ว",
                    color: "success",
                });
                fetchCourses();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถเปลี่ยนสถานะได้",
                color: "danger",
            });
        }
    };

    // Navigate to course detail
    const handleViewCourse = (course: Course) => {
        router.push(`/admin/courses/${course.id}`);
    };

    // Render cell content
    const renderCell = (course: Course, columnKey: string) => {
        switch (columnKey) {
            case "code":
                return (
                    <div className="flex items-center gap-3">
                        {course.image ? (
                            <img
                                src={course.image}
                                alt={course.name}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                            />
                        ) : (
                            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                                <Icon icon="solar:book-2-bold" className="text-lg text-white" />
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-slate-800">{course.code}</p>
                        </div>
                    </div>
                );
            case "name":
                return (
                    <Tooltip content={course.name} delay={500}>
                        <span className="text-slate-700 font-medium line-clamp-2 max-w-[250px]">{course.name}</span>
                    </Tooltip>
                );
            case "year_semester":
                return (
                    <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat" color="primary">
                            {course.year}
                        </Chip>
                        <Chip size="sm" variant="flat" color="secondary">
                            {course.semester === 3 ? "ฤดูร้อน" : `เทอม ${course.semester}`}
                        </Chip>
                    </div>
                );
            case "instructor":
                return course.instructor ? (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">{course.instructor.full_name}</span>
                    </div>
                ) : (
                    <span className="text-slate-400 italic">ยังไม่กำหนด</span>
                );
            case "sections":
                return (
                    <div className="col-span-1 flex items-center gap-2">
                        <Tooltip content="กลุ่มเรียน">
                            <Chip size="sm" variant="flat" color="warning">
                                <div className="flex justify-center items-center">
                                <Icon icon="solar:users-group-rounded-bold" className="mr-1" />
                                {course.sections?.length || 0} กลุ่ม
                                </div>
                            </Chip>
                        </Tooltip>
                    </div>
                );
            case "status":
                return (
                    <Chip
                        size="sm"
                        variant="dot"
                        color={course.is_active ? "success" : "default"}
                    >
                        {course.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Chip>
                );
            case "actions":
                return (
                    <div className="flex items-center gap-1 justify-center">
                        <Tooltip content="ดูรายละเอียด">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleViewCourse(course)}
                            >
                                <Icon icon="solar:eye-linear" className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="แก้ไข">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => openEditModal(course)}
                            >
                                <Icon icon="solar:pen-linear" className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content={course.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleToggleStatus(course)}
                            >
                                <Icon
                                    icon={course.is_active ? "solar:eye-closed-linear" : "solar:eye-linear"}
                                    className="text-lg text-default-500"
                                />
                            </Button>
                        </Tooltip>
                        <Tooltip content="ลบ" color="danger">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => openDeleteModal(course)}
                            >
                                <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        จัดการรายวิชา
                    </h1>
                    <p className="text-slate-500 mt-1">จัดการรายวิชาทั้งหมดในระบบ</p>
                </div>
                <Button
                    color="primary"
                    startContent={<Icon icon="solar:add-circle-bold" className="text-xl" />}
                    onPress={() => {
                        resetForm();
                        setIsCreateModalOpen(true);
                    }}
                    className="font-medium px-6 bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                    เพิ่มรายวิชา
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg">
                            <Icon icon="solar:book-2-bold" className="text-2xl text-violet-600" />
                        </div>
                        <div>
                            <p className="text-sm text-default-500">รายวิชาทั้งหมด</p>
                            <p className="text-2xl font-bold text-default-900">{stats?.total || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Icon icon="solar:check-circle-bold" className="text-2xl text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-default-500">ใช้งานอยู่</p>
                            <p className="text-2xl font-bold text-default-900">{stats?.byStatus.active || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Icon icon="solar:close-circle-bold" className="text-2xl text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-default-500">ปิดใช้งาน</p>
                            <p className="text-2xl font-bold text-default-900">{stats?.byStatus.inactive || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-default-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon icon="solar:calendar-bold" className="text-2xl text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-default-500">ปีการศึกษานี้</p>
                            <p className="text-2xl font-bold text-default-900">{stats?.thisYear || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl border border-default-200 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 pb-4">
                        <Input
                            placeholder="ค้นหารหัสวิชา, ชื่อวิชา..."
                            value={search}
                            onValueChange={setSearch}
                            startContent={<Icon icon="solar:magnifer-linear" className="text-default-400" />}
                            className="flex-1 "
                            classNames={{
                                inputWrapper: "bg-slate-50 border-slate-200 hover:border-slate-300",
                            }}
                        />
                        <div className="flex gap-2 flex-wrap">
                            <Select
                                placeholder="ปีการศึกษา"
                                selectedKeys={[yearFilter]}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="w-40"
                                size="md"
                                classNames={{
                                    trigger: "bg-slate-50 border-slate-200 hover:border-slate-300",
                                }}
                            >
                                {yearOptions.map((option) => (
                                    <SelectItem key={option.key}>{option.label}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                placeholder="ภาคเรียน"
                                selectedKeys={[semesterFilter]}
                                onChange={(e) => setSemesterFilter(e.target.value)}
                                className="w-40"
                                size="md"
                                classNames={{
                                    trigger: "bg-slate-50 border-slate-200 hover:border-slate-300",
                                }}
                            >
                                {semesterOptions.map((option) => (
                                    <SelectItem key={option.key}>{option.label}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                placeholder="สถานะ"
                                selectedKeys={[statusFilter]}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-36"
                                size="md"
                                classNames={{
                                    trigger: "bg-slate-50 border-slate-200 hover:border-slate-300",
                                }}
                            >
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.key}>{option.label}</SelectItem>
                                ))}
                            </Select>
                        </div>
                    </div>


                    {/* Table */}
                    <Table
                        aria-label="Courses table"
                        removeWrapper
                        classNames={{
                            th: "bg-slate-50 text-slate-600 font-semibold",
                            td: "py-3",
                        }}
                    >
                        <TableHeader columns={columns}>
                            {(column) => (
                                <TableColumn
                                    key={column.key}
                                    align={column.key === "actions" ? "center" : "start"}
                                    allowsSorting={column.sortable}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                    className={column.sortable ? "cursor-pointer hover:bg-default-200" : ""}
                                >
                                    {column.label}
                                </TableColumn>
                            )}
                        </TableHeader>
                        <TableBody
                            items={courses}
                            isLoading={isLoading}
                            loadingContent={<Spinner color="primary" />}
                            emptyContent={
                                <div className="py-10 text-center">
                                    <Icon icon="solar:book-2-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">ไม่พบข้อมูลรายวิชา</p>
                                </div>
                            }
                        >
                            {(item) => (
                                <TableRow key={item.id}>
                                    {(columnKey) => (
                                        <TableCell>{renderCell(item, columnKey as string)}</TableCell>
                                    )}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100">
                        <p className="text-sm text-slate-500">
                            แสดง {((page - 1) * limit) + 1} - {Math.min(page * limit, totalItems)} จาก {totalItems} รายการ
                        </p>
                        <Pagination
                            total={totalPages}
                            page={page}
                            onChange={setPage}
                            showControls
                            size="sm"
                            color="primary"
                        />
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="2xl" scrollBehavior="inside">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                                <Icon icon="solar:book-2-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มรายวิชาใหม่</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">กรอกข้อมูลรายวิชาที่ต้องการเพิ่มในระบบ</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-6">
                        <div className="space-y-5">
                            {/* Course Image Section */}
                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:gallery-bold" className="text-lg text-blue-500" />
                                    <span className="text-sm font-semibold text-slate-700">รูปปกรายวิชา</span>
                                </div>
                                <div className="py-3">
                                    {imagePreview ? (
                                        <div className="relative group">
                                            <img
                                                src={imagePreview}
                                                alt="Course preview"
                                                className="w-full h-48 object-cover rounded-xl border border-slate-200"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                                                <label className="cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        as="span"
                                                        size="sm"
                                                        color="primary"
                                                        startContent={<Icon icon="solar:camera-bold" />}
                                                    >
                                                        เปลี่ยนรูป
                                                    </Button>
                                                </label>
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    startContent={<Icon icon="solar:trash-bin-trash-bold" />}
                                                    onPress={handleRemoveImage}
                                                >
                                                    ลบรูป
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                                                <Icon icon="solar:cloud-upload-bold-duotone" className="text-5xl text-blue-400 mx-auto mb-3" />
                                                <p className="text-slate-600 font-medium">คลิกเพื่ออัปโหลดรูปปกรายวิชา</p>
                                                <p className="text-slate-400 text-sm mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:document-text-bold" className="text-lg text-blue-500" />
                                    <span className="text-sm font-semibold text-slate-700">ข้อมูลรายวิชา</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-3">


                                    <div className="md:col-span-2">
                                        <Input
                                            label="รหัสวิชา"
                                            labelPlacement="outside"
                                            placeholder="เช่น 101401"
                                            variant="bordered"
                                            size="lg"
                                            value={formData.code}
                                            onValueChange={(value) => setFormData({ ...formData, code: value })}
                                            isRequired
                                            startContent={<Icon icon="solar:hashtag-linear" className="text-blue-400 text-xl" />}
                                            classNames={{
                                                inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                                label: "text-slate-600 font-medium text-sm",
                                            }}
                                        />
                                        <div className="md:col-span-2 pt-4">
                                            <Input
                                                label="ชื่อวิชา"
                                                labelPlacement="outside"
                                                placeholder="เช่น Object-Oriented Programming"
                                                variant="bordered"
                                                size="lg"
                                                value={formData.name}
                                                onValueChange={(value) => setFormData({ ...formData, name: value })}
                                                isRequired
                                                startContent={<Icon icon="solar:book-linear" className="text-blue-400 text-xl" />}
                                                classNames={{
                                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                                    label: "text-slate-600 font-medium text-sm",
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Input
                                        label="ปีการศึกษา"
                                        labelPlacement="outside"
                                        placeholder="เช่น 2568"
                                        variant="bordered"
                                        size="lg"
                                        type="number"
                                        value={formData.year.toString()}
                                        onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) || currentYear })}
                                        isRequired
                                        startContent={<Icon icon="solar:calendar-linear" className="text-blue-400 text-xl" />}
                                        classNames={{
                                            inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    />
                                    <Select
                                        label="ภาคเรียน"
                                        labelPlacement="outside"
                                        placeholder="เลือกภาคเรียน"
                                        variant="bordered"
                                        size="lg"
                                        selectedKeys={[formData.semester.toString()]}
                                        onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
                                        isRequired
                                        classNames={{
                                            trigger: "h-12 bg-white border-slate-200 hover:border-blue-300",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    >
                                        <SelectItem key="1">ภาคเรียนที่ 1</SelectItem>
                                        <SelectItem key="2">ภาคเรียนที่ 2</SelectItem>
                                        <SelectItem key="3">ภาคฤดูร้อน</SelectItem>
                                    </Select>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:user-circle-bold" className="text-lg text-blue-500" />
                                    <span className="text-sm font-semibold text-slate-700">ผู้สอน</span>
                                </div>
                                <div className="py-3">
                                    <Select
                                        label="อาจารย์ผู้สอน"
                                        labelPlacement="outside"
                                        placeholder="เลือกอาจารย์ผู้สอน (ถ้ามี)"
                                        variant="bordered"
                                        size="lg"
                                        selectedKeys={formData.instructor_id ? [formData.instructor_id.toString()] : []}
                                        onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value ? parseInt(e.target.value) : null })}
                                        classNames={{
                                            trigger: "h-12 bg-white border-slate-200 hover:border-blue-300",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    >
                                        {instructors.map((instructor) => (
                                            <SelectItem key={instructor.id.toString()}>
                                                {instructor.full_name}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:notes-bold" className="text-lg text-blue-500" />
                                    <span className="text-sm font-semibold text-slate-700">รายละเอียดเพิ่มเติม</span>
                                </div>
                                <div className="py-3">
                                    <Textarea
                                        label="คำอธิบายรายวิชา"
                                        labelPlacement="outside"
                                        placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับรายวิชา (ถ้ามี)"
                                        variant="bordered"
                                        value={formData.description}
                                        onValueChange={(value) => setFormData({ ...formData, description: value })}
                                        minRows={3}
                                        classNames={{
                                            inputWrapper: "bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            color="default"
                            onPress={() => setIsCreateModalOpen(false)}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleCreate}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-blue-500 to-indigo-600"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" className="text-lg" />}
                        >
                            สร้างรายวิชา
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="2xl" scrollBehavior="inside">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                                <Icon icon="solar:pen-new-square-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">แก้ไขรายวิชา</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">แก้ไขข้อมูลรายวิชา {selectedCourse?.code}</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-6">
                        <div className="space-y-5">
                            {/* Course Image Section */}
                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:gallery-bold" className="text-lg text-amber-500" />
                                    <span className="text-sm font-semibold text-slate-700">รูปปกรายวิชา</span>
                                </div>
                                <div className="py-3">
                                    {imagePreview ? (
                                        <div className="relative group">
                                            <img
                                                src={imagePreview}
                                                alt="Course preview"
                                                className="w-full h-48 object-cover rounded-xl border border-slate-200"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                                                <label className="cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        as="span"
                                                        size="sm"
                                                        color="warning"
                                                        startContent={<Icon icon="solar:camera-bold" />}
                                                    >
                                                        เปลี่ยนรูป
                                                    </Button>
                                                </label>
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    startContent={<Icon icon="solar:trash-bin-trash-bold" />}
                                                    onPress={handleRemoveImage}
                                                >
                                                    ลบรูป
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/50 transition-colors">
                                                <Icon icon="solar:cloud-upload-bold-duotone" className="text-5xl text-amber-400 mx-auto mb-3" />
                                                <p className="text-slate-600 font-medium">คลิกเพื่ออัปโหลดรูปปกรายวิชา</p>
                                                <p className="text-slate-400 text-sm mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:document-text-bold" className="text-lg text-amber-500" />
                                    <span className="text-sm font-semibold text-slate-700">ข้อมูลรายวิชา</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-3">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="รหัสวิชา"
                                            labelPlacement="outside"
                                            placeholder="เช่น 101401"
                                            variant="bordered"
                                            size="lg"
                                            value={formData.code}
                                            onValueChange={(value) => setFormData({ ...formData, code: value })}
                                            isRequired
                                            startContent={<Icon icon="solar:hashtag-linear" className="text-amber-400 text-xl" />}
                                            classNames={{
                                                inputWrapper: "h-12 bg-white border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                                label: "text-slate-600 font-medium text-sm",
                                            }}
                                        />
                                        <div className="md:col-span-2 pt-4">
                                            <Input
                                                label="ชื่อวิชา"
                                                labelPlacement="outside"
                                                placeholder="เช่น Object-Oriented Programming"
                                                variant="bordered"
                                                size="lg"
                                                value={formData.name}
                                                onValueChange={(value) => setFormData({ ...formData, name: value })}
                                                isRequired
                                                startContent={<Icon icon="solar:book-linear" className="text-amber-400 text-xl" />}
                                                classNames={{
                                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                                    label: "text-slate-600 font-medium text-sm",
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Input
                                        label="ปีการศึกษา"
                                        labelPlacement="outside"
                                        placeholder="เช่น 2568"
                                        variant="bordered"
                                        size="lg"
                                        type="number"
                                        value={formData.year.toString()}
                                        onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) || currentYear })}
                                        isRequired
                                        startContent={<Icon icon="solar:calendar-linear" className="text-amber-400 text-xl" />}
                                        classNames={{
                                            inputWrapper: "h-12 bg-white border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    />
                                    <Select
                                        label="ภาคเรียน"
                                        labelPlacement="outside"
                                        placeholder="เลือกภาคเรียน"
                                        variant="bordered"
                                        size="lg"
                                        selectedKeys={[formData.semester.toString()]}
                                        onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
                                        isRequired
                                        classNames={{
                                            trigger: "h-12 bg-white border-slate-200 hover:border-amber-300",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    >
                                        <SelectItem key="1">ภาคเรียนที่ 1</SelectItem>
                                        <SelectItem key="2">ภาคเรียนที่ 2</SelectItem>
                                        <SelectItem key="3">ภาคฤดูร้อน</SelectItem>
                                    </Select>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:user-circle-bold" className="text-lg text-amber-500" />
                                    <span className="text-sm font-semibold text-slate-700">ผู้สอน</span>
                                </div>
                                <div className="py-3">
                                    <Select
                                        label="อาจารย์ผู้สอน"
                                        labelPlacement="outside"
                                        placeholder="เลือกอาจารย์ผู้สอน (ถ้ามี)"
                                        variant="bordered"
                                        size="lg"
                                        selectedKeys={formData.instructor_id ? [formData.instructor_id.toString()] : []}
                                        onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value ? parseInt(e.target.value) : null })}
                                        classNames={{
                                            trigger: "h-12 bg-white border-slate-200 hover:border-amber-300",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    >
                                        {instructors.map((instructor) => (
                                            <SelectItem key={instructor.id.toString()}>
                                                {instructor.full_name}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-5 space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon icon="solar:notes-bold" className="text-lg text-amber-500" />
                                    <span className="text-sm font-semibold text-slate-700">รายละเอียดเพิ่มเติม</span>
                                </div>
                                <div className="py-3">
                                    <Textarea
                                        label="คำอธิบายรายวิชา"
                                        labelPlacement="outside"
                                        placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับรายวิชา (ถ้ามี)"
                                        variant="bordered"
                                        value={formData.description}
                                        onValueChange={(value) => setFormData({ ...formData, description: value })}
                                        minRows={3}
                                        classNames={{
                                            inputWrapper: "bg-white border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            color="default"
                            onPress={() => {
                                setIsEditModalOpen(false);
                                setSelectedCourse(null);
                            }}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="warning"
                            onPress={handleUpdate}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                            startContent={!isSubmitting && <Icon icon="solar:pen-bold" className="text-lg" />}
                        >
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg shadow-red-500/30">
                                <Icon icon="solar:trash-bin-trash-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">ยืนยันการลบ</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-6">
                        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                            <p className="text-slate-700">
                                คุณต้องการลบรายวิชา <span className="font-bold text-red-600">{selectedCourse?.code} - {selectedCourse?.name}</span> ใช่หรือไม่?
                            </p>
                            <p className="text-sm text-slate-500 mt-2">
                                ข้อมูลที่เกี่ยวข้องทั้งหมด (กลุ่มเรียน, ผู้ช่วยสอน, นักศึกษา) จะถูกลบไปด้วย
                            </p>
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            color="default"
                            onPress={() => {
                                setIsDeleteModalOpen(false);
                                setSelectedCourse(null);
                            }}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="danger"
                            onPress={handleDelete}
                            isLoading={isSubmitting}
                            className="font-medium px-6"
                            startContent={!isSubmitting && <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />}
                        >
                            ลบรายวิชา
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
