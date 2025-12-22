"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Tooltip } from "@heroui/tooltip";
import { Tabs, Tab } from "@heroui/tabs";
import { Progress } from "@heroui/progress";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/student.service";
import type { Course, TA, SectionStudent } from "@/services/course.service";
import type { Student } from "@/services/student.service";

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tasList, setTasList] = useState<TA[]>([]);
    const [studentsList, setStudentsList] = useState<Student[]>([]);
    const [activeTab, setActiveTab] = useState("overview");

    // Section states
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionNo, setNewSectionNo] = useState("");
    const [newSectionNote, setNewSectionNote] = useState("");

    // TA states
    const [isAddTAModalOpen, setIsAddTAModalOpen] = useState(false);
    const [selectedTAId, setSelectedTAId] = useState<string>("");

    // Student states
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [sectionStudents, setSectionStudents] = useState<Record<number, SectionStudent[]>>({});
    const [expandedSections, setExpandedSections] = useState<number[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate total students
    const totalStudents = course?.sections?.reduce((acc, section) => acc + (section.studentCount || 0), 0) || 0;

    // Fetch course details
    const fetchCourse = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await courseService.getCourseById(courseId);
            if (response.success && response.data) {
                setCourse(response.data);
            }
        } catch (error) {
            console.error("Error fetching course:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    // Fetch TAs list for dropdown
    const fetchTAsList = async () => {
        try {
            const response = await courseService.getTAsList();
            if (response.success && response.data) {
                setTasList(response.data);
            }
        } catch (error) {
            console.error("Error fetching TAs:", error);
        }
    };

    // Fetch students list for dropdown
    const fetchStudentsList = async () => {
        try {
            const response = await studentService.getStudents({ limit: 1000, status: "active" });
            if (response.success && response.data) {
                setStudentsList(response.data.students);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    // Fetch students in section
    const fetchSectionStudents = async (sectionId: number) => {
        try {
            const response = await courseService.getSectionStudents(courseId, sectionId);
            if (response.success && response.data) {
                setSectionStudents(prev => ({ ...prev, [sectionId]: response.data! }));
            }
        } catch (error) {
            console.error("Error fetching section students:", error);
        }
    };

    useEffect(() => {
        fetchCourse();
        fetchTAsList();
        fetchStudentsList();
    }, [fetchCourse]);

    // Toggle section expansion
    const toggleSection = (sectionId: number) => {
        if (expandedSections.includes(sectionId)) {
            setExpandedSections(expandedSections.filter(id => id !== sectionId));
        } else {
            setExpandedSections([...expandedSections, sectionId]);
            if (!sectionStudents[sectionId]) {
                fetchSectionStudents(sectionId);
            }
        }
    };

    // Add section
    const handleAddSection = async () => {
        if (!newSectionNo.trim()) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณากรอกหมายเลขกลุ่มเรียน",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await courseService.addSection(courseId, {
                section_no: newSectionNo,
                note: newSectionNote || undefined,
            });
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "เพิ่มกลุ่มเรียนสำเร็จ",
                    color: "success",
                });
                setIsAddSectionModalOpen(false);
                setNewSectionNo("");
                setNewSectionNote("");
                fetchCourse();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถเพิ่มกลุ่มเรียนได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Remove section
    const handleRemoveSection = async (sectionId: number) => {
        if (!confirm("คุณต้องการลบกลุ่มเรียนนี้ใช่หรือไม่?")) return;

        try {
            const response = await courseService.removeSection(courseId, sectionId);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "ลบกลุ่มเรียนสำเร็จ",
                    color: "success",
                });
                fetchCourse();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถลบกลุ่มเรียนได้",
                color: "danger",
            });
        }
    };

    // Add TA
    const handleAddTA = async () => {
        if (!selectedTAId) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณาเลือกผู้ช่วยสอน",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await courseService.addTA(courseId, parseInt(selectedTAId));
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "เพิ่มผู้ช่วยสอนสำเร็จ",
                    color: "success",
                });
                setIsAddTAModalOpen(false);
                setSelectedTAId("");
                fetchCourse();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถเพิ่มผู้ช่วยสอนได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Remove TA
    const handleRemoveTA = async (userId: number) => {
        if (!confirm("คุณต้องการนำผู้ช่วยสอนออกจากรายวิชานี้ใช่หรือไม่?")) return;

        try {
            const response = await courseService.removeTA(courseId, userId);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "นำผู้ช่วยสอนออกสำเร็จ",
                    color: "success",
                });
                fetchCourse();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถนำผู้ช่วยสอนออกได้",
                color: "danger",
            });
        }
    };

    // Open add student modal
    const openAddStudentModal = (sectionId: number) => {
        setSelectedSectionId(sectionId);
        setSelectedStudentId("");
        setIsAddStudentModalOpen(true);
    };

    // Add student to section
    const handleAddStudent = async () => {
        if (!selectedSectionId || !selectedStudentId) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณาเลือกนักศึกษา",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await courseService.addStudentToSection(
                courseId,
                selectedSectionId,
                parseInt(selectedStudentId)
            );
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "เพิ่มนักศึกษาสำเร็จ",
                    color: "success",
                });
                setIsAddStudentModalOpen(false);
                setSelectedStudentId("");
                fetchSectionStudents(selectedSectionId);
                fetchCourse();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถเพิ่มนักศึกษาได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Remove student from section
    const handleRemoveStudent = async (sectionId: number, studentId: number) => {
        if (!confirm("คุณต้องการนำนักศึกษาออกจากกลุ่มเรียนนี้ใช่หรือไม่?")) return;

        try {
            const response = await courseService.removeStudentFromSection(courseId, sectionId, studentId);
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "นำนักศึกษาออกสำเร็จ",
                    color: "success",
                });
                fetchSectionStudents(sectionId);
                fetchCourse();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถนำนักศึกษาออกได้",
                color: "danger",
            });
        }
    };

    // Get available TAs (not already in course)
    const availableTAs = tasList.filter(
        ta => !course?.tas?.some(courseTa => courseTa.id === ta.id)
    );

    // Get available students for section (not already enrolled)
    const getAvailableStudents = (sectionId: number) => {
        const enrolled = sectionStudents[sectionId] || [];
        return studentsList.filter(
            student => !enrolled.some(s => s.id === student.id)
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="text-center py-20">
                <Icon icon="solar:book-2-linear" className="text-6xl text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-700">ไม่พบข้อมูลรายวิชา</h2>
                <Button
                    color="primary"
                    variant="light"
                    className="mt-4"
                    onPress={() => router.push("/admin/courses")}
                >
                    กลับไปหน้ารายวิชา
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {/* Tab Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => router.push("/admin/courses")}
                        className="mr-2"
                    >
                        <Icon icon="solar:arrow-left-linear" className="text-xl text-slate-600" />
                    </Button>
                    <Tabs 
                        selectedKey={activeTab} 
                        onSelectionChange={(key) => setActiveTab(key as string)}
                        variant="underlined"
                        classNames={{
                            tabList: "gap-6",
                            cursor: "bg-violet-500",
                            tab: "px-0 h-12",
                            tabContent: "group-data-[selected=true]:text-violet-600 font-medium"
                        }}
                    >
                        <Tab key="overview" title="ภาพรวม" />
                        <Tab key="sections" title="กลุ่มเรียน" />
                        <Tab key="people" title="บุคคล" />
                    </Tabs>
                </div>
            </div>

            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                <div className="relative px-6 py-10">
                    <div>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-violet-200 text-sm font-medium tracking-wider uppercase">Course</span>
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        className={course.is_active ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"}
                                    >
                                        {course.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                    </Chip>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                    {course.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-white/90">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:hashtag-bold" className="text-lg" />
                                        <span className="font-semibold">รหัสวิชา: {course.code}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:calendar-bold" className="text-lg" />
                                        <span>ปีการศึกษา: {course.year}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:document-bold" className="text-lg" />
                                        <span>ภาคเรียน: {course.semester === 3 ? "ฤดูร้อน" : course.semester}</span>
                                    </div>
                                </div>
                            </div>
                            {course.image ? (
                                <img 
                                    src={course.image} 
                                    alt={course.name}
                                    className="hidden md:block w-40 h-40 object-cover rounded-2xl shadow-2xl border-4 border-white/20"
                                />
                            ) : (
                                <div className="hidden md:flex w-40 h-40 bg-white/10 backdrop-blur-sm rounded-2xl items-center justify-center border-4 border-white/20">
                                    <Icon icon="solar:book-2-bold-duotone" className="text-6xl text-white/50" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 py-6 bg-slate-50 min-h-screen">
                <div className="space-y-6">
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="shadow-sm border-0">
                            <CardBody className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">นักศึกษาทั้งหมด</p>
                                        <p className="text-3xl font-bold text-slate-800">{totalStudents}</p>
                                    </div>
                                    <div className="p-3 bg-violet-100 rounded-xl">
                                        <Icon icon="solar:users-group-rounded-bold" className="text-2xl text-violet-600" />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="shadow-sm border-0">
                            <CardBody className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">ผู้ช่วยสอน (TA)</p>
                                        <p className="text-3xl font-bold text-slate-800">{course.tas?.length || 0}</p>
                                    </div>
                                    <div className="p-3 bg-cyan-100 rounded-xl">
                                        <Icon icon="solar:user-hands-bold" className="text-2xl text-cyan-600" />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="shadow-sm border-0">
                            <CardBody className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">กลุ่มเรียน</p>
                                        <p className="text-3xl font-bold text-slate-800">{course.sections?.length || 0}</p>
                                    </div>
                                    <div className="p-3 bg-amber-100 rounded-xl">
                                        <Icon icon="solar:notebook-bold" className="text-2xl text-amber-600" />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        {/* <Card className="shadow-sm border-0">
                            <CardBody className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">อาจารย์ผู้สอน</p>
                                        <p className="text-lg font-bold text-slate-800 truncate max-w-[120px]">
                                            {course.instructor?.full_name || "-"}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-emerald-100 rounded-xl">
                                        <Icon icon="solar:user-circle-bold" className="text-2xl text-emerald-600" />
                                    </div>
                                </div>
                            </CardBody>
                        </Card> */}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Course Info */}
                            <Card className="shadow-sm border-0">
                                <CardHeader className="px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:info-circle-bold" className="text-xl text-violet-500" />
                                        <span className="font-semibold text-slate-800">ข้อมูลรายวิชา</span>
                                    </div>
                                </CardHeader>
                                <CardBody className="px-6 py-5">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <Icon icon="solar:hashtag-linear" className="text-lg text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">รหัสวิชา</p>
                                                <p className="font-semibold text-slate-800">{course.code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <Icon icon="solar:book-linear" className="text-lg text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">ชื่อวิชา</p>
                                                <p className="font-semibold text-slate-800">{course.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <Icon icon="solar:calendar-linear" className="text-lg text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">ปีการศึกษา / ภาคเรียน</p>
                                                <p className="font-semibold text-slate-800">
                                                    {course.year} / {course.semester === 3 ? "ภาคฤดูร้อน" : `ภาคเรียนที่ ${course.semester}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <Icon icon="solar:user-circle-linear" className="text-lg text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">อาจารย์ผู้สอน</p>
                                                <p className="font-semibold text-slate-800">
                                                    {course.instructor?.full_name || <span className="text-slate-400 italic">ยังไม่กำหนด</span>}
                                                </p>
                                            </div>
                                        </div>
                                        {course.description && (
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <Icon icon="solar:document-text-linear" className="text-lg text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">คำอธิบายรายวิชา</p>
                                                    <p className="text-slate-700">{course.description}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Quick Stats */}
                            <Card className="shadow-sm border-0">
                                <CardHeader className="px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:chart-2-bold" className="text-xl text-emerald-500" />
                                        <span className="font-semibold text-slate-800">สรุปข้อมูล</span>
                                    </div>
                                </CardHeader>
                                <CardBody className="px-6 py-5">
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-slate-600">จำนวนนักศึกษาต่อกลุ่ม</span>
                                                <span className="text-sm font-semibold text-emerald-600">
                                                    เฉลี่ย {course.sections?.length ? Math.round(totalStudents / course.sections.length) : 0} คน
                                                </span>
                                            </div>
                                            <Progress 
                                                value={course.sections?.length ? Math.min((totalStudents / course.sections.length / 50) * 100, 100) : 0}
                                                color="success"
                                                className="h-2"
                                            />
                                        </div>

                                        <Divider />

                                        <div>
                                            <p className="text-sm text-slate-500 mb-3">กลุ่มเรียนทั้งหมด</p>
                                            {course.sections && course.sections.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {course.sections.map((section) => (
                                                        <Chip 
                                                            key={section.id} 
                                                            variant="flat" 
                                                            color="warning"
                                                            size="sm"
                                                        >
                                                            กลุ่ม {section.section_no} ({section.studentCount || 0} คน)
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic text-sm">ยังไม่มีกลุ่มเรียน</p>
                                            )}
                                        </div>

                                        <Divider />

                                        <div>
                                            <p className="text-sm text-slate-500 mb-3">ผู้ช่วยสอน (TA)</p>
                                            {course.tas && course.tas.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {course.tas.map((ta) => (
                                                        <Chip 
                                                            key={ta.id}
                                                            variant="flat"
                                                            color="secondary"
                                                            size="sm"
                                                            avatar={<Avatar name={ta.full_name} size="sm" />}
                                                        >
                                                            {ta.full_name}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic text-sm">ยังไม่มีผู้ช่วยสอน</p>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    )}

                    {activeTab === "sections" && (
                        <Card className="shadow-sm border-0">
                            <CardHeader className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:users-group-rounded-bold" className="text-xl text-warning" />
                                    <span className="font-semibold text-slate-800">กลุ่มเรียน ({course.sections?.length || 0})</span>
                                </div>
                                <Button
                                    size="sm"
                                    color="warning"
                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                    onPress={() => setIsAddSectionModalOpen(true)}
                                >
                                    เพิ่มกลุ่มเรียน
                                </Button>
                            </CardHeader>
                            <CardBody className="px-6 py-4">
                                {course.sections && course.sections.length > 0 ? (
                                    <div className="space-y-3">
                                        {course.sections.map((section) => (
                                            <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div
                                                    className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                                    onClick={() => toggleSection(section.id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-amber-100 rounded-lg">
                                                            <Icon icon="solar:notebook-bold" className="text-xl text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">กลุ่มเรียน {section.section_no}</p>
                                                            <p className="text-sm text-slate-500">{section.studentCount || 0} นักศึกษา</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Tooltip content="เพิ่มนักศึกษา">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="light"
                                                                color="primary"
                                                                onPress={() => openAddStudentModal(section.id)}
                                                            >
                                                                <Icon icon="solar:user-plus-linear" className="text-lg" />
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip content="ลบกลุ่มเรียน" color="danger">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="light"
                                                                color="danger"
                                                                onPress={() => handleRemoveSection(section.id)}
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                                                            </Button>
                                                        </Tooltip>
                                                        <Icon
                                                            icon={expandedSections.includes(section.id) ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                                                            className="text-xl text-slate-400"
                                                        />
                                                    </div>
                                                </div>
                                                {expandedSections.includes(section.id) && (
                                                    <div className="p-4 border-t border-slate-200 bg-white">
                                                        {sectionStudents[section.id] && sectionStudents[section.id].length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {sectionStudents[section.id].map((student) => (
                                                                    <div
                                                                        key={student.id}
                                                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <Avatar
                                                                                name={student.full_name}
                                                                                size="sm"
                                                                                className="bg-cyan-500"
                                                                            />
                                                                            <div>
                                                                                <p className="font-medium text-slate-800">{student.student_id}</p>
                                                                                <p className="text-sm text-slate-500">{student.full_name}</p>
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="danger"
                                                                            onPress={() => handleRemoveStudent(section.id, student.id)}
                                                                        >
                                                                            <Icon icon="solar:close-circle-linear" className="text-lg" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8">
                                                                <Icon icon="solar:users-group-rounded-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                                                <p className="text-slate-400">ยังไม่มีนักศึกษาในกลุ่มนี้</p>
                                                                <Button
                                                                    size="sm"
                                                                    color="primary"
                                                                    variant="flat"
                                                                    className="mt-3"
                                                                    startContent={<Icon icon="solar:user-plus-linear" />}
                                                                    onPress={() => openAddStudentModal(section.id)}
                                                                >
                                                                    เพิ่มนักศึกษา
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 mb-4">ยังไม่มีกลุ่มเรียน</p>
                                        <Button
                                            color="warning"
                                            startContent={<Icon icon="solar:add-circle-bold" />}
                                            onPress={() => setIsAddSectionModalOpen(true)}
                                        >
                                            เพิ่มกลุ่มเรียนแรก
                                        </Button>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {activeTab === "people" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Instructor */}
                            <Card className="shadow-sm border-0">
                                <CardHeader className="px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:user-circle-bold" className="text-xl text-emerald-500" />
                                        <span className="font-semibold text-slate-800">อาจารย์ผู้สอน</span>
                                    </div>
                                </CardHeader>
                                <CardBody className="px-6 py-5">
                                    {course.instructor ? (
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50">
                                            <Avatar
                                                name={course.instructor.full_name}
                                                size="lg"
                                                className="bg-emerald-500"
                                            />
                                            <div>
                                                <p className="font-semibold text-slate-800 text-lg">{course.instructor.full_name}</p>
                                                <p className="text-sm text-slate-500">{course.instructor.email || course.instructor.username}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Icon icon="solar:user-circle-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                            <p className="text-slate-400">ยังไม่กำหนดอาจารย์ผู้สอน</p>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>

                            {/* TAs */}
                            <Card className="shadow-sm border-0">
                                <CardHeader className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:user-hands-bold" className="text-xl text-cyan-500" />
                                        <span className="font-semibold text-slate-800">ผู้ช่วยสอน (TA)</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        color="primary"
                                        variant="flat"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => setIsAddTAModalOpen(true)}
                                        isDisabled={availableTAs.length === 0}
                                    >
                                        เพิ่ม TA
                                    </Button>
                                </CardHeader>
                                <CardBody className="px-6 py-5">
                                    {course.tas && course.tas.length > 0 ? (
                                        <div className="space-y-3">
                                            {course.tas.map((ta) => (
                                                <div
                                                    key={ta.id}
                                                    className="flex items-center justify-between p-4 rounded-xl bg-cyan-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            name={ta.full_name}
                                                            size="sm"
                                                            className="bg-cyan-500"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-slate-800">{ta.full_name}</p>
                                                            <p className="text-xs text-slate-500">{ta.email || ta.username}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={() => handleRemoveTA(ta.id)}
                                                    >
                                                        <Icon icon="solar:close-circle-linear" className="text-lg" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Icon icon="solar:user-hands-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                            <p className="text-slate-400 mb-3">ยังไม่มีผู้ช่วยสอน</p>
                                            <Button
                                                size="sm"
                                                color="primary"
                                                variant="flat"
                                                startContent={<Icon icon="solar:add-circle-bold" />}
                                                onPress={() => setIsAddTAModalOpen(true)}
                                                isDisabled={availableTAs.length === 0}
                                            >
                                                เพิ่ม TA
                                            </Button>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    )}


                </div>
            </div>

            {/* Add Section Modal */}
            <Modal isOpen={isAddSectionModalOpen} onClose={() => setIsAddSectionModalOpen(false)} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                                <Icon icon="solar:users-group-rounded-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มกลุ่มเรียน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">เพิ่มกลุ่มเรียนใหม่ในรายวิชา</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-6">
                        <div className="space-y-4">
                            <Input
                                label="หมายเลขกลุ่ม"
                                labelPlacement="outside"
                                placeholder="เช่น 1, 2, 3 หรือ A, B, C"
                                variant="bordered"
                                size="lg"
                                value={newSectionNo}
                                onValueChange={setNewSectionNo}
                                isRequired
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />
                            <Input
                                label="หมายเหตุ"
                                labelPlacement="outside"
                                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                variant="bordered"
                                size="lg"
                                value={newSectionNote}
                                onValueChange={setNewSectionNote}
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            color="default"
                            onPress={() => setIsAddSectionModalOpen(false)}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="warning"
                            onPress={handleAddSection}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" className="text-lg" />}
                        >
                            เพิ่มกลุ่มเรียน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add TA Modal */}
            <Modal isOpen={isAddTAModalOpen} onClose={() => setIsAddTAModalOpen(false)} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
                                <Icon icon="solar:user-hands-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มผู้ช่วยสอน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">เลือกผู้ช่วยสอนที่ต้องการเพิ่ม</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-6">
                        <Select
                            label="เลือกผู้ช่วยสอน"
                            labelPlacement="outside"
                            placeholder="เลือกผู้ช่วยสอน"
                            variant="bordered"
                            size="lg"
                            selectedKeys={selectedTAId ? [selectedTAId] : []}
                            onChange={(e) => setSelectedTAId(e.target.value)}
                            classNames={{
                                trigger: "h-12 bg-white border-slate-200 hover:border-cyan-300",
                                label: "text-slate-600 font-medium text-sm",
                            }}
                        >
                            {availableTAs.map((ta) => (
                                <SelectItem key={ta.id.toString()}>
                                    {ta.full_name}
                                </SelectItem>
                            ))}
                        </Select>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            color="default"
                            onPress={() => setIsAddTAModalOpen(false)}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleAddTA}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-cyan-500 to-blue-600"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" className="text-lg" />}
                        >
                            เพิ่มผู้ช่วยสอน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Student Modal */}
            <Modal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30">
                                <Icon icon="solar:user-plus-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มนักศึกษา</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">เลือกนักศึกษาที่ต้องการเพิ่มในกลุ่มเรียน</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-6">
                        <Select
                            label="เลือกนักศึกษา"
                            labelPlacement="outside"
                            placeholder="ค้นหาและเลือกนักศึกษา"
                            variant="bordered"
                            size="lg"
                            selectedKeys={selectedStudentId ? [selectedStudentId] : []}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            classNames={{
                                trigger: "h-12 bg-white border-slate-200 hover:border-violet-300",
                                label: "text-slate-600 font-medium text-sm",
                            }}
                        >
                            {selectedSectionId && getAvailableStudents(selectedSectionId).map((student) => (
                                <SelectItem key={student.id.toString()}>
                                    {student.student_id} - {student.full_name}
                                </SelectItem>
                            ))}
                        </Select>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            color="default"
                            onPress={() => setIsAddStudentModalOpen(false)}
                            className="font-medium px-6"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="secondary"
                            onPress={handleAddStudent}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-violet-500 to-purple-600"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" className="text-lg" />}
                        >
                            เพิ่มนักศึกษา
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
