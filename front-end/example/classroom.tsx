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
import { Select, SelectItem } from "@heroui/select";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/student.service";
import { authService } from "@/services/auth.service";
import type { Course, TA, SectionStudent, CourseOverview, Team, TeamMember as ServiceTeamMember } from "@/services/course.service";
import type { Student } from "@/services/student.service";

// Team/Group Types (local extension of service types)
interface TeamMember {
    id: number;
    student_id: string;
    full_name: string;
}
interface PermanentTeam {
    id: number;
    name: string;
    members: TeamMember[];
    createdAt: string;
}
interface WeeklyTeam {
    id: number;
    name: string;
    members: TeamMember[];
    weekNumber: number;
}

export default function ClassroomDetailPage() {
    const params = useParams();
    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tasList, setTasList] = useState<TA[]>([]);
    const [studentsList, setStudentsList] = useState<Student[]>([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [userRole, setUserRole] = useState<string>("");
    const [overview, setOverview] = useState<CourseOverview | null>(null);
    const [isOverviewLoading, setIsOverviewLoading] = useState(false);

    // Section states
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionNo, setNewSectionNo] = useState("");
    const [newSectionNote, setNewSectionNote] = useState("");
    const [sectionSubTab, setSectionSubTab] = useState<"students" | "permanent" | "weekly">("students");
    const [sectionSearchQuery, setSectionSearchQuery] = useState("");

    // Group/Team states
    const [permanentTeams, setPermanentTeams] = useState<PermanentTeam[]>([]);
    const [weeklyTeams, setWeeklyTeams] = useState<Record<number, WeeklyTeam[]>>({});
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [totalWeeks] = useState(15); // Total weeks in semester
    const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
    const [teamCreationType, setTeamCreationType] = useState<"permanent" | "weekly">("permanent");
    const [newTeamName, setNewTeamName] = useState("");
    const [selectedTeamMembers, setSelectedTeamMembers] = useState<number[]>([]);
    const [teamFormationMethod, setTeamFormationMethod] = useState<"manual" | "random">("manual");
    const [teamSize, setTeamSize] = useState(3);
    const [selectedSectionForTeam, setSelectedSectionForTeam] = useState<number | "all">("all");
    
    // Team member selection mode (select from list or paste from Excel)
    const [teamMemberMode, setTeamMemberMode] = useState<"select" | "paste">("select");
    const [teamExcelPasteData, setTeamExcelPasteData] = useState("");
    const [parsedTeamMembers, setParsedTeamMembers] = useState<Array<{
        inputValue: string;
        matchedStudent: TeamMember | null;
        status: "matched" | "not_found" | "already_in_team";
    }>>([]);

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
    
    // Delete confirmation modal states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteType, setDeleteType] = useState<"student" | "team" | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{
        // For student deletion
        studentId?: number;
        studentName?: string;
        studentCode?: string;
        sectionId?: number;
        sectionNo?: string;
        // For team deletion
        teamId?: number;
        teamName?: string;
        teamType?: "permanent" | "weekly";
        weekNumber?: number;
        teamMembers?: TeamMember[];
    } | null>(null);
    
    // Bulk add students (Excel paste) states
    const [addStudentMode, setAddStudentMode] = useState<"select" | "paste">("select");
    const [excelPasteData, setExcelPasteData] = useState("");
    const [parsedStudents, setParsedStudents] = useState<Array<{
        inputValue: string;
        matchedStudent: typeof studentsList[0] | null;
        status: "matched" | "not_found" | "already_enrolled";
    }>>([]);

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

    // Fetch course overview dashboard data
    const fetchOverview = useCallback(async () => {
        setIsOverviewLoading(true);
        try {
            const response = await courseService.getCourseOverview(courseId);
            if (response.success && response.data) {
                setOverview(response.data);
            }
        } catch (error) {
            console.error("Error fetching overview:", error);
        } finally {
            setIsOverviewLoading(false);
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

    // Fetch teams from backend
    const fetchTeams = useCallback(async () => {
        try {
            // Fetch permanent teams
            const permanentResponse = await courseService.getTeams(courseId, 'permanent');
            if (permanentResponse.success && permanentResponse.data) {
                const transformedPermanent: PermanentTeam[] = permanentResponse.data.map(t => ({
                    id: t.id,
                    name: t.name,
                    members: t.members.map(m => ({
                        id: m.id,
                        student_id: m.student_id,
                        full_name: m.full_name,
                    })),
                    createdAt: t.created_at,
                }));
                setPermanentTeams(transformedPermanent);
            }

            // Fetch weekly teams
            const weeklyResponse = await courseService.getTeams(courseId, 'temporary');
            if (weeklyResponse.success && weeklyResponse.data) {
                const groupedByWeek: Record<number, WeeklyTeam[]> = {};
                weeklyResponse.data.forEach(t => {
                    const weekNum = t.week_number || 1;
                    if (!groupedByWeek[weekNum]) {
                        groupedByWeek[weekNum] = [];
                    }
                    groupedByWeek[weekNum].push({
                        id: t.id,
                        name: t.name,
                        members: t.members.map(m => ({
                            id: m.id,
                            student_id: m.student_id,
                            full_name: m.full_name,
                        })),
                        weekNumber: weekNum,
                    });
                });
                setWeeklyTeams(groupedByWeek);
            }
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourse();
        fetchOverview();
        fetchTAsList();
        fetchStudentsList();
        // Fetch user role
        const fetchUserRole = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                setUserRole(user.role);
            }
        };
        fetchUserRole();
    }, [fetchCourse, fetchOverview]);

    // Fetch all section students and teams after course is loaded
    useEffect(() => {
        if (course?.sections && course.sections.length > 0) {
            fetchAllSectionStudents();
            fetchTeams();
        }
    }, [course?.sections, fetchAllSectionStudents, fetchTeams]);

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

    // Parse Excel paste data to find matching students
    const parseExcelData = useCallback((pasteData: string) => {
        if (!pasteData.trim() || !selectedSectionId) {
            setParsedStudents([]);
            return;
        }

        // Split by newlines, tabs, or commas to handle different Excel formats
        const lines = pasteData
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const enrolledStudentIds = new Set(
            (sectionStudents[selectedSectionId] || []).map(s => s.student_id)
        );

        const results = lines.map(inputValue => {
            // Try to find matching student by student_id or full_name
            const matchedStudent = studentsList.find(student =>
                student.student_id.toLowerCase() === inputValue.toLowerCase() ||
                student.full_name.toLowerCase().includes(inputValue.toLowerCase()) ||
                inputValue.toLowerCase().includes(student.student_id.toLowerCase())
            );

            if (!matchedStudent) {
                return { inputValue, matchedStudent: null, status: "not_found" as const };
            }

            if (enrolledStudentIds.has(matchedStudent.student_id)) {
                return { inputValue, matchedStudent, status: "already_enrolled" as const };
            }

            return { inputValue, matchedStudent, status: "matched" as const };
        });

        setParsedStudents(results);
    }, [studentsList, selectedSectionId, sectionStudents]);

    // Bulk add students from parsed Excel data
    const handleBulkAddStudents = async () => {
        const studentsToAdd = parsedStudents
            .filter(p => p.status === "matched" && p.matchedStudent)
            .map(p => p.matchedStudent!);

        if (studentsToAdd.length === 0) {
            addToast({
                title: "ไม่มีนักศึกษาที่สามารถเพิ่มได้",
                description: "กรุณาตรวจสอบรายชื่อที่วางอีกครั้ง",
                color: "warning",
            });
            return;
        }

        if (!selectedSectionId) return;

        setIsSubmitting(true);

        try {
            // ใช้ bulk API แทนการ loop
            const studentIds = studentsToAdd.map(s => s.id);
            const response = await courseService.bulkAddStudentsToSection(
                courseId,
                selectedSectionId,
                studentIds
            );

            if (response.success) {
                // อัพเดท local state
                const addedIds = response.data?.addedStudentIds || studentIds;
                const addedStudents = studentsToAdd.filter(s => addedIds.includes(s.id));

                if (addedStudents.length > 0) {
                    setSectionStudents(prev => ({
                        ...prev,
                        [selectedSectionId]: [
                            ...(prev[selectedSectionId] || []),
                            ...addedStudents.map(student => ({
                                id: student.id,
                                student_id: student.student_id,
                                full_name: student.full_name,
                                email: student.email,
                                is_active: student.is_active,
                                enrolled_at: new Date().toISOString()
                            }))
                        ]
                    }));

                    setCourse(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            sections: prev.sections?.map(section =>
                                section.id === selectedSectionId
                                    ? { ...section, studentCount: (section.studentCount || 0) + addedStudents.length }
                                    : section
                            )
                        };
                    });
                }

                const addedCount = response.data?.addedCount || addedStudents.length;
                const skippedCount = response.data?.skippedCount || 0;

                addToast({
                    title: "เพิ่มนักศึกษาสำเร็จ",
                    description: `เพิ่มนักศึกษาได้ ${addedCount} คน${skippedCount > 0 ? ` (ข้าม ${skippedCount} คน)` : ""}`,
                    color: skippedCount === 0 ? "success" : "warning",
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถเพิ่มนักศึกษาได้';
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: errorMessage,
                color: "danger",
            });
        }

        // Reset states
        setIsAddStudentModalOpen(false);
        setExcelPasteData("");
        setParsedStudents([]);
        setAddStudentMode("select");
        setIsSubmitting(false);
    };

    // Reset modal state when closing
    const resetAddStudentModal = () => {
        setIsAddStudentModalOpen(false);
        setSelectedStudentId("");
        setStudentSearchQuery("");
        setExcelPasteData("");
        setParsedStudents([]);
        setAddStudentMode("select");
    };

    // Open delete student confirmation modal
    const openDeleteStudentModal = (sectionId: number, student: SectionStudent) => {
        const section = course?.sections?.find(s => s.id === sectionId);
        
        // Find all teams this student belongs to
        const permanentTeam = permanentTeams.find(t => t.members.some(m => m.id === student.id));
        const weeklyTeamsWithStudent: { weekNumber: number; teamName: string }[] = [];
        Object.entries(weeklyTeams).forEach(([weekNum, teams]) => {
            teams.forEach(team => {
                if (team.members.some(m => m.id === student.id)) {
                    weeklyTeamsWithStudent.push({ weekNumber: parseInt(weekNum), teamName: team.name });
                }
            });
        });

        setDeleteType("student");
        setDeleteTarget({
            studentId: student.id,
            studentName: student.full_name,
            studentCode: student.student_id,
            sectionId: sectionId,
            sectionNo: section?.section_no
        });
        setIsDeleteModalOpen(true);
    };

    // Actually remove student from section (called after confirmation)
    const confirmRemoveStudent = async () => {
        if (!deleteTarget?.sectionId || !deleteTarget?.studentId) return;

        const sectionId = deleteTarget.sectionId;
        const studentId = deleteTarget.studentId;
        
        setIsSubmitting(true);
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

                // Remove student from all teams (permanent and weekly)
                setPermanentTeams(prev => prev.map(team => ({
                    ...team,
                    members: team.members.filter(m => m.id !== studentId)
                })).filter(team => team.members.length > 0)); // Remove empty teams

                setWeeklyTeams(prev => {
                    const updated: Record<number, WeeklyTeam[]> = {};
                    Object.entries(prev).forEach(([weekNum, teams]) => {
                        updated[parseInt(weekNum)] = teams.map(team => ({
                            ...team,
                            members: team.members.filter(m => m.id !== studentId)
                        })).filter(team => team.members.length > 0);
                    });
                    return updated;
                });

                addToast({
                    title: "นำนักศึกษาออกสำเร็จ",
                    description: `นำ ${deleteTarget.studentName} ออกจากกลุ่มเรียน ${deleteTarget.sectionNo} แล้ว (คะแนนที่เคยลงยังคงอยู่ในระบบ)`,
                    color: "success",
                });
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                setDeleteType(null);
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถนำนักศึกษาออกได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get student's team info for display
    const getStudentTeamInfo = useCallback((studentId: number) => {
        const permanentTeam = permanentTeams.find(t => t.members.some(m => m.id === studentId));
        const weeklyTeamsInfo: { weekNumber: number; teamName: string }[] = [];
        
        Object.entries(weeklyTeams).forEach(([weekNum, teams]) => {
            teams.forEach(team => {
                if (team.members.some(m => m.id === studentId)) {
                    weeklyTeamsInfo.push({ weekNumber: parseInt(weekNum), teamName: team.name });
                }
            });
        });

        return {
            permanentTeam: permanentTeam?.name || null,
            weeklyTeams: weeklyTeamsInfo
        };
    }, [permanentTeams, weeklyTeams]);

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

    // Get all enrolled students (for team management)
    const getAllEnrolledStudents = useCallback(() => {
        const students: TeamMember[] = [];
        Object.values(sectionStudents).forEach(sectionList => {
            sectionList.forEach(s => {
                if (!students.some(existing => existing.id === s.id)) {
                    students.push({
                        id: s.id,
                        student_id: s.student_id,
                        full_name: s.full_name
                    });
                }
            });
        });
        return students;
    }, [sectionStudents]);

    // Get students in a specific section (for team management)
    const getStudentsInSection = useCallback((sectionId: number) => {
        return (sectionStudents[sectionId] || []).map(s => ({
            id: s.id,
            student_id: s.student_id,
            full_name: s.full_name
        }));
    }, [sectionStudents]);

    // Get students not in any team
    const getUnassignedStudents = useCallback((teamType: "permanent" | "weekly", weekNumber?: number) => {
        const allStudents = selectedSectionForTeam === "all" 
            ? getAllEnrolledStudents()
            : getStudentsInSection(selectedSectionForTeam as number);
        
        const assignedIds = new Set<number>();
        if (teamType === "permanent") {
            permanentTeams.forEach(team => {
                team.members.forEach(m => assignedIds.add(m.id));
            });
        } else if (weekNumber !== undefined && weeklyTeams[weekNumber]) {
            weeklyTeams[weekNumber].forEach(team => {
                team.members.forEach(m => assignedIds.add(m.id));
            });
        }
        return allStudents.filter(s => !assignedIds.has(s.id));
    }, [getAllEnrolledStudents, getStudentsInSection, permanentTeams, weeklyTeams, selectedSectionForTeam]);

    // Parse Excel paste data for team members
    const parseTeamExcelData = useCallback((pasteData: string) => {
        if (!pasteData.trim()) {
            setParsedTeamMembers([]);
            return;
        }

        // Get unassigned students based on current team type
        const unassignedStudents = getUnassignedStudents(
            teamCreationType, 
            teamCreationType === "weekly" ? selectedWeek : undefined
        );
        const unassignedIds = new Set(unassignedStudents.map(s => s.id));

        // Split by newlines to handle Excel paste
        const lines = pasteData
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const results = lines.map(inputValue => {
            // Try to find matching student in all enrolled students
            const allStudents = getAllEnrolledStudents();
            const matchedStudent = allStudents.find(student =>
                student.student_id.toLowerCase() === inputValue.toLowerCase() ||
                student.full_name.toLowerCase().includes(inputValue.toLowerCase()) ||
                inputValue.toLowerCase().includes(student.student_id.toLowerCase())
            );

            if (!matchedStudent) {
                return { inputValue, matchedStudent: null, status: "not_found" as const };
            }

            if (!unassignedIds.has(matchedStudent.id)) {
                return { inputValue, matchedStudent, status: "already_in_team" as const };
            }

            return { inputValue, matchedStudent, status: "matched" as const };
        });

        setParsedTeamMembers(results);
        
        // Auto-select matched students
        const matchedIds = results
            .filter(r => r.status === "matched" && r.matchedStudent)
            .map(r => r.matchedStudent!.id);
        setSelectedTeamMembers(matchedIds);
    }, [teamCreationType, selectedWeek, getAllEnrolledStudents, getUnassignedStudents]);

    // Reset team modal state
    const resetTeamModal = useCallback(() => {
        setIsCreateTeamModalOpen(false);
        setNewTeamName("");
        setSelectedTeamMembers([]);
        setTeamMemberMode("select");
        setTeamExcelPasteData("");
        setParsedTeamMembers([]);
    }, []);

    // Find which team a student belongs to
    const findStudentTeam = useCallback((studentId: number, teamType: "permanent" | "weekly", weekNumber?: number): string | null => {
        if (teamType === "permanent") {
            const team = permanentTeams.find(t => t.members.some(m => m.id === studentId));
            return team?.name || null;
        } else if (weekNumber !== undefined && weeklyTeams[weekNumber]) {
            const team = weeklyTeams[weekNumber].find(t => t.members.some(m => m.id === studentId));
            return team?.name || null;
        }
        return null;
    }, [permanentTeams, weeklyTeams]);

    // Create random teams
    const createRandomTeams = useCallback((students: TeamMember[], size: number): TeamMember[][] => {
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        const teams: TeamMember[][] = [];
        for (let i = 0; i < shuffled.length; i += size) {
            teams.push(shuffled.slice(i, i + size));
        }
        return teams;
    }, []);

    // Handle create teams (permanent or weekly)
    const handleCreateTeam = useCallback(async () => {
        setIsSubmitting(true);
        
        try {
            if (teamFormationMethod === "manual") {
                if (!newTeamName.trim() || selectedTeamMembers.length === 0) {
                    addToast({
                        title: "ข้อมูลไม่ครบ",
                        description: "กรุณากรอกชื่อกลุ่มและเลือกสมาชิก",
                        color: "warning",
                    });
                    setIsSubmitting(false);
                    return;
                }

                // Call API to create single team
                const response = await courseService.createTeam(courseId, {
                    name: newTeamName,
                    group_type: teamCreationType === "permanent" ? "permanent" : "temporary",
                    week_number: teamCreationType === "weekly" ? selectedWeek : undefined,
                    member_ids: selectedTeamMembers,
                });

                if (response.success) {
                    addToast({
                        title: "สำเร็จ",
                        description: "สร้างกลุ่มสำเร็จ",
                        color: "success",
                    });
                    // Refresh teams from backend
                    fetchTeams();
                }
            } else {
                // Random team formation
                const unassigned = getUnassignedStudents(
                    teamCreationType, 
                    teamCreationType === "weekly" ? selectedWeek : undefined
                );
                if (unassigned.length === 0) {
                    addToast({
                        title: "ไม่มีนักศึกษา",
                        description: "นักศึกษาทั้งหมดอยู่ในกลุ่มแล้ว",
                        color: "warning",
                    });
                    setIsSubmitting(false);
                    return;
                }
                
                const randomTeams = createRandomTeams(unassigned, teamSize);
                const existingCount = teamCreationType === "permanent" 
                    ? permanentTeams.length 
                    : (weeklyTeams[selectedWeek]?.length || 0);

                // Call API to bulk create teams
                const teamsData = randomTeams.map((members, idx) => ({
                    name: `กลุ่ม ${existingCount + idx + 1}`,
                    member_ids: members.map(m => m.id),
                }));

                const response = await courseService.bulkCreateTeams(courseId, {
                    teams: teamsData,
                    group_type: teamCreationType === "permanent" ? "permanent" : "temporary",
                    week_number: teamCreationType === "weekly" ? selectedWeek : undefined,
                });

                if (response.success) {
                    addToast({
                        title: "สำเร็จ",
                        description: `สุ่มกลุ่มสำเร็จ ${response.data?.createdCount || teamsData.length} กลุ่ม`,
                        color: "success",
                    });
                    // Refresh teams from backend
                    fetchTeams();
                }
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถสร้างกลุ่มได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
            setIsCreateTeamModalOpen(false);
            setNewTeamName("");
            setSelectedTeamMembers([]);
        }
    }, [teamFormationMethod, newTeamName, selectedTeamMembers, teamCreationType, selectedWeek, teamSize, 
        permanentTeams, weeklyTeams, courseId, fetchTeams, getUnassignedStudents, createRandomTeams]);

    // Open delete team confirmation modal
    const openDeleteTeamModal = useCallback((teamId: number, teamType: "permanent" | "weekly", weekNumber?: number) => {
        let team: PermanentTeam | WeeklyTeam | undefined;
        
        if (teamType === "permanent") {
            team = permanentTeams.find(t => t.id === teamId);
        } else if (weekNumber !== undefined) {
            team = weeklyTeams[weekNumber]?.find(t => t.id === teamId);
        }

        if (team) {
            setDeleteType("team");
            setDeleteTarget({
                teamId: team.id,
                teamName: team.name,
                teamType: teamType,
                weekNumber: weekNumber,
                teamMembers: team.members
            });
            setIsDeleteModalOpen(true);
        }
    }, [permanentTeams, weeklyTeams]);

    // Actually delete team (called after confirmation)
    const confirmDeleteTeam = useCallback(async () => {
        if (!deleteTarget?.teamId || !deleteTarget?.teamType) return;

        const { teamId, teamType } = deleteTarget;
        
        setIsSubmitting(true);
        try {
            const response = await courseService.deleteTeam(courseId, teamId);
            
            if (response.success) {
                addToast({
                    title: "ลบกลุ่มสำเร็จ",
                    description: `ลบ "${deleteTarget.teamName}" เรียบร้อยแล้ว`,
                    color: "success",
                });
                // Refresh teams from backend
                fetchTeams();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถลบกลุ่มได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
            setDeleteType(null);
        }
    }, [deleteTarget, courseId, fetchTeams]);

    // Copy teams from previous week
    const copyTeamsFromPreviousWeek = useCallback(async () => {
        if (selectedWeek <= 1) {
            addToast({
                title: "ไม่สามารถคัดลอก",
                description: "นี่คือสัปดาห์แรก ไม่มีสัปดาห์ก่อนหน้า",
                color: "warning",
            });
            return;
        }
        const prevWeekTeams = weeklyTeams[selectedWeek - 1];
        if (!prevWeekTeams || prevWeekTeams.length === 0) {
            addToast({
                title: "ไม่มีกลุ่ม",
                description: `สัปดาห์ที่ ${selectedWeek - 1} ยังไม่มีกลุ่ม`,
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Copy teams to new week via API
            const teamsData = prevWeekTeams.map((team) => ({
                name: team.name,
                member_ids: team.members.map(m => m.id),
            }));

            const response = await courseService.bulkCreateTeams(courseId, {
                teams: teamsData,
                group_type: 'temporary',
                week_number: selectedWeek,
            });

            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: `คัดลอกกลุ่มจากสัปดาห์ที่ ${selectedWeek - 1} สำเร็จ`,
                    color: "success",
                });
                fetchTeams();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถคัดลอกกลุ่มได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedWeek, weeklyTeams, courseId, fetchTeams]);

    // Clear all teams in current week
    const clearWeeklyTeams = useCallback(async () => {
        const teamsToDelete = weeklyTeams[selectedWeek];
        if (!teamsToDelete || teamsToDelete.length === 0) {
            addToast({
                title: "ไม่มีกลุ่ม",
                description: "ไม่มีกลุ่มในสัปดาห์นี้",
                color: "warning",
            });
            return;
        }

        if (!confirm(`คุณต้องการล้างกลุ่มทั้งหมด ${teamsToDelete.length} กลุ่มในสัปดาห์ที่ ${selectedWeek} ใช่หรือไม่?`)) return;
        
        setIsSubmitting(true);
        try {
            // Delete all teams in current week
            for (const team of teamsToDelete) {
                await courseService.deleteTeam(courseId, team.id);
            }
            addToast({
                title: "สำเร็จ",
                description: "ล้างกลุ่มสำเร็จ",
                color: "success",
            });
            fetchTeams();
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถล้างกลุ่มได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedWeek, weeklyTeams, courseId, fetchTeams]);

    // Filter section students by search query
    const getFilteredSectionStudents = useCallback((sectionId: number) => {
        const students = sectionStudents[sectionId] || [];
        if (!sectionSearchQuery.trim()) return students;
        const query = sectionSearchQuery.toLowerCase();
        return students.filter(s =>
            s.student_id.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    }, [sectionStudents, sectionSearchQuery]);

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
                    <div className="space-y-6">
                        {isOverviewLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <Spinner size="lg" />
                            </div>
                        ) : (
                            <>
                                {/* Row 1: Course Summary & Top Students */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Course Summary */}
                                    <Card className="shadow-sm border border-slate-200">
                                        <CardHeader className="px-5 py-4 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Icon icon="solar:chart-2-bold" className="text-xl text-blue-500" />
                                                <span className="font-semibold text-slate-800">สรุปรายวิชา</span>
                                            </div>
                                        </CardHeader>
                                        <CardBody className="px-5 py-5">
                                            {/* Summary Stats */}
                                            <div className="grid grid-cols-3 gap-4 mb-5">
                                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                                    <p className="text-3xl font-bold text-blue-600">{overview?.summary.totalStudents || 0}</p>
                                                    <p className="text-sm text-slate-600 mt-1">นักศึกษา</p>
                                                </div>
                                                <div className="text-center p-4 bg-amber-50 rounded-xl">
                                                    <p className="text-3xl font-bold text-amber-600">{overview?.summary.totalSections || 0}</p>
                                                    <p className="text-sm text-slate-600 mt-1">กลุ่มเรียน</p>
                                                </div>
                                                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                                                    <p className="text-3xl font-bold text-emerald-600">{overview?.summary.totalTAs || 0}</p>
                                                    <p className="text-sm text-slate-600 mt-1">TA</p>
                                                </div>
                                            </div>
                                            <Divider />
                                            {/* Performance Stats - waiting for assignments */}
                                            <div className="mt-5">
                                                <p className="text-sm font-medium text-slate-700 mb-3">ประสิทธิภาพการส่งงาน</p>
                                                {overview?.summary.totalAssignments && overview.summary.totalAssignments > 0 ? (
                                                    <>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm text-slate-600">อัตราการส่งงาน</span>
                                                            <span className="text-lg font-bold text-blue-600">
                                                                {overview.summary.submissionRate}%
                                                            </span>
                                                        </div>
                                                        <Progress 
                                                            value={overview.summary.submissionRate} 
                                                            color="primary" 
                                                            className="h-3" 
                                                        />
                                                    </>
                                                ) : (
                                                    <div className="text-center py-4 bg-slate-50 rounded-lg">
                                                        <Icon icon="solar:document-text-linear" className="text-3xl text-slate-300 mx-auto mb-2" />
                                                        <p className="text-sm text-slate-500">ยังไม่มีงานที่มอบหมาย</p>
                                                        <p className="text-xs text-slate-400 mt-1">สร้างงานเพื่อดูสถิติการส่งงาน</p>
                                                    </div>
                                                )}
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
                                            {overview?.topStudents && overview.topStudents.length > 0 ? (
                                                <div className="space-y-3">
                                                    {overview.topStudents.map((student, index) => (
                                                        <div key={student.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full ${
                                                                    index === 0 ? "bg-amber-100 text-amber-600" :
                                                                    index === 1 ? "bg-slate-200 text-slate-600" :
                                                                    index === 2 ? "bg-orange-100 text-orange-600" :
                                                                    "bg-blue-100 text-blue-600"
                                                                }`}>
                                                                    #{index + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="font-medium text-slate-700 text-sm">{student.full_name}</p>
                                                                    <p className="text-xs text-slate-400">{student.student_id}</p>
                                                                </div>
                                                            </div>
                                                            <Chip size="sm" color="primary" variant="flat" className="font-semibold">
                                                                {student.totalScore.toFixed(1)}
                                                            </Chip>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Icon icon="solar:document-text-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                                    <p className="text-sm text-slate-500">ยังไม่มีงานที่มอบหมาย</p>
                                                    <p className="text-xs text-slate-400 mt-1">เมื่อมีงานและมีการให้คะแนน ระบบจะแสดงนักศึกษาที่โดดเด่น</p>
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                </div>

                                {/* Row 2: Students Need Attention */}
                                <Card className="shadow-sm border border-slate-200">
                                    <CardHeader className="px-5 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:danger-triangle-bold" className="text-xl text-amber-500" />
                                            <span className="font-semibold text-slate-800">นักศึกษาที่ต้องการความสนใจ</span>
                                            <Chip size="sm" variant="flat" color="warning" className="ml-2">
                                                คะแนนต่ำกว่า 60%
                                            </Chip>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="px-5 py-4">
                                        {overview?.lowPerformers && overview.lowPerformers.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {overview.lowPerformers.map((student) => (
                                                    <div key={student.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-slate-700 text-sm truncate">{student.full_name}</p>
                                                                <p className="text-xs text-slate-400">{student.student_id}</p>
                                                            </div>
                                                            <span className={`text-sm font-bold ${
                                                                (student.percentage || 0) < 30 ? "text-red-500" : "text-amber-500"
                                                            }`}>
                                                                {student.percentage || 0}%
                                                            </span>
                                                        </div>
                                                        <Progress 
                                                            value={student.percentage || 0} 
                                                            color={(student.percentage || 0) < 30 ? "danger" : "warning"} 
                                                            className="h-1.5" 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Icon icon="solar:document-text-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                                <p className="text-sm text-slate-500">ยังไม่มีงานที่มอบหมาย</p>
                                                <p className="text-xs text-slate-400 mt-1">เมื่อมีงานและมีการให้คะแนน ระบบจะแสดงนักศึกษาที่ต้องการความช่วยเหลือ</p>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>

                                {/* Row 3: Assignment Analysis Table */}
                                <Card className="shadow-sm border border-slate-200">
                                    <CardHeader className="px-5 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:document-text-bold" className="text-xl text-blue-500" />
                                            <span className="font-semibold text-slate-800">การวิเคราะห์งานแต่ละชิ้น</span>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="p-0">
                                        {/* TODO: When assignments API is ready, use overview.assignments instead */}
                                        {assignments.length > 0 ? (
                                            <Table removeWrapper aria-label="Assignment analysis table">
                                                <TableHeader>
                                                    <TableColumn>งาน</TableColumn>
                                                    <TableColumn align="center">คะแนนเฉลี่ย</TableColumn>
                                                    <TableColumn align="center">ส่งงานแล้ว</TableColumn>
                                                    <TableColumn align="center">ยังไม่ส่ง</TableColumn>
                                                    <TableColumn align="center">อัตราการส่ง</TableColumn>
                                                </TableHeader>
                                                <TableBody>
                                                    {assignments.map((assignment) => (
                                                        <TableRow key={assignment.id}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium text-slate-800">{assignment.name}</p>
                                                                    <p className="text-xs text-slate-400">คะแนนเต็ม: {assignment.maxScore}</p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-slate-400">-</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip size="sm" color="default" variant="flat">- คน</Chip>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip size="sm" color="default" variant="flat">- คน</Chip>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-slate-400">-</span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="text-center py-12">
                                                <Icon icon="solar:document-text-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                                <p className="text-sm text-slate-400">ยังไม่มีงานที่มอบหมาย</p>
                                                <Button
                                                    size="sm"
                                                    color="primary"
                                                    variant="flat"
                                                    className="mt-3"
                                                    onPress={() => setActiveTab("assignments")}
                                                >
                                                    สร้างงานใหม่
                                                </Button>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>

                                {/* Row 4: TA Activity (Only for Instructor) & Course Info */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* TA Activity - Only visible to instructor */}
                                    {(userRole === "instructor" || userRole === "admin") && (
                                        <Card className="shadow-sm border border-slate-200">
                                            <CardHeader className="px-5 py-4 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <Icon icon="solar:user-hands-bold" className="text-xl text-emerald-500" />
                                                    <span className="font-semibold text-slate-800">กิจกรรม TA</span>
                                                    <Chip size="sm" variant="flat" color="secondary" className="ml-2">
                                                        เฉพาะอาจารย์
                                                    </Chip>
                                                </div>
                                            </CardHeader>
                                            <CardBody className="px-5 py-4">
                                                {overview?.taActivity && overview.taActivity.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {overview.taActivity.map((ta) => (
                                                            <div key={ta.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                                                                <Avatar 
                                                                    name={ta.full_name}
                                                                    src={ta.avatar || undefined}
                                                                    size="md"
                                                                    className="bg-gradient-to-br from-emerald-500 to-teal-600"
                                                                />
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-slate-800">{ta.full_name}</p>
                                                                    <p className="text-xs text-slate-400">{ta.email || "ไม่มีอีเมล"}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    {ta.gradedCount > 0 ? (
                                                                        <>
                                                                            <p className="text-sm font-semibold text-emerald-600">ตรวจงานแล้ว</p>
                                                                            <p className="text-xs text-slate-500">{ta.gradedCount} ชิ้น</p>
                                                                        </>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-400">ยังไม่มีกิจกรรม</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <Icon icon="solar:user-hands-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                                        <p className="text-sm text-slate-400">ยังไม่มีผู้ช่วยสอน</p>
                                                    </div>
                                                )}
                                            </CardBody>
                                        </Card>
                                    )}

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
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-xs text-slate-500 mb-1">รหัสวิชา</p>
                                                    <p className="font-semibold text-slate-800">{course.code}</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-xs text-slate-500 mb-1">ปีการศึกษา</p>
                                                    <p className="font-semibold text-slate-800">{course.year}</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-xs text-slate-500 mb-1">ภาคเรียน</p>
                                                    <p className="font-semibold text-slate-800">
                                                        {course.semester === 3 ? "ภาคฤดูร้อน" : `ภาคเรียนที่ ${course.semester}`}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-xs text-slate-500 mb-1">อาจารย์ผู้สอน</p>
                                                    <p className="font-semibold text-slate-800">{course.instructor?.full_name || "-"}</p>
                                                </div>
                                            </div>
                                            {course.description && (
                                                <>
                                                    <Divider />
                                                    <div>
                                                        <p className="text-xs text-slate-500 mb-2">คำอธิบายรายวิชา</p>
                                                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{course.description}</p>
                                                    </div>
                                                </>
                                            )}
                                            {/* TAs List for TA view */}
                                            {userRole === "ta" && course.tas && course.tas.length > 0 && (
                                                <>
                                                    <Divider />
                                                    <div>
                                                        <p className="text-xs text-slate-500 mb-2">ผู้ช่วยสอนในรายวิชา</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {course.tas.map((ta) => (
                                                                <Chip 
                                                                    key={ta.id}
                                                                    variant="flat"
                                                                    color="success"
                                                                    size="sm"
                                                                >
                                                                    {ta.full_name}
                                                                </Chip>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </CardBody>
                                    </Card>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Sections Tab - Redesigned with Sub-tabs */}
                {activeTab === "sections" && (
                    <div className="space-y-6">
                        {/* Header Card with Sub-tabs */}
                        <Card className="shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-blue-300 p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                            <Icon icon="solar:users-group-rounded-bold-duotone" className="text-3xl text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">จัดการกลุ่มเรียน</h2>
                                            <p className="text-white/80 text-sm">จัดการนักศึกษาและกลุ่มทำงานในรายวิชา</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">{course.sections?.length || 0}</p>
                                            <p className="text-xs text-white/70">กลุ่มเรียน</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/20"></div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">{totalStudents}</p>
                                            <p className="text-xs text-white/70">นักศึกษา</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/20"></div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white">{permanentTeams.length}</p>
                                            <p className="text-xs text-white/70">กลุ่มถาวร</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Sub-tabs Navigation */}
                            <div className="bg-white border-t border-slate-100">
                                <div className="flex">
                                    <button
                                        onClick={() => setSectionSubTab("students")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all border-b-2 ${
                                            sectionSubTab === "students"
                                                ? "text-amber-600 border-amber-500 bg-amber-50/50"
                                                : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Icon icon="solar:users-group-rounded-bold" className="text-xl" />
                                        <span>รายชื่อนักศึกษา</span>
                                        <Chip size="sm" variant="flat" className={sectionSubTab === "students" ? "bg-amber-100 text-amber-700" : "bg-slate-100"}>
                                            {totalStudents}
                                        </Chip>
                                    </button>
                                    <button
                                        onClick={() => setSectionSubTab("permanent")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all border-b-2 ${
                                            sectionSubTab === "permanent"
                                                ? "text-purple-600 border-purple-500 bg-purple-50/50"
                                                : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Icon icon="solar:users-group-two-rounded-bold" className="text-xl" />
                                        <span>กลุ่มถาวร</span>
                                        {permanentTeams.length > 0 && (
                                            <Chip size="sm" variant="flat" className={sectionSubTab === "permanent" ? "bg-purple-100 text-purple-700" : "bg-slate-100"}>
                                                {permanentTeams.length}
                                            </Chip>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setSectionSubTab("weekly")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all border-b-2 ${
                                            sectionSubTab === "weekly"
                                                ? "text-emerald-600 border-emerald-500 bg-emerald-50/50"
                                                : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Icon icon="solar:calendar-bold" className="text-xl" />
                                        <span>กลุ่มรายสัปดาห์</span>
                                        {Object.keys(weeklyTeams).filter(k => weeklyTeams[parseInt(k)]?.length > 0).length > 0 && (
                                            <Chip size="sm" variant="flat" className={sectionSubTab === "weekly" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}>
                                                W{selectedWeek}
                                            </Chip>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {/* Sub-tab: Students (Table View) */}
                        {sectionSubTab === "students" && (
                            <div className="space-y-4">
                                {/* Search & Actions Bar */}
                                <Card className="shadow-sm border border-slate-200">
                                    <CardBody className="py-3 px-4">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    placeholder="ค้นหารหัสหรือชื่อนักศึกษา..."
                                                    value={sectionSearchQuery}
                                                    onValueChange={setSectionSearchQuery}
                                                    startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                                    className="w-72"
                                                    size="md"
                                                    variant="bordered"
                                                    isClearable
                                                    classNames={{
                                                        inputWrapper: "bg-slate-50 border-slate-200"
                                                    }}
                                                />
                                                {/* {sectionSearchQuery && (
                                                    <Button
                                                        size="sm"
                                                        variant="light"
                                                        onPress={() => setSectionSearchQuery("")}
                                                    >
                                                        ล้างการค้นหา
                                                    </Button>
                                                )} */}
                                            </div>
                                            <Button
                                                color="primary"
                                                startContent={<Icon icon="solar:add-circle-bold" />}
                                                onPress={() => setIsAddSectionModalOpen(true)}
                                                className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
                                            >
                                                เพิ่มกลุ่มเรียน
                                            </Button>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Sections with Table */}
                                {course.sections && course.sections.length > 0 ? (
                                    <div className="space-y-4">
                                        {course.sections.map((section, sectionIdx) => (
                                            <Card key={section.id} className="shadow-sm border border-slate-200 overflow-hidden">
                                                {/* Section Header */}
                                                <div 
                                                    className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                                                        expandedSections.includes(section.id)
                                                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                                            : "bg-gradient-to-r from-slate-50 to-slate-100 hover:from-amber-50 hover:to-orange-50"
                                                    }`}
                                                    onClick={() => toggleSection(section.id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {/* <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                                                            expandedSections.includes(section.id)
                                                                ? "bg-white/20 text-white"
                                                                : "bg-amber-500 text-white"
                                                        }`}>
                                                            {section.section_no}
                                                        </div> */}
                                                        <div>
                                                            <p className={`font-semibold ${expandedSections.includes(section.id) ? "text-white" : "text-slate-800"}`}>
                                                                 {section.section_no}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Icon 
                                                                    icon="solar:users-group-rounded-linear" 
                                                                    className={expandedSections.includes(section.id) ? "text-white/70" : "text-slate-400"} 
                                                                />
                                                                <span className={`text-sm ${expandedSections.includes(section.id) ? "text-white/80" : "text-slate-500"}`}>
                                                                    {section.studentCount || 0} นักศึกษา
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <Tooltip content="เพิ่มนักศึกษา">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant={expandedSections.includes(section.id) ? "flat" : "flat"}
                                                                className={expandedSections.includes(section.id) ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"}
                                                                onPress={() => openAddStudentModal(section.id)}
                                                            >
                                                                <Icon icon="solar:user-plus-bold" className="text-lg" />
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip content="ลบกลุ่มเรียน" color="danger">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="flat"
                                                                className={expandedSections.includes(section.id) ? "bg-white/20 text-white hover:bg-red-500" : "bg-red-100 text-red-600"}
                                                                onPress={() => handleRemoveSection(section.id)}
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                                            </Button>
                                                        </Tooltip>
                                                        <div className={`ml-2 p-1 rounded-lg ${expandedSections.includes(section.id) ? "bg-white/20" : "bg-slate-200"}`}>
                                                            <Icon
                                                                icon={expandedSections.includes(section.id) ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                                                                className={`text-xl ${expandedSections.includes(section.id) ? "text-white" : "text-slate-500"}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Student Table (expanded) */}
                                                {expandedSections.includes(section.id) && (
                                                    <CardBody className="p-0 bg-white">
                                                        {getFilteredSectionStudents(section.id).length > 0 ? (
                                                            <Table
                                                                aria-label={`นักศึกษากลุ่ม ${section.section_no}`}
                                                                removeWrapper
                                                                classNames={{
                                                                    th: "bg-slate-50/80 text-slate-600 font-semibold text-xs uppercase tracking-wide",
                                                                    td: "py-3 border-b border-slate-50",
                                                                    tr: "hover:bg-amber-50/50 transition-colors",
                                                                }}
                                                            >
                                                                <TableHeader>
                                                                    <TableColumn width={60}>ลำดับ</TableColumn>
                                                                    <TableColumn width={130}>รหัสนักศึกษา</TableColumn>
                                                                    <TableColumn>ชื่อ-นามสกุล</TableColumn>
                                                                    <TableColumn width={140}>กลุ่มถาวร</TableColumn>
                                                                    <TableColumn width={100}>สถานะ</TableColumn>
                                                                    <TableColumn width={80} align="center">จัดการ</TableColumn>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {getFilteredSectionStudents(section.id).map((student, idx) => (
                                                                        <TableRow key={student.id}>
                                                                            <TableCell>
                                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                                                    <span className="text-sm font-medium text-slate-500">{idx + 1}</span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-700">
                                                                                    {student.student_id}
                                                                                </code>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex items-center gap-3">
                                                                                    <Avatar 
                                                                                        name={student.full_name} 
                                                                                        size="sm" 
                                                                                        className="bg-gradient-to-br from-amber-400 to-orange-500"
                                                                                    />
                                                                                    <span className="font-medium text-slate-800">{student.full_name}</span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {findStudentTeam(student.id, "permanent") ? (
                                                                                    <Chip 
                                                                                        size="sm" 
                                                                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                                                                                        startContent={<Icon icon="solar:users-group-two-rounded-bold" className="text-xs" />}
                                                                                    >
                                                                                        {findStudentTeam(student.id, "permanent")}
                                                                                    </Chip>
                                                                                ) : (
                                                                                    <span className="text-slate-300 text-sm">ยังไม่มีกลุ่ม</span>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Chip 
                                                                                    size="sm" 
                                                                                    variant="dot"
                                                                                    color={student.is_active ? "success" : "default"}
                                                                                    classNames={{
                                                                                        dot: student.is_active ? "bg-green-500" : "bg-slate-300"
                                                                                    }}
                                                                                >
                                                                                    {student.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                                                                                </Chip>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Tooltip content="นำออกจากกลุ่ม" color="danger">
                                                                                    <Button
                                                                                        isIconOnly
                                                                                        size="sm"
                                                                                        variant="light"
                                                                                        color="danger"
                                                                                        onPress={() => openDeleteStudentModal(section.id, student)}
                                                                                    >
                                                                                        <Icon icon="solar:user-minus-bold" className="text-lg" />
                                                                                    </Button>
                                                                                </Tooltip>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : sectionStudents[section.id] && sectionStudents[section.id].length > 0 ? (
                                                            <div className="text-center py-12 bg-slate-50/50">
                                                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                                                    <Icon icon="solar:magnifer-linear" className="text-3xl text-slate-400" />
                                                                </div>
                                                                <p className="text-slate-500 font-medium">ไม่พบนักศึกษาที่ค้นหา</p>
                                                                <p className="text-sm text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาใหม่</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-12 bg-gradient-to-b from-slate-50 to-white">
                                                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
                                                                    <Icon icon="solar:users-group-rounded-bold-duotone" className="text-4xl text-amber-500" />
                                                                </div>
                                                                <p className="text-slate-600 font-medium mb-1">ยังไม่มีนักศึกษาในกลุ่มนี้</p>
                                                                <p className="text-sm text-slate-400 mb-4">เพิ่มนักศึกษาเพื่อเริ่มต้นจัดการกลุ่มเรียน</p>
                                                                <Button
                                                                    color="primary"
                                                                    variant="flat"
                                                                    startContent={<Icon icon="solar:user-plus-bold" />}
                                                                    onPress={() => openAddStudentModal(section.id)}
                                                                    className="bg-amber-100 text-amber-700"
                                                                >
                                                                    เพิ่มนักศึกษา
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </CardBody>
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
                                        <CardBody className="text-center py-16">
                                            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                <Icon icon="solar:notebook-bold-duotone" className="text-5xl text-amber-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีกลุ่มเรียน</h3>
                                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                                สร้างกลุ่มเรียนเพื่อจัดการนักศึกษาในรายวิชานี้
                                            </p>
                                            <Button
                                                color="primary"
                                                size="lg"
                                                startContent={<Icon icon="solar:add-circle-bold" />}
                                                onPress={() => setIsAddSectionModalOpen(true)}
                                                className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
                                            >
                                                เพิ่มกลุ่มเรียนแรก
                                            </Button>
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Sub-tab: Permanent Teams */}
                        {sectionSubTab === "permanent" && (
                            <div className="space-y-4">
                                {/* Action Bar */}
                                <Card className="shadow-sm border border-slate-200">
                                    <CardBody className="py-3 px-4">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <Icon icon="solar:info-circle-bold" className="text-xl text-purple-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-700">กลุ่มถาวร</p>
                                                    <p className="text-sm text-slate-500">กลุ่มที่ใช้ตลอดทั้งเทอม สำหรับโปรเจกต์ระยะยาว</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    color="secondary"
                                                    variant="flat"
                                                    startContent={<Icon icon="solar:shuffle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("permanent");
                                                        setTeamFormationMethod("random");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-purple-100 text-purple-700"
                                                >
                                                    สุ่มกลุ่มอัตโนมัติ
                                                </Button>
                                                <Button
                                                    color="primary"
                                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("permanent");
                                                        setTeamFormationMethod("manual");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25"
                                                >
                                                    สร้างกลุ่มใหม่
                                                </Button>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Teams Grid */}
                                {permanentTeams.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {permanentTeams.map((team, teamIdx) => (
                                            <Card key={team.id} className="shadow-sm border border-slate-200 hover:shadow-lg hover:border-purple-200 transition-all group">
                                                <CardHeader className="px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white">
                                                                {teamIdx + 1}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-white">{team.name}</span>
                                                                <p className="text-xs text-white/70">{team.members.length} สมาชิก</p>
                                                            </div>
                                                        </div>
                                                        <Tooltip content="ลบกลุ่ม" color="danger">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="flat"
                                                                className="bg-white/20 text-white hover:bg-red-500"
                                                                onPress={() => openDeleteTeamModal(team.id, "permanent")}
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-bold" />
                                                            </Button>
                                                        </Tooltip>
                                                    </div>
                                                </CardHeader>
                                                <CardBody className="px-4 py-3">
                                                    <div className="space-y-2">
                                                        {team.members.map((member, idx) => (
                                                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 transition-colors">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-slate-800 truncate">{member.full_name}</p>
                                                                    <p className="text-xs text-slate-400">{member.student_id}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="shadow-sm border border-dashed border-purple-200 bg-purple-50/30">
                                        <CardBody className="text-center py-16">
                                            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                                <Icon icon="solar:users-group-two-rounded-bold-duotone" className="text-5xl text-purple-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีกลุ่มถาวร</h3>
                                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                                สร้างกลุ่มสำหรับโปรเจกต์หรืองานกลุ่มระยะยาวที่ต้องทำงานร่วมกันตลอดเทอม
                                            </p>
                                            <div className="flex items-center justify-center gap-3">
                                                <Button
                                                    variant="flat"
                                                    startContent={<Icon icon="solar:shuffle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("permanent");
                                                        setTeamFormationMethod("random");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-purple-100 text-purple-700"
                                                >
                                                    สุ่มกลุ่มอัตโนมัติ
                                                </Button>
                                                <Button
                                                    color="primary"
                                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("permanent");
                                                        setTeamFormationMethod("manual");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25"
                                                >
                                                    สร้างกลุ่มเอง
                                                </Button>
                                            </div>
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Sub-tab: Weekly Teams */}
                        {sectionSubTab === "weekly" && (
                            <div className="space-y-4">
                                {/* Week Selector Bar */}
                                <Card className="shadow-sm border border-slate-200">
                                    <CardBody className="py-3 px-4">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                                        <Icon icon="solar:calendar-bold" className="text-xl text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-700">สัปดาห์ที่ {selectedWeek}</p>
                                                        <p className="text-sm text-slate-500">
                                                            {weeklyTeams[selectedWeek]?.length || 0} กลุ่ม
                                                        </p>
                                                    </div>
                                                </div>
                                                <Select
                                                    selectedKeys={[selectedWeek.toString()]}
                                                    onSelectionChange={(keys) => {
                                                        const val = Array.from(keys)[0];
                                                        if (val) setSelectedWeek(parseInt(val.toString()));
                                                    }}
                                                    className="w-40"
                                                    size="sm"
                                                    variant="bordered"
                                                >
                                                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                                                        <SelectItem key={week.toString()}>
                                                            สัปดาห์ที่ {week} {weeklyTeams[week]?.length > 0 ? `(${weeklyTeams[week].length} กลุ่ม)` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedWeek > 1 && (
                                                    <Button
                                                        variant="flat"
                                                        size="sm"
                                                        startContent={<Icon icon="solar:copy-bold" />}
                                                        onPress={copyTeamsFromPreviousWeek}
                                                        className="bg-slate-100"
                                                    >
                                                        คัดลอกจาก W{selectedWeek - 1}
                                                    </Button>
                                                )}
                                                {weeklyTeams[selectedWeek]?.length > 0 && (
                                                    <Button
                                                        variant="flat"
                                                        size="sm"
                                                        color="danger"
                                                        startContent={<Icon icon="solar:eraser-bold" />}
                                                        onPress={clearWeeklyTeams}
                                                    >
                                                        ล้างทั้งหมด
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="flat"
                                                    startContent={<Icon icon="solar:shuffle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("weekly");
                                                        setTeamFormationMethod("random");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-emerald-100 text-emerald-700"
                                                >
                                                    สุ่มกลุ่ม
                                                </Button>
                                                <Button
                                                    color="primary"
                                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("weekly");
                                                        setTeamFormationMethod("manual");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
                                                >
                                                    สร้างกลุ่ม
                                                </Button>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Week Navigation Pills */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1">
                                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
                                        const hasTeams = weeklyTeams[week] && weeklyTeams[week].length > 0;
                                        const isSelected = week === selectedWeek;
                                        return (
                                            <button
                                                key={week}
                                                onClick={() => setSelectedWeek(week)}
                                                className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                                                    isSelected
                                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                                                        : hasTeams
                                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                }`}
                                            >
                                                W{week}
                                                {hasTeams && !isSelected && (
                                                    <Icon icon="solar:check-circle-bold" className="ml-1 text-emerald-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Teams Grid */}
                                {weeklyTeams[selectedWeek] && weeklyTeams[selectedWeek].length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {weeklyTeams[selectedWeek].map((team, teamIdx) => (
                                            <Card key={team.id} className="shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-200 transition-all group">
                                                <CardHeader className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white">
                                                                {teamIdx + 1}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-white">{team.name}</span>
                                                                <p className="text-xs text-white/70">{team.members.length} สมาชิก</p>
                                                            </div>
                                                        </div>
                                                        <Tooltip content="ลบกลุ่ม" color="danger">
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="flat"
                                                                className="bg-white/20 text-white hover:bg-red-500"
                                                                onPress={() => openDeleteTeamModal(team.id, "weekly", selectedWeek)}
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-bold" />
                                                            </Button>
                                                        </Tooltip>
                                                    </div>
                                                </CardHeader>
                                                <CardBody className="px-4 py-3">
                                                    <div className="space-y-2">
                                                        {team.members.map((member, idx) => (
                                                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 transition-colors">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-slate-800 truncate">{member.full_name}</p>
                                                                    <p className="text-xs text-slate-400">{member.student_id}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="shadow-sm border border-dashed border-emerald-200 bg-emerald-50/30">
                                        <CardBody className="text-center py-16">
                                            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                                <Icon icon="solar:calendar-bold-duotone" className="text-5xl text-emerald-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีกลุ่มสำหรับสัปดาห์ที่ {selectedWeek}</h3>
                                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                                สร้างกลุ่มใหม่หรือคัดลอกจากสัปดาห์ก่อนหน้าเพื่อเริ่มต้น
                                            </p>
                                            <div className="flex items-center justify-center gap-3">
                                                {selectedWeek > 1 && weeklyTeams[selectedWeek - 1]?.length > 0 && (
                                                    <Button
                                                        variant="flat"
                                                        startContent={<Icon icon="solar:copy-bold" />}
                                                        onPress={copyTeamsFromPreviousWeek}
                                                        className="bg-slate-100"
                                                    >
                                                        คัดลอกจาก W{selectedWeek - 1}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="flat"
                                                    startContent={<Icon icon="solar:shuffle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("weekly");
                                                        setTeamFormationMethod("random");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-emerald-100 text-emerald-700"
                                                >
                                                    สุ่มกลุ่มอัตโนมัติ
                                                </Button>
                                                <Button
                                                    color="primary"
                                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                                    onPress={() => {
                                                        setTeamCreationType("weekly");
                                                        setTeamFormationMethod("manual");
                                                        setIsCreateTeamModalOpen(true);
                                                    }}
                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
                                                >
                                                    สร้างกลุ่มเอง
                                                </Button>
                                            </div>
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
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
                                            size="sm"
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
            <Modal isOpen={isAddStudentModalOpen} onClose={resetAddStudentModal} size="2xl">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Icon icon="solar:user-plus-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มนักศึกษา</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">
                                    {addStudentMode === "select" 
                                        ? "ค้นหานักศึกษาที่ต้องการเพิ่มในกลุ่มเรียน" 
                                        : "วางรายชื่อจาก Excel เพื่อเพิ่มหลายคนพร้อมกัน"
                                    }
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-4">
                            {/* Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                <button
                                    onClick={() => setAddStudentMode("select")}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        addStudentMode === "select"
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <Icon icon="solar:magnifer-linear" />
                                    เลือกจากรายชื่อ
                                </button>
                                <button
                                    onClick={() => setAddStudentMode("paste")}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        addStudentMode === "paste"
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    <Icon icon="solar:clipboard-list-linear" />
                                    วางจาก Excel
                                </button>
                            </div>

                            {/* Select Mode */}
                            {addStudentMode === "select" && (
                                <>
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
                                </>
                            )}

                            {/* Paste Mode */}
                            {addStudentMode === "paste" && (
                                <>
                                    <div>
                                        <label className="text-slate-600 font-medium text-sm mb-2 block">
                                            วางรหัสนักศึกษาจาก Excel
                                        </label>
                                        <p className="text-xs text-slate-400 mb-2">
                                            คัดลอกคอลัมน์รหัสนักศึกษาจาก Excel แล้ววางที่นี่ (หนึ่งรหัสต่อหนึ่งบรรทัด)
                                        </p>
                                        <textarea
                                            value={excelPasteData}
                                            onChange={(e) => {
                                                setExcelPasteData(e.target.value);
                                                parseExcelData(e.target.value);
                                            }}
                                            placeholder={"63302000-1\n63302000-2\n63302000-3\n..."}
                                            className="w-full h-32 px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none bg-white"
                                        />
                                    </div>

                                    {/* Parse Results */}
                                    {parsedStudents.length > 0 && (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                <p className="text-sm text-slate-600">
                                                    ผลการตรวจสอบ ({parsedStudents.length} รายการ)
                                                </p>
                                                <div className="flex gap-2 text-xs">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                        พบ {parsedStudents.filter(p => p.status === "matched").length}
                                                    </span>
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                                        มีอยู่แล้ว {parsedStudents.filter(p => p.status === "already_enrolled").length}
                                                    </span>
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                                        ไม่พบ {parsedStudents.filter(p => p.status === "not_found").length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {parsedStudents.map((result, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 ${
                                                            result.status === "matched" ? "bg-green-50" :
                                                            result.status === "already_enrolled" ? "bg-amber-50" : "bg-red-50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {result.matchedStudent ? (
                                                                <>
                                                                    <Avatar name={result.matchedStudent.full_name} size="sm" className={
                                                                        result.status === "matched" ? "bg-green-500" : "bg-amber-500"
                                                                    } />
                                                                    <div>
                                                                        <p className="font-medium text-slate-800">{result.matchedStudent.full_name}</p>
                                                                        <p className="text-sm text-slate-500">{result.matchedStudent.student_id}</p>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
                                                                        <Icon icon="solar:question-circle-linear" className="text-red-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-slate-800">{result.inputValue}</p>
                                                                        <p className="text-sm text-red-500">ไม่พบในระบบ</p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div>
                                                            {result.status === "matched" && (
                                                                <span className="text-xs px-2 py-1 bg-green-200 text-green-700 rounded-full flex items-center gap-1">
                                                                    <Icon icon="solar:check-circle-bold" className="text-sm" />
                                                                    พร้อมเพิ่ม
                                                                </span>
                                                            )}
                                                            {result.status === "already_enrolled" && (
                                                                <span className="text-xs px-2 py-1 bg-amber-200 text-amber-700 rounded-full flex items-center gap-1">
                                                                    <Icon icon="solar:info-circle-bold" className="text-sm" />
                                                                    มีอยู่แล้ว
                                                                </span>
                                                            )}
                                                            {result.status === "not_found" && (
                                                                <span className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded-full flex items-center gap-1">
                                                                    <Icon icon="solar:close-circle-bold" className="text-sm" />
                                                                    ไม่พบ
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button variant="light" onPress={resetAddStudentModal}>
                            ยกเลิก
                        </Button>
                        {addStudentMode === "select" ? (
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
                        ) : (
                            <Button
                                color="primary"
                                onPress={handleBulkAddStudents}
                                isLoading={isSubmitting}
                                isDisabled={parsedStudents.filter(p => p.status === "matched").length === 0}
                                className="bg-blue-500"
                                startContent={!isSubmitting && <Icon icon="solar:users-group-rounded-bold" />}
                            >
                                เพิ่ม {parsedStudents.filter(p => p.status === "matched").length} คน
                            </Button>
                        )}
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

            {/* Create Team Modal */}
            <Modal 
                isOpen={isCreateTeamModalOpen} 
                onClose={resetTeamModal} 
                size="xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl shadow-lg ${
                                teamCreationType === "permanent" 
                                    ? "bg-gradient-to-br from-purple-500 to-indigo-600" 
                                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                            }`}>
                                <Icon icon="solar:users-group-two-rounded-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {teamFormationMethod === "random" 
                                        ? "สุ่มกลุ่มอัตโนมัติ"
                                        : `สร้าง${teamCreationType === "permanent" ? "กลุ่มถาวร" : "กลุ่มรายสัปดาห์"}ใหม่`
                                    }
                                </h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">
                                    {teamFormationMethod === "random"
                                        ? `สุ่มจับกลุ่ม${teamCreationType === "permanent" ? "ถาวร" : `สัปดาห์ที่ ${selectedWeek}`}`
                                        : teamCreationType === "permanent" 
                                            ? "กลุ่มที่ใช้ตลอดทั้งเทอม" 
                                            : `กลุ่มสำหรับสัปดาห์ที่ ${selectedWeek}`
                                    }
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-5">
                            {/* Section Filter */}
                            <div>
                                <label className="text-slate-600 font-medium text-sm mb-2 block">จากกลุ่มเรียน</label>
                                <Select
                                    selectedKeys={[selectedSectionForTeam.toString()]}
                                    onSelectionChange={(keys) => {
                                        const val = Array.from(keys)[0];
                                        if (val) {
                                            setSelectedSectionForTeam(val === "all" ? "all" : parseInt(val.toString()));
                                            setSelectedTeamMembers([]);
                                        }
                                    }}
                                    variant="bordered"
                                    className="max-w-xs"
                                    items={[
                                        { key: "all", label: "ทุกกลุ่มเรียน" },
                                        ...(course?.sections || []).map((section) => ({
                                            key: section.id.toString(),
                                            label: `กลุ่มเรียน ${section.section_no} (${section.studentCount || 0} คน)`
                                        }))
                                    ]}
                                >
                                    {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                                </Select>
                            </div>

                            {teamFormationMethod === "manual" ? (
                                <>
                                    {/* Team Name */}
                                    <Input
                                        label="ชื่อกลุ่ม"
                                        labelPlacement="outside"
                                        placeholder="เช่น กลุ่ม 1, กลุ่ม A, ทีม Alpha"
                                        variant="bordered"
                                        size="lg"
                                        value={newTeamName}
                                        onValueChange={setNewTeamName}
                                        isRequired
                                        classNames={{
                                            inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                            label: "text-slate-600 font-medium text-sm",
                                        }}
                                    />

                                    {/* Member Selection Mode Toggle */}
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            onClick={() => {
                                                setTeamMemberMode("select");
                                                setTeamExcelPasteData("");
                                                setParsedTeamMembers([]);
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                teamMemberMode === "select"
                                                    ? `bg-white shadow-sm ${teamCreationType === "permanent" ? "text-purple-600" : "text-emerald-600"}`
                                                    : "text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            <Icon icon="solar:checklist-linear" />
                                            เลือกจากรายชื่อ
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTeamMemberMode("paste");
                                                setSelectedTeamMembers([]);
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                teamMemberMode === "paste"
                                                    ? `bg-white shadow-sm ${teamCreationType === "permanent" ? "text-purple-600" : "text-emerald-600"}`
                                                    : "text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            <Icon icon="solar:clipboard-list-linear" />
                                            วางจาก Excel
                                        </button>
                                    </div>

                                    {/* Select Mode - Member Selection */}
                                    {teamMemberMode === "select" && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-slate-600 font-medium text-sm">
                                                    เลือกสมาชิก ({selectedTeamMembers.length} คน)
                                                </label>
                                                {selectedTeamMembers.length > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={() => setSelectedTeamMembers([])}
                                                    >
                                                        ล้างทั้งหมด
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                                    <p className="text-sm text-slate-600">
                                                        นักศึกษาที่ยังไม่อยู่ในกลุ่ม: {getUnassignedStudents(teamCreationType, teamCreationType === "weekly" ? selectedWeek : undefined).length} คน
                                                    </p>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {getUnassignedStudents(teamCreationType, teamCreationType === "weekly" ? selectedWeek : undefined).length > 0 ? (
                                                        getUnassignedStudents(teamCreationType, teamCreationType === "weekly" ? selectedWeek : undefined).map((student) => (
                                                            <div
                                                                key={student.id}
                                                                onClick={() => {
                                                                    if (selectedTeamMembers.includes(student.id)) {
                                                                        setSelectedTeamMembers(prev => prev.filter(id => id !== student.id));
                                                                    } else {
                                                                        setSelectedTeamMembers(prev => [...prev, student.id]);
                                                                    }
                                                                }}
                                                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${
                                                                    selectedTeamMembers.includes(student.id)
                                                                        ? teamCreationType === "permanent" 
                                                                            ? "bg-purple-50 border-l-4 border-l-purple-500"
                                                                            : "bg-emerald-50 border-l-4 border-l-emerald-500"
                                                                        : "hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar name={student.full_name} size="sm" className={
                                                                        teamCreationType === "permanent" ? "bg-purple-500" : "bg-emerald-500"
                                                                    } />
                                                                    <div>
                                                                        <p className="font-medium text-slate-800">{student.full_name}</p>
                                                                        <p className="text-sm text-slate-500">{student.student_id}</p>
                                                                    </div>
                                                                </div>
                                                                {selectedTeamMembers.includes(student.id) && (
                                                                    <Icon icon="solar:check-circle-bold" className={`text-xl ${
                                                                        teamCreationType === "permanent" ? "text-purple-500" : "text-emerald-500"
                                                                    }`} />
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <Icon icon="solar:users-group-rounded-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                                            <p className="text-slate-400">นักศึกษาทั้งหมดอยู่ในกลุ่มแล้ว</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Paste Mode - Excel Paste */}
                                    {teamMemberMode === "paste" && (
                                        <>
                                            <div>
                                                <label className="text-slate-600 font-medium text-sm mb-2 block">
                                                    วางรหัสนักศึกษาจาก Excel
                                                </label>
                                                <p className="text-xs text-slate-400 mb-2">
                                                    คัดลอกคอลัมน์รหัสนักศึกษาจาก Excel แล้ววางที่นี่ (หนึ่งรหัสต่อหนึ่งบรรทัด)
                                                </p>
                                                <textarea
                                                    value={teamExcelPasteData}
                                                    onChange={(e) => {
                                                        setTeamExcelPasteData(e.target.value);
                                                        parseTeamExcelData(e.target.value);
                                                    }}
                                                    placeholder={"64070001\n64070002\n64070003\n..."}
                                                    className={`w-full h-28 px-4 py-3 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 resize-none bg-white ${
                                                        teamCreationType === "permanent" 
                                                            ? "border-purple-200 focus:ring-purple-400" 
                                                            : "border-emerald-200 focus:ring-emerald-400"
                                                    }`}
                                                />
                                            </div>

                                            {/* Parse Results */}
                                            {parsedTeamMembers.length > 0 && (
                                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                        <p className="text-sm text-slate-600">
                                                            ผลการตรวจสอบ ({parsedTeamMembers.length} รายการ)
                                                        </p>
                                                        <div className="flex gap-2 text-xs">
                                                            <span className={`px-2 py-1 rounded-full ${
                                                                teamCreationType === "permanent" 
                                                                    ? "bg-purple-100 text-purple-700" 
                                                                    : "bg-emerald-100 text-emerald-700"
                                                            }`}>
                                                                พบ {parsedTeamMembers.filter(p => p.status === "matched").length}
                                                            </span>
                                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                                                มีกลุ่มแล้ว {parsedTeamMembers.filter(p => p.status === "already_in_team").length}
                                                            </span>
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                                                ไม่พบ {parsedTeamMembers.filter(p => p.status === "not_found").length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {parsedTeamMembers.map((result, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 ${
                                                                    result.status === "matched" 
                                                                        ? teamCreationType === "permanent" ? "bg-purple-50" : "bg-emerald-50"
                                                                        : result.status === "already_in_team" ? "bg-amber-50" : "bg-red-50"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {result.matchedStudent ? (
                                                                        <>
                                                                            <Avatar name={result.matchedStudent.full_name} size="sm" className={
                                                                                result.status === "matched" 
                                                                                    ? teamCreationType === "permanent" ? "bg-purple-500" : "bg-emerald-500"
                                                                                    : "bg-amber-500"
                                                                            } />
                                                                            <div>
                                                                                <p className="font-medium text-slate-800">{result.matchedStudent.full_name}</p>
                                                                                <p className="text-sm text-slate-500">{result.matchedStudent.student_id}</p>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
                                                                                <Icon icon="solar:question-circle-linear" className="text-red-600" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-slate-800">{result.inputValue}</p>
                                                                                <p className="text-sm text-red-500">ไม่พบในระบบ</p>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {result.status === "matched" && (
                                                                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                                                            teamCreationType === "permanent"
                                                                                ? "bg-purple-200 text-purple-700"
                                                                                : "bg-emerald-200 text-emerald-700"
                                                                        }`}>
                                                                            <Icon icon="solar:check-circle-bold" className="text-sm" />
                                                                            พร้อมเพิ่ม
                                                                        </span>
                                                                    )}
                                                                    {result.status === "already_in_team" && (
                                                                        <span className="text-xs px-2 py-1 bg-amber-200 text-amber-700 rounded-full flex items-center gap-1">
                                                                            <Icon icon="solar:info-circle-bold" className="text-sm" />
                                                                            มีกลุ่มแล้ว
                                                                        </span>
                                                                    )}
                                                                    {result.status === "not_found" && (
                                                                        <span className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded-full flex items-center gap-1">
                                                                            <Icon icon="solar:close-circle-bold" className="text-sm" />
                                                                            ไม่พบ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Random Formation Settings */}
                                    <div>
                                        <label className="text-slate-600 font-medium text-sm mb-2 block">จำนวนสมาชิกต่อกลุ่ม</label>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                onPress={() => setTeamSize(prev => Math.max(2, prev - 1))}
                                            >
                                                <Icon icon="solar:minus-circle-linear" />
                                            </Button>
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                                                teamCreationType === "permanent" 
                                                    ? "bg-purple-50 border-purple-200" 
                                                    : "bg-emerald-50 border-emerald-200"
                                            }`}>
                                                <Icon icon="solar:users-group-rounded-linear" className={
                                                    teamCreationType === "permanent" ? "text-purple-500" : "text-emerald-500"
                                                } />
                                                <span className="font-bold text-lg text-slate-800">{teamSize}</span>
                                                <span className="text-slate-500 text-sm">คน</span>
                                            </div>
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                onPress={() => setTeamSize(prev => Math.min(10, prev + 1))}
                                            >
                                                <Icon icon="solar:add-circle-linear" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <Card className={`shadow-sm border ${
                                        teamCreationType === "permanent" 
                                            ? "border-purple-100 bg-purple-50/50" 
                                            : "border-emerald-100 bg-emerald-50/50"
                                    }`}>
                                        <CardBody className="py-3 px-4">
                                            <div className="flex items-start gap-3">
                                                <Icon icon="solar:info-circle-bold" className={`text-xl mt-0.5 ${
                                                    teamCreationType === "permanent" ? "text-purple-500" : "text-emerald-500"
                                                }`} />
                                                <div>
                                                    <p className={`font-medium ${
                                                        teamCreationType === "permanent" ? "text-purple-800" : "text-emerald-800"
                                                    }`}>ตัวอย่างการจับกลุ่ม</p>
                                                    <p className={`text-sm ${
                                                        teamCreationType === "permanent" ? "text-purple-600" : "text-emerald-600"
                                                    }`}>
                                                        {(() => {
                                                            const unassigned = getUnassignedStudents(teamCreationType, teamCreationType === "weekly" ? selectedWeek : undefined);
                                                            const numTeams = Math.ceil(unassigned.length / teamSize);
                                                            const remainder = unassigned.length % teamSize;
                                                            if (unassigned.length === 0) {
                                                                return "ไม่มีนักศึกษาที่ยังไม่อยู่ในกลุ่ม";
                                                            }
                                                            return `นักศึกษา ${unassigned.length} คน จะถูกแบ่งเป็น ${numTeams} กลุ่ม ${
                                                                remainder > 0 ? `(${numTeams - 1} กลุ่ม ${teamSize} คน และ 1 กลุ่ม ${remainder} คน)` : `(กลุ่มละ ${teamSize} คน)`
                                                            }`;
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                </>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button 
                            variant="light" 
                            onPress={resetTeamModal}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color={teamCreationType === "permanent" ? "secondary" : "success"}
                            onPress={handleCreateTeam}
                            isLoading={isSubmitting}
                            className={teamCreationType === "permanent" ? "bg-purple-500" : "bg-emerald-500"}
                            startContent={!isSubmitting && <Icon icon={teamFormationMethod === "random" ? "solar:shuffle-bold" : "solar:add-circle-bold"} />}
                        >
                            {teamFormationMethod === "random" 
                                ? "สุ่มกลุ่ม" 
                                : `สร้างกลุ่ม${selectedTeamMembers.length > 0 ? ` (${selectedTeamMembers.length} คน)` : ""}`
                            }
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteTarget(null);
                    setDeleteType(null);
                }}
                size="lg"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                                <Icon icon="solar:danger-triangle-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {deleteType === "student" ? "นำนักศึกษาออกจากวิชา" : "ลบกลุ่ม"}
                                </h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">
                                    กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        {deleteType === "student" && deleteTarget && (
                            <div className="space-y-4">
                                {/* Student Info */}
                                <Card className="border border-red-100 bg-red-50/50">
                                    <CardBody className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar 
                                                name={deleteTarget.studentName} 
                                                size="lg" 
                                                className="bg-red-500"
                                            />
                                            <div>
                                                <p className="font-semibold text-lg text-slate-800">
                                                    {deleteTarget.studentName}
                                                </p>
                                                <p className="text-sm text-slate-500 font-mono">
                                                    {deleteTarget.studentCode}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    กลุ่มเรียน {deleteTarget.sectionNo}
                                                </p>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Team Info */}
                                {(() => {
                                    const teamInfo = getStudentTeamInfo(deleteTarget.studentId!);
                                    const hasTeams = teamInfo.permanentTeam || teamInfo.weeklyTeams.length > 0;
                                    
                                    if (hasTeams) {
                                        return (
                                            <Card className="border border-amber-200 bg-amber-50">
                                                <CardBody className="py-3 px-4">
                                                    <div className="flex items-start gap-3">
                                                        <Icon icon="solar:info-circle-bold" className="text-xl text-amber-600 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-amber-800">นักศึกษาอยู่ในกลุ่มต่อไปนี้</p>
                                                            <div className="mt-2 space-y-1">
                                                                {teamInfo.permanentTeam && (
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <Chip size="sm" className="bg-purple-100 text-purple-700">
                                                                            กลุ่มถาวร
                                                                        </Chip>
                                                                        <span className="text-slate-700">{teamInfo.permanentTeam}</span>
                                                                    </div>
                                                                )}
                                                                {teamInfo.weeklyTeams.map((wt, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                                                        <Chip size="sm" className="bg-emerald-100 text-emerald-700">
                                                                            สัปดาห์ที่ {wt.weekNumber}
                                                                        </Chip>
                                                                        <span className="text-slate-700">{wt.teamName}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <p className="text-xs text-amber-600 mt-2">
                                                                * หากลบนักศึกษา จะถูกนำออกจากกลุ่มเหล่านี้ด้วย
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Score Info */}
                                <Card className="border border-blue-200 bg-blue-50">
                                    <CardBody className="py-3 px-4">
                                        <div className="flex items-start gap-3">
                                            <Icon icon="solar:diploma-verified-bold" className="text-xl text-blue-600 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-blue-800">เกี่ยวกับคะแนน</p>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    คะแนนที่เคยลงให้นักศึกษาคนนี้จะยังคงอยู่ในระบบ และจะแสดงเป็น 
                                                    <span className="font-medium"> &quot;นักศึกษาที่ถูกนำออก&quot; </span>
                                                    ในหน้าคะแนน
                                                </p>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Warning */}
                                <div className="p-4 bg-red-100 rounded-xl border border-red-200">
                                    <div className="flex items-center gap-3">
                                        <Icon icon="solar:shield-warning-bold" className="text-2xl text-red-600" />
                                        <div>
                                            <p className="font-semibold text-red-800">
                                                คุณต้องการนำนักศึกษาออกใช่หรือไม่?
                                            </p>
                                            <p className="text-sm text-red-600">
                                                การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {deleteType === "team" && deleteTarget && (
                            <div className="space-y-4">
                                {/* Team Info */}
                                <Card className={`border ${
                                    deleteTarget.teamType === "permanent" 
                                        ? "border-purple-200 bg-purple-50" 
                                        : "border-emerald-200 bg-emerald-50"
                                }`}>
                                    <CardBody className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                deleteTarget.teamType === "permanent"
                                                    ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                                                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                                            }`}>
                                                <Icon icon="solar:users-group-two-rounded-bold" className="text-2xl text-white" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg text-slate-800">
                                                    {deleteTarget.teamName}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {deleteTarget.teamType === "permanent" 
                                                        ? "กลุ่มถาวร" 
                                                        : `กลุ่มรายสัปดาห์ (สัปดาห์ที่ ${deleteTarget.weekNumber})`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Members */}
                                {deleteTarget.teamMembers && deleteTarget.teamMembers.length > 0 && (
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                            <p className="text-sm font-medium text-slate-600">
                                                สมาชิกในกลุ่ม ({deleteTarget.teamMembers.length} คน)
                                            </p>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto">
                                            {deleteTarget.teamMembers.map((member) => (
                                                <div key={member.id} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0">
                                                    <Avatar name={member.full_name} size="sm" className={
                                                        deleteTarget.teamType === "permanent" ? "bg-purple-500" : "bg-emerald-500"
                                                    } />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{member.full_name}</p>
                                                        <p className="text-xs text-slate-400">{member.student_id}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Info */}
                                <Card className="border border-blue-200 bg-blue-50">
                                    <CardBody className="py-3 px-4">
                                        <div className="flex items-start gap-3">
                                            <Icon icon="solar:info-circle-bold" className="text-xl text-blue-600 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-blue-800">สิ่งที่จะเกิดขึ้น</p>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    สมาชิกทุกคนในกลุ่มจะกลับไปเป็นนักศึกษาที่ยังไม่มีกลุ่ม 
                                                    และสามารถจัดกลุ่มใหม่ได้
                                                </p>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>

                                {/* Warning */}
                                <div className="p-4 bg-red-100 rounded-xl border border-red-200">
                                    <div className="flex items-center gap-3">
                                        <Icon icon="solar:shield-warning-bold" className="text-2xl text-red-600" />
                                        <div>
                                            <p className="font-semibold text-red-800">
                                                คุณต้องการลบกลุ่มนี้ใช่หรือไม่?
                                            </p>
                                            <p className="text-sm text-red-600">
                                                การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button 
                            variant="light" 
                            onPress={() => {
                                setIsDeleteModalOpen(false);
                                setDeleteTarget(null);
                                setDeleteType(null);
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="danger"
                            onPress={deleteType === "student" ? confirmRemoveStudent : confirmDeleteTeam}
                            isLoading={isSubmitting}
                            className="bg-red-500"
                            startContent={!isSubmitting && <Icon icon="solar:trash-bin-trash-bold" />}
                        >
                            {deleteType === "student" ? "นำนักศึกษาออก" : "ลบกลุ่ม"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}