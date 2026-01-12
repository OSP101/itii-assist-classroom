"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Pagination } from "@heroui/pagination";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { authService } from "@/services/auth.service";
import { courseService, Course } from "@/services/course.service";
import { IoSchool, IoBook, IoPeople, IoPersonAdd } from "react-icons/io5";

interface Stats {
    total: number;
    byStatus: {
        active: number;
        inactive: number;
    };
    years: number[];
}

export default function HomePage() {
    const router = useRouter();
    const [allCourses, setAllCourses] = useState<Course[]>([]); // All courses from API
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Create course modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const currentYear = new Date().getFullYear() + 543;
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        year: currentYear,
        semester: 1,
        description: "",
        image: "",
    });

    // Filters
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Get user role
    useEffect(() => {
        const fetchUser = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                setUserRole(user.role);
            }
        };
        fetchUser();
    }, []);

    // Fetch all courses once on load
    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch all courses without pagination (set high limit)
            const response = await courseService.getMyCourses({ limit: 1000 });
            if (response.success && response.data) {
                setAllCourses(response.data.courses);
            }
        } catch (error) {
            console.error("Failed to fetch courses:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await courseService.getMyCoursesStats();
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
        fetchStats();
    }, [fetchCourses, fetchStats]);

    // Client-side filtering
    const filteredCourses = useMemo(() => {
        let result = [...allCourses];

        // Search filter
        if (search.trim()) {
            const searchLower = search.toLowerCase().trim();
            result = result.filter(course =>
                course.code.toLowerCase().includes(searchLower) ||
                course.name.toLowerCase().includes(searchLower)
            );
        }

        // Year filter
        if (yearFilter) {
            const year = parseInt(yearFilter);
            result = result.filter(course => course.year === year);
        }

        // Semester filter
        if (semesterFilter) {
            const semester = parseInt(semesterFilter);
            result = result.filter(course => course.semester === semester);
        }

        // Status filter
        if (statusFilter === 'active') {
            result = result.filter(course => course.is_active === true);
        } else if (statusFilter === 'inactive') {
            result = result.filter(course => course.is_active === false);
        }

        return result;
    }, [allCourses, search, yearFilter, semesterFilter, statusFilter]);

    // Client-side pagination
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
    const paginatedCourses = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCourses.slice(start, start + itemsPerPage);
    }, [filteredCourses, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, yearFilter, semesterFilter, statusFilter]);

    const clearFilters = () => {
        setSearch("");
        setYearFilter("");
        setSemesterFilter("");
        setStatusFilter("");
    };

    const hasActiveFilters = search || yearFilter || semesterFilter || statusFilter;

    // Generate year options from actual data
    const yearOptions = useMemo(() => {
        const years = Array.from(new Set(allCourses.map(c => c.year))).sort((a, b) => b - a);
        return years.map(year => ({
            value: year.toString(),
            label: `${year}`,
        }));
    }, [allCourses]);

    const semesterOptions = [
        { value: "1", label: "เทอม 1" },
        { value: "2", label: "เทอม 2" },
        { value: "3", label: "ฤดูร้อน" },
    ];

    const statusOptions = [
        { value: "active", label: "เปิดใช้งาน" },
        { value: "inactive", label: "ปิดใช้งาน" },
    ];

    const getSemesterText = (semester: number) => {
        return semester === 3 ? "ฤดูร้อน" : `เทอม ${semester}`;
    };

    const handleCourseClick = (courseId: string) => {
        router.push(`/classroom/${courseId}`);
    };

    const handleCreateCourse = () => {
        setIsCreateModalOpen(true);
    };

    // Image upload handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                addToast({
                    title: "ไฟล์ใหญ่เกินไป",
                    description: "กรุณาเลือกไฟล์ขนาดไม่เกิน 2MB",
                    color: "warning",
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                setFormData({ ...formData, image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setFormData({ ...formData, image: "" });
    };

    const resetForm = () => {
        setFormData({
            code: "",
            name: "",
            year: currentYear,
            semester: 1,
            description: "",
            image: "",
        });
        setImagePreview(null);
    };

    const handleCreate = async () => {
        if (!formData.code || !formData.name) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "กรุณากรอกรหัสวิชาและชื่อวิชา",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await courseService.createCourse({
                code: formData.code,
                name: formData.name,
                year: formData.year,
                semester: formData.semester,
                description: formData.description || undefined,
                image: formData.image || undefined,
            });

            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "สร้างรายวิชาเรียบร้อยแล้ว",
                    color: "success",
                });
                setIsCreateModalOpen(false);
                resetForm();
                fetchCourses();
                fetchStats();
            } else {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: response.message || "ไม่สามารถสร้างรายวิชาได้",
                    color: "danger",
                });
            }
        } catch (error: any) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถสร้างรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Edit Modal
    const openEditModal = (course: Course) => {
        setSelectedCourse(course);
        setFormData({
            code: course.code,
            name: course.name,
            year: course.year,
            semester: course.semester,
            description: course.description || "",
            image: course.image || "",
        });
        setImagePreview(course.image || null);
        setIsEditModalOpen(true);
    };

    // Handle Update Course
    const handleUpdate = async () => {
        if (!selectedCourse) return;
        if (!formData.code || !formData.name) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "กรุณากรอกรหัสวิชาและชื่อวิชา",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await courseService.updateCourse(selectedCourse.id, {
                code: formData.code,
                name: formData.name,
                year: formData.year,
                semester: formData.semester,
                description: formData.description || undefined,
                image: formData.image || undefined,
            });

            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "แก้ไขรายวิชาเรียบร้อยแล้ว",
                    color: "success",
                });
                setIsEditModalOpen(false);
                resetForm();
                setSelectedCourse(null);
                fetchCourses();
            } else {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: response.message || "ไม่สามารถแก้ไขรายวิชาได้",
                    color: "danger",
                });
            }
        } catch (error: any) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถแก้ไขรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Toggle Status
    const handleToggleStatus = async (course: Course) => {
        try {
            const response = await courseService.toggleStatus(course.id);
            if (response.success) {
                addToast({
                    title: course.is_active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว",
                    description: `รายวิชา ${course.code} ${course.is_active ? "ปิด" : "เปิด"}ใช้งานเรียบร้อยแล้ว`,
                    color: "success",
                });
                fetchCourses();
                fetchStats();
            } else {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: response.message || "ไม่สามารถเปลี่ยนสถานะได้",
                    color: "danger",
                });
            }
        } catch (error: any) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถเปลี่ยนสถานะได้",
                color: "danger",
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">รายวิชาของฉัน</h1>
                    <p className="text-slate-500 mt-1">
                        {userRole === "instructor"
                            ? "รายวิชาที่คุณเป็นผู้สอน"
                            : "รายวิชาที่คุณเป็นผู้ช่วยสอน"}
                    </p>
                </div>

                {userRole === "instructor" && (
                    <Button
                        color="primary"
                        startContent={<Icon icon="solar:add-circle-bold" className="text-xl" />}
                        onPress={handleCreateCourse}
                        className="bg-gradient-to-r from-blue-400 to-indigo-500"
                    >
                        สร้างรายวิชาใหม่
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card className="border border-slate-200 shadow-sm">
                    <CardBody className="flex flex-row items-center gap-3 p-4">
                        <div className="rounded-xl bg-blue-100 p-2 sm:p-2.5">
                            <IoBook className="text-xl sm:text-2xl text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">รายวิชาทั้งหมด</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.total ?? 0}</p>
                        </div>
                    </CardBody>
                </Card>

                <Card className="border border-slate-200 shadow-sm">
                    <CardBody className="flex flex-row items-center gap-3 p-4">
                        <div className="rounded-xl bg-green-100 p-2 sm:p-2.5">
                            <IoSchool className="text-xl sm:text-2xl text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">เปิดใช้งาน</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.byStatus?.active ?? 0}</p>
                        </div>
                    </CardBody>
                </Card>

                <Card className="border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                    <CardBody className="flex flex-row items-center gap-3 p-4">
                        <div className="rounded-xl bg-red-100 p-2 sm:p-2.5">
                            <IoBook className="text-xl sm:text-2xl text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-slate-500">ปิดใช้งาน</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.byStatus?.inactive ?? 0}</p>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border border-slate-200 shadow-sm">
                <CardBody className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <Input
                                placeholder="ค้นหารายวิชา..."
                                value={search}
                                onValueChange={setSearch}
                                startContent={<Icon icon="solar:magnifer-linear" className="text-blue-400" />}
                                isClearable
                                onClear={() => setSearch("")}
                                variant="bordered"
                                classNames={{
                                    inputWrapper: "border-blue-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-blue-400 text-sm",
                                }}
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Select
                                placeholder="ปีการศึกษา"
                                selectedKeys={yearFilter ? [yearFilter] : []}
                                onSelectionChange={(keys) => setYearFilter(Array.from(keys)[0] as string || "")}
                                className="w-full sm:w-36"
                                size="md"
                                variant="bordered"

                            >
                                {yearOptions.map((option) => (
                                    <SelectItem key={option.value}>{option.label}</SelectItem>
                                ))}
                            </Select>

                            <Select
                                placeholder="ภาคเรียน"
                                selectedKeys={semesterFilter ? [semesterFilter] : []}
                                onSelectionChange={(keys) => setSemesterFilter(Array.from(keys)[0] as string || "")}
                                className="w-full sm:w-32"
                                size="md"
                                variant="bordered"

                            >
                                {semesterOptions.map((option) => (
                                    <SelectItem key={option.value}>{option.label}</SelectItem>
                                ))}
                            </Select>

                            <Select
                                placeholder="สถานะ"
                                selectedKeys={statusFilter ? [statusFilter] : []}
                                onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || "")}
                                className="w-full sm:w-32"
                                size="md"
                                variant="bordered"

                            >
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.value}>{option.label}</SelectItem>
                                ))}
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    variant="flat"
                                    color="danger"
                                    size="md"
                                    onPress={clearFilters}
                                    startContent={<Icon icon="solar:close-circle-linear" />}
                                >
                                    ล้าง
                                </Button>
                            )}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Course Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Spinner size="lg" color="primary" />
                </div>
            ) : paginatedCourses.length === 0 ? (
                <Card className="border border-slate-200 shadow-sm">
                    <CardBody className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <IoBook className="text-3xl text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-center">
                            {hasActiveFilters
                                ? "ไม่พบรายวิชาที่ตรงกับการค้นหา"
                                : userRole === "instructor"
                                    ? "คุณยังไม่มีรายวิชา กดปุ่ม \"สร้างรายวิชาใหม่\" เพื่อเริ่มต้น"
                                    : "คุณยังไม่ได้รับมอบหมายเป็นผู้ช่วยสอนในรายวิชาใด ๆ"}
                        </p>
                        {hasActiveFilters && (
                            <Button
                                variant="flat"
                                color="primary"
                                className="mt-4"
                                onPress={clearFilters}
                            >
                                ล้างตัวกรอง
                            </Button>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedCourses.map((course) => (
                            <Card
                                key={course.id}
                                isPressable
                                onPress={() => handleCourseClick(course.id)}
                                className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Course Image/Banner */}
                                <div className="h-32 relative overflow-hidden">
                                    {course.image ? (
                                        <Image
                                            src={course.image}
                                            alt={course.name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                                            <IoSchool className="text-white/20 text-7xl" />
                                        </div>
                                    )}
                                    {/* Status Badge */}
                                    <div className="absolute top-2 right-2">
                                        <Chip
                                            size="sm"
                                            variant="solid"
                                            className={course.is_active
                                                ? "bg-green-500/90 text-white"
                                                : "bg-red-500/90 text-white"
                                            }
                                        >
                                            {course.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                        </Chip>
                                    </div>
                                </div>

                                <CardBody className="p-4">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {course.code}
                                                </h3>
                                                <p className="text-sm text-slate-600 line-clamp-1">
                                                    {course.name}
                                                </p>
                                            </div>
                                            {/* Menu Button - Only for instructor */}
                                            {userRole === "instructor" && (
                                                <Dropdown>
                                                    <DropdownTrigger>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            className="min-w-8 w-8 h-8"
                                                        >
                                                            <Icon icon="solar:menu-dots-bold" className="text-lg text-slate-500" />
                                                        </Button>
                                                    </DropdownTrigger>
                                                    <DropdownMenu
                                                        aria-label="Course actions"
                                                        onAction={(key) => {
                                                            if (key === "edit") {
                                                                openEditModal(course);
                                                            } else if (key === "toggle") {
                                                                handleToggleStatus(course);
                                                            }
                                                        }}
                                                    >
                                                        <DropdownItem
                                                            key="edit"
                                                            startContent={<Icon icon="solar:pen-linear" className="text-lg" />}
                                                        >
                                                            แก้ไขรายวิชา
                                                        </DropdownItem>
                                                        <DropdownItem
                                                            key="toggle"
                                                            startContent={
                                                                <Icon
                                                                    icon={course.is_active ? "solar:eye-closed-linear" : "solar:eye-linear"}
                                                                    className="text-lg"
                                                                />
                                                            }
                                                            color={course.is_active ? "warning" : "success"}
                                                        >
                                                            {course.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                                        </DropdownItem>
                                                    </DropdownMenu>
                                                </Dropdown>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Chip size="sm" variant="flat" className="bg-blue-50 text-blue-600">
                                                {course.year}/{course.semester}
                                            </Chip>
                                            <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600">
                                                {getSemesterText(course.semester)}
                                            </Chip>
                                        </div>
                                    </div>
                                </CardBody>

                                <CardFooter className="border-t border-slate-100 px-4 py-3">
                                    <div className="flex items-center justify-between w-full text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <IoPeople className="text-lg" />
                                            <span>{course.taCount ?? 0} TA</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <IoPersonAdd className="text-lg" />
                                            <span>{course.studentCount ?? 0} นักศึกษา</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <IoBook className="text-lg" />
                                            <span>{course.sections?.length ?? 0} กลุ่ม</span>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-6">
                            <Pagination
                                total={totalPages}
                                page={currentPage}
                                onChange={setCurrentPage}
                                showControls
                                color="primary"
                            />
                        </div>
                    )}
                </>
            )}

            {/* Create Course Modal อันนี้เอาของแอดมินมาใช้เลย ใส่รูปได้*/}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                size="2xl"
                scrollBehavior="inside"
                classNames={{
                    base: "mx-2 sm:mx-4",
                    body: "py-4",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30">
                                <Icon icon="solar:book-2-bold" className="text-xl sm:text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800">สร้างรายวิชาใหม่</h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">กรอกข้อมูลรายวิชาที่ต้องการสร้าง</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-4 sm:px-6 py-4 sm:py-6">
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

                            {/* Course Info Section */}
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
                                    </div>
                                    <div className="md:col-span-2">
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

                            {/* Description Section */}
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
                            onPress={() => {
                                setIsCreateModalOpen(false);
                                resetForm();
                            }}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleCreate}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-blue-400 to-indigo-500"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" className="text-lg" />}
                        >
                            สร้างรายวิชา
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Course Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                    setSelectedCourse(null);
                }}
                size="2xl"
                scrollBehavior="inside"
                classNames={{
                    base: "mx-2 sm:mx-4",
                    body: "py-4",
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                                <Icon icon="solar:pen-new-square-bold" className="text-xl sm:text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800">แก้ไขรายวิชา</h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                                    แก้ไขข้อมูลรายวิชา {selectedCourse?.code}
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-4 sm:px-6 py-4 sm:py-6">
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
                                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/50 transition-colors">
                                                <Icon icon="solar:cloud-upload-bold-duotone" className="text-5xl text-amber-400 mx-auto mb-3" />
                                                <p className="text-slate-600 font-medium">คลิกเพื่ออัปโหลดรูปปกรายวิชา</p>
                                                <p className="text-slate-400 text-sm mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Course Info Section */}
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
                                    </div>
                                    <div className="md:col-span-2">
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

                            {/* Description Section */}
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
                                resetForm();
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
                            startContent={!isSubmitting && <Icon icon="solar:diskette-bold" className="text-lg" />}
                        >
                            บันทึกการแก้ไข
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
