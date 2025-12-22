"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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

export default function ClassroomDetailPage() {
    const params = useParams();
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
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [sectionStudents, setSectionStudents] = useState<Record<number, SectionStudent[]>>({});
    const [expandedSections, setExpandedSections] = useState<number[]>([]);

    // Assignment states
    interface SubItem {
        id: string;
        name: string;
        maxScore: number;
    }
    interface GroupTeam {
        id: string;
        name: string;
        members: number[]; // student ids
    }
    interface Assignment {
        id: string;
        name: string;
        type: "individual" | "group";
        hasSubItems: boolean;
        subItems: SubItem[];
        maxScore: number;
        dueDate?: string;
        description?: string;
        createdAt: string;
        // Group assignment specific
        groupSize?: number; // จำนวนสมาชิกต่อกลุ่ม
        groupFormation?: "manual" | "random"; // วิธีจับกลุ่ม
        teams?: GroupTeam[]; // กลุ่มย่อยในงาน
    }
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState<{
        name: string;
        type: "individual" | "group";
        hasSubItems: boolean;
        subItems: SubItem[];
        maxScore: number;
        dueDate: string;
        description: string;
        groupSize: number;
        groupFormation: "manual" | "random";
    }>({
        name: "",
        type: "individual",
        hasSubItems: false,
        subItems: [],
        maxScore: 10,
        dueDate: "",
        description: "",
        groupSize: 3,
        groupFormation: "manual",
    });
    const [expandedAssignments, setExpandedAssignments] = useState<string[]>([]);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

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

    // Fetch all section students (for knowing who is already enrolled)
    const fetchAllSectionStudents = useCallback(async () => {
        if (!course?.sections) return;
        for (const section of course.sections) {
            try {
                const response = await courseService.getSectionStudents(courseId, section.id);
                if (response.success && response.data) {
                    setSectionStudents(prev => ({ ...prev, [section.id]: response.data! }));
                }
            } catch (error) {
                console.error(`Error fetching section ${section.id} students:`, error);
            }
        }
    }, [course?.sections, courseId]);

    useEffect(() => {
        fetchCourse();
        fetchTAsList();
        fetchStudentsList();
    }, [fetchCourse]);

    // Fetch all section students after course is loaded
    useEffect(() => {
        if (course?.sections && course.sections.length > 0) {
            fetchAllSectionStudents();
        }
    }, [course?.sections, fetchAllSectionStudents]);

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
        setStudentSearchQuery("");
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
                // Find the student info from studentsList
                const addedStudent = studentsList.find(s => s.id === parseInt(selectedStudentId));
                if (addedStudent) {
                    // Update sectionStudents state locally
                    setSectionStudents(prev => ({
                        ...prev,
                        [selectedSectionId]: [
                            ...(prev[selectedSectionId] || []),
                            {
                                id: addedStudent.id,
                                student_id: addedStudent.student_id,
                                full_name: addedStudent.full_name,
                                email: addedStudent.email,
                                is_active: addedStudent.is_active,
                                enrolled_at: new Date().toISOString()
                            }
                        ]
                    }));
                    // Update course sections studentCount
                    setCourse(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            sections: prev.sections?.map(section =>
                                section.id === selectedSectionId
                                    ? { ...section, studentCount: (section.studentCount || 0) + 1 }
                                    : section
                            )
                        };
                    });
                }
                addToast({
                    title: "สำเร็จ",
                    description: "เพิ่มนักศึกษาสำเร็จ",
                    color: "success",
                });
                setIsAddStudentModalOpen(false);
                setSelectedStudentId("");
                setStudentSearchQuery("");
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
                // Update sectionStudents state locally
                setSectionStudents(prev => ({
                    ...prev,
                    [sectionId]: (prev[sectionId] || []).filter(s => s.id !== studentId)
                }));
                // Update course sections studentCount
                setCourse(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        sections: prev.sections?.map(section =>
                            section.id === sectionId
                                ? { ...section, studentCount: Math.max((section.studentCount || 0) - 1, 0) }
                                : section
                        )
                    };
                });
                addToast({
                    title: "สำเร็จ",
                    description: "นำนักศึกษาออกสำเร็จ",
                    color: "success",
                });
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

    // Get all enrolled students across all sections
    const getAllEnrolledStudentIds = useCallback(() => {
        const enrolledIds = new Set<number>();
        Object.values(sectionStudents).forEach(students => {
            students.forEach(s => enrolledIds.add(s.id));
        });
        return enrolledIds;
    }, [sectionStudents]);

    // Get available students (not already enrolled in ANY section)
    const getAvailableStudents = useCallback(() => {
        const enrolledIds = getAllEnrolledStudentIds();
        return studentsList.filter(student => !enrolledIds.has(student.id));
    }, [studentsList, getAllEnrolledStudentIds]);

    // Filter students by search query
    const filteredStudents = useCallback(() => {
        const available = getAvailableStudents();
        if (!studentSearchQuery.trim()) return available;
        const query = studentSearchQuery.toLowerCase();
        return available.filter(s => 
            s.student_id.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    }, [getAvailableStudents, studentSearchQuery]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Icon icon="solar:book-2-linear" className="text-6xl text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700">ไม่พบข้อมูลรายวิชา</h2>
                    <Button
                        color="primary"
                        variant="light"
                        className="mt-4"
                        onPress={() => window.close()}
                    >
                        ปิดหน้านี้
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Header - Blue Theme */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-20 w-48 h-48 bg-white rounded-full blur-3xl"></div>
                </div>
                <div className="relative px-6 py-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Chip size="sm" className="bg-white/20 text-white border-0">
                                    {course.code}
                                </Chip>
                                <Chip size="sm" className="bg-white/20 text-white border-0">
                                    {course.year}/{course.semester === 3 ? "ฤดูร้อน" : course.semester}
                                </Chip>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                                {course.name}
                            </h1>
                            {course.instructor && (
                                <div className="flex items-center gap-2 text-white/80 text-sm">
                                    <span>{course.instructor.full_name}</span>
                                </div>
                            )}
                        </div>
                        {course.image ? (
                            <img 
                                src={course.image} 
                                alt={course.name}
                                className="hidden md:block w-28 h-28 object-cover rounded-2xl shadow-xl border-2 border-white/20"
                            />
                        ) : (
                            <div className="hidden md:flex w-28 h-28 bg-white/10 backdrop-blur-sm rounded-2xl items-center justify-center border-2 border-white/20">
                                <Icon icon="solar:book-2-bold-duotone" className="text-4xl text-white/60" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards Row - Overlapping Hero */}
            <div className="px-6 -mt-5 relative z-10 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Students Count */}
                    <Card className="shadow-md border-0 bg-white">
                        <CardBody className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Icon icon="solar:users-group-rounded-bold" className="text-lg text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">นักศึกษา</p>
                                    <p className="text-xl font-bold text-slate-800">{totalStudents}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* TAs Count */}
                    <Card className="shadow-md border-0 bg-white">
                        <CardBody className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Icon icon="solar:user-hands-bold" className="text-lg text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">ผู้ช่วยสอน</p>
                                    <p className="text-xl font-bold text-slate-800">{course.tas?.length || 0}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Sections Count */}
                    <Card className="shadow-md border-0 bg-white">
                        <CardBody className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Icon icon="solar:notebook-bold" className="text-lg text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">กลุ่มเรียน</p>
                                    <p className="text-xl font-bold text-slate-800">{course.sections?.length || 0}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Status */}
                    <Card className="shadow-md border-0 bg-white">
                        <CardBody className="p-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${course.is_active ? "bg-green-100" : "bg-slate-100"}`}>
                                    <Icon 
                                        icon={course.is_active ? "solar:check-circle-bold" : "solar:close-circle-bold"} 
                                        className={`text-lg ${course.is_active ? "text-green-600" : "text-slate-400"}`} 
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">สถานะ</p>
                                    <p className={`text-sm font-semibold ${course.is_active ? "text-green-600" : "text-slate-500"}`}>
                                        {course.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Tabs Navigation - Sticky below stats */}
            <div className="sticky top-14 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-6">
                    <Tabs 
                        selectedKey={activeTab} 
                        onSelectionChange={(key) => setActiveTab(key as string)}
                        variant="underlined"
                        classNames={{
                            tabList: "gap-6",
                            cursor: "bg-blue-500",
                            tab: "px-0 h-11",
                            tabContent: "group-data-[selected=true]:text-blue-600 text-slate-500 font-medium text-sm"
                        }}
                    >
                        <Tab 
                            key="overview" 
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:chart-2-bold" className="text-lg" />
                                    <span>ภาพรวม</span>
                                </div>
                            } 
                        />
                        <Tab 
                            key="sections" 
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:notebook-bold" className="text-lg" />
                                    <span>กลุ่มเรียน</span>
                                </div>
                            } 
                        />
                        <Tab 
                            key="people" 
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:users-group-rounded-bold" className="text-lg" />
                                    <span>บุคคล</span>
                                </div>
                            } 
                        />
                        <Tab 
                            key="assignments" 
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:clipboard-list-bold" className="text-lg" />
                                    <span>งาน</span>
                                    {assignments.length > 0 && (
                                        <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-600 h-5 min-w-5 px-1">
                                            {assignments.length}
                                        </Chip>
                                    )}
                                </div>
                            } 
                        />
                        <Tab 
                            key="scores" 
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:diploma-bold" className="text-lg" />
                                    <span>คะแนน</span>
                                </div>
                            } 
                        />
                    </Tabs>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 py-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Course Summary */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:chart-2-bold" className="text-xl text-blue-500" />
                                    <span className="font-semibold text-slate-800">ประสิทธิภาพโดยรวม</span>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4 space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-600">อัตราการส่งงาน</span>
                                        <span className="text-sm font-semibold text-blue-600">0%</span>
                                    </div>
                                    <Progress value={0} color="primary" className="h-2" />
                                </div>
                                <Divider />
                                <div className="flex items-center gap-3">
                                    <Icon icon="solar:document-text-bold" className="text-lg text-slate-400" />
                                    <div>
                                        <p className="text-sm text-slate-500">แนวโน้ม</p>
                                        <p className="font-medium text-slate-700 flex items-center gap-1">
                                            <Icon icon="solar:graph-up-bold" className="text-emerald-500" />
                                            ยังไม่มีข้อมูล
                                        </p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Top Students */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:star-bold" className="text-xl text-amber-500" />
                                    <span className="font-semibold text-slate-800">นักศึกษาที่โดดเด่น</span>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4">
                                {totalStudents > 0 ? (
                                    <div className="space-y-3">
                                        {course.sections?.slice(0, 5).flatMap(section => 
                                            (sectionStudents[section.id] || []).slice(0, 2)
                                        ).slice(0, 5).map((student, index) => (
                                            <div key={student.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                                                        #{index + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-slate-700 text-sm">{student.full_name}</p>
                                                        <p className="text-xs text-slate-400">{student.student_id}</p>
                                                    </div>
                                                </div>
                                                <Chip size="sm" color="primary" variant="flat">0.0</Chip>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Icon icon="solar:users-group-rounded-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">ยังไม่มีข้อมูลนักศึกษา</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* Course Info */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:info-circle-bold" className="text-xl text-blue-500" />
                                    <span className="font-semibold text-slate-800">ข้อมูลรายวิชา</span>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">รหัสวิชา</p>
                                        <p className="font-medium text-slate-800">{course.code}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">ปีการศึกษา</p>
                                        <p className="font-medium text-slate-800">{course.year}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">ภาคเรียน</p>
                                        <p className="font-medium text-slate-800">
                                            {course.semester === 3 ? "ภาคฤดูร้อน" : `ภาคเรียนที่ ${course.semester}`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">อาจารย์ผู้สอน</p>
                                        <p className="font-medium text-slate-800">{course.instructor?.full_name || "-"}</p>
                                    </div>
                                </div>
                                {course.description && (
                                    <>
                                        <Divider />
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">คำอธิบายรายวิชา</p>
                                            <p className="text-sm text-slate-700">{course.description}</p>
                                        </div>
                                    </>
                                )}
                            </CardBody>
                        </Card>

                        {/* TAs Summary */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:user-hands-bold" className="text-xl text-emerald-500" />
                                    <span className="font-semibold text-slate-800">ผู้ช่วยสอน (TA)</span>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4">
                                {course.tas && course.tas.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {course.tas.map((ta) => (
                                            <Chip 
                                                key={ta.id}
                                                variant="flat"
                                                color="success"
                                                
                                            >
                                                {ta.full_name}
                                            </Chip>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Icon icon="solar:user-hands-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">ยังไม่มีผู้ช่วยสอน</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                )}

                {/* Sections Tab */}
                {activeTab === "sections" && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800">กลุ่มเรียนทั้งหมด</h2>
                            <Button
                                color="primary"
                                startContent={<Icon icon="solar:add-circle-bold" />}
                                onPress={() => setIsAddSectionModalOpen(true)}
                                className="bg-blue-500"
                            >
                                เพิ่มกลุ่มเรียน
                            </Button>
                        </div>

                        {/* Sections List */}
                        {course.sections && course.sections.length > 0 ? (
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="p-0 divide-y divide-slate-100">
                                    {course.sections.map((section) => (
                                        <div key={section.id}>
                                            <div
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => toggleSection(section.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-amber-100 rounded-lg">
                                                        <Icon icon="solar:notebook-bold" className="text-xl text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">กลุ่ม {section.section_no}</p>
                                                        <p className="text-sm text-slate-500">{section.studentCount || 0} นักศึกษา</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                                                        className="text-xl text-slate-400 ml-2"
                                                    />
                                                </div>
                                            </div>
                                            {expandedSections.includes(section.id) && (
                                                <div className="px-4 pb-4 bg-slate-50">
                                                    {sectionStudents[section.id] && sectionStudents[section.id].length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {sectionStudents[section.id].map((student) => (
                                                                <div
                                                                    key={student.id}
                                                                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar name={student.full_name} size="sm" className="bg-blue-500" />
                                                                        <div>
                                                                            <p className="font-medium text-slate-800 text-sm">{student.full_name}</p>
                                                                            <p className="text-xs text-slate-500">{student.student_id}</p>
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
                                                        <div className="text-center py-6">
                                                            <Icon icon="solar:users-group-rounded-linear" className="text-3xl text-slate-300 mx-auto mb-2" />
                                                            <p className="text-sm text-slate-400">ยังไม่มีนักศึกษาในกลุ่มนี้</p>
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
                                </CardBody>
                            </Card>
                        ) : (
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="text-center py-12">
                                    <Icon icon="solar:notebook-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 mb-4">ยังไม่มีกลุ่มเรียน</p>
                                    <Button
                                        color="primary"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => setIsAddSectionModalOpen(true)}
                                        className="bg-blue-500"
                                    >
                                        เพิ่มกลุ่มเรียนแรก
                                    </Button>
                                </CardBody>
                            </Card>
                        )}
                    </div>
                )}

                {/* People Tab */}
                {activeTab === "people" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Instructor */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:user-circle-bold" className="text-xl text-blue-500" />
                                    <span className="font-semibold text-slate-800">อาจารย์ผู้สอน</span>
                                </div>
                            </CardHeader>
                            <CardBody className="px-5 py-4">
                                {course.instructor ? (
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50">
                                        <Avatar
                                            name={course.instructor.full_name}
                                            size="lg"
                                            className="bg-blue-500"
                                        />
                                        <div>
                                            <p className="font-semibold text-slate-800">{course.instructor.full_name}</p>
                                            <p className="text-sm text-slate-500">{course.instructor.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Icon icon="solar:user-circle-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">ยังไม่กำหนดอาจารย์ผู้สอน</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* TAs */}
                        <Card className="shadow-sm border border-slate-200">
                            <CardHeader className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:user-hands-bold" className="text-xl text-emerald-500" />
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
                            <CardBody className="px-5 py-4">
                                {course.tas && course.tas.length > 0 ? (
                                    <div className="space-y-3">
                                        {course.tas.map((ta) => (
                                            <div
                                                key={ta.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={ta.full_name} size="sm" className="bg-emerald-500" />
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
                                    <div className="text-center py-6">
                                        <Icon icon="solar:user-hands-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 mb-3">ยังไม่มีผู้ช่วยสอน</p>
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

                {/* Assignments Tab */}
                {activeTab === "assignments" && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">งานทั้งหมด</h2>
                                <p className="text-sm text-slate-500">สร้างและจัดการหัวข้องานสำหรับการลงคะแนน</p>
                            </div>
                            <Button
                                color="primary"
                                startContent={<Icon icon="solar:add-circle-bold" />}
                                onPress={() => {
                                    setNewAssignment({
                                        name: "",
                                        type: "individual",
                                        hasSubItems: false,
                                        subItems: [],
                                        maxScore: 10,
                                        dueDate: "",
                                        description: "",
                                        groupSize: 3,
                                        groupFormation: "manual",
                                    });
                                    setEditingAssignment(null);
                                    setIsAddAssignmentModalOpen(true);
                                }}
                                className="bg-blue-500"
                            >
                                สร้างงานใหม่
                            </Button>
                        </div>

                        {/* Assignment Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="p-4 text-center">
                                    <Icon icon="solar:clipboard-list-bold" className="text-2xl text-blue-500 mx-auto mb-1" />
                                    <p className="text-2xl font-bold text-slate-800">{assignments.length}</p>
                                    <p className="text-xs text-slate-500">งานทั้งหมด</p>
                                </CardBody>
                            </Card>
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="p-4 text-center">
                                    <Icon icon="solar:user-bold" className="text-2xl text-indigo-500 mx-auto mb-1" />
                                    <p className="text-2xl font-bold text-slate-800">{assignments.filter(a => a.type === "individual").length}</p>
                                    <p className="text-xs text-slate-500">งานเดี่ยว</p>
                                </CardBody>
                            </Card>
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="p-4 text-center">
                                    <Icon icon="solar:users-group-rounded-bold" className="text-2xl text-emerald-500 mx-auto mb-1" />
                                    <p className="text-2xl font-bold text-slate-800">{assignments.filter(a => a.type === "group").length}</p>
                                    <p className="text-xs text-slate-500">งานกลุ่ม</p>
                                </CardBody>
                            </Card>
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="p-4 text-center">
                                    <Icon icon="solar:medal-star-bold" className="text-2xl text-amber-500 mx-auto mb-1" />
                                    <p className="text-2xl font-bold text-slate-800">
                                        {assignments.reduce((acc, a) => acc + (a.hasSubItems ? a.subItems.reduce((s, sub) => s + sub.maxScore, 0) : a.maxScore), 0)}
                                    </p>
                                    <p className="text-xs text-slate-500">คะแนนรวม</p>
                                </CardBody>
                            </Card>
                        </div>

                        {/* Assignments List */}
                        {assignments.length > 0 ? (
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="p-0 divide-y divide-slate-100">
                                    {assignments.map((assignment) => (
                                        <div key={assignment.id}>
                                            <div
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => {
                                                    if (assignment.hasSubItems) {
                                                        setExpandedAssignments(prev => 
                                                            prev.includes(assignment.id) 
                                                                ? prev.filter(id => id !== assignment.id)
                                                                : [...prev, assignment.id]
                                                        );
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl ${
                                                        assignment.type === "individual" 
                                                            ? "bg-indigo-100" 
                                                            : "bg-emerald-100"
                                                    }`}>
                                                        <Icon 
                                                            icon={assignment.type === "individual" ? "solar:user-bold" : "solar:users-group-rounded-bold"} 
                                                            className={`text-xl ${
                                                                assignment.type === "individual" 
                                                                    ? "text-indigo-600" 
                                                                    : "text-emerald-600"
                                                            }`} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-slate-800">{assignment.name}</p>
                                                            <Chip 
                                                                size="sm" 
                                                                variant="flat" 
                                                                className={assignment.type === "individual" 
                                                                    ? "bg-indigo-50 text-indigo-600" 
                                                                    : "bg-emerald-50 text-emerald-600"
                                                                }
                                                            >
                                                                {assignment.type === "individual" ? "งานเดี่ยว" : "งานกลุ่ม"}
                                                            </Chip>
                                                            {assignment.hasSubItems && (
                                                                <Chip size="sm" variant="flat" className="bg-amber-50 text-amber-600">
                                                                    {assignment.subItems.length} ข้อย่อย
                                                                </Chip>
                                                            )}
                                                            {assignment.type === "group" && assignment.groupSize && (
                                                                <Chip size="sm" variant="flat" className="bg-purple-50 text-purple-600">
                                                                    <Icon icon={assignment.groupFormation === "random" ? "solar:shuffle-linear" : "solar:hand-shake-linear"} className="mr-1" />
                                                                    {assignment.groupSize} คน/กลุ่ม
                                                                </Chip>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                <Icon icon="solar:medal-star-linear" className="text-amber-500" />
                                                                {assignment.hasSubItems 
                                                                    ? assignment.subItems.reduce((acc, sub) => acc + sub.maxScore, 0)
                                                                    : assignment.maxScore
                                                                } คะแนน
                                                            </span>
                                                            {assignment.type === "group" && (
                                                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                    <Icon icon="solar:users-group-rounded-linear" className="text-emerald-500" />
                                                                    {assignment.teams?.length || 0} กลุ่ม
                                                                </span>
                                                            )}
                                                            {assignment.dueDate && (
                                                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                    <Icon icon="solar:calendar-linear" />
                                                                    {new Date(assignment.dueDate).toLocaleDateString("th-TH", {
                                                                        day: "numeric",
                                                                        month: "short",
                                                                        year: "numeric"
                                                                    })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip content="แก้ไข">
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="primary"
                                                            onPress={() => {
                                                                setEditingAssignment(assignment);
                                                                setNewAssignment({
                                                                    name: assignment.name,
                                                                    type: assignment.type,
                                                                    hasSubItems: assignment.hasSubItems,
                                                                    subItems: assignment.subItems,
                                                                    maxScore: assignment.maxScore,
                                                                    dueDate: assignment.dueDate || "",
                                                                    description: assignment.description || "",
                                                                    groupSize: assignment.groupSize || 3,
                                                                    groupFormation: assignment.groupFormation || "manual",
                                                                });
                                                                setIsAddAssignmentModalOpen(true);
                                                            }}
                                                        >
                                                            <Icon icon="solar:pen-linear" className="text-lg" />
                                                        </Button>
                                                    </Tooltip>
                                                    {assignment.type === "group" && (
                                                        <Tooltip content="จัดการกลุ่ม">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="light"
                                                                color="success"
                                                                onPress={() => {
                                                                    addToast({
                                                                        title: "กำลังพัฒนา",
                                                                        description: "ระบบจัดการกลุ่มกำลังพัฒนา",
                                                                        color: "warning",
                                                                    });
                                                                }}
                                                            >
                                                                <Icon icon="solar:users-group-rounded-linear" className="text-lg" />
                                                            </Button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip content="ลบงาน" color="danger">
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="danger"
                                                            onPress={() => {
                                                                if (confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) {
                                                                    setAssignments(prev => prev.filter(a => a.id !== assignment.id));
                                                                    addToast({
                                                                        title: "สำเร็จ",
                                                                        description: "ลบงานเรียบร้อยแล้ว",
                                                                        color: "success",
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                                                        </Button>
                                                    </Tooltip>
                                                    {assignment.hasSubItems && (
                                                        <Icon
                                                            icon={expandedAssignments.includes(assignment.id) ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                                                            className="text-xl text-slate-400 ml-2"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            {/* Sub Items */}
                                            {assignment.hasSubItems && expandedAssignments.includes(assignment.id) && (
                                                <div className="px-4 pb-4 bg-slate-50">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {assignment.subItems.map((subItem, idx) => (
                                                            <div
                                                                key={subItem.id}
                                                                className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div>
                                                                        <p className="font-medium text-slate-800 text-sm">{subItem.name}</p>
                                                                        <p className="text-xs text-slate-500">{subItem.maxScore} คะแนน</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardBody>
                            </Card>
                        ) : (
                            <Card className="shadow-sm border border-slate-200">
                                <CardBody className="text-center py-16">
                                    <Icon icon="solar:clipboard-list-linear" className="text-6xl text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีงาน</h3>
                                    <p className="text-slate-500 mb-6">เริ่มสร้างงานเพื่อกำหนดหัวข้อการลงคะแนน</p>
                                    <Button
                                        color="primary"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => setIsAddAssignmentModalOpen(true)}
                                        className="bg-blue-500"
                                    >
                                        สร้างงานใหม่
                                    </Button>
                                </CardBody>
                            </Card>
                        )}
                    </div>
                )}

                {/* Scores Tab */}
                {activeTab === "scores" && (
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="text-center py-16">
                            <Icon icon="solar:chart-2-linear" className="text-6xl text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">ระบบคะแนน</h3>
                            <p className="text-slate-500">กำลังพัฒนา...</p>
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Add Section Modal */}
            <Modal isOpen={isAddSectionModalOpen} onClose={() => setIsAddSectionModalOpen(false)} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                                <Icon icon="solar:notebook-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มกลุ่มเรียน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">เพิ่มกลุ่มเรียนใหม่ในรายวิชา</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
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
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
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
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button variant="light" onPress={() => setIsAddSectionModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleAddSection}
                            isLoading={isSubmitting}
                            className="bg-blue-500"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" />}
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
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                                <Icon icon="solar:user-hands-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มผู้ช่วยสอน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">เลือกผู้ช่วยสอนที่ต้องการเพิ่ม</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <Select
                            label="เลือกผู้ช่วยสอน"
                            labelPlacement="outside"
                            placeholder="เลือกผู้ช่วยสอน"
                            variant="bordered"
                            size="lg"
                            selectedKeys={selectedTAId ? [selectedTAId] : []}
                            onChange={(e) => setSelectedTAId(e.target.value)}
                            classNames={{
                                trigger: "h-12 bg-white border-slate-200 hover:border-blue-300",
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
                        <Button variant="light" onPress={() => setIsAddTAModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            color="success"
                            onPress={handleAddTA}
                            isLoading={isSubmitting}
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" />}
                        >
                            เพิ่มผู้ช่วยสอน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Student Modal */}
            <Modal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} size="lg">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Icon icon="solar:user-plus-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มนักศึกษา</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">ค้นหานักศึกษาที่ต้องการเพิ่มในกลุ่มเรียน</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-4">
                            <Input
                                label="ค้นหานักศึกษา"
                                labelPlacement="outside"
                                placeholder="พิมพ์รหัสนักศึกษาหรือชื่อนักศึกษา..."
                                variant="bordered"
                                size="lg"
                                value={studentSearchQuery}
                                onValueChange={setStudentSearchQuery}
                                startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />
                            
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                    <p className="text-sm text-slate-600">
                                        {studentSearchQuery.trim() 
                                            ? `พบ ${filteredStudents().length} รายการ`
                                            : `นักศึกษาที่สามารถเพิ่มได้ ${getAvailableStudents().length} คน`
                                        }
                                    </p>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {filteredStudents().length > 0 ? (
                                        filteredStudents().slice(0, 50).map((student) => (
                                            <div
                                                key={student.id}
                                                onClick={() => setSelectedStudentId(student.id.toString())}
                                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${
                                                    selectedStudentId === student.id.toString()
                                                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                        : "hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={student.full_name} size="sm" className="bg-blue-500" />
                                                    <div>
                                                        <p className="font-medium text-slate-800">{student.full_name}</p>
                                                        <p className="text-sm text-slate-500">{student.student_id}</p>
                                                    </div>
                                                </div>
                                                {selectedStudentId === student.id.toString() && (
                                                    <Icon icon="solar:check-circle-bold" className="text-xl text-blue-500" />
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <Icon icon="solar:user-cross-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                            <p className="text-slate-400">
                                                {studentSearchQuery.trim() 
                                                    ? "ไม่พบนักศึกษาที่ค้นหา"
                                                    : "ไม่มีนักศึกษาที่สามารถเพิ่มได้"
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button variant="light" onPress={() => setIsAddStudentModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleAddStudent}
                            isLoading={isSubmitting}
                            isDisabled={!selectedStudentId}
                            className="bg-blue-500"
                            startContent={!isSubmitting && <Icon icon="solar:add-circle-bold" />}
                        >
                            เพิ่มนักศึกษา
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add/Edit Assignment Modal */}
            <Modal 
                isOpen={isAddAssignmentModalOpen} 
                onClose={() => {
                    setIsAddAssignmentModalOpen(false);
                    setEditingAssignment(null);
                }} 
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Icon icon="solar:clipboard-list-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {editingAssignment ? "แก้ไขงาน" : "สร้างงานใหม่"}
                                </h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">
                                    กำหนดหัวข้องานสำหรับการลงคะแนน
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-5">
                            {/* Assignment Name */}
                            <Input
                                label="ชื่องาน"
                                labelPlacement="outside"
                                placeholder="เช่น งานที่ 1, Quiz 1, โปรเจคกลุ่ม"
                                variant="bordered"
                                size="lg"
                                value={newAssignment.name}
                                onValueChange={(val) => setNewAssignment(prev => ({ ...prev, name: val }))}
                                isRequired
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />

                            {/* Assignment Type */}
                            <div>
                                <label className="text-slate-600 font-medium text-sm mb-2 block">ประเภทงาน</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ ...prev, type: "individual" }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            newAssignment.type === "individual"
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <Icon icon="solar:user-bold" className={`text-3xl mx-auto mb-2 ${
                                            newAssignment.type === "individual" ? "text-indigo-500" : "text-slate-400"
                                        }`} />
                                        <p className={`font-semibold ${
                                            newAssignment.type === "individual" ? "text-indigo-600" : "text-slate-600"
                                        }`}>งานเดี่ยว</p>
                                        <p className="text-xs text-slate-500 mt-1">คะแนนรายบุคคล</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ ...prev, type: "group" }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            newAssignment.type === "group"
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <Icon icon="solar:users-group-rounded-bold" className={`text-3xl mx-auto mb-2 ${
                                            newAssignment.type === "group" ? "text-emerald-500" : "text-slate-400"
                                        }`} />
                                        <p className={`font-semibold ${
                                            newAssignment.type === "group" ? "text-emerald-600" : "text-slate-600"
                                        }`}>งานกลุ่ม</p>
                                        <p className="text-xs text-slate-500 mt-1">จับกลุ่มทำงานร่วมกัน</p>
                                    </button>
                                </div>
                            </div>

                            {/* Group Settings - Only show when type is "group" */}
                            {newAssignment.type === "group" && (
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon icon="solar:settings-bold" className="text-emerald-600" />
                                        <span className="font-semibold text-emerald-800">ตั้งค่างานกลุ่ม</span>
                                    </div>
                                    
                                    {/* Group Size */}
                                    <div>
                                        <label className="text-slate-600 font-medium text-sm mb-2 block">จำนวนสมาชิกต่อกลุ่ม</label>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                onPress={() => setNewAssignment(prev => ({ 
                                                    ...prev, 
                                                    groupSize: Math.max(2, prev.groupSize - 1) 
                                                }))}
                                            >
                                                <Icon icon="solar:minus-circle-linear" />
                                            </Button>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
                                                <Icon icon="solar:users-group-rounded-linear" className="text-emerald-500" />
                                                <span className="font-bold text-lg text-slate-800">{newAssignment.groupSize}</span>
                                                <span className="text-slate-500 text-sm">คน</span>
                                            </div>
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                onPress={() => setNewAssignment(prev => ({ 
                                                    ...prev, 
                                                    groupSize: Math.min(10, prev.groupSize + 1) 
                                                }))}
                                            >
                                                <Icon icon="solar:add-circle-linear" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Group Formation Method */}
                                    <div>
                                        <label className="text-slate-600 font-medium text-sm mb-2 block">วิธีการจับกลุ่ม</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setNewAssignment(prev => ({ ...prev, groupFormation: "manual" }))}
                                                className={`p-3 rounded-xl border-2 transition-all ${
                                                    newAssignment.groupFormation === "manual"
                                                        ? "border-emerald-500 bg-white"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <Icon icon="solar:hand-shake-bold" className={`text-2xl mx-auto mb-1 ${
                                                    newAssignment.groupFormation === "manual" ? "text-emerald-500" : "text-slate-400"
                                                }`} />
                                                <p className={`font-medium text-sm ${
                                                    newAssignment.groupFormation === "manual" ? "text-emerald-600" : "text-slate-600"
                                                }`}>จับกลุ่มเอง</p>
                                                <p className="text-xs text-slate-500 mt-0.5">นักศึกษาเลือกสมาชิก</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewAssignment(prev => ({ ...prev, groupFormation: "random" }))}
                                                className={`p-3 rounded-xl border-2 transition-all ${
                                                    newAssignment.groupFormation === "random"
                                                        ? "border-purple-500 bg-white"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <Icon icon="solar:shuffle-bold" className={`text-2xl mx-auto mb-1 ${
                                                    newAssignment.groupFormation === "random" ? "text-purple-500" : "text-slate-400"
                                                }`} />
                                                <p className={`font-medium text-sm ${
                                                    newAssignment.groupFormation === "random" ? "text-purple-600" : "text-slate-600"
                                                }`}>สุ่มกลุ่ม</p>
                                                <p className="text-xs text-slate-500 mt-0.5">ระบบจับกลุ่มให้อัตโนมัติ</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200">
                                        <Icon icon="solar:info-circle-linear" className="text-slate-400 mt-0.5" />
                                        <div className="text-xs text-slate-500">
                                            {newAssignment.groupFormation === "manual" ? (
                                                <p>นักศึกษาสามารถเลือกสมาชิกในกลุ่มได้เอง หลังจากสร้างงานแล้วจะสามารถจัดการกลุ่มได้ในหน้างาน</p>
                                            ) : (
                                                <p>ระบบจะสุ่มจับกลุ่มให้อัตโนมัติตามจำนวนสมาชิกที่กำหนด โดยจะจับกลุ่มตาม Section ของนักศึกษา</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Has Sub Items Toggle */}
                            <div>
                                <label className="text-slate-600 font-medium text-sm mb-2 block">รูปแบบคะแนน</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ 
                                            ...prev, 
                                            hasSubItems: false,
                                            subItems: []
                                        }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            !newAssignment.hasSubItems
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <Icon icon="solar:document-bold" className={`text-3xl mx-auto mb-2 ${
                                            !newAssignment.hasSubItems ? "text-blue-500" : "text-slate-400"
                                        }`} />
                                        <p className={`font-semibold ${
                                            !newAssignment.hasSubItems ? "text-blue-600" : "text-slate-600"
                                        }`}>คะแนนเดียว</p>
                                        <p className="text-xs text-slate-500 mt-1">ให้คะแนนรวมทั้งงาน</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ 
                                            ...prev, 
                                            hasSubItems: true,
                                            subItems: prev.subItems.length > 0 ? prev.subItems : [
                                                { id: `sub_${Date.now()}`, name: "ข้อ 1", maxScore: 5 }
                                            ]
                                        }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            newAssignment.hasSubItems
                                                ? "border-amber-500 bg-amber-50"
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <Icon icon="solar:checklist-bold" className={`text-3xl mx-auto mb-2 ${
                                            newAssignment.hasSubItems ? "text-amber-500" : "text-slate-400"
                                        }`} />
                                        <p className={`font-semibold ${
                                            newAssignment.hasSubItems ? "text-amber-600" : "text-slate-600"
                                        }`}>มีข้อย่อย</p>
                                        <p className="text-xs text-slate-500 mt-1">แบ่งเป็นหลายข้อย่อย</p>
                                    </button>
                                </div>
                            </div>

                            {/* Single Score Input */}
                            {!newAssignment.hasSubItems && (
                                <Input
                                    type="number"
                                    label="คะแนนเต็ม"
                                    labelPlacement="outside"
                                    placeholder="เช่น 10, 20, 100"
                                    variant="bordered"
                                    size="lg"
                                    min={0}
                                    value={newAssignment.maxScore.toString()}
                                    onValueChange={(val) => setNewAssignment(prev => ({ ...prev, maxScore: parseInt(val) || 0 }))}
                                    isRequired
                                    endContent={<span className="text-slate-400 text-sm">คะแนน</span>}
                                    classNames={{
                                        inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                        label: "text-slate-600 font-medium text-sm",
                                    }}
                                />
                            )}

                            {/* Sub Items Editor */}
                            {newAssignment.hasSubItems && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-slate-600 font-medium text-sm">
                                            ข้อย่อย ({newAssignment.subItems.length} ข้อ)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <Chip size="sm" variant="flat" className="bg-amber-100 text-amber-600">
                                                รวม {newAssignment.subItems.reduce((acc, sub) => acc + sub.maxScore, 0)} คะแนน
                                            </Chip>
                                            <Button
                                                size="sm"
                                                color="primary"
                                                variant="flat"
                                                startContent={<Icon icon="solar:add-circle-linear" />}
                                                onPress={() => {
                                                    setNewAssignment(prev => ({
                                                        ...prev,
                                                        subItems: [
                                                            ...prev.subItems,
                                                            { 
                                                                id: `sub_${Date.now()}`, 
                                                                name: `ข้อ ${prev.subItems.length + 1}`, 
                                                                maxScore: 5 
                                                            }
                                                        ]
                                                    }));
                                                }}
                                            >
                                                เพิ่มข้อ
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {newAssignment.subItems.map((subItem, idx) => (
                                            <div 
                                                key={subItem.id} 
                                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                                            >
                                                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 text-sm font-bold rounded-full flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <Input
                                                    size="sm"
                                                    variant="bordered"
                                                    placeholder="ชื่อข้อย่อย"
                                                    value={subItem.name}
                                                    onValueChange={(val) => {
                                                        setNewAssignment(prev => ({
                                                            ...prev,
                                                            subItems: prev.subItems.map(s => 
                                                                s.id === subItem.id ? { ...s, name: val } : s
                                                            )
                                                        }));
                                                    }}
                                                    classNames={{
                                                        inputWrapper: "h-10 bg-white border-slate-200",
                                                    }}
                                                />
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    variant="bordered"
                                                    placeholder="คะแนน"
                                                    min={0}
                                                    value={subItem.maxScore.toString()}
                                                    onValueChange={(val) => {
                                                        setNewAssignment(prev => ({
                                                            ...prev,
                                                            subItems: prev.subItems.map(s => 
                                                                s.id === subItem.id ? { ...s, maxScore: parseInt(val) || 0 } : s
                                                            )
                                                        }));
                                                    }}
                                                    className="w-24"
                                                    endContent={<span className="text-slate-400 text-xs">คะแนน</span>}
                                                    classNames={{
                                                        inputWrapper: "h-10 bg-white border-slate-200",
                                                    }}
                                                />
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    isDisabled={newAssignment.subItems.length <= 1}
                                                    onPress={() => {
                                                        setNewAssignment(prev => ({
                                                            ...prev,
                                                            subItems: prev.subItems.filter(s => s.id !== subItem.id)
                                                        }));
                                                    }}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-linear" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Due Date */}
                            <Input
                                type="date"
                                label="กำหนดส่ง (ถ้ามี)"
                                labelPlacement="outside"
                                variant="bordered"
                                size="lg"
                                value={newAssignment.dueDate}
                                onValueChange={(val) => setNewAssignment(prev => ({ ...prev, dueDate: val }))}
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />

                            {/* Description */}
                            <Input
                                label="รายละเอียดเพิ่มเติม"
                                labelPlacement="outside"
                                placeholder="คำอธิบายเกี่ยวกับงาน (ถ้ามี)"
                                variant="bordered"
                                size="lg"
                                value={newAssignment.description}
                                onValueChange={(val) => setNewAssignment(prev => ({ ...prev, description: val }))}
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-slate-600 font-medium text-sm",
                                }}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <div className="flex items-center justify-between w-full">
                            <div className="text-sm text-slate-500">
                                {newAssignment.hasSubItems 
                                    ? `คะแนนรวม: ${newAssignment.subItems.reduce((acc, sub) => acc + sub.maxScore, 0)} คะแนน`
                                    : `คะแนนเต็ม: ${newAssignment.maxScore} คะแนน`
                                }
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="light" 
                                    onPress={() => {
                                        setIsAddAssignmentModalOpen(false);
                                        setEditingAssignment(null);
                                    }}
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={() => {
                                        if (!newAssignment.name.trim()) {
                                            addToast({
                                                title: "ข้อมูลไม่ครบ",
                                                description: "กรุณากรอกชื่องาน",
                                                color: "warning",
                                            });
                                            return;
                                        }
                                        if (newAssignment.hasSubItems && newAssignment.subItems.length === 0) {
                                            addToast({
                                                title: "ข้อมูลไม่ครบ",
                                                description: "กรุณาเพิ่มข้อย่อยอย่างน้อย 1 ข้อ",
                                                color: "warning",
                                            });
                                            return;
                                        }

                                        if (editingAssignment) {
                                            // Update existing
                                            setAssignments(prev => prev.map(a => 
                                                a.id === editingAssignment.id
                                                    ? {
                                                        ...a,
                                                        name: newAssignment.name,
                                                        type: newAssignment.type,
                                                        hasSubItems: newAssignment.hasSubItems,
                                                        subItems: newAssignment.subItems,
                                                        maxScore: newAssignment.maxScore,
                                                        dueDate: newAssignment.dueDate || undefined,
                                                        description: newAssignment.description || undefined,
                                                        groupSize: newAssignment.type === "group" ? newAssignment.groupSize : undefined,
                                                        groupFormation: newAssignment.type === "group" ? newAssignment.groupFormation : undefined,
                                                    }
                                                    : a
                                            ));
                                            addToast({
                                                title: "สำเร็จ",
                                                description: "แก้ไขงานเรียบร้อยแล้ว",
                                                color: "success",
                                            });
                                        } else {
                                            // Create new
                                            const newAssignmentData: Assignment = {
                                                id: `assignment_${Date.now()}`,
                                                name: newAssignment.name,
                                                type: newAssignment.type,
                                                hasSubItems: newAssignment.hasSubItems,
                                                subItems: newAssignment.subItems,
                                                maxScore: newAssignment.maxScore,
                                                dueDate: newAssignment.dueDate || undefined,
                                                description: newAssignment.description || undefined,
                                                createdAt: new Date().toISOString(),
                                                groupSize: newAssignment.type === "group" ? newAssignment.groupSize : undefined,
                                                groupFormation: newAssignment.type === "group" ? newAssignment.groupFormation : undefined,
                                                teams: newAssignment.type === "group" ? [] : undefined,
                                            };
                                            setAssignments(prev => [...prev, newAssignmentData]);
                                            addToast({
                                                title: "สำเร็จ",
                                                description: newAssignment.type === "group" 
                                                    ? "สร้างงานกลุ่มเรียบร้อยแล้ว สามารถจัดการกลุ่มได้ในหน้างาน"
                                                    : "สร้างงานใหม่เรียบร้อยแล้ว",
                                                color: "success",
                                            });
                                        }
                                        setIsAddAssignmentModalOpen(false);
                                        setEditingAssignment(null);
                                    }}
                                    isLoading={isSubmitting}
                                    className="bg-blue-500"
                                    startContent={!isSubmitting && <Icon icon={editingAssignment ? "solar:pen-bold" : "solar:add-circle-bold"} />}
                                >
                                    {editingAssignment ? "บันทึกการแก้ไข" : "สร้างงาน"}
                                </Button>
                            </div>
                        </div>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
