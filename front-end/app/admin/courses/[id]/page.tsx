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
import type { Course, CourseSection, TA, SectionStudent } from "@/services/course.service";
import type { Student } from "@/services/student.service";

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = parseInt(params.id as string);

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tasList, setTasList] = useState<TA[]>([]);
    const [studentsList, setStudentsList] = useState<Student[]>([]);

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    isIconOnly
                    variant="light"
                    onPress={() => router.push("/admin/courses")}
                >
                    <Icon icon="solar:arrow-left-linear" className="text-xl" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-800">{course.code}</h1>
                        <Chip
                            size="sm"
                            variant="dot"
                            color={course.is_active ? "success" : "default"}
                        >
                            {course.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                        </Chip>
                    </div>
                    <p className="text-slate-500 mt-1">{course.name}</p>
                </div>
            </div>

            {/* Course Info Card */}
            <Card className="shadow-sm">
                <CardHeader className="flex gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Icon icon="solar:book-2-bold" className="text-2xl text-white" />
                    </div>
                    <div className="flex flex-col text-white">
                        <p className="text-lg font-bold">{course.code} - {course.name}</p>
                        <p className="text-sm text-white/80">
                            ปีการศึกษา {course.year} ภาคเรียนที่ {course.semester === 3 ? "ฤดูร้อน" : course.semester}
                        </p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">อาจารย์ผู้สอน</p>
                            {course.instructor ? (
                                <div className="flex items-center gap-2">
                                    
                                    <span className="font-medium">{course.instructor.full_name}</span>
                                </div>
                            ) : (
                                <span className="text-slate-400 italic">ยังไม่กำหนด</span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">จำนวนกลุ่มเรียน</p>
                            <p className="font-medium">{course.sections?.length || 0} กลุ่ม</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-1">จำนวนผู้ช่วยสอน</p>
                            <p className="font-medium">{course.tas?.length || 0} คน</p>
                        </div>
                    </div>
                    {course.description && (
                        <>
                            <Divider className="my-4" />
                            <div>
                                <p className="text-sm text-slate-500 mb-1">คำอธิบายรายวิชา</p>
                                <p className="text-slate-700">{course.description}</p>
                            </div>
                        </>
                    )}
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sections Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex justify-between items-center px-6 py-4 border-b">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:users-group-rounded-bold" className="text-xl text-warning" />
                            <span className="font-semibold text-slate-800">กลุ่มเรียน</span>
                        </div>
                        <Button
                            size="sm"
                            color="warning"
                            variant="flat"
                            startContent={<Icon icon="solar:add-circle-bold" />}
                            onPress={() => setIsAddSectionModalOpen(true)}
                        >
                            เพิ่มกลุ่ม
                        </Button>
                    </CardHeader>
                    <CardBody className="px-6 py-4">
                        {course.sections && course.sections.length > 0 ? (
                            <div className="space-y-3">
                                {course.sections.map((section) => (
                                    <div key={section.id} className="border rounded-lg overflow-hidden">
                                        <div
                                            className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                                            onClick={() => toggleSection(section.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon
                                                    icon={expandedSections.includes(section.id) ? "solar:alt-arrow-down-linear" : "solar:alt-arrow-right-linear"}
                                                    className="text-lg text-slate-500"
                                                />
                                                <div>
                                                    <span className="font-medium">กลุ่ม {section.section_no}</span>
                                                    <span className="text-sm text-slate-500 ml-2">
                                                        ({section.studentCount || 0} คน)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Tooltip content="เพิ่มนักศึกษา">
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            openAddStudentModal(section.id);
                                                        }}
                                                    >
                                                        <Icon icon="solar:user-plus-linear" className="text-lg text-default-500" />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content="ลบกลุ่ม" color="danger">
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveSection(section.id);
                                                        }}
                                                    >
                                                        <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        {expandedSections.includes(section.id) && (
                                            <div className="p-3 border-t">
                                                {sectionStudents[section.id] && sectionStudents[section.id].length > 0 ? (
                                                    <div className="space-y-2">
                                                        {sectionStudents[section.id].map((student) => (
                                                            <div
                                                                key={student.id}
                                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar
                                                                        name={student.full_name}
                                                                        size="sm"
                                                                        className="bg-cyan-500"
                                                                    />
                                                                    <div>
                                                                        <p className="text-sm font-medium">{student.student_id}</p>
                                                                        <p className="text-xs text-slate-500">{student.full_name}</p>
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
                                                    <p className="text-sm text-slate-400 text-center py-4">
                                                        ยังไม่มีนักศึกษาในกลุ่มนี้
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Icon icon="solar:users-group-rounded-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-400">ยังไม่มีกลุ่มเรียน</p>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* TAs Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex justify-between items-center px-6 py-4 border-b">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:user-hands-bold" className="text-xl text-success" />
                            <span className="font-semibold text-slate-800">ผู้ช่วยสอน (TA)</span>
                        </div>
                        <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            startContent={<Icon icon="solar:add-circle-bold" />}
                            onPress={() => setIsAddTAModalOpen(true)}
                            isDisabled={availableTAs.length === 0}
                        >
                            เพิ่ม TA
                        </Button>
                    </CardHeader>
                    <CardBody className="px-6 py-4">
                        {course.tas && course.tas.length > 0 ? (
                            <div className="space-y-3">
                                {course.tas.map((ta) => (
                                    <div
                                        key={ta.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                name={ta.full_name}
                                                size="sm"
                                                className="bg-green-500"
                                            />
                                            <div>
                                                <p className="font-medium">{ta.full_name}</p>
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
                                <p className="text-slate-400">ยังไม่มีผู้ช่วยสอน</p>
                            </div>
                        )}
                    </CardBody>
                </Card>
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
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
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
                                trigger: "h-12 bg-white border-slate-200 hover:border-green-300",
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
                            color="success"
                            onPress={handleAddTA}
                            isLoading={isSubmitting}
                            className="font-medium px-6"
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
                            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
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
                                trigger: "h-12 bg-white border-slate-200 hover:border-cyan-300",
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
                            color="primary"
                            onPress={handleAddStudent}
                            isLoading={isSubmitting}
                            className="font-medium px-6 bg-gradient-to-r from-cyan-500 to-blue-600"
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
