"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/student.service";
import { authService } from "@/services/auth.service";
import assignmentService from "@/services/assignment.service";
import scoreService from "@/services/score.service";
import type { Assignment as AssignmentType, AssignmentSubItem } from "@/services/assignment.service";
import type { Course, TA, SectionStudent, CourseOverview, Team, TeamMember as ServiceTeamMember } from "@/services/course.service";
import type { Student } from "@/services/student.service";
import type { StudentScore, ScoresData, Group } from "@/services/score.service";

// Import components
import {
    OverviewTab,
    SectionsTab,
    PeopleTab,
    AssignmentsTab,
    ScoresTab,
    ScoreModal,
    OverviewSkeleton,
    TeamsGridSkeleton,
} from "./components";


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
    const [isOverviewLoading, setIsOverviewLoading] = useState(true);

    // Progressive loading states - แยก loading state แต่ละส่วน
    const [isTeamsLoading, setIsTeamsLoading] = useState(true);
    const [isPeopleLoading, setIsPeopleLoading] = useState(true); // สำหรับ TAs list
    const [isStudentsLoading, setIsStudentsLoading] = useState(true); // สำหรับ students list

    // Section states
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionNo, setNewSectionNo] = useState("");
    const [newSectionNote, setNewSectionNote] = useState("");
    const [sectionSubTab, setSectionSubTab] = useState<"students" | "permanent" | "weekly">("students");
    const [sectionSearchQuery, setSectionSearchQuery] = useState("");

    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

    // Bulk delete teams modal state
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Bulk add students (Excel paste) states
    const [addStudentMode, setAddStudentMode] = useState<"select" | "paste">("select");
    const [excelPasteData, setExcelPasteData] = useState("");
    const [parsedStudents, setParsedStudents] = useState<Array<{
        inputValue: string;
        matchedStudent: typeof studentsList[0] | null;
        status: "matched" | "not_found" | "already_enrolled";
    }>>([]);

    // Assignment states - using API types
    interface LocalSubItem {
        id?: number;
        name: string;
        max_score: number;
    }
    const [assignments, setAssignments] = useState<AssignmentType[]>([]);
    const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
    const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState<{
        name: string;
        assignment_type: "individual" | "permanent_group" | "weekly_group";
        week_number?: number;
        hasSubItems: boolean;
        subItems: LocalSubItem[];
        maxScore: number;
        dueDate: string;
        description: string;
    }>({
        name: "",
        assignment_type: "individual",
        hasSubItems: false,
        subItems: [],
        maxScore: 10,
        dueDate: "",
        description: "",
    });
    const [expandedAssignments, setExpandedAssignments] = useState<number[]>([]);
    const [editingAssignment, setEditingAssignment] = useState<AssignmentType | null>(null);

    // Scores Tab States
    const [selectedAssignmentForScore, setSelectedAssignmentForScore] = useState<AssignmentType | null>(null);
    const [scoresData, setScoresData] = useState<ScoresData | null>(null);
    const [isScoresLoading, setIsScoresLoading] = useState(false);
    const [scoreSearchQuery, setScoreSearchQuery] = useState("");
    const [scoreEntries, setScoreEntries] = useState<Record<string, number | "">>({});
    const [isSavingScores, setIsSavingScores] = useState(false);
    const [groupsForScore, setGroupsForScore] = useState<Group[]>([]);
    const [selectedGroupForScore, setSelectedGroupForScore] = useState<Group | null>(null);
    const [isGroupScoreModalOpen, setIsGroupScoreModalOpen] = useState(false);
    const [groupScoreValue, setGroupScoreValue] = useState<number>(0);
    const [groupSubItemScores, setGroupSubItemScores] = useState<Record<number, number>>({});
    
    // New Score Modal State
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const [scoreModalAssignment, setScoreModalAssignment] = useState<AssignmentType | null>(null);

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
    const fetchTAsList = useCallback(async () => {
        setIsPeopleLoading(true);
        try {
            const response = await courseService.getTAsList();
            if (response.success && response.data) {
                setTasList(response.data);
                console.log("Fetched TAs:", response.data);
            }
        } catch (error) {
            console.error("Error fetching TAs:", error);
        } finally {
            setIsPeopleLoading(false);
        }
    }, []);

    // Fetch students list for dropdown
    const fetchStudentsList = useCallback(async () => {
        setIsStudentsLoading(true);
        try {
            const response = await studentService.getStudents({ limit: 1000, status: "active" });
            if (response.success && response.data) {
                setStudentsList(response.data.students);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setIsStudentsLoading(false);
        }
    }, []);

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
        setIsTeamsLoading(true);
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
        } finally {
            setIsTeamsLoading(false);
        }
    }, [courseId]);

    // Fetch assignments from API
    const fetchAssignments = useCallback(async () => {
        if (!courseId) return;
        
        setIsAssignmentsLoading(true);
        try {
            // courseId is already a string (nanoid format)
            const data = await assignmentService.getAssignments(courseId);
            setAssignments(data);
        } catch (error) {
            console.error("Error fetching assignments:", error);
        } finally {
            setIsAssignmentsLoading(false);
        }
    }, [courseId]);

    // Fetch scores for selected assignment
    const fetchScoresForAssignment = useCallback(async (assignment: AssignmentType) => {
        setIsScoresLoading(true);
        try {
            const data = await scoreService.getScores(assignment.id);
            setScoresData(data);
            // Initialize score entries from existing scores
            const entries: Record<string, number | ""> = {};
            if (data && data.student_scores) {
                data.student_scores.forEach(studentScore => {
                    const key = `${studentScore.student.id}`;
                    entries[key] = studentScore.score !== null && studentScore.score !== undefined ? studentScore.score : "";
                });
            }
            setScoreEntries(entries);

            // Fetch groups if this is a group assignment
            if (assignment.assignment_type !== "individual") {
                const groups = await scoreService.getGroupsForAssignment(assignment.id);
                setGroupsForScore(groups);
            } else {
                setGroupsForScore([]);
            }
        } catch (error) {
            console.error("Error fetching scores:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลคะแนนได้",
                color: "danger",
            });
        } finally {
            setIsScoresLoading(false);
        }
    }, []);

    // Save individual score
    const saveScore = async (studentId: number, score: number) => {
        if (!selectedAssignmentForScore) return;
        try {
            await scoreService.submitScore({
                assignment_id: selectedAssignmentForScore.id,
                student_id: studentId,
                score,
            });
            addToast({
                title: "บันทึกแล้ว",
                description: "บันทึกคะแนนเรียบร้อย",
                color: "success",
            });
        } catch (error) {
            console.error("Error saving score:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกคะแนนได้",
                color: "danger",
            });
        }
    };

    // Save all scores
    const saveAllScores = async () => {
        if (!selectedAssignmentForScore || !scoresData) return;
        setIsSavingScores(true);
        try {
            const scores: { student_id: number; score: number; comment?: string }[] = [];
            
            scoresData.student_scores.forEach(studentScore => {
                const student = studentScore.student;
                const key = `${student.id}`;
                const scoreValue = scoreEntries[key];
                if (scoreValue !== "" && scoreValue !== undefined) {
                    scores.push({
                        student_id: student.id,
                        score: Number(scoreValue),
                    });
                }
            });

            if (scores.length > 0) {
                await scoreService.submitBulkScores({
                    assignment_id: selectedAssignmentForScore.id,
                    scores,
                });
                addToast({
                    title: "บันทึกแล้ว",
                    description: `บันทึกคะแนนทั้งหมด ${scores.length} รายการเรียบร้อย`,
                    color: "success",
                });
                // Refresh scores
                fetchScoresForAssignment(selectedAssignmentForScore);
            }
        } catch (error) {
            console.error("Error saving all scores:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกคะแนนได้",
                color: "danger",
            });
        } finally {
            setIsSavingScores(false);
        }
    };

    // Save group score
    const saveGroupScore = async () => {
        if (!selectedAssignmentForScore || !selectedGroupForScore) return;
        setIsSavingScores(true);
        try {
            await scoreService.submitGroupScore({
                assignment_id: selectedAssignmentForScore.id,
                group_id: selectedGroupForScore.id,
                score: groupScoreValue,
            });
            addToast({
                title: "บันทึกแล้ว",
                description: `บันทึกคะแนนกลุ่ม ${selectedGroupForScore.name} เรียบร้อย`,
                color: "success",
            });
            setIsGroupScoreModalOpen(false);
            fetchScoresForAssignment(selectedAssignmentForScore);
        } catch (error) {
            console.error("Error saving group score:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกคะแนนกลุ่มได้",
                color: "danger",
            });
        } finally {
            setIsSavingScores(false);
        }
    };

    // Initial data loading - fetch all data in parallel
    useEffect(() => {
        // เรียกทุก API พร้อมกัน แต่ละตัวจัดการ loading state ของตัวเอง
        fetchCourse();
        fetchOverview();
        fetchTAsList();
        fetchStudentsList();
        fetchTeams(); // เรียกเลยไม่ต้องรอ course
        fetchAssignments(); // เรียก assignments

        // Fetch user role
        const fetchUserRole = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                setUserRole(user.role);
            }
        };
        fetchUserRole();
    }, [fetchCourse, fetchOverview, fetchTAsList, fetchStudentsList, fetchTeams, fetchAssignments]);

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
            if (response.success && response.data) {
                // อัปเดต local state แทนการรีโหลดทั้งหน้า
                const newSection = response.data;
                setCourse(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        sections: [...(prev.sections || []), {
                            id: newSection.id,
                            course_id: courseId,
                            section_no: newSection.section_no,
                            note: newSection.note,
                            created_at: newSection.created_at,
                            studentCount: 0
                        }]
                    };
                });
                addToast({
                    title: "สำเร็จ",
                    description: "เพิ่มกลุ่มเรียนสำเร็จ",
                    color: "success",
                });
                setIsAddSectionModalOpen(false);
                setNewSectionNo("");
                setNewSectionNote("");
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
                // อัปเดต local state แทนการรีโหลดทั้งหน้า
                setCourse(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        sections: prev.sections?.filter(s => s.id !== sectionId) || []
                    };
                });
                // ลบ students ของ section นี้ออกจาก state ด้วย
                setSectionStudents(prev => {
                    const updated = { ...prev };
                    delete updated[sectionId];
                    return updated;
                });
                // ลบออกจาก expanded sections
                setExpandedSections(prev => prev.filter(id => id !== sectionId));
                addToast({
                    title: "สำเร็จ",
                    description: "ลบกลุ่มเรียนสำเร็จ",
                    color: "success",
                });
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
            if (response.success && response.data) {
                // หา TA info จาก tasList และอัปเดต local state
                const addedTA = tasList.find(ta => ta.id === parseInt(selectedTAId));
                if (addedTA) {
                    setCourse(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            tas: [...(prev.tas || []), {
                                id: addedTA.id,
                                full_name: addedTA.full_name,
                                email: addedTA.email,
                                username: addedTA.username,
                                avatar: addedTA.avatar,
                                CourseTA: { assigned_at: new Date().toISOString() }
                            }]
                        };
                    });
                }
                addToast({
                    title: "สำเร็จ",
                    description: "เพิ่มผู้ช่วยสอนสำเร็จ",
                    color: "success",
                });
                setIsAddTAModalOpen(false);
                setSelectedTAId("");
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
                // อัปเดต local state แทนการรีโหลดทั้งหน้า
                setCourse(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        tas: prev.tas?.filter(ta => ta.id !== userId) || []
                    };
                });
                addToast({
                    title: "สำเร็จ",
                    description: "นำผู้ช่วยสอนออกสำเร็จ",
                    color: "success",
                });
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

    // Copy teams from specific week
    const copyTeamsFromWeek = useCallback(async (sourceWeek: number) => {
        const sourceWeekTeams = weeklyTeams[sourceWeek];
        if (!sourceWeekTeams || sourceWeekTeams.length === 0) {
            addToast({
                title: "ไม่มีกลุ่ม",
                description: `สัปดาห์ที่ ${sourceWeek} ยังไม่มีกลุ่ม`,
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Copy teams to new week via API
            const teamsData = sourceWeekTeams.map((team) => ({
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
                    description: `คัดลอกกลุ่มจากสัปดาห์ที่ ${sourceWeek} สำเร็จ`,
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

    // Open bulk delete modal
    const openBulkDeleteModal = useCallback(() => {
        const teamsToDelete = weeklyTeams[selectedWeek];
        if (!teamsToDelete || teamsToDelete.length === 0) {
            addToast({
                title: "ไม่มีกลุ่ม",
                description: "ไม่มีกลุ่มในสัปดาห์นี้",
                color: "warning",
            });
            return;
        }
        setIsBulkDeleteModalOpen(true);
    }, [selectedWeek, weeklyTeams]);

    // Clear all teams in current week (called after confirmation)
    const confirmBulkDeleteTeams = useCallback(async () => {
        const teamsToDelete = weeklyTeams[selectedWeek];
        if (!teamsToDelete || teamsToDelete.length === 0) return;

        setIsSubmitting(true);
        try {
            // Use bulk delete API instead of deleting one by one
            const teamIds = teamsToDelete.map(team => team.id);
            const response = await courseService.bulkDeleteTeams(courseId, teamIds);
            
            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: `ล้างกลุ่มสำเร็จ ${response.data?.deletedCount || teamsToDelete.length} กลุ่ม`,
                    color: "success",
                });
                fetchTeams();
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: err.message || "ไม่สามารถล้างกลุ่มได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
            setIsBulkDeleteModalOpen(false);
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

    // Menu items for sidebar
    const menuItems = [
        { key: "overview", label: "ภาพรวม", icon: "solar:chart-2-bold" },
        { key: "sections", label: "กลุ่มเรียน", icon: "solar:notebook-bold" },
        { key: "people", label: "บุคคล", icon: "solar:users-group-rounded-bold" },
        { key: "assignments", label: "งาน", icon: "solar:clipboard-list-bold", badge: assignments.length > 0 ? assignments.length : undefined },
        { key: "scores", label: "คะแนน", icon: "solar:diploma-bold" },
    ];

    // console.log("Course data:", course);

    return (
        <div className="min-h-[calc(100vh-3.2rem)] bg-slate-100">
            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-50 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Button
                        isIconOnly
                        variant="flat"
                        className="bg-white/20 text-white"
                        onPress={() => setIsMobileSidebarOpen(true)}
                    >
                        <Icon icon="solar:hamburger-menu-linear" className="text-xl" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-white font-semibold truncate">{course.name}</h1>
                        <p className="text-white/70 text-xs">{course.code}</p>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={() => setIsMobileSidebarOpen(false)}
                >
                    <div
                        className="w-72 h-full bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Mobile Sidebar Header */}
                        <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <Chip size="sm" className="bg-white/20 text-white border-0">
                                    {course.code}
                                </Chip>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="flat"
                                    className="bg-white/20 text-white"
                                    onPress={() => setIsMobileSidebarOpen(false)}
                                >
                                    <Icon icon="solar:close-circle-linear" className="text-lg" />
                                </Button>
                            </div>
                            <h2 className="text-white font-bold text-lg leading-tight mb-1">{course.name}</h2>
                            <p className="text-white/70 text-sm">{course.year}/{course.semester === 3 ? "ฤดูร้อน" : course.semester}</p>
                            {course.instructor && (
                                <p className="text-white/60 text-xs mt-2">{course.instructor.full_name}</p>
                            )}
                        </div>

                        {/* Mobile Menu Items */}
                        <nav className="p-3">
                            {menuItems.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        setActiveTab(item.key);
                                        setIsMobileSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all cursor-pointer ${activeTab === item.key
                                            ? "bg-blue-50 text-blue-600"
                                            : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                                        }`}
                                >
                                    <Icon icon={item.icon} className="text-xl" />
                                    <span className="font-medium">{item.label}</span>
                                    {item.badge && (
                                        <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-600 h-5 min-w-5 px-1 ml-auto">
                                            {item.badge}
                                        </Chip>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            <div className="flex">
                {/* Desktop Sidebar - Fixed position */}
                <aside className="hidden lg:flex flex-col w-64 h-[calc(100vh)] bg-white border-r border-slate-200 fixed top-12 left-0 overflow-y-auto z-40">
                    {/* Sidebar Header - Course Info */}
                    {/* <div className="p-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            {course.image ? (
                                <img 
                                    src={course.image} 
                                    alt={course.name}
                                    className="w-12 h-12 object-cover rounded-xl"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <Icon icon="solar:book-2-bold-duotone" className="text-xl text-white" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-slate-800 text-sm leading-tight truncate">{course.name}</h2>
                                <p className="text-slate-500 text-xs">{course.code}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Chip size="sm" variant="flat" className="bg-blue-50 text-blue-600">
                                {course.year}/{course.semester === 3 ? "ฤดูร้อน" : course.semester}
                            </Chip>
                            <Chip size="sm" variant="flat" color={course.is_active ? "success" : "default"}>
                                {course.is_active ? "เปิดใช้งาน" : "ปิด"}
                            </Chip>
                        </div>
                    </div> */}

                    {/* Navigation Menu */}
                    <nav className="flex-1 p-3">
                        {/* <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">เมนู</p> */}
                        {menuItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${activeTab === item.key
                                        ? "bg-blue-50 text-blue-600 font-medium"
                                        : "text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <Icon icon={item.icon} className={`text-lg ${activeTab === item.key ? "text-blue-500" : "text-slate-400"}`} />
                                <span className="text-sm">{item.label}</span>
                                {item.badge && (
                                    <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-600 h-5 min-w-5 px-1 ml-auto text-xs">
                                        {item.badge}
                                    </Chip>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Sidebar Footer - Quick Stats */}
                    {/* <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold text-blue-600">{overview?.summary.totalStudents || course.studentCount || 0}</p>
                                <p className="text-xs text-slate-500">นักศึกษา</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-amber-600">{course.sections?.length || 0}</p>
                                <p className="text-xs text-slate-500">กลุ่ม</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-emerald-600">{course.tas?.length || 0}</p>
                                <p className="text-xs text-slate-500">TA</p>
                            </div>
                        </div>
                    </div> */}
                </aside>

                {/* Main Content Area - Add left margin for fixed sidebar */}
                <main className="flex-1 lg:ml-64 overflow-x-hidden">
                    {/* Page Title Header - Desktop only */}
                    {/* <div className="hidden lg:block bg-white border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    activeTab === "overview" ? "bg-blue-100" :
                                    activeTab === "sections" ? "bg-amber-100" :
                                    activeTab === "people" ? "bg-emerald-100" :
                                    activeTab === "assignments" ? "bg-purple-100" :
                                    "bg-rose-100"
                                }`}>
                                    <Icon 
                                        icon={menuItems.find(m => m.key === activeTab)?.icon || "solar:chart-2-bold"} 
                                        className={`text-xl ${
                                            activeTab === "overview" ? "text-blue-600" :
                                            activeTab === "sections" ? "text-amber-600" :
                                            activeTab === "people" ? "text-emerald-600" :
                                            activeTab === "assignments" ? "text-purple-600" :
                                            "text-rose-600"
                                        }`}
                                    />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-800">
                                        {menuItems.find(m => m.key === activeTab)?.label || "ภาพรวม"}
                                    </h1>
                                    <p className="text-sm text-slate-500">{course.code} - {course.name}</p>
                                </div>
                            </div>
                        </div>
                    </div> */}

                    {/* Content */}
                    <div className="p-4 lg:p-6">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <OverviewTab
                                course={course}
                                overview={overview}
                                isLoading={isLoading || isOverviewLoading}
                                userRole={userRole}
                                assignments={assignments}
                                onNavigateToAssignments={() => setActiveTab("assignments")}
                            />
                        )}

                        {/* Sections Tab */}
                        {activeTab === "sections" && (
                            <SectionsTab
                                course={course}
                                sectionSubTab={sectionSubTab}
                                setSectionSubTab={setSectionSubTab}
                                sectionSearchQuery={sectionSearchQuery}
                                setSectionSearchQuery={setSectionSearchQuery}
                                totalStudents={totalStudents}
                                permanentTeams={permanentTeams}
                                weeklyTeams={weeklyTeams}
                                selectedWeek={selectedWeek}
                                setSelectedWeek={setSelectedWeek}
                                totalWeeks={totalWeeks}
                                expandedSections={expandedSections}
                                isTeamsLoading={isTeamsLoading}
                                sectionStudents={sectionStudents}
                                onToggleSection={toggleSection}
                                onOpenAddSectionModal={() => setIsAddSectionModalOpen(true)}
                                onOpenAddStudentModal={openAddStudentModal}
                                onRemoveSection={handleRemoveSection}
                                onOpenDeleteStudentModal={openDeleteStudentModal}
                                onOpenCreateTeamModal={(type, method) => {
                                    setTeamCreationType(type);
                                    setTeamFormationMethod(method);
                                    setNewTeamName("");
                                    setSelectedTeamMembers([]);
                                    setTeamExcelPasteData("");
                                    setParsedTeamMembers([]);
                                    setSelectedSectionForTeam("all");
                                    setTeamMemberMode("select");
                                    setIsCreateTeamModalOpen(true);
                                }}
                                onOpenDeleteTeamModal={openDeleteTeamModal}
                                onCopyTeamsFromWeek={copyTeamsFromWeek}
                                onOpenBulkDeleteModal={openBulkDeleteModal}
                                getFilteredSectionStudents={getFilteredSectionStudents}
                                findStudentTeam={findStudentTeam}
                            />
                        )}

                        {/* People Tab */}
                        {activeTab === "people" && (
                            <PeopleTab
                                course={course}
                                isLoading={isLoading}
                                isPeopleLoading={isPeopleLoading}
                                onOpenAddTAModal={() => setIsAddTAModalOpen(true)}
                                onRemoveTA={handleRemoveTA}
                            />
                        )}

                        {/* Assignments Tab */}
                        {activeTab === "assignments" && (
                            <AssignmentsTab
                                assignments={assignments}
                                setAssignments={setAssignments}
                                isLoading={isAssignmentsLoading}
                                expandedAssignments={expandedAssignments}
                                setExpandedAssignments={setExpandedAssignments}
                                onOpenCreateModal={() => {
                                    setNewAssignment({
                                        name: "",
                                        assignment_type: "individual",
                                        hasSubItems: false,
                                        subItems: [],
                                        maxScore: 10,
                                        dueDate: "",
                                        description: "",
                                    });
                                    setEditingAssignment(null);
                                    setIsAddAssignmentModalOpen(true);
                                }}
                                onOpenEditModal={(assignment) => {
                                    setEditingAssignment(assignment);
                                    setNewAssignment({
                                        name: assignment.name,
                                        assignment_type: assignment.assignment_type,
                                        week_number: assignment.week_number,
                                        hasSubItems: !!(assignment.subItems && assignment.subItems.length > 0),
                                        subItems: assignment.subItems?.map(s => ({
                                            id: s.id,
                                            name: s.name,
                                            max_score: Number(s.max_score)
                                        })) || [],
                                        maxScore: Number(assignment.max_score),
                                        dueDate: assignment.due_date || "",
                                        description: assignment.description || "",
                                    });
                                    setIsAddAssignmentModalOpen(true);
                                }}
                                onOpenScoreModal={(assignment) => {
                                    setScoreModalAssignment(assignment);
                                    setIsScoreModalOpen(true);
                                }}
                            />
                        )}

                        {/* Scores Tab */}
                        {activeTab === "scores" && (
                            <ScoresTab
                                assignments={assignments}
                                selectedAssignment={selectedAssignmentForScore}
                                setSelectedAssignment={setSelectedAssignmentForScore}
                                scoresData={scoresData}
                                isLoading={isScoresLoading}
                                scoreSearchQuery={scoreSearchQuery}
                                setScoreSearchQuery={setScoreSearchQuery}
                                scoreEntries={scoreEntries}
                                setScoreEntries={setScoreEntries}
                                isSaving={isSavingScores}
                                groupsForScore={groupsForScore}
                                onFetchScores={fetchScoresForAssignment}
                                onSaveScores={saveAllScores}
                                onOpenGroupScoreModal={() => {
                                    setSelectedGroupForScore(null);
                                    setGroupScoreValue(0);
                                    setGroupSubItemScores({});
                                    setIsGroupScoreModalOpen(true);
                                }}
                                onNavigateToAssignments={() => setActiveTab("assignments")}
                            />
                        )}
                    </div>
                </main>
            </div>

            {/* Score Modal (New) */}
            <ScoreModal
                isOpen={isScoreModalOpen}
                onClose={() => {
                    setIsScoreModalOpen(false);
                    setScoreModalAssignment(null);
                }}
                assignment={scoreModalAssignment}
                courseId={courseId}
                onScoreSubmitted={() => {
                    // Refresh scores if needed
                    if (selectedAssignmentForScore) {
                        fetchScoresForAssignment(selectedAssignmentForScore);
                    }
                }}
            />

            {/* Group Score Modal */}
            <Modal 
                isOpen={isGroupScoreModalOpen} 
                onClose={() => setIsGroupScoreModalOpen(false)} 
                size="lg"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg">
                                <Icon icon="solar:users-group-rounded-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">ให้คะแนนรายกลุ่ม</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">
                                    {selectedAssignmentForScore?.name}
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-4">
                            <Select
                                label="เลือกกลุ่ม"
                                placeholder="เลือกกลุ่มที่ต้องการให้คะแนน"
                                variant="bordered"
                                size="lg"
                                selectedKeys={selectedGroupForScore ? [String(selectedGroupForScore.id)] : []}
                                onSelectionChange={(keys) => {
                                    const selectedId = Array.from(keys)[0];
                                    const group = groupsForScore.find(g => g.id === Number(selectedId));
                                    setSelectedGroupForScore(group || null);
                                    if (group) {
                                        // Initialize sub-item scores for the group
                                        if (selectedAssignmentForScore?.subItems && selectedAssignmentForScore.subItems.length > 0) {
                                            const scores: Record<number, number> = {};
                                            selectedAssignmentForScore.subItems.forEach(subItem => {
                                                if (subItem.id !== undefined) {
                                                    // Check if any member already has a score
                                                    const memberScore = group.members.find(m => {
                                                        const entry = scoreEntries[`${m.id}-${subItem.id}`];
                                                        return entry !== undefined && entry !== "";
                                                    });
                                                    const key = `${group.members[0]?.id}-${subItem.id}`;
                                                    scores[subItem.id] = memberScore ? Number(scoreEntries[key] || 0) : 0;
                                                }
                                            });
                                            setGroupSubItemScores(scores);
                                        } else {
                                            // Check if any member already has a score
                                            const key = `${group.members[0]?.id}`;
                                            const existingScore = scoreEntries[key];
                                            setGroupScoreValue(existingScore !== undefined && existingScore !== "" ? Number(existingScore) : 0);
                                        }
                                    }
                                }}
                            >
                                {groupsForScore.map((group) => (
                                    <SelectItem key={String(group.id)} textValue={group.name}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon icon="solar:users-group-rounded-bold" className="text-purple-500" />
                                                <span>{group.name}</span>
                                            </div>
                                            <Chip size="sm" variant="flat" color="secondary">
                                                {group.members.length} คน
                                            </Chip>
                                        </div>
                                    </SelectItem>
                                ))}
                            </Select>

                            {/* Selected Group Info */}
                            {selectedGroupForScore && (
                                <Card className="bg-purple-50 border border-purple-100">
                                    <CardBody className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-purple-800">{selectedGroupForScore.name}</h4>
                                                <p className="text-sm text-purple-600 mt-1">
                                                    สมาชิก: {selectedGroupForScore.members.map(m => `${m.full_name}`).join(", ")}
                                                </p>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            )}

                            {/* Score Input */}
                            {selectedGroupForScore && (
                                <>
                                    {selectedAssignmentForScore?.subItems && selectedAssignmentForScore.subItems.length > 0 ? (
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-slate-700">คะแนนตามหัวข้อย่อย</p>
                                            {selectedAssignmentForScore.subItems.filter(s => s.id !== undefined).map((subItem) => (
                                                <div key={subItem.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                    <div>
                                                        <span className="font-medium text-slate-700">{subItem.name}</span>
                                                        <span className="text-sm text-slate-500 ml-2">(เต็ม {subItem.max_score})</span>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        size="sm"
                                                        variant="bordered"
                                                        min={0}
                                                        max={Number(subItem.max_score)}
                                                        value={String(groupSubItemScores[subItem.id!] ?? 0)}
                                                        onValueChange={(val) => {
                                                            const numVal = Math.min(Number(val || 0), Number(subItem.max_score));
                                                            setGroupSubItemScores(prev => ({
                                                                ...prev,
                                                                [subItem.id!]: numVal
                                                            }));
                                                        }}
                                                        className="w-24"
                                                        classNames={{
                                                            inputWrapper: "h-10 bg-white",
                                                            input: "text-center",
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <span className="font-medium text-slate-700">คะแนน (เต็ม {selectedAssignmentForScore?.max_score})</span>
                                            <Input
                                                type="number"
                                                size="sm"
                                                variant="bordered"
                                                min={0}
                                                max={Number(selectedAssignmentForScore?.max_score || 0)}
                                                value={String(groupScoreValue)}
                                                onValueChange={(val) => {
                                                    const numVal = Math.min(Number(val || 0), Number(selectedAssignmentForScore?.max_score || 0));
                                                    setGroupScoreValue(numVal);
                                                }}
                                                className="w-24"
                                                classNames={{
                                                    inputWrapper: "h-10 bg-white",
                                                    input: "text-center",
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 pb-6 pt-2">
                        <Button
                            color="default"
                            variant="light"
                            onPress={() => setIsGroupScoreModalOpen(false)}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            isDisabled={!selectedGroupForScore}
                            isLoading={isSavingScores}
                            onPress={saveGroupScore}
                            className="bg-gradient-to-r from-purple-500 to-violet-600"
                        >
                            บันทึกคะแนน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add TA Modal */}
            <Modal isOpen={isAddTAModalOpen} onClose={() => setIsAddTAModalOpen(false)} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl shadow-lg">
                                <Icon icon="solar:user-hands-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เพิ่มผู้ช่วยสอน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">เลือกผู้ช่วยสอนที่ต้องการเพิ่ม</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        {/* แสดงจำนวน TA ในระบบ */}
                        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                            <Icon icon="solar:users-group-rounded-bold" className="text-blue-500" />
                            <span>ผู้ช่วยสอนในระบบทั้งหมด <span className="font-semibold text-blue-600">{tasList.length}</span> คน</span>
                            {course?.tas && course.tas.length > 0 && (
                                <span className="text-slate-400">
                                    (อยู่ในวิชานี้แล้ว <span className="font-semibold text-emerald-600">{course.tas.length}</span> คน)
                                </span>
                            )}
                        </div>
                        
                        <Autocomplete
                            label="ค้นหาผู้ช่วยสอน"
                            labelPlacement="outside"
                            placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหา..."
                            variant="bordered"
                            size="lg"
                            selectedKey={selectedTAId}
                            onSelectionChange={(key) => setSelectedTAId(key?.toString() || "")}
                            disabledKeys={course?.tas?.map(ta => ta.id.toString()) || []}
                            startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                            listboxProps={{
                                emptyContent: "ไม่พบผู้ช่วยสอนที่ค้นหา",
                            }}
                            classNames={{
                                base: "w-full",
                                listboxWrapper: "max-h-[300px]",
                            }}
                            inputProps={{
                                classNames: {
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-500 focus-within:!border-blue-500",
                                    label: "text-slate-600 font-medium text-sm",
                                },
                            }}
                        >
                            {tasList.map((ta) => {
                                const isInCourse = course?.tas?.some(courseTa => courseTa.id === ta.id);
                                return (
                                    <AutocompleteItem 
                                        key={ta.id.toString()}
                                        textValue={ta.full_name}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                name={ta.full_name}
                                                src={ta.avatar || undefined}
                                                size="sm"
                                                className={`flex-shrink-0 ${isInCourse ? 'bg-slate-400' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-medium truncate ${isInCourse ? 'text-slate-400' : 'text-slate-800'}`}>
                                                        {ta.full_name}
                                                    </p>
                                                    {isInCourse && (
                                                        <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full whitespace-nowrap">
                                                            อยู่ในวิชาแล้ว
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs truncate ${isInCourse ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {ta.email || ta.username}
                                                </p>
                                            </div>
                                        </div>
                                    </AutocompleteItem>
                                );
                            })}
                        </Autocomplete>
                        
                        {/* แสดง TA ที่เลือก */}
                        {selectedTAId && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        name={tasList.find(ta => ta.id.toString() === selectedTAId)?.full_name || ""}
                                        size="sm"
                                        src={tasList.find(ta => ta.id.toString() === selectedTAId)?.avatar || undefined}
                                        className="bg-gradient-to-br from-blue-400 to-indigo-500"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-800">
                                            {tasList.find(ta => ta.id.toString() === selectedTAId)?.full_name}
                                        </p>
                                        <p className="text-xs text-blue-600">
                                            {tasList.find(ta => ta.id.toString() === selectedTAId)?.email || 
                                             tasList.find(ta => ta.id.toString() === selectedTAId)?.username}
                                        </p>
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="flat"
                                        className="bg-blue-200/50 text-blue-700"
                                        onPress={() => setSelectedTAId("")}
                                    >
                                        <Icon icon="solar:close-circle-bold" className="text-lg" />
                                    </Button>
                                </div>
                            </div>
                        )}
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
                            className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-400/25"
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
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${addStudentMode === "select"
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    <Icon icon="solar:magnifer-linear" />
                                    เลือกจากรายชื่อ
                                </button>
                                <button
                                    onClick={() => setAddStudentMode("paste")}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${addStudentMode === "paste"
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
                                                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${selectedStudentId === student.id.toString()
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
                                                        className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 ${result.status === "matched" ? "bg-green-50" :
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
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ ...prev, assignment_type: "individual", week_number: undefined }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${newAssignment.assignment_type === "individual"
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon icon="solar:user-bold" className={`text-3xl mx-auto mb-2 ${newAssignment.assignment_type === "individual" ? "text-indigo-500" : "text-slate-400"
                                            }`} />
                                        <p className={`font-semibold text-sm ${newAssignment.assignment_type === "individual" ? "text-indigo-600" : "text-slate-600"
                                            }`}>งานเดี่ยว</p>
                                        <p className="text-xs text-slate-500 mt-1">คะแนนรายบุคคล</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ ...prev, assignment_type: "permanent_group", week_number: undefined }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${newAssignment.assignment_type === "permanent_group"
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon icon="solar:users-group-rounded-bold" className={`text-3xl mx-auto mb-2 ${newAssignment.assignment_type === "permanent_group" ? "text-purple-500" : "text-slate-400"
                                            }`} />
                                        <p className={`font-semibold text-sm ${newAssignment.assignment_type === "permanent_group" ? "text-purple-600" : "text-slate-600"
                                            }`}>กลุ่มถาวร</p>
                                        <p className="text-xs text-slate-500 mt-1">ใช้กลุ่มถาวรที่มีอยู่</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({ ...prev, assignment_type: "weekly_group", week_number: selectedWeek }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${newAssignment.assignment_type === "weekly_group"
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon icon="solar:calendar-bold" className={`text-3xl mx-auto mb-2 ${newAssignment.assignment_type === "weekly_group" ? "text-emerald-500" : "text-slate-400"
                                            }`} />
                                        <p className={`font-semibold text-sm ${newAssignment.assignment_type === "weekly_group" ? "text-emerald-600" : "text-slate-600"
                                            }`}>กลุ่มประจำสัปดาห์</p>
                                        <p className="text-xs text-slate-500 mt-1">กลุ่มตามสัปดาห์</p>
                                    </button>
                                </div>
                            </div>

                            {/* Week Number - Only show for weekly group */}
                            {newAssignment.assignment_type === "weekly_group" && (
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <label className="text-slate-600 font-medium text-sm mb-2 block">สัปดาห์ที่</label>
                                    {Object.keys(weeklyTeams).length > 0 ? (
                                        <Select
                                            placeholder="เลือกสัปดาห์"
                                            selectedKeys={newAssignment.week_number ? [newAssignment.week_number.toString()] : []}
                                            onSelectionChange={(keys) => {
                                                const val = Array.from(keys)[0] as string;
                                                if (val) {
                                                    setNewAssignment(prev => ({ ...prev, week_number: parseInt(val) }));
                                                }
                                            }}
                                            variant="bordered"
                                            classNames={{
                                                trigger: "bg-white border-slate-200",
                                                value: "text-slate-800",
                                            }}
                                        >
                                            {Object.keys(weeklyTeams)
                                                .map(Number)
                                                .sort((a, b) => a - b)
                                                .map((weekNum) => (
                                                    <SelectItem key={weekNum.toString()} textValue={`สัปดาห์ที่ ${weekNum}`}>
                                                        <div className="flex items-center justify-between w-full">
                                                            <span>สัปดาห์ที่ {weekNum}</span>
                                                            <span className="text-xs text-slate-500">
                                                                ({weeklyTeams[weekNum]?.length || 0} กลุ่ม)
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </Select>
                                    ) : (
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                                            <Icon icon="solar:info-circle-bold" className="text-amber-500 text-xl mb-1" />
                                            <p className="text-sm text-amber-700">ยังไม่มีกลุ่มประจำสัปดาห์</p>
                                            <p className="text-xs text-amber-600 mt-1">กรุณาสร้างกลุ่มประจำสัปดาห์ก่อน</p>
                                        </div>
                                    )}
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
                                        className={`p-4 rounded-xl border-2 transition-all ${!newAssignment.hasSubItems
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon icon="solar:document-bold" className={`text-3xl mx-auto mb-2 ${!newAssignment.hasSubItems ? "text-blue-500" : "text-slate-400"
                                            }`} />
                                        <p className={`font-semibold ${!newAssignment.hasSubItems ? "text-blue-600" : "text-slate-600"
                                            }`}>คะแนนเดียว</p>
                                        <p className="text-xs text-slate-500 mt-1">ให้คะแนนรวมทั้งงาน</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment(prev => ({
                                            ...prev,
                                            hasSubItems: true,
                                            subItems: prev.subItems.length > 0 ? prev.subItems : [
                                                { name: "ข้อ 1", max_score: 5 }
                                            ]
                                        }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${newAssignment.hasSubItems
                                                ? "border-amber-500 bg-amber-50"
                                                : "border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon icon="solar:checklist-bold" className={`text-3xl mx-auto mb-2 ${newAssignment.hasSubItems ? "text-amber-500" : "text-slate-400"
                                            }`} />
                                        <p className={`font-semibold ${newAssignment.hasSubItems ? "text-amber-600" : "text-slate-600"
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
                                    className="pt-6"
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
                                                รวม {newAssignment.subItems.reduce((acc, sub) => acc + sub.max_score, 0)} คะแนน
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
                                                                name: `ข้อ ${prev.subItems.length + 1}`,
                                                                max_score: 5
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
                                                key={subItem.id || idx}
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
                                                            subItems: prev.subItems.map((s, i) =>
                                                                i === idx ? { ...s, name: val } : s
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
                                                    value={subItem.max_score.toString()}
                                                    onValueChange={(val) => {
                                                        setNewAssignment(prev => ({
                                                            ...prev,
                                                            subItems: prev.subItems.map((s, i) =>
                                                                i === idx ? { ...s, max_score: parseInt(val) || 0 } : s
                                                            )
                                                        }));
                                                    }}
                                                    className="w-36"
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
                                                            subItems: prev.subItems.filter((_, i) => i !== idx)
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
                            {/* <Input
                                type="date"
                                label="กำหนดส่ง (ถ้ามี)"
                                labelPlacement="outside"
                                variant="bordered"
                                size="lg"
                                value={newAssignment.dueDate}
                                onValueChange={(val) => setNewAssignment(prev => ({ ...prev, dueDate: val }))}

                                className="pt-4"
                                classNames={{
                                    inputWrapper: "h-12 bg-white border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-slate-600 font-medium text-sm",

                                }}
                            /> */}

                            {/* Description */}
                            <Input
                                label="รายละเอียดเพิ่มเติม"
                                labelPlacement="outside"
                                placeholder="คำอธิบายเกี่ยวกับงาน (ถ้ามี)"
                                variant="bordered"
                                size="lg"
                                value={newAssignment.description}
                                onValueChange={(val) => setNewAssignment(prev => ({ ...prev, description: val }))}
                                className="pt-4"
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
                                    ? `คะแนนรวม: ${newAssignment.subItems.reduce((acc, sub) => acc + sub.max_score, 0)} คะแนน`
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
                                    onPress={async () => {
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
                                        if (newAssignment.assignment_type === "weekly_group" && !newAssignment.week_number) {
                                            addToast({
                                                title: "ข้อมูลไม่ครบ",
                                                description: "กรุณาเลือกสัปดาห์",
                                                color: "warning",
                                            });
                                            return;
                                        }

                                        setIsSubmitting(true);
                                        try {
                                            if (editingAssignment) {
                                                // Update existing via API
                                                const result = await assignmentService.updateAssignment(editingAssignment.id, {
                                                    name: newAssignment.name,
                                                    description: newAssignment.description || undefined,
                                                    assignment_type: newAssignment.assignment_type,
                                                    week_number: newAssignment.week_number,
                                                    max_score: newAssignment.hasSubItems ? undefined : newAssignment.maxScore,
                                                    sub_items: newAssignment.hasSubItems ? newAssignment.subItems : undefined,
                                                    due_date: newAssignment.dueDate || undefined,
                                                });
                                                if (result) {
                                                    await fetchAssignments();
                                                    addToast({
                                                        title: "สำเร็จ",
                                                        description: "แก้ไขงานเรียบร้อยแล้ว",
                                                        color: "success",
                                                    });
                                                }
                                            } else {
                                                // Create new via API
                                                // courseId is already a string (nanoid format)
                                                if (!courseId) {
                                                    addToast({
                                                        title: "เกิดข้อผิดพลาด",
                                                        description: "ไม่พบรหัสรายวิชา",
                                                        color: "danger",
                                                    });
                                                    setIsSubmitting(false);
                                                    return;
                                                }
                                                const result = await assignmentService.createAssignment({
                                                    course_id: courseId,
                                                    name: newAssignment.name,
                                                    description: newAssignment.description || undefined,
                                                    assignment_type: newAssignment.assignment_type,
                                                    week_number: newAssignment.week_number,
                                                    max_score: newAssignment.hasSubItems ? undefined : newAssignment.maxScore,
                                                    sub_items: newAssignment.hasSubItems ? newAssignment.subItems : undefined,
                                                    due_date: newAssignment.dueDate || undefined,
                                                });
                                                if (result) {
                                                    await fetchAssignments();
                                                    addToast({
                                                        title: "สำเร็จ",
                                                        description: "สร้างงานใหม่เรียบร้อยแล้ว",
                                                        color: "success",
                                                    });
                                                }
                                            }
                                            setIsAddAssignmentModalOpen(false);
                                            setEditingAssignment(null);
                                        } catch (error) {
                                            console.error("Error saving assignment:", error);
                                            addToast({
                                                title: "เกิดข้อผิดพลาด",
                                                description: "ไม่สามารถบันทึกงานได้",
                                                color: "danger",
                                            });
                                        } finally {
                                            setIsSubmitting(false);
                                        }
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
                            <div className={`p-3 rounded-xl shadow-lg ${teamCreationType === "permanent"
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
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${teamMemberMode === "select"
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
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${teamMemberMode === "paste"
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
                                                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${selectedTeamMembers.includes(student.id)
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
                                                                    <Icon icon="solar:check-circle-bold" className={`text-xl ${teamCreationType === "permanent" ? "text-purple-500" : "text-emerald-500"
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
                                                    className={`w-full h-28 px-4 py-3 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 resize-none bg-white ${teamCreationType === "permanent"
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
                                                            <span className={`px-2 py-1 rounded-full ${teamCreationType === "permanent"
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
                                                                className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 ${result.status === "matched"
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
                                                                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${teamCreationType === "permanent"
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
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${teamCreationType === "permanent"
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
                                    <Card className={`shadow-sm border ${teamCreationType === "permanent"
                                            ? "border-purple-100 bg-purple-50/50"
                                            : "border-emerald-100 bg-emerald-50/50"
                                        }`}>
                                        <CardBody className="py-3 px-4">
                                            <div className="flex items-start gap-3">
                                                <Icon icon="solar:info-circle-bold" className={`text-xl mt-0.5 ${teamCreationType === "permanent" ? "text-purple-500" : "text-emerald-500"
                                                    }`} />
                                                <div>
                                                    <p className={`font-medium ${teamCreationType === "permanent" ? "text-purple-800" : "text-emerald-800"
                                                        }`}>ตัวอย่างการจับกลุ่ม</p>
                                                    <p className={`text-sm ${teamCreationType === "permanent" ? "text-purple-600" : "text-emerald-600"
                                                        }`}>
                                                        {(() => {
                                                            const unassigned = getUnassignedStudents(teamCreationType, teamCreationType === "weekly" ? selectedWeek : undefined);
                                                            const numTeams = Math.ceil(unassigned.length / teamSize);
                                                            const remainder = unassigned.length % teamSize;
                                                            if (unassigned.length === 0) {
                                                                return "ไม่มีนักศึกษาที่ยังไม่อยู่ในกลุ่ม";
                                                            }
                                                            return `นักศึกษา ${unassigned.length} คน จะถูกแบ่งเป็น ${numTeams} กลุ่ม ${remainder > 0 ? `(${numTeams - 1} กลุ่ม ${teamSize} คน และ 1 กลุ่ม ${remainder} คน)` : `(กลุ่มละ ${teamSize} คน)`
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
                                <Card className={`border ${deleteTarget.teamType === "permanent"
                                        ? "border-purple-200 bg-purple-50"
                                        : "border-emerald-200 bg-emerald-50"
                                    }`}>
                                    <CardBody className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${deleteTarget.teamType === "permanent"
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
                                {/* {deleteTarget.teamMembers && deleteTarget.teamMembers.length > 0 && (
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
                                )} */}

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

                                {/* Score Warning */}
                                <Card className="border border-amber-200 bg-amber-50">
                                    <CardBody className="py-3 px-4">
                                        <div className="flex items-start gap-3">
                                            <Icon icon="solar:document-text-bold" className="text-xl text-amber-600 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-amber-800">เกี่ยวกับคะแนน</p>
                                                <p className="text-sm text-amber-700 mt-1">
                                                    หากมีการลงคะแนนให้กลุ่มนี้ไว้แล้ว คะแนนจะยังคงอยู่ในระบบ
                                                    โดยผูกกับนักศึกษาแต่ละคน ไม่ได้ถูกลบไปด้วย
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

            {/* Bulk Delete Teams Modal */}
            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                size="lg"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                <Icon icon="solar:trash-bin-2-bold" className="text-2xl text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">ล้างกลุ่มทั้งหมด</h3>
                                <p className="text-sm text-slate-500">สัปดาห์ที่ {selectedWeek}</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-4">
                            {/* Teams Summary */}
                            <Card className="border border-emerald-200 bg-emerald-50">
                                <CardBody className="py-4 px-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                                <Icon icon="solar:users-group-two-rounded-bold" className="text-2xl text-white" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg text-slate-800">
                                                    {weeklyTeams[selectedWeek]?.length || 0} กลุ่ม
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    จำนวนสมาชิกทั้งหมด {weeklyTeams[selectedWeek]?.reduce((acc, t) => acc + t.members.length, 0) || 0} คน
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Teams List Preview */}
                            {/* {weeklyTeams[selectedWeek] && weeklyTeams[selectedWeek].length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                        <p className="text-sm font-medium text-slate-600">
                                            กลุ่มที่จะถูกลบ
                                        </p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {weeklyTeams[selectedWeek].map((team, idx) => (
                                            <div key={team.id} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{team.name}</p>
                                                        <p className="text-xs text-slate-400">{team.members.length} สมาชิก</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )} */}

                            {/* Info */}
                            <Card className="border border-blue-200 bg-blue-50">
                                <CardBody className="py-3 px-4">
                                    <div className="flex items-start gap-3">
                                        <Icon icon="solar:info-circle-bold" className="text-xl text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-blue-800">สิ่งที่จะเกิดขึ้น</p>
                                            <p className="text-sm text-blue-600 mt-1">
                                                สมาชิกทุกคนในทุกกลุ่มของสัปดาห์นี้จะกลับไปเป็นนักศึกษาที่ยังไม่มีกลุ่ม
                                                และสามารถจัดกลุ่มใหม่ได้
                                            </p>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Score Warning */}
                            <Card className="border border-amber-200 bg-amber-50">
                                <CardBody className="py-3 px-4">
                                    <div className="flex items-start gap-3">
                                        <Icon icon="solar:document-text-bold" className="text-xl text-amber-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-amber-800">เกี่ยวกับคะแนน</p>
                                            <p className="text-sm text-amber-700 mt-1">
                                                หากมีการลงคะแนนให้กลุ่มเหล่านี้ไว้แล้ว คะแนนจะยังคงอยู่ในระบบ
                                                โดยผูกกับนักศึกษาแต่ละคน ไม่ได้ถูกลบไปด้วย
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
                                            คุณต้องการล้างกลุ่มทั้งหมดใช่หรือไม่?
                                        </p>
                                        <p className="text-sm text-red-600">
                                            การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            variant="light"
                            onPress={() => setIsBulkDeleteModalOpen(false)}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="danger"
                            onPress={confirmBulkDeleteTeams}
                            isLoading={isSubmitting}
                            className="bg-red-500"
                            startContent={!isSubmitting && <Icon icon="solar:trash-bin-trash-bold" />}
                        >
                            ล้างทั้งหมด ({weeklyTeams[selectedWeek]?.length || 0} กลุ่ม)
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
