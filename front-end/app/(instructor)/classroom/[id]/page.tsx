"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
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
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { FaCheckCircle } from "react-icons/fa";

// Import custom hooks
import { 
    useClassroomData, 
    useClassroomActions, 
    useScores, 
    useModalStates,
    type TeamMember,
    type PermanentTeam,
    type WeeklyTeam,
} from "./hooks";

// Import service types
import type { Assignment as AssignmentType, AssignmentSubItem } from "@/services/assignment.service";
import type { SectionStudent } from "@/services/course.service";

// Import Skeletons directly (they're small and used for loading states)
import { OverviewSkeleton, TeamsGridSkeleton } from "./components/Skeletons";

// Lazy load heavy Tab components with custom loading states
const OverviewTab = dynamic(() => import("./components/OverviewTab"), {
    loading: () => <OverviewSkeleton />,
    ssr: false,
});

const SectionsTab = dynamic(() => import("./components/SectionsTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

const PeopleTab = dynamic(() => import("./components/PeopleTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

const AssignmentsTab = dynamic(() => import("./components/AssignmentsTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

const AttendanceTab = dynamic(() => import("./components/AttendanceTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

const ScoresTab = dynamic(() => import("./components/ScoreSummaryTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

// ScoreSummaryTab is now the same as ScoresTab (unified)
const ScoreSummaryTab = ScoresTab;

const ScoreApprovalTab = dynamic(() => import("./components/ScoreApprovalTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

// Lazy load Modal (only needed when user opens it)
const ScoreModal = dynamic(() => import("./components/ScoreModal"), {
    loading: () => null,
    ssr: false,
});

const BonusScoreModal = dynamic(() => import("./components/BonusScoreModal"), {
    loading: () => null,
    ssr: false,
});

const SettingsTab = dynamic(() => import("./components/SettingsTab"), {
    loading: () => (
        <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="primary" />
        </div>
    ),
    ssr: false,
});

export default function ClassroomDetailPage() {
    const params = useParams();
    const courseId = params.id as string;

    // ============================================
    // Custom Hooks - Data & Business Logic
    // ============================================
    
    const classroomData = useClassroomData(courseId);
    const {
        course,
        setCourse,
        overview,
        assignments,
        setAssignments,
        attendanceSessions,
        permanentTeams,
        setPermanentTeams,
        weeklyTeams,
        setWeeklyTeams,
        tasList,
        studentsList,
        instructorsList,
        sectionStudents,
        setSectionStudents,
        userRole,
        currentUserId,
        pendingApprovalCount,
        setPendingApprovalCount,
        isConnected,
        isLoading,
        isOverviewLoading,
        isAssignmentsLoading,
        isTeamsLoading,
        isPeopleLoading,
        isStudentsLoading,
        fetchCourse,
        fetchOverview,
        fetchAssignments,
        fetchAttendanceSessions,
        fetchTeams,
        fetchSectionStudents,
        fetchAllSectionStudents,
        refreshForTab,
        initializeData,
        emitUpdate,
        naturalSort,
    } = classroomData;

    const classroomActions = useClassroomActions({
        courseId,
        course,
        setCourse,
        sectionStudents,
        setSectionStudents,
        permanentTeams,
        setPermanentTeams,
        weeklyTeams,
        setWeeklyTeams,
        studentsList,
        fetchCourse,
        fetchOverview,
        fetchTeams,
        fetchAllSectionStudents,
        emitUpdate,
    });

    const scores = useScores({
        onOverviewRefresh: () => fetchOverview(true),
        emitUpdate,
    });

    const modals = useModalStates();

    // ============================================
    // UI-Only States (local to this component)
    // ============================================
    
    const [activeTab, setActiveTab] = useState("overview");
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<number[]>([]);
    const [expandedAssignments, setExpandedAssignments] = useState<number[]>([]);
    
    // Section UI states
    const [sectionSubTab, setSectionSubTab] = useState<"students" | "permanent" | "weekly">("students");
    const [sectionSearchQuery, setSectionSearchQuery] = useState("");
    
    // Team UI states
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [totalWeeks] = useState(15);
    const [selectedSectionForTeam, setSelectedSectionForTeam] = useState<number | "all">("all");
    
    // Assignment form state (for new assignment modal)
    interface LocalSubItem {
        id?: number;
        name: string;
        max_score: number;
    }
    const [newAssignment, setNewAssignment] = useState<{
        name: string;
        assignment_type: "individual" | "permanent_group" | "weekly_group" | "assignment";
        week_number?: number;
        linked_attendance_session_id?: number | null;
        linked_attendance_session_ids: number[];
        attendance_condition: "and" | "or";
        hasSubItems: boolean;
        subItems: LocalSubItem[];
        maxScore: number;
        dueDate: string;
        description: string;
    }>({
        name: "",
        assignment_type: "individual",
        linked_attendance_session_id: null,
        linked_attendance_session_ids: [],
        attendance_condition: "or",
        hasSubItems: false,
        subItems: [],
        maxScore: 10,
        dueDate: "",
        description: "",
    });
    const [editingAssignment, setEditingAssignment] = useState<AssignmentType | null>(null);
    
    // Score modal specific state
    const [scoreModalAssignment, setScoreModalAssignment] = useState<AssignmentType | null>(null);
    const [scoreSearchQuery, setScoreSearchQuery] = useState("");

    // ============================================
    // Computed Values (Memoized)
    // ============================================
    
    const totalStudents = useMemo(() => {
        return course?.sections?.reduce((acc, section) => acc + (section.studentCount || 0), 0) || 0;
    }, [course?.sections]);

    const availableTAs = useMemo(() => {
        return tasList.filter(ta => !course?.tas?.some(courseTa => courseTa.id === ta.id));
    }, [tasList, course?.tas]);

    const filteredInstructors = useMemo(() => {
        const existingIds = course?.instructors?.map(i => i.id) || [];
        return instructorsList.filter(instructor => {
            if (existingIds.includes(instructor.id)) return false;
            if (modals.instructorModal.searchQuery) {
                const query = modals.instructorModal.searchQuery.toLowerCase();
                return instructor.full_name.toLowerCase().includes(query) ||
                       instructor.email?.toLowerCase().includes(query);
            }
            return true;
        });
    }, [instructorsList, course?.instructors, modals.instructorModal.searchQuery]);

    // Get all enrolled students (for team management)
    const getAllEnrolledStudents = useCallback((): TeamMember[] => {
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

    // Get students in a specific section
    const getStudentsInSection = useCallback((sectionId: number): TeamMember[] => {
        return (sectionStudents[sectionId] || []).map(s => ({
            id: s.id,
            student_id: s.student_id,
            full_name: s.full_name
        }));
    }, [sectionStudents]);

    // Get all enrolled student IDs
    const getAllEnrolledStudentIds = useCallback(() => {
        const enrolledIds = new Set<number>();
        Object.values(sectionStudents).forEach(students => {
            students.forEach(s => enrolledIds.add(s.id));
        });
        return enrolledIds;
    }, [sectionStudents]);

    // Get available students (not enrolled)
    const getAvailableStudents = useCallback(() => {
        const enrolledIds = getAllEnrolledStudentIds();
        return studentsList.filter(student => !enrolledIds.has(student.id));
    }, [studentsList, getAllEnrolledStudentIds]);

    // Get unassigned students (not in any team)
    const getUnassignedStudents = useCallback((teamType: "permanent" | "weekly", weekNumber?: number): TeamMember[] => {
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

    // Get student's team info
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

    // Get available students for editing team
    const getAvailableStudentsForEdit = useCallback(() => {
        const editTeam = modals.editTeamModal.team;
        if (!editTeam) return [];
        
        const allStudents = getAllEnrolledStudents();
        const currentMemberIds = new Set(modals.editTeamModal.members);
        const otherTeamMemberIds = new Set<number>();
        
        if (editTeam.type === "permanent") {
            permanentTeams.forEach(team => {
                if (team.id !== editTeam.id) {
                    team.members.forEach(m => otherTeamMemberIds.add(m.id));
                }
            });
        } else if (editTeam.weekNumber !== undefined) {
            const weekTeams = weeklyTeams[editTeam.weekNumber] || [];
            weekTeams.forEach(team => {
                if (team.id !== editTeam.id) {
                    team.members.forEach(m => otherTeamMemberIds.add(m.id));
                }
            });
        }
        
        return allStudents.filter(s => 
            currentMemberIds.has(s.id) || !otherTeamMemberIds.has(s.id)
        );
    }, [modals.editTeamModal.team, modals.editTeamModal.members, getAllEnrolledStudents, permanentTeams, weeklyTeams]);

    // Filter section students by search
    const getFilteredSectionStudents = useCallback((sectionId: number) => {
        const students = sectionStudents[sectionId] || [];
        if (!sectionSearchQuery.trim()) return students;
        const query = sectionSearchQuery.toLowerCase();
        return students.filter(s =>
            s.student_id.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    }, [sectionStudents, sectionSearchQuery]);

    // Filter available students by search
    const filteredStudents = useCallback(() => {
        const available = getAvailableStudents();
        if (!modals.studentModal.searchQuery.trim()) return available;
        const query = modals.studentModal.searchQuery.toLowerCase();
        return available.filter(s =>
            s.student_id.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    }, [getAvailableStudents, modals.studentModal.searchQuery]);

    // ============================================
    // Effects
    // ============================================

    // Initialize data on mount
    useEffect(() => {
        initializeData();
    }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch section students when course sections load
    useEffect(() => {
        if (course?.sections && course.sections.length > 0) {
            fetchAllSectionStudents();
        }
    }, [course?.sections, fetchAllSectionStudents]);

    // Refresh data when changing tabs
    useEffect(() => {
        refreshForTab(activeTab);
    }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // ============================================
    // UI Handlers
    // ============================================

    const toggleSection = useCallback((sectionId: number) => {
        if (expandedSections.includes(sectionId)) {
            setExpandedSections(expandedSections.filter(id => id !== sectionId));
        } else {
            setExpandedSections([...expandedSections, sectionId]);
            if (!sectionStudents[sectionId]) {
                fetchSectionStudents(sectionId);
            }
        }
    }, [expandedSections, sectionStudents, fetchSectionStudents]);

    const toggleAssignment = useCallback((assignmentId: number) => {
        if (expandedAssignments.includes(assignmentId)) {
            setExpandedAssignments(expandedAssignments.filter(id => id !== assignmentId));
        } else {
            setExpandedAssignments([...expandedAssignments, assignmentId]);
        }
    }, [expandedAssignments]);

    // ============================================
    // Action Handlers (Bridge to hooks)
    // ============================================

    const handleAddSection = async () => {
        modals.setIsSubmitting(true);
        const success = await classroomActions.addSection(
            modals.sectionModal.sectionNo,
            modals.sectionModal.note
        );
        modals.setIsSubmitting(false);
        if (success) modals.sectionModal.reset();
    };

    const confirmRemoveSection = async () => {
        if (!modals.deleteModal.target?.sectionId) return;
        modals.setIsSubmitting(true);
        const success = await classroomActions.removeSection(modals.deleteModal.target.sectionId);
        modals.setIsSubmitting(false);
        if (success) modals.deleteModal.reset();
    };

    const handleAddTA = async () => {
        modals.setIsSubmitting(true);
        const success = await classroomActions.addTAs(modals.taModal.selectedIds);
        modals.setIsSubmitting(false);
        if (success) modals.taModal.reset();
    };

    const confirmRemoveTA = async () => {
        if (!modals.deleteModal.target?.taId) return;
        modals.setIsSubmitting(true);
        const success = await classroomActions.removeTA(modals.deleteModal.target.taId);
        modals.setIsSubmitting(false);
        if (success) modals.deleteModal.reset();
    };

    const handleAddInstructors = async () => {
        modals.setIsSubmitting(true);
        const success = await classroomActions.addInstructors(modals.instructorModal.selectedIds);
        modals.setIsSubmitting(false);
        if (success) modals.instructorModal.reset();
    };

    const confirmRemoveInstructor = async () => {
        if (!(modals.deleteModal.target as any)?.instructorId) return;
        modals.setIsSubmitting(true);
        const success = await classroomActions.removeInstructor((modals.deleteModal.target as any).instructorId);
        modals.setIsSubmitting(false);
        if (success) modals.deleteModal.reset();
    };

    const handleAddStudent = async () => {
        if (!modals.studentModal.sectionId || !modals.studentModal.studentId) {
            addToast({
                title: "ข้อมูลไม่ครบ",
                description: "กรุณาเลือกนักศึกษา",
                color: "warning",
            });
            return;
        }
        modals.setIsSubmitting(true);
        const success = await classroomActions.addStudentToSection(
            modals.studentModal.sectionId,
            parseInt(modals.studentModal.studentId)
        );
        modals.setIsSubmitting(false);
        if (success) modals.studentModal.reset();
    };

    const handleBulkAddStudents = async () => {
        const studentsToAdd = modals.studentModal.parsedStudents
            .filter(p => p.status === "matched" && p.matchedStudent)
            .map(p => p.matchedStudent!.id);
        
        if (studentsToAdd.length === 0 || !modals.studentModal.sectionId) return;
        
        modals.setIsSubmitting(true);
        const success = await classroomActions.bulkAddStudentsToSection(
            modals.studentModal.sectionId,
            studentsToAdd
        );
        modals.setIsSubmitting(false);
        if (success) modals.studentModal.reset();
    };

    const confirmRemoveStudent = async () => {
        if (!modals.deleteModal.target?.sectionId || !modals.deleteModal.target?.studentId) return;
        modals.setIsSubmitting(true);
        const success = await classroomActions.removeStudentFromSection(
            modals.deleteModal.target.sectionId,
            modals.deleteModal.target.studentId
        );
        modals.setIsSubmitting(false);
        if (success) modals.deleteModal.reset();
    };

    const handleCreateTeam = async () => {
        modals.setIsSubmitting(true);
        
        if (modals.teamModal.formationMethod === "manual") {
            const success = await classroomActions.createTeam(
                modals.teamModal.type,
                modals.teamModal.name,
                modals.teamModal.members,
                modals.teamModal.type === "weekly" ? selectedWeek : undefined
            );
            if (success) modals.teamModal.reset();
        } else {
            // Random team creation
            const unassigned = getUnassignedStudents(
                modals.teamModal.type,
                modals.teamModal.type === "weekly" ? selectedWeek : undefined
            );
            const baseName = modals.teamModal.type === "permanent" ? "กลุ่มถาวร" : `กลุ่มสัปดาห์ ${selectedWeek}`;
            await classroomActions.createRandomTeams(
                modals.teamModal.type,
                unassigned,
                modals.teamModal.size,
                baseName,
                modals.teamModal.type === "weekly" ? selectedWeek : undefined
            );
            modals.teamModal.reset();
        }
        
        modals.setIsSubmitting(false);
    };

    const saveEditedTeam = async () => {
        if (!modals.editTeamModal.team) return;
        modals.setIsSubmitting(true);
        const success = await classroomActions.updateTeam(
            modals.editTeamModal.team.id,
            modals.editTeamModal.name,
            modals.editTeamModal.members
        );
        modals.setIsSubmitting(false);
        if (success) modals.editTeamModal.reset();
    };

    const confirmDeleteTeam = async () => {
        if (!modals.deleteModal.target?.teamId) return;
        modals.setIsSubmitting(true);
        const success = await classroomActions.deleteTeam(modals.deleteModal.target.teamId);
        modals.setIsSubmitting(false);
        if (success) modals.deleteModal.reset();
    };

    const confirmBulkDeleteTeams = async () => {
        const teamsToDelete = weeklyTeams[selectedWeek] || [];
        if (teamsToDelete.length === 0) return;
        
        modals.setIsSubmitting(true);
        await classroomActions.bulkDeleteTeams(teamsToDelete.map(t => t.id));
        modals.setIsSubmitting(false);
        modals.bulkDeleteModal.setIsOpen(false);
    };

    const handleCopyTeamsFromWeek = async (sourceWeek: number) => {
        modals.setIsSubmitting(true);
        await classroomActions.copyTeamsFromWeek(sourceWeek, selectedWeek);
        modals.setIsSubmitting(false);
    };

    // Parse Excel data for students
    const parseExcelData = useCallback((pasteData: string) => {
        if (!pasteData.trim() || !modals.studentModal.sectionId) {
            modals.studentModal.setParsedStudents([]);
            return;
        }

        const lines = pasteData
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const enrolledStudentIds = new Set(
            (sectionStudents[modals.studentModal.sectionId] || []).map(s => s.student_id)
        );

        const results = lines.map(inputValue => {
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

        modals.studentModal.setParsedStudents(results);
    }, [studentsList, sectionStudents, modals.studentModal]);

    // Parse Excel data for team members
    const parseTeamExcelData = useCallback(async (pasteData: string) => {
        if (!pasteData.trim()) {
            modals.teamModal.setParsedMembers([]);
            return;
        }

        const lines = pasteData
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            modals.teamModal.setParsedMembers([]);
            return;
        }

        modals.teamModal.setIsParsing(true);

        try {
            const sectionFilter = selectedSectionForTeam === "all" 
                ? "all" 
                : course?.sections?.find(s => s.id === selectedSectionForTeam)?.section_no;
            
            const response = await classroomActions.searchStudentsByIds(lines, sectionFilter);
            
            if (!response.success || !response.data) {
                modals.teamModal.setIsParsing(false);
                return;
            }

            const unassignedStudents = getUnassignedStudents(
                modals.teamModal.type,
                modals.teamModal.type === "weekly" ? selectedWeek : undefined
            );
            const unassignedIds = new Set(unassignedStudents.map(s => s.id));

            const results: Array<{
                inputValue: string;
                matchedStudent: TeamMember | null;
                status: "matched" | "not_found" | "already_in_team";
            }> = [];

            response.data.found.forEach((item: any) => {
                const student = item.student;
                const teamMember: TeamMember = {
                    id: student.id,
                    student_id: student.student_id,
                    full_name: student.full_name,
                };

                if (unassignedIds.has(student.id)) {
                    results.push({
                        inputValue: item.query,
                        matchedStudent: teamMember,
                        status: "matched",
                    });
                } else {
                    const existingTeam = findStudentTeam(
                        student.id,
                        modals.teamModal.type,
                        modals.teamModal.type === "weekly" ? selectedWeek : undefined
                    );
                    results.push({
                        inputValue: item.query,
                        matchedStudent: teamMember,
                        status: existingTeam ? "already_in_team" : "matched",
                    });
                }
            });

            response.data.not_found.forEach((inputValue: string) => {
                results.push({
                    inputValue,
                    matchedStudent: null,
                    status: "not_found",
                });
            });

            modals.teamModal.setParsedMembers(results);

            const matchedIds = results
                .filter(r => r.status === "matched" && r.matchedStudent)
                .map(r => r.matchedStudent!.id);
            modals.teamModal.setMembers(matchedIds);

        } catch (error) {
            console.error("Error parsing team members:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถค้นหานักศึกษาได้",
                color: "danger",
            });
            modals.teamModal.setParsedMembers([]);
        } finally {
            modals.teamModal.setIsParsing(false);
        }
    }, [course?.sections, selectedSectionForTeam, selectedWeek, getUnassignedStudents, findStudentTeam, classroomActions, modals.teamModal]);

    // Open modals helpers
    const openAddStudentModal = useCallback((sectionId: number) => {
        modals.studentModal.setSectionId(sectionId);
        modals.studentModal.setStudentId("");
        modals.studentModal.setSearchQuery("");
        modals.studentModal.setIsOpen(true);
    }, [modals.studentModal]);

    const handleRemoveSection = useCallback((sectionId: number) => {
        const section = course?.sections?.find(s => s.id === sectionId);
        if (!section) return;
        modals.deleteModal.open("section", {
            sectionId: sectionId,
            sectionNo: section.section_no,
            sectionStudentCount: section.studentCount || 0
        });
    }, [course?.sections, modals.deleteModal]);

    const handleRemoveTA = useCallback((userId: number) => {
        const ta = course?.tas?.find(t => t.id === userId);
        if (!ta) return;
        modals.deleteModal.open("ta", {
            taId: userId,
            taName: ta.full_name,
            taEmail: ta.email || ta.username,
            taAvatar: ta.avatar || undefined,
        });
    }, [course?.tas, modals.deleteModal]);

    const handleRemoveInstructor = useCallback((userId: number) => {
        const instructor = course?.instructors?.find(i => i.id === userId);
        if (!instructor) return;
        modals.deleteModal.open("instructor" as any, {
            instructorId: userId,
            instructorName: instructor.full_name,
            instructorEmail: instructor.email || undefined,
        } as any);
    }, [course?.instructors, modals.deleteModal]);

    const openDeleteStudentModal = useCallback((sectionId: number, student: SectionStudent) => {
        const section = course?.sections?.find(s => s.id === sectionId);
        modals.deleteModal.open("student", {
            studentId: student.id,
            studentName: student.full_name,
            studentCode: student.student_id,
            sectionId: sectionId,
            sectionNo: section?.section_no
        });
    }, [course?.sections, modals.deleteModal]);

    const openDeleteTeamModal = useCallback((teamId: number, teamType: "permanent" | "weekly", weekNumber?: number) => {
        let team: PermanentTeam | WeeklyTeam | undefined;
        if (teamType === "permanent") {
            team = permanentTeams.find(t => t.id === teamId);
        } else if (weekNumber !== undefined) {
            team = weeklyTeams[weekNumber]?.find(t => t.id === teamId);
        }
        if (team) {
            modals.deleteModal.open("team", {
                teamId: team.id,
                teamName: team.name,
                teamType: teamType,
                weekNumber: weekNumber,
                teamMembers: team.members
            });
        }
    }, [permanentTeams, weeklyTeams, modals.deleteModal]);

    const openEditTeamModal = useCallback((teamId: number, teamType: "permanent" | "weekly", weekNumber?: number) => {
        let team: PermanentTeam | WeeklyTeam | undefined;
        if (teamType === "permanent") {
            team = permanentTeams.find(t => t.id === teamId);
        } else if (weekNumber !== undefined) {
            team = weeklyTeams[weekNumber]?.find(t => t.id === teamId);
        }
        if (team) {
            modals.editTeamModal.open({
                id: team.id,
                name: team.name,
                type: teamType,
                weekNumber: weekNumber,
                members: team.members,
            });
        }
    }, [permanentTeams, weeklyTeams, modals.editTeamModal]);

    const openBulkDeleteModal = useCallback(() => {
        const teamsToDelete = weeklyTeams[selectedWeek];
        if (!teamsToDelete || teamsToDelete.length === 0) {
            addToast({
                title: "ไม่มีกลุ่มที่จะลบ",
                description: "ไม่พบกลุ่มในสัปดาห์ที่เลือก",
                color: "warning",
            });
            return;
        }
        modals.bulkDeleteModal.setIsOpen(true);
    }, [selectedWeek, weeklyTeams, modals.bulkDeleteModal]);

    // TA selection helpers
    const toggleTASelection = useCallback((taId: number) => {
        const current = modals.taModal.selectedIds;
        if (current.includes(taId)) {
            modals.taModal.setSelectedIds(current.filter(id => id !== taId));
        } else {
            modals.taModal.setSelectedIds([...current, taId]);
        }
    }, [modals.taModal]);

    const selectAllAvailableTAs = useCallback(() => {
        const existingTAIds = course?.tas?.map(ta => ta.id) || [];
        const availableTAIds = tasList
            .filter(ta => !existingTAIds.includes(ta.id))
            .map(ta => ta.id);
        modals.taModal.setSelectedIds(availableTAIds);
    }, [course?.tas, tasList, modals.taModal]);

    const clearTASelection = useCallback(() => {
        modals.taModal.setSelectedIds([]);
    }, [modals.taModal]);

    // Instructor selection helpers
    const selectAllInstructors = useCallback(() => {
        const existingIds = course?.instructors?.map(i => i.id) || [];
        const availableIds = instructorsList
            .filter(inst => !existingIds.includes(inst.id))
            .map(inst => inst.id);
        modals.instructorModal.setSelectedIds(availableIds);
    }, [course?.instructors, instructorsList, modals.instructorModal]);

    const clearInstructorSelection = useCallback(() => {
        modals.instructorModal.setSelectedIds([]);
    }, [modals.instructorModal]);

    // ============================================
    // Menu Items
    // ============================================

    const menuItems = useMemo(() => [
        { key: "overview", label: "ภาพรวม", icon: "solar:chart-2-bold" },
        { key: "sections", label: "กลุ่มเรียน", icon: "solar:notebook-bold" },
        { key: "people", label: "บุคลากร", icon: "solar:users-group-rounded-bold" },
        { key: "assignments", label: "งานในชั้นเรียน", icon: "solar:clipboard-list-bold", badge: assignments.length > 0 ? assignments.length : undefined },
        { key: "scores", label: "คะแนนในชั้นเรียน", icon: "solar:chart-square-bold" },
        ...(userRole === 'instructor' ? [{
            key: "approval",
            label: "อนุมัติคะแนน",
            icon: "solar:clipboard-check-bold",
            badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
            badgeColor: "warning" as const,
        }] : []),
        { key: "attendance", label: "เช็คชื่อ", icon: "solar:user-check-bold" },
        { key: "queue", label: "คิวตรวจงาน", icon: "solar:sort-by-time-bold", badge: 'เร็ว ๆ นี้', status: "coming_soon", badgeColor: "warning" as const },
        ...(userRole === 'instructor' ? [{
            key: "settings",
            label: "ตั้งค่ารายวิชา",
            icon: "solar:settings-bold",
        }] : []),
    ], [assignments.length, userRole, pendingApprovalCount]);

    // ============================================
    // Render
    // ============================================

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
                        {isLoading ? (
                            <>
                                <div className="h-5 w-32 bg-white/20 rounded animate-pulse" />
                                <div className="h-3 w-20 bg-white/20 rounded animate-pulse mt-1" />
                            </>
                        ) : course ? (
                            <>
                                <h1 className="text-white font-semibold truncate">{course.name}</h1>
                                <p className="text-white/70 text-xs">{course.code}</p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-white font-semibold truncate">ไม่พบรายวิชา</h1>
                                <p className="text-white/70 text-xs">Course not found</p>
                            </>
                        )}
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
                                {isLoading ? (
                                    <div className="h-6 w-20 bg-white/20 rounded animate-pulse" />
                                ) : course ? (
                                    <Chip size="sm" className="bg-white/20 text-white border-0">
                                        {course.code}
                                    </Chip>
                                ) : (
                                    <Chip size="sm" className="bg-red-500/30 text-white border-0">
                                        N/A
                                    </Chip>
                                )}
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
                            {isLoading ? (
                                <>
                                    <div className="h-6 w-48 bg-white/20 rounded animate-pulse mb-2" />
                                    <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
                                </>
                            ) : course ? (
                                <>
                                    <h2 className="text-white font-bold text-lg leading-tight mb-1">{course.name}</h2>
                                    <p className="text-white/70 text-sm">{course.year}/{course.semester === 3 ? "ฤดูร้อน" : course.semester}</p>
                                    {course.instructor && (
                                        <p className="text-white/60 text-xs mt-2">{course.instructor.full_name}</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h2 className="text-white font-bold text-lg leading-tight mb-1">ไม่พบรายวิชา</h2>
                                    <p className="text-white/70 text-sm">กรุณาตรวจสอบลิงก์อีกครั้ง</p>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Items */}
                        <nav className="p-3">
                            {menuItems.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        if ((item as any).status !== "coming_soon") {
                                            setActiveTab(item.key);
                                            setIsMobileSidebarOpen(false);
                                        }
                                    }}
                                    disabled={(item as any).status === "coming_soon"}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${activeTab === item.key
                                            ? "bg-blue-50 text-blue-600"
                                            : "text-slate-600 hover:bg-slate-50"
                                        } ${(item as any).status === "coming_soon" ? "cursor-not-allowed opacity-50 bg-slate-50" : "cursor-pointer"}`}
                                >
                                    <Icon icon={item.icon} className="text-xl" />
                                    <span className="font-medium">{item.label}</span>
                                    {item.badge && (
                                        <Chip 
                                            size="sm" 
                                            variant="flat" 
                                            color={(item as any).badgeColor || "primary"}
                                            className="h-5 min-w-5 px-1 ml-auto"
                                        >
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
                    {/* Navigation Menu */}
                    <nav className="flex-1 p-3">
                        {menuItems.map((item) => (
                            <button
                                key={item.key}
                                disabled={(item as any).status === "coming_soon"}
                                onClick={() => {
                                    if ((item as any).status !== "coming_soon") {
                                        setActiveTab(item.key);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${activeTab === item.key
                                        ? "bg-blue-50 text-blue-600 font-medium"
                                        : "text-slate-600 hover:bg-slate-50"
                                    } ${(item as any).status === "coming_soon" ? "cursor-not-allowed opacity-50 bg-slate-50" : "cursor-pointer"}`}
                            >
                                <Icon icon={item.icon} className={`text-lg ${activeTab === item.key ? "text-blue-500" : "text-slate-400"}`} />
                                <span className="text-sm">{item.label}</span>
                                {item.badge && (
                                    <Chip 
                                        size="sm" 
                                        variant="flat" 
                                        color={(item as any).badgeColor || "primary"}
                                        className="h-5 min-w-5 px-1 ml-auto text-xs"
                                    >
                                        {item.badge}
                                    </Chip>
                                )}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area - Add left margin for fixed sidebar */}
                <main className="flex-1 lg:ml-64 overflow-x-hidden">
                    <div className="p-4 lg:p-6">
                        {/* Error State - Course Not Found */}
                        {!isLoading && !course && (
                            <div className="flex items-center justify-center min-h-[60vh]">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icon icon="solar:danger-triangle-bold" className="text-4xl text-red-500" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-700 mb-2">ไม่พบข้อมูลรายวิชา</h2>
                                    <p className="text-slate-500 mb-6">รายวิชานี้อาจถูกลบไปแล้ว หรือคุณไม่มีสิทธิ์เข้าถึง</p>
                                    <div className="flex gap-3 justify-center">
                                        <Button
                                            color="primary"
                                            variant="flat"
                                            onPress={() => window.history.back()}
                                            startContent={<Icon icon="solar:arrow-left-linear" />}
                                        >
                                            กลับหน้าก่อน
                                        </Button>
                                        <Button
                                            color="primary"
                                            onPress={() => window.location.href = '/home'}
                                            startContent={<Icon icon="solar:home-2-linear" />}
                                        >
                                            หน้าหลัก
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Content - Only show when course is loaded */}
                        {course && (
                            <>
                    {activeTab === "overview" && (
                                <OverviewTab
                                    course={course}
                                    overview={overview}
                                    isLoading={isOverviewLoading}
                                    userRole={userRole}
                                    assignments={assignments}
                                    onNavigateToAssignments={() => setActiveTab("assignments")}
                                />
                            )}

                            {activeTab === "sections" && (
                                <SectionsTab courseId={courseId} />
                            )}

                            {activeTab === "people" && (
                                <PeopleTab
                                    course={course}
                                    isLoading={isPeopleLoading}
                                    isPeopleLoading={isPeopleLoading}
                                    onOpenAddTAModal={() => modals.taModal.setIsOpen(true)}
                                    onOpenAddInstructorModal={() => modals.instructorModal.setIsOpen(true)}
                                    onRemoveTA={handleRemoveTA}
                                    onRemoveInstructor={handleRemoveInstructor}
                                    userRole={userRole}
                                    currentUserId={currentUserId}
                                />
                            )}

                            {activeTab === "assignments" && (
                                <AssignmentsTab
                                    assignments={assignments}
                                    setAssignments={setAssignments}
                                    isLoading={isAssignmentsLoading}
                                    expandedAssignments={expandedAssignments}
                                    setExpandedAssignments={setExpandedAssignments}
                                    onOpenCreateModal={() => setEditingAssignment(null)}
                                    onOpenEditModal={(assignment) => setEditingAssignment(assignment)}
                                    onOpenScoreModal={(assignment) => {
                                        setScoreModalAssignment(assignment);
                                        modals.scoreModals.setIsScoreModalOpen(true);
                                    }}
                                    onOpenBonusScoreModal={() => modals.scoreModals.setIsBonusScoreModalOpen(true)}
                                    onAssignmentDeleted={() => {
                                        fetchAssignments(true);
                                        fetchOverview(true);
                                    }}
                                />
                            )}

                            {activeTab === "scores" && (
                                <ScoresTab courseId={courseId} />
                            )}

                            {activeTab === "approval" && userRole === "instructor" && (
                                <ScoreApprovalTab
                                    courseId={courseId}
                                    onPendingCountChange={setPendingApprovalCount}
                                />
                            )}

                            {activeTab === "attendance" && (
                                <AttendanceTab
                                    course={course}
                                    isLoading={isOverviewLoading}
                                    onAttendanceChanged={() => fetchOverview(true)}
                                />
                            )}

                            {activeTab === "settings" && userRole === "instructor" && (
                                <SettingsTab
                                    course={course}
                                    onCourseUpdate={(updatedCourse) => setCourse(updatedCourse)}
                                />
                            )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Score Modal */}
            <ScoreModal
                isOpen={modals.scoreModals.isScoreModalOpen}
                onClose={() => {
                    modals.scoreModals.setIsScoreModalOpen(false);
                    setScoreModalAssignment(null);
                }}
                assignment={scoreModalAssignment}
                courseId={courseId}
                onScoreSubmitted={() => {
                    fetchOverview(true);
                    if (scores.selectedAssignment) {
                        scores.fetchScores(scores.selectedAssignment);
                    }
                }}
            />

            {/* Bonus Score Modal */}
            <BonusScoreModal
                isOpen={modals.scoreModals.isBonusScoreModalOpen}
                onClose={() => modals.scoreModals.setIsBonusScoreModalOpen(false)}
                courseId={courseId}
            />

            {/* Add Section Modal */}
            <Modal 
                isOpen={modals.sectionModal.isOpen} 
                onClose={modals.sectionModal.reset}
                size="md"
            >
                <ModalContent>
                    <ModalHeader>เพิ่มกลุ่มเรียน</ModalHeader>
                    <ModalBody>
                        <Input
                            label="หมายเลขกลุ่มเรียน"
                            placeholder="เช่น 1, 2, 801"
                            value={modals.sectionModal.sectionNo}
                            onValueChange={modals.sectionModal.setSectionNo}
                            isRequired
                        />
                        <Input
                            label="หมายเหตุ (ถ้ามี)"
                            placeholder="เช่น กลุ่มพิเศษ"
                            value={modals.sectionModal.note}
                            onValueChange={modals.sectionModal.setNote}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.sectionModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleAddSection}
                            isLoading={modals.isSubmitting}
                        >
                            เพิ่มกลุ่มเรียน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add TA Modal */}
            <Modal 
                isOpen={modals.taModal.isOpen} 
                onClose={modals.taModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>เพิ่มผู้ช่วยสอน</ModalHeader>
                    <ModalBody>
                        <Input
                            placeholder="ค้นหาผู้ช่วยสอน..."
                            value={modals.taModal.searchQuery}
                            onValueChange={modals.taModal.setSearchQuery}
                            startContent={<Icon icon="solar:magnifer-linear" />}
                        />
                        <div className="flex gap-2 mb-2">
                            <Button size="sm" variant="flat" onPress={selectAllAvailableTAs}>
                                เลือกทั้งหมด
                            </Button>
                            <Button size="sm" variant="flat" onPress={clearTASelection}>
                                ล้างการเลือก
                            </Button>
                            <Chip size="sm" variant="flat" color="primary">
                                เลือกแล้ว {modals.taModal.selectedIds.length} คน
                            </Chip>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                            {availableTAs
                                .filter(ta => {
                                    if (!modals.taModal.searchQuery) return true;
                                    const query = modals.taModal.searchQuery.toLowerCase();
                                    return ta.full_name.toLowerCase().includes(query) ||
                                           ta.email?.toLowerCase().includes(query) ||
                                           ta.username.toLowerCase().includes(query);
                                })
                                .map(ta => (
                                    <Card
                                        key={ta.id}
                                        isPressable
                                        onPress={() => toggleTASelection(ta.id)}
                                        className={`${modals.taModal.selectedIds.includes(ta.id) ? "border-primary bg-primary-50" : ""}`}
                                    >
                                        <CardBody className="p-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={ta.avatar || undefined}
                                                    name={ta.full_name}
                                                    size="sm"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium">{ta.full_name}</p>
                                                    <p className="text-xs text-slate-500">{ta.email || ta.username}</p>
                                                </div>
                                                {modals.taModal.selectedIds.includes(ta.id) && (
                                                    <FaCheckCircle className="text-primary" />
                                                )}
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.taModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleAddTA}
                            isLoading={modals.isSubmitting}
                            isDisabled={modals.taModal.selectedIds.length === 0}
                        >
                            เพิ่มผู้ช่วยสอน ({modals.taModal.selectedIds.length})
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Instructor Modal */}
            <Modal 
                isOpen={modals.instructorModal.isOpen} 
                onClose={modals.instructorModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>เพิ่มอาจารย์ผู้สอน</ModalHeader>
                    <ModalBody>
                        <Input
                            placeholder="ค้นหาอาจารย์..."
                            value={modals.instructorModal.searchQuery}
                            onValueChange={modals.instructorModal.setSearchQuery}
                            startContent={<Icon icon="solar:magnifer-linear" />}
                        />
                        <div className="flex gap-2 mb-2">
                            <Button size="sm" variant="flat" onPress={selectAllInstructors}>
                                เลือกทั้งหมด
                            </Button>
                            <Button size="sm" variant="flat" onPress={clearInstructorSelection}>
                                ล้างการเลือก
                            </Button>
                            <Chip size="sm" variant="flat" color="primary">
                                เลือกแล้ว {modals.instructorModal.selectedIds.length} คน
                            </Chip>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                            {filteredInstructors.map(instructor => (
                                <Card
                                    key={instructor.id}
                                    isPressable
                                    onPress={() => {
                                        const current = modals.instructorModal.selectedIds;
                                        if (current.includes(instructor.id)) {
                                            modals.instructorModal.setSelectedIds(current.filter(id => id !== instructor.id));
                                        } else {
                                            modals.instructorModal.setSelectedIds([...current, instructor.id]);
                                        }
                                    }}
                                    className={`${modals.instructorModal.selectedIds.includes(instructor.id) ? "border-primary bg-primary-50" : ""}`}
                                >
                                    <CardBody className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                src={instructor.avatar || undefined}
                                                name={instructor.full_name}
                                                size="sm"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium">{instructor.full_name}</p>
                                                <p className="text-xs text-slate-500">{instructor.email}</p>
                                            </div>
                                            {modals.instructorModal.selectedIds.includes(instructor.id) && (
                                                <FaCheckCircle className="text-primary" />
                                            )}
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.instructorModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleAddInstructors}
                            isLoading={modals.isSubmitting}
                            isDisabled={modals.instructorModal.selectedIds.length === 0}
                        >
                            เพิ่มอาจารย์ ({modals.instructorModal.selectedIds.length})
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Student Modal */}
            <Modal 
                isOpen={modals.studentModal.isOpen} 
                onClose={modals.studentModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        เพิ่มนักศึกษา - กลุ่มเรียน {course?.sections?.find(s => s.id === modals.studentModal.sectionId)?.section_no}
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex gap-2 mb-4">
                            <Button
                                size="sm"
                                variant={modals.studentModal.mode === "select" ? "solid" : "flat"}
                                color={modals.studentModal.mode === "select" ? "primary" : "default"}
                                onPress={() => modals.studentModal.setMode("select")}
                            >
                                เลือกจากรายชื่อ
                            </Button>
                            <Button
                                size="sm"
                                variant={modals.studentModal.mode === "paste" ? "solid" : "flat"}
                                color={modals.studentModal.mode === "paste" ? "primary" : "default"}
                                onPress={() => modals.studentModal.setMode("paste")}
                            >
                                วางจาก Excel
                            </Button>
                        </div>

                        {modals.studentModal.mode === "select" ? (
                            <>
                                <Input
                                    placeholder="ค้นหานักศึกษา..."
                                    value={modals.studentModal.searchQuery}
                                    onValueChange={modals.studentModal.setSearchQuery}
                                    startContent={<Icon icon="solar:magnifer-linear" />}
                                />
                                <Select
                                    label="เลือกนักศึกษา"
                                    placeholder="เลือกนักศึกษา"
                                    selectedKeys={modals.studentModal.studentId ? [modals.studentModal.studentId] : []}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0] as string;
                                        modals.studentModal.setStudentId(selected || "");
                                    }}
                                >
                                    {filteredStudents().map(student => (
                                        <SelectItem key={String(student.id)} textValue={`${student.student_id} - ${student.full_name}`}>
                                            <div className="flex items-center gap-2">
                                                <Avatar size="sm" name={student.full_name} />
                                                <div>
                                                    <p className="font-medium">{student.student_id}</p>
                                                    <p className="text-xs text-slate-500">{student.full_name}</p>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </Select>
                            </>
                        ) : (
                            <>
                                <Input
                                    label="วางรายชื่อจาก Excel"
                                    placeholder="วางรหัสนักศึกษา (แต่ละบรรทัด)"
                                    value={modals.studentModal.excelData}
                                    onValueChange={(value) => {
                                        modals.studentModal.setExcelData(value);
                                        parseExcelData(value);
                                    }}
                                    description="วางรหัสนักศึกษา หรือชื่อ-นามสกุล หนึ่งรายการต่อบรรทัด"
                                />
                                {modals.studentModal.parsedStudents.length > 0 && (
                                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                                        {modals.studentModal.parsedStudents.map((item, index) => (
                                            <div 
                                                key={index}
                                                className={`p-2 rounded-lg border ${
                                                    item.status === "matched" ? "border-green-200 bg-green-50" :
                                                    item.status === "already_enrolled" ? "border-amber-200 bg-amber-50" :
                                                    "border-red-200 bg-red-50"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">{item.inputValue}</span>
                                                    {item.status === "matched" && item.matchedStudent && (
                                                        <span className="text-xs text-green-600">
                                                            → {item.matchedStudent.student_id} {item.matchedStudent.full_name}
                                                        </span>
                                                    )}
                                                    {item.status === "already_enrolled" && (
                                                        <span className="text-xs text-amber-600">ลงทะเบียนแล้ว</span>
                                                    )}
                                                    {item.status === "not_found" && (
                                                        <span className="text-xs text-red-600">ไม่พบ</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex gap-2 mt-2">
                                            <Chip size="sm" color="success" variant="flat">
                                                พบ {modals.studentModal.parsedStudents.filter(p => p.status === "matched").length}
                                            </Chip>
                                            <Chip size="sm" color="warning" variant="flat">
                                                ซ้ำ {modals.studentModal.parsedStudents.filter(p => p.status === "already_enrolled").length}
                                            </Chip>
                                            <Chip size="sm" color="danger" variant="flat">
                                                ไม่พบ {modals.studentModal.parsedStudents.filter(p => p.status === "not_found").length}
                                            </Chip>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.studentModal.reset}>
                            ยกเลิก
                        </Button>
                        {modals.studentModal.mode === "select" ? (
                            <Button 
                                color="primary" 
                                onPress={handleAddStudent}
                                isLoading={modals.isSubmitting}
                                isDisabled={!modals.studentModal.studentId}
                            >
                                เพิ่มนักศึกษา
                            </Button>
                        ) : (
                            <Button 
                                color="primary" 
                                onPress={handleBulkAddStudents}
                                isLoading={modals.isSubmitting}
                                isDisabled={modals.studentModal.parsedStudents.filter(p => p.status === "matched").length === 0}
                            >
                                เพิ่ม {modals.studentModal.parsedStudents.filter(p => p.status === "matched").length} คน
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal 
                isOpen={modals.deleteModal.isOpen} 
                onClose={modals.deleteModal.reset}
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="text-danger">
                        {modals.deleteModal.type === "student" && "ยืนยันการนำนักศึกษาออก"}
                        {modals.deleteModal.type === "section" && "ยืนยันการลบกลุ่มเรียน"}
                        {modals.deleteModal.type === "team" && "ยืนยันการลบกลุ่ม"}
                        {modals.deleteModal.type === "ta" && "ยืนยันการนำผู้ช่วยสอนออก"}
                        {modals.deleteModal.type === "instructor" && "ยืนยันการนำอาจารย์ออก"}
                    </ModalHeader>
                    <ModalBody>
                        {modals.deleteModal.type === "student" && modals.deleteModal.target && (
                            <p>
                                ต้องการนำ <strong>{modals.deleteModal.target.studentName}</strong> ({modals.deleteModal.target.studentCode}) 
                                ออกจากกลุ่มเรียน {modals.deleteModal.target.sectionNo} หรือไม่?
                            </p>
                        )}
                        {modals.deleteModal.type === "section" && modals.deleteModal.target && (
                            <div>
                                <p>ต้องการลบกลุ่มเรียน <strong>{modals.deleteModal.target.sectionNo}</strong> หรือไม่?</p>
                                {(modals.deleteModal.target.sectionStudentCount || 0) > 0 && (
                                    <p className="text-danger mt-2">
                                        ⚠️ กลุ่มนี้มีนักศึกษา {modals.deleteModal.target.sectionStudentCount} คน จะถูกนำออกด้วย
                                    </p>
                                )}
                            </div>
                        )}
                        {modals.deleteModal.type === "team" && modals.deleteModal.target && (
                            <div>
                                <p>ต้องการลบกลุ่ม <strong>{modals.deleteModal.target.teamName}</strong> หรือไม่?</p>
                                {modals.deleteModal.target.teamMembers && modals.deleteModal.target.teamMembers.length > 0 && (
                                    <div className="mt-2 text-sm text-slate-500">
                                        <p>สมาชิก ({modals.deleteModal.target.teamMembers.length} คน):</p>
                                        <ul className="list-disc list-inside">
                                            {modals.deleteModal.target.teamMembers.slice(0, 5).map(m => (
                                                <li key={m.id}>{m.full_name}</li>
                                            ))}
                                            {modals.deleteModal.target.teamMembers.length > 5 && (
                                                <li>และอีก {modals.deleteModal.target.teamMembers.length - 5} คน</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        {modals.deleteModal.type === "ta" && modals.deleteModal.target && (
                            <div className="flex items-center gap-3">
                                <Avatar
                                    src={modals.deleteModal.target.taAvatar}
                                    name={modals.deleteModal.target.taName}
                                    size="lg"
                                />
                                <div>
                                    <p>ต้องการนำ <strong>{modals.deleteModal.target.taName}</strong> ออกจากรายวิชานี้หรือไม่?</p>
                                    <p className="text-sm text-slate-500">{modals.deleteModal.target.taEmail}</p>
                                </div>
                            </div>
                        )}
                        {modals.deleteModal.type === "instructor" && modals.deleteModal.target && (
                            <div className="flex items-center gap-3">
                                <Avatar
                                    src={(modals.deleteModal.target as any).instructorAvatar}
                                    name={(modals.deleteModal.target as any).instructorName}
                                    size="lg"
                                />
                                <div>
                                    <p>ต้องการนำ <strong>{(modals.deleteModal.target as any).instructorName}</strong> ออกจากรายวิชานี้หรือไม่?</p>
                                    <p className="text-sm text-slate-500">{(modals.deleteModal.target as any).instructorEmail}</p>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.deleteModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={() => {
                                switch (modals.deleteModal.type) {
                                    case "student": confirmRemoveStudent(); break;
                                    case "section": confirmRemoveSection(); break;
                                    case "team": confirmDeleteTeam(); break;
                                    case "ta": confirmRemoveTA(); break;
                                    case "instructor": confirmRemoveInstructor(); break;
                                }
                            }}
                            isLoading={modals.isSubmitting}
                        >
                            {modals.deleteModal.type === "section" ? "ลบกลุ่มเรียน" : 
                             modals.deleteModal.type === "team" ? "ลบกลุ่ม" : "นำออก"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Bulk Delete Teams Modal */}
            <Modal 
                isOpen={modals.bulkDeleteModal.isOpen} 
                onClose={() => modals.bulkDeleteModal.setIsOpen(false)}
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="text-danger">ยืนยันการลบกลุ่มทั้งหมด</ModalHeader>
                    <ModalBody>
                        <p>
                            ต้องการลบกลุ่มทั้งหมด {(weeklyTeams[selectedWeek] || []).length} กลุ่ม 
                            ในสัปดาห์ที่ {selectedWeek} หรือไม่?
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => modals.bulkDeleteModal.setIsOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={confirmBulkDeleteTeams}
                            isLoading={modals.isSubmitting}
                        >
                            ลบทั้งหมด
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Create Team Modal */}
            <Modal 
                isOpen={modals.teamModal.isOpen} 
                onClose={modals.teamModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        สร้าง{modals.teamModal.type === "permanent" ? "กลุ่มถาวร" : `กลุ่มสัปดาห์ ${selectedWeek}`}
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex gap-2 mb-4">
                            <Button
                                size="sm"
                                variant={modals.teamModal.formationMethod === "manual" ? "solid" : "flat"}
                                color={modals.teamModal.formationMethod === "manual" ? "primary" : "default"}
                                onPress={() => modals.teamModal.setFormationMethod("manual")}
                            >
                                เลือกด้วยตนเอง
                            </Button>
                            <Button
                                size="sm"
                                variant={modals.teamModal.formationMethod === "random" ? "solid" : "flat"}
                                color={modals.teamModal.formationMethod === "random" ? "primary" : "default"}
                                onPress={() => modals.teamModal.setFormationMethod("random")}
                            >
                                สุ่มอัตโนมัติ
                            </Button>
                        </div>

                        {modals.teamModal.formationMethod === "manual" ? (
                            <>
                                <Input
                                    label="ชื่อกลุ่ม"
                                    placeholder="เช่น กลุ่ม 1"
                                    value={modals.teamModal.name}
                                    onValueChange={modals.teamModal.setName}
                                    isRequired
                                />
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        variant={modals.teamModal.memberMode === "select" ? "solid" : "flat"}
                                        color={modals.teamModal.memberMode === "select" ? "primary" : "default"}
                                        onPress={() => modals.teamModal.setMemberMode("select")}
                                    >
                                        เลือกจากรายชื่อ
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={modals.teamModal.memberMode === "paste" ? "solid" : "flat"}
                                        color={modals.teamModal.memberMode === "paste" ? "primary" : "default"}
                                        onPress={() => modals.teamModal.setMemberMode("paste")}
                                    >
                                        วางจาก Excel
                                    </Button>
                                </div>

                                {modals.teamModal.memberMode === "select" ? (
                                    <div className="mt-4">
                                        <p className="text-sm text-slate-500 mb-2">
                                            เลือกสมาชิก ({modals.teamModal.members.length} คน)
                                        </p>
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {getUnassignedStudents(
                                                modals.teamModal.type,
                                                modals.teamModal.type === "weekly" ? selectedWeek : undefined
                                            ).map(student => (
                                                <div
                                                    key={student.id}
                                                    className={`p-2 rounded cursor-pointer transition-colors ${
                                                        modals.teamModal.members.includes(student.id)
                                                            ? "bg-primary-100 border border-primary"
                                                            : "bg-slate-50 hover:bg-slate-100"
                                                    }`}
                                                    onClick={() => {
                                                        const current = modals.teamModal.members;
                                                        if (current.includes(student.id)) {
                                                            modals.teamModal.setMembers(current.filter(id => id !== student.id));
                                                        } else {
                                                            modals.teamModal.setMembers([...current, student.id]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm">{student.student_id} - {student.full_name}</span>
                                                        {modals.teamModal.members.includes(student.id) && (
                                                            <FaCheckCircle className="text-primary" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <Input
                                            label="วางรายชื่อจาก Excel"
                                            placeholder="วางรหัสนักศึกษา (แต่ละบรรทัด)"
                                            value={modals.teamModal.excelData}
                                            onValueChange={(value) => {
                                                modals.teamModal.setExcelData(value);
                                                parseTeamExcelData(value);
                                            }}
                                        />
                                        {modals.teamModal.isParsing && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Spinner size="sm" />
                                                <span className="text-sm text-slate-500">กำลังค้นหา...</span>
                                            </div>
                                        )}
                                        {modals.teamModal.parsedMembers.length > 0 && (
                                            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                {modals.teamModal.parsedMembers.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        className={`p-2 rounded text-sm ${
                                                            item.status === "matched" ? "bg-green-50 text-green-700" :
                                                            item.status === "already_in_team" ? "bg-amber-50 text-amber-700" :
                                                            "bg-red-50 text-red-700"
                                                        }`}
                                                    >
                                                        {item.inputValue}
                                                        {item.matchedStudent && ` → ${item.matchedStudent.full_name}`}
                                                        {item.status === "already_in_team" && " (อยู่ในกลุ่มแล้ว)"}
                                                        {item.status === "not_found" && " (ไม่พบ)"}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <Input
                                    type="number"
                                    label="จำนวนสมาชิกต่อกลุ่ม"
                                    value={String(modals.teamModal.size)}
                                    onValueChange={(v) => modals.teamModal.setSize(parseInt(v) || 3)}
                                    min={2}
                                    max={10}
                                />
                                <p className="text-sm text-slate-500 mt-2">
                                    มีนักศึกษาที่ยังไม่มีกลุ่ม: {getUnassignedStudents(
                                        modals.teamModal.type,
                                        modals.teamModal.type === "weekly" ? selectedWeek : undefined
                                    ).length} คน
                                </p>
                                <p className="text-sm text-slate-500">
                                    จะได้ประมาณ: {Math.ceil(getUnassignedStudents(
                                        modals.teamModal.type,
                                        modals.teamModal.type === "weekly" ? selectedWeek : undefined
                                    ).length / modals.teamModal.size)} กลุ่ม
                                </p>
                            </>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.teamModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleCreateTeam}
                            isLoading={modals.isSubmitting}
                            isDisabled={
                                modals.teamModal.formationMethod === "manual" 
                                    ? (!modals.teamModal.name.trim() || modals.teamModal.members.length === 0)
                                    : getUnassignedStudents(
                                        modals.teamModal.type,
                                        modals.teamModal.type === "weekly" ? selectedWeek : undefined
                                    ).length === 0
                            }
                        >
                            {modals.teamModal.formationMethod === "manual" ? "สร้างกลุ่ม" : "สุ่มสร้างกลุ่ม"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Team Modal */}
            <Modal 
                isOpen={modals.editTeamModal.isOpen} 
                onClose={modals.editTeamModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>แก้ไขกลุ่ม</ModalHeader>
                    <ModalBody>
                        <Input
                            label="ชื่อกลุ่ม"
                            value={modals.editTeamModal.name}
                            onValueChange={modals.editTeamModal.setName}
                            isRequired
                        />
                        <p className="text-sm text-slate-500 mt-4 mb-2">
                            สมาชิก ({modals.editTeamModal.members.length} คน)
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {getAvailableStudentsForEdit().map(student => (
                                <div
                                    key={student.id}
                                    className={`p-2 rounded cursor-pointer transition-colors ${
                                        modals.editTeamModal.members.includes(student.id)
                                            ? "bg-primary-100 border border-primary"
                                            : "bg-slate-50 hover:bg-slate-100"
                                    }`}
                                    onClick={() => {
                                        const current = modals.editTeamModal.members;
                                        if (current.includes(student.id)) {
                                            modals.editTeamModal.setMembers(current.filter(id => id !== student.id));
                                        } else {
                                            modals.editTeamModal.setMembers([...current, student.id]);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">{student.student_id} - {student.full_name}</span>
                                        {modals.editTeamModal.members.includes(student.id) && (
                                            <FaCheckCircle className="text-primary" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={modals.editTeamModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={saveEditedTeam}
                            isLoading={modals.isSubmitting}
                            isDisabled={!modals.editTeamModal.name.trim()}
                        >
                            บันทึก
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Group Score Modal */}
            <Modal 
                isOpen={modals.scoreModals.isGroupScoreModalOpen} 
                onClose={() => modals.scoreModals.setIsGroupScoreModalOpen(false)}
                size="md"
            >
                <ModalContent>
                    <ModalHeader>ให้คะแนนกลุ่ม</ModalHeader>
                    <ModalBody>
                        <Select
                            label="เลือกกลุ่ม"
                            selectedKeys={scores.selectedGroup ? [String(scores.selectedGroup.id)] : []}
                            onSelectionChange={(keys) => {
                                const selectedId = Array.from(keys)[0];
                                const group = scores.groupsForScore.find(g => g.id === Number(selectedId));
                                scores.setSelectedGroup(group || null);
                            }}
                        >
                            {scores.groupsForScore.map(group => (
                                <SelectItem key={String(group.id)} textValue={group.name}>
                                    {group.name} ({group.members?.length || 0} คน)
                                </SelectItem>
                            ))}
                        </Select>
                        {scores.selectedGroup && (
                            <Input
                                type="number"
                                label="คะแนน"
                                value={String(scores.groupScoreValue)}
                                onValueChange={(v) => scores.setGroupScoreValue(parseFloat(v) || 0)}
                                max={scores.selectedAssignment?.max_score || 100}
                                min={0}
                            />
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => modals.scoreModals.setIsGroupScoreModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={async () => {
                                const success = await scores.saveGroupScore();
                                if (success) modals.scoreModals.setIsGroupScoreModalOpen(false);
                            }}
                            isLoading={scores.isSaving}
                            isDisabled={!scores.selectedGroup}
                        >
                            บันทึกคะแนน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
