"use client";

import { useState, useMemo, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody } from "@heroui/card";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import scoreService, { type Student, type Group, type StudentScore, type ScoresData, type SubItemScoreData } from "@/services/score.service";
import type { AssignmentType } from "./types";

interface ScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignment: AssignmentType | null;
    courseId: string;
    onScoreSubmitted?: () => void;
}

interface SubItemScore {
    subItemId: number;
    score: number | string;
    maxScore: number;
}

// Interface for existing score info
interface ExistingScoreInfo {
    score: number | null;
    graded_by?: {
        id: number;
        display_name: string;
    };
    graded_at?: string;
}

// Interface for sub-item existing score
interface SubItemExistingScore {
    subItemId: number;
    score: number | null;
    graded_by?: {
        id: number;
        display_name: string;
    };
    graded_at?: string;
}

export default function ScoreModal({
    isOpen,
    onClose,
    assignment,
    courseId,
    onScoreSubmitted,
}: ScoreModalProps) {
    // States
    const [activeTab, setActiveTab] = useState<"grade" | "edit">("grade");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Grade tab states
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [mainScore, setMainScore] = useState<string>("");
    const [subItemScores, setSubItemScores] = useState<SubItemScore[]>([]);
    const [comment, setComment] = useState("");
    
    // Edit tab states
    const [editSearchQuery, setEditSearchQuery] = useState("");
    const [editSelectedStudent, setEditSelectedStudent] = useState<Student | null>(null);
    const [currentScore, setCurrentScore] = useState<StudentScore | null>(null);
    const [newScore, setNewScore] = useState<string>("");
    const [editReason, setEditReason] = useState("");

    // Existing score states (for checking duplicates)
    const [scoresData, setScoresData] = useState<ScoresData | null>(null);
    const [existingScore, setExistingScore] = useState<ExistingScoreInfo | null>(null);
    const [subItemExistingScores, setSubItemExistingScores] = useState<SubItemExistingScore[]>([]);
    const [groupSearchQuery, setGroupSearchQuery] = useState("");
    const [isCheckingScore, setIsCheckingScore] = useState(false);

    const isGroupAssignment = assignment?.assignment_type !== "individual";
    const isPermanentGroup = assignment?.assignment_type === "permanent_group";
    const hasSubItems = assignment?.subItems && assignment.subItems.length > 0;

    // Colors based on group type
    const groupColors = isPermanentGroup 
        ? { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', chip: 'bg-purple-100 text-purple-700' }
        : { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700' };

    // Load students and groups when modal opens
    useEffect(() => {
        if (isOpen && assignment) {
            loadData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, assignment?.id]);

    // Reset states when modal closes
    useEffect(() => {
        if (!isOpen) {
            resetStates();
        }
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const studentData = await scoreService.searchStudents(courseId);
            setStudents(studentData);

            if (isGroupAssignment && assignment) {
                const groupData = await scoreService.getGroupsForAssignment(assignment.id);
                setGroups(groupData);
            }

            // Load existing scores for this assignment
            if (assignment) {
                const scores = await scoreService.getScores(assignment.id);
                setScoresData(scores);
            }
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลได้",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetStates = () => {
        setActiveTab("grade");
        setSearchQuery("");
        setSelectedStudent(null);
        setSelectedGroup(null);
        setMainScore("");
        setSubItemScores([]);
        setComment("");
        setEditSearchQuery("");
        setEditSelectedStudent(null);
        setCurrentScore(null);
        setNewScore("");
        setEditReason("");
        setExistingScore(null);
        setSubItemExistingScores([]);
        setGroupSearchQuery("");
    };

    // Initialize sub-item scores when student/group is selected
    useEffect(() => {
        if (assignment?.subItems && (selectedStudent || selectedGroup)) {
            setSubItemScores(
                assignment.subItems
                    .filter(item => item.id !== undefined)
                    .map(item => ({
                        subItemId: item.id!,
                        score: "",
                        maxScore: item.max_score,
                    }))
            );
        }
    }, [selectedStudent?.id, selectedGroup?.id, assignment?.id, assignment?.subItems]);

    // Check for existing scores when student is selected
    useEffect(() => {
        if (selectedStudent && scoresData) {
            const studentScore = scoresData.student_scores.find(
                ss => ss.student.id === selectedStudent.id
            );
            
            if (studentScore && studentScore.score !== null && studentScore.score !== undefined) {
                setExistingScore({
                    score: studentScore.score,
                    graded_by: studentScore.graded_by,
                    graded_at: studentScore.graded_at,
                });
            } else {
                setExistingScore(null);
            }
            
            // Check sub-item scores from API response
            if (studentScore?.sub_item_scores && studentScore.sub_item_scores.length > 0) {
                const existingSubScores: SubItemExistingScore[] = studentScore.sub_item_scores
                    .filter(si => si.score !== null)
                    .map(si => ({
                        subItemId: si.sub_item_id,
                        score: si.score,
                        graded_by: si.graded_by || undefined,
                        graded_at: si.graded_at || undefined,
                    }));
                setSubItemExistingScores(existingSubScores);
            } else {
                setSubItemExistingScores([]);
            }
        } else {
            setExistingScore(null);
            setSubItemExistingScores([]);
        }
    }, [selectedStudent?.id, scoresData]);

    // Check for existing scores when group is selected  
    useEffect(() => {
        if (selectedGroup && scoresData) {
            // For group assignments, check if any member has a score
            const memberWithScore = selectedGroup.members.find(member => {
                const studentScore = scoresData.student_scores.find(
                    ss => ss.student.id === member.id
                );
                return studentScore && studentScore.score !== null && studentScore.score !== undefined;
            });
            
            if (memberWithScore) {
                const studentScore = scoresData.student_scores.find(
                    ss => ss.student.id === memberWithScore.id
                );
                if (studentScore) {
                    setExistingScore({
                        score: studentScore.score ?? null,
                        graded_by: studentScore.graded_by,
                        graded_at: studentScore.graded_at,
                    });
                    
                    // Check sub-item scores for group
                    if (studentScore.sub_item_scores && studentScore.sub_item_scores.length > 0) {
                        const existingSubScores: SubItemExistingScore[] = studentScore.sub_item_scores
                            .filter(si => si.score !== null)
                            .map(si => ({
                                subItemId: si.sub_item_id,
                                score: si.score,
                                graded_by: si.graded_by || undefined,
                                graded_at: si.graded_at || undefined,
                            }));
                        setSubItemExistingScores(existingSubScores);
                    } else {
                        setSubItemExistingScores([]);
                    }
                }
            } else {
                setExistingScore(null);
                setSubItemExistingScores([]);
            }
        }
        // Note: Don't reset existingScore when !selectedGroup because 
        // this useEffect also triggers for individual assignments
        // and would override the student's existingScore
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGroup?.id, scoresData]);

    // Filter students based on search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students.slice(0, 2);
        const query = searchQuery.toLowerCase();
        return students.filter(
            s => s.student_id.toLowerCase().includes(query) ||
                 s.full_name.toLowerCase().includes(query)
        ).slice(0, 2);
    }, [students, searchQuery]);

    // Filter groups based on search query
    const filteredGroups = useMemo(() => {
        if (!groupSearchQuery.trim()) return groups;
        const query = groupSearchQuery.toLowerCase();
        return groups.filter(
            g => g.name.toLowerCase().includes(query) ||
                 g.members.some(m => 
                    m.full_name.toLowerCase().includes(query) ||
                    m.student_id.toLowerCase().includes(query)
                 )
        );
    }, [groups, groupSearchQuery]);

    const handleStudentSelect = async (key: React.Key | null) => {
        if (!key) {
            setSelectedStudent(null);
            setExistingScore(null);
            setSubItemExistingScores([]);
            return;
        }
        const student = students.find(s => s.id.toString() === key.toString());
        setSelectedStudent(student || null);
        setSearchQuery(""); // Clear search query after selection
        setMainScore("");
        
        // Fetch latest scores from server to check if already graded by another TA
        if (student && assignment) {
            setIsCheckingScore(true);
            try {
                const latestScores = await scoreService.getScores(assignment.id);
                setScoresData(latestScores);
            } catch (error) {
                console.error("Error checking scores:", error);
            } finally {
                setIsCheckingScore(false);
            }
        }
    };

    const handleGroupSelect = async (key: React.Key | null) => {
        if (!key) {
            setSelectedGroup(null);
            setExistingScore(null);
            setSubItemExistingScores([]);
            return;
        }
        const group = groups.find(g => g.id.toString() === key.toString());
        setSelectedGroup(group || null);
        setGroupSearchQuery(""); // Clear search query after selection
        setMainScore("");
        
        // Fetch latest scores from server to check if already graded by another TA
        if (group && assignment) {
            setIsCheckingScore(true);
            try {
                const latestScores = await scoreService.getScores(assignment.id);
                setScoresData(latestScores);
            } catch (error) {
                console.error("Error checking scores:", error);
            } finally {
                setIsCheckingScore(false);
            }
        }
    };

    const handleSubItemScoreChange = (subItemId: number, value: string) => {
        setSubItemScores(prev =>
            prev.map(item =>
                item.subItemId === subItemId ? { ...item, score: value } : item
            )
        );
    };

    // Calculate total score from sub-items
    const calculatedTotalScore = useMemo(() => {
        if (!hasSubItems) return null;
        return subItemScores.reduce((sum, item) => {
            const score = parseFloat(item.score.toString()) || 0;
            return sum + score;
        }, 0);
    }, [subItemScores, hasSubItems]);

    // Validate scores
    const validateScore = (score: string, maxScore: number): boolean => {
        const numScore = parseFloat(score);
        return !isNaN(numScore) && numScore >= 0 && numScore <= maxScore;
    };

    const canSubmitGrade = useMemo(() => {
        if (!assignment) return false;
        if (isCheckingScore) return false; // Disable while checking
        if (!isGroupAssignment && !selectedStudent) return false;
        if (isGroupAssignment && !selectedGroup) return false;

        // If already scored (non sub-items), cannot submit
        if (!hasSubItems && existingScore) return false;

        if (hasSubItems) {
            // อย่างน้อยต้องกรอกคะแนน 1 ข้อ และคะแนนที่กรอกต้องถูกต้อง
            // และข้อที่กรอกต้องไม่มีคะแนนอยู่แล้ว
            const filledItems = subItemScores.filter(item => {
                const existingSubScore = subItemExistingScores.find(s => s.subItemId === item.subItemId);
                return item.score !== "" && !existingSubScore;
            });
            if (filledItems.length === 0) return false;
            return filledItems.every(item => validateScore(item.score.toString(), item.maxScore));
        } else {
            return mainScore !== "" && validateScore(mainScore, assignment.max_score);
        }
    }, [assignment, selectedStudent, selectedGroup, mainScore, subItemScores, hasSubItems, isGroupAssignment, existingScore, subItemExistingScores, isCheckingScore]);

    const handleSubmitGrade = async () => {
        if (!assignment || !canSubmitGrade) return;

        setIsSubmitting(true);
        try {
            if (hasSubItems) {
                // Submit each sub-item score individually
                const itemsToSubmit = subItemScores.filter(item => {
                    const existingSubScore = subItemExistingScores.find(s => s.subItemId === item.subItemId);
                    return item.score !== "" && !existingSubScore;
                });

                if (isGroupAssignment && selectedGroup) {
                    // For group with sub-items
                    for (const item of itemsToSubmit) {
                        await scoreService.submitGroupScore({
                            assignment_id: assignment.id,
                            group_id: selectedGroup.id,
                            score: parseFloat(item.score.toString()),
                            sub_item_id: item.subItemId,
                            comment: comment || undefined,
                        });
                    }
                } else if (selectedStudent) {
                    // For individual with sub-items
                    for (const item of itemsToSubmit) {
                        await scoreService.submitScore({
                            assignment_id: assignment.id,
                            student_id: selectedStudent.id,
                            score: parseFloat(item.score.toString()),
                            sub_item_id: item.subItemId,
                            comment: comment || undefined,
                        });
                    }
                }
            } else {
                // Single score (no sub-items)
                if (isGroupAssignment && selectedGroup) {
                    console.log('Submitting group score:', {
                        assignment_id: assignment.id,
                        group_id: selectedGroup.id,
                        score: parseFloat(mainScore),
                    });
                    const result = await scoreService.submitGroupScore({
                        assignment_id: assignment.id,
                        group_id: selectedGroup.id,
                        score: parseFloat(mainScore),
                        comment: comment || undefined,
                    });
                    console.log('Group score result:', result);
                    if (!result) {
                        throw new Error('Failed to submit group score');
                    }
                } else if (selectedStudent) {
                    const result = await scoreService.submitScore({
                        assignment_id: assignment.id,
                        student_id: selectedStudent.id,
                        score: parseFloat(mainScore),
                        comment: comment || undefined,
                    });
                    console.log('Individual score result:', result);
                    if (!result) {
                        throw new Error('Failed to submit score');
                    }
                }
            }

            addToast({
                title: "บันทึกคะแนนสำเร็จ",
                description: `บันทึกคะแนน${isGroupAssignment ? "กลุ่ม" : "นักศึกษา"}เรียบร้อยแล้ว`,
                color: "success",
            });

            // Reload scoresData เพื่อให้ข้อมูลเป็นปัจจุบัน
            const updatedScores = await scoreService.getScores(assignment.id);
            setScoresData(updatedScores);

            setSelectedStudent(null);
            setSelectedGroup(null);
            setMainScore("");
            setSubItemScores([]);
            setComment("");
            setSearchQuery("");
            setGroupSearchQuery("");
            setExistingScore(null);
            setSubItemExistingScores([]);
            
            onScoreSubmitted?.();
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกคะแนนได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit tab handlers
    const handleEditStudentSelect = async (key: React.Key | null) => {
        if (!key || !assignment) {
            setEditSelectedStudent(null);
            setCurrentScore(null);
            return;
        }
        
        const student = students.find(s => s.id.toString() === key.toString());
        setEditSelectedStudent(student || null);
        
        if (student) {
            try {
                const scoresData = await scoreService.getScores(assignment.id);
                const studentScore = scoresData?.student_scores.find(
                    ss => ss.student.id === student.id
                );
                setCurrentScore(studentScore || null);
                setNewScore(studentScore?.score?.toString() || "");
            } catch (error) {
                console.error("Error loading score:", error);
            }
        }
    };

    const canSubmitEdit = useMemo(() => {
        if (!currentScore || !editReason.trim()) return false;
        if (newScore === "" || !validateScore(newScore, assignment?.max_score || 0)) return false;
        return true;
    }, [currentScore, newScore, editReason, assignment]);

    const handleSubmitEdit = async () => {
        if (!currentScore?.score_id || !canSubmitEdit) return;

        setIsSubmitting(true);
        try {
            await scoreService.requestScoreEdit({
                score_id: currentScore.score_id,
                new_score: parseFloat(newScore),
                reason: editReason,
            });

            addToast({
                title: "ส่งคำขอแก้ไขสำเร็จ",
                description: "คำขอแก้ไขคะแนนถูกส่งไปยังผู้ดูแลแล้ว",
                color: "success",
            });

            setEditSelectedStudent(null);
            setCurrentScore(null);
            setNewScore("");
            setEditReason("");
            setEditSearchQuery("");
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถส่งคำขอแก้ไขได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get assignment type info
    const getTypeInfo = () => {
        if (!assignment) return { icon: "solar:document-bold", color: "from-slate-500 to-slate-600" };
        switch (assignment.assignment_type) {
            case "individual":
                return { icon: "solar:user-bold", color: "from-indigo-500 to-purple-600" };
            case "permanent_group":
                return { icon: "solar:users-group-two-rounded-bold", color: "from-purple-500 to-pink-600" };
            default:
                return { icon: "solar:users-group-rounded-bold", color: "from-emerald-500 to-teal-600" };
        }
    };

    if (!assignment) return null;

    const typeInfo = getTypeInfo();

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
            placement="top-center"
            
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-gradient-to-br ${typeInfo.color} rounded-xl shadow-lg`}>
                            <Icon icon={typeInfo.icon} className="text-2xl text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{assignment.name}</h3>
                            <p className="text-sm text-slate-500 font-normal mt-1">
                                คะแนนเต็ม {assignment.max_score} คะแนน
                                {hasSubItems && ` • ${assignment.subItems?.length} ข้อย่อย`}
                            </p>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="px-6 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Tabs */}
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={(key) => setActiveTab(key as "grade" | "edit")}
                                variant="underlined"
                                classNames={{
                                    tabList: "gap-6 w-full",
                                    cursor: "bg-blue-500",
                                    tab: "px-0 h-10",
                                    tabContent: "group-data-[selected=true]:text-blue-600 font-medium"
                                }}
                            >
                                <Tab
                                    key="grade"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:pen-new-square-bold" className="text-lg" />
                                            <span>ลงคะแนน</span>
                                        </div>
                                    }
                                />
                                <Tab
                                    key="edit"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:pen-2-bold" className="text-lg" />
                                            <span>แก้ไขคะแนน</span>
                                        </div>
                                    }
                                />
                            </Tabs>

                            {activeTab === "grade" ? (
                                /* Grade Tab */
                                <div className="space-y-5">
                                    {/* Student/Group Selection */}
                                    {!isGroupAssignment ? (
                                        <div>
                                            <label className="text-slate-600 font-medium text-sm mb-2 block">ค้นหานักศึกษา</label>
                                            {!selectedStudent && (
                                                <Autocomplete
                                                    placeholder="พิมพ์รหัสหรือชื่อนักศึกษา..."
                                                    inputValue={searchQuery}
                                                    onInputChange={setSearchQuery}
                                                    selectedKey={null}
                                                    onSelectionChange={handleStudentSelect}
                                                    startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                                    variant="bordered"
                                                    classNames={{
                                                        base: "w-full",
                                                        listboxWrapper: "max-h-[300px]",
                                                    }}
                                                >
                                                    {filteredStudents.map((student) => (
                                                        <AutocompleteItem
                                                            key={student.id.toString()}
                                                            textValue={`${student.student_id} ${student.full_name}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Avatar
                                                                    name={`${student.full_name}`}
                                                                    size="sm"
                                                                    className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white shrink-0"
                                                                />
                                                                <div>
                                                                    <p className="font-medium text-slate-800">{student.full_name}</p>
                                                                    <p className="text-xs text-slate-500">{student.student_id}</p>
                                                                </div>
                                                            </div>
                                                        </AutocompleteItem>
                                                    ))}
                                                </Autocomplete>
                                            )}

                                            {/* Selected Student Info */}
                                            {selectedStudent && (
                                                <div className={`mt-3 p-3 rounded-xl border ${existingScore ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            name={`${selectedStudent.full_name}`}
                                                            size="md"
                                                            className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-slate-800">
                                                                {selectedStudent.full_name}
                                                            </p>
                                                            <p className="text-sm text-slate-500">{selectedStudent.student_id}</p>
                                                        </div>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            onPress={() => {
                                                                setSelectedStudent(null);
                                                                setSearchQuery("");
                                                                setExistingScore(null);
                                                            }}
                                                        >
                                                            <Icon icon="solar:close-circle-bold" className="text-xl text-slate-400" />
                                                        </Button>
                                                    </div>
                                                    
                                                    {/* Loading indicator while checking score */}
                                                    {isCheckingScore && (
                                                        <div className="mt-3 p-3 bg-slate-100 rounded-lg border border-slate-200">
                                                            <div className="flex items-center gap-2">
                                                                <Spinner size="sm" />
                                                                <p className="text-sm text-slate-600">กำลังตรวจสอบคะแนน...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Warning if already scored */}
                                                    {!isCheckingScore && existingScore && !hasSubItems && (
                                                        <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                                                            <div className="flex items-start gap-2">
                                                                <Icon icon="solar:danger-triangle-bold" className="text-xl text-amber-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-sm font-semibold text-amber-800">นักศึกษาคนนี้ได้รับคะแนนไปแล้ว</p>
                                                                    <p className="text-lg font-bold text-amber-900 mt-1">
                                                                        {existingScore.score} / {assignment?.max_score} คะแนน
                                                                    </p>
                                                                    {existingScore.graded_by && (
                                                                        <p className="text-xs text-amber-700 mt-1">
                                                                            ให้คะแนนโดย: {existingScore.graded_by.display_name}
                                                                            {existingScore.graded_at && ` เมื่อ ${new Date(existingScore.graded_at).toLocaleDateString("th-TH")}`}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-amber-600 mt-2">
                                                                        หากต้องการแก้ไข กรุณาไปที่แท็บ "แก้ไขคะแนน"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Group Assignment */
                                        <div>
                                            <label className="text-slate-600 font-medium text-sm mb-2 block">ค้นหากลุ่ม</label>
                                            {!selectedGroup && (
                                                <Autocomplete
                                                    placeholder="พิมพ์ชื่อกลุ่มหรือชื่อสมาชิก..."
                                                    inputValue={groupSearchQuery}
                                                    onInputChange={setGroupSearchQuery}
                                                    selectedKey={null}
                                                    onSelectionChange={handleGroupSelect}
                                                    startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                                    variant="bordered"
                                                    classNames={{
                                                        base: "w-full",
                                                        listboxWrapper: "max-h-[300px]",
                                                    }}
                                                >
                                                    {filteredGroups.map((group) => (
                                                        <AutocompleteItem
                                                            key={group.id.toString()}
                                                            textValue={group.name}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 ${isPermanentGroup ? 'bg-purple-100' : 'bg-emerald-100'} rounded-lg shrink-0`}>
                                                                        <Icon icon={isPermanentGroup ? "solar:users-group-two-rounded-bold" : "solar:users-group-rounded-bold"} className={`text-lg ${groupColors.icon}`} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-slate-800">{group.name}</p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {group.members.slice(0, 3).map(m => m.full_name).join(", ")}
                                                                            {group.members.length > 3 && ` +${group.members.length - 3} คน`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Chip size="sm" variant="flat" className="bg-slate-100">
                                                                    {group.members.length} คน
                                                                </Chip>
                                                            </div>
                                                        </AutocompleteItem>
                                                    ))}
                                                </Autocomplete>
                                            )}

                                            {/* Selected Group Info */}
                                            {selectedGroup && (
                                                <div className={`mt-3 p-3 rounded-xl border ${existingScore ? 'bg-amber-50 border-amber-200' : `${groupColors.bg} ${groupColors.border}`}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Icon icon={isPermanentGroup ? "solar:users-group-two-rounded-bold" : "solar:users-group-rounded-bold"} className={`text-xl ${groupColors.icon}`} />
                                                            <span className="font-semibold text-slate-800">{selectedGroup.name}</span>
                                                            <Chip size="sm" variant="flat" className={groupColors.chip}>
                                                                {selectedGroup.members.length} คน
                                                            </Chip>
                                                        </div>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            onPress={() => {
                                                                setSelectedGroup(null);
                                                                setGroupSearchQuery("");
                                                                setExistingScore(null);
                                                            }}
                                                        >
                                                            <Icon icon="solar:close-circle-bold" className="text-xl text-slate-400" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedGroup.members.map((member) => (
                                                            <Chip
                                                                key={member.id}
                                                                size="sm"
                                                                variant="flat"
                                                                className="bg-white"
                                                                
                                                            >
                                                                {member.full_name}
                                                            </Chip>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Loading indicator while checking score */}
                                                    {isCheckingScore && (
                                                        <div className="mt-3 p-3 bg-slate-100 rounded-lg border border-slate-200">
                                                            <div className="flex items-center gap-2">
                                                                <Spinner size="sm" />
                                                                <p className="text-sm text-slate-600">กำลังตรวจสอบคะแนน...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Warning if already scored */}
                                                    {!isCheckingScore && existingScore && !hasSubItems && (
                                                        <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                                                            <div className="flex items-start gap-2">
                                                                <Icon icon="solar:danger-triangle-bold" className="text-xl text-amber-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-sm font-semibold text-amber-800">กลุ่มนี้ได้รับคะแนนไปแล้ว</p>
                                                                    <p className="text-lg font-bold text-amber-900 mt-1">
                                                                        {existingScore.score} / {assignment?.max_score} คะแนน
                                                                    </p>
                                                                    {existingScore.graded_by && (
                                                                        <p className="text-xs text-amber-700 mt-1">
                                                                            ให้คะแนนโดย: {existingScore.graded_by.display_name}
                                                                            {existingScore.graded_at && ` เมื่อ ${new Date(existingScore.graded_at).toLocaleDateString("th-TH")}`}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-amber-600 mt-2">
                                                                        หากต้องการแก้ไข กรุณาไปที่แท็บ "แก้ไขคะแนน"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Score Input Section */}
                                    {(selectedStudent || selectedGroup) && !isCheckingScore && (!existingScore || hasSubItems) && (
                                        <>
                                            <Divider />
                                            
                                            <div>
                                                <label className="text-slate-600 font-medium text-sm mb-3 block flex items-center gap-2">
                                                    <Icon icon="solar:medal-star-bold" className="text-amber-500" />
                                                    กรอกคะแนน
                                                </label>

                                                {hasSubItems ? (
                                                    /* Sub-items score inputs */
                                                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl">
                                                        {assignment.subItems?.filter(item => item.id !== undefined).map((subItem, idx) => {
                                                            const subItemId = subItem.id!;
                                                            const existingSubScore = subItemExistingScores.find(s => s.subItemId === subItemId);
                                                            const isLocked = existingSubScore && existingSubScore.score !== null;
                                                            
                                                            return (
                                                                <div 
                                                                    key={subItemId} 
                                                                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                                                                        isLocked 
                                                                            ? 'bg-amber-50 border-amber-200' 
                                                                            : 'bg-white border-slate-200'
                                                                    }`}
                                                                >
                                                                    <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full shrink-0 ${
                                                                        isLocked 
                                                                            ? 'bg-amber-100 text-amber-600' 
                                                                            : 'bg-blue-100 text-blue-600'
                                                                    }`}>
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-slate-700 truncate">{subItem.name}</p>
                                                                        {isLocked && existingSubScore?.graded_by && (
                                                                            <p className="text-xs text-amber-600 mt-0.5">
                                                                                ลงโดย {existingSubScore.graded_by.display_name}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isLocked ? (
                                                                            <>
                                                                                <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 rounded-lg">
                                                                                    <Icon icon="solar:lock-bold" className="text-amber-600" />
                                                                                    <span className="font-bold text-amber-700">{existingSubScore?.score}</span>
                                                                                </div>
                                                                                <span className="text-sm text-slate-500">/ {subItem.max_score}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Input
                                                                                    type="number"
                                                                                    placeholder="0"
                                                                                    value={subItemScores.find(s => s.subItemId === subItemId)?.score.toString() || ""}
                                                                                    onValueChange={(value) => handleSubItemScoreChange(subItemId, value)}
                                                                                    min={0}
                                                                                    max={subItem.max_score}
                                                                                    className="w-20"
                                                                                    size="sm"
                                                                                    variant="bordered"
                                                                                    classNames={{
                                                                                        input: "text-center font-semibold",
                                                                                        inputWrapper: "bg-white border-slate-200",
                                                                                    }}
                                                                                />
                                                                                <span className="text-sm text-slate-500">/ {subItem.max_score}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        
                                                        {/* Total Score Display */}
                                                        {/* <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                                            <span className="text-sm font-medium text-slate-600">รวม:</span>
                                                            <span className="text-xl font-bold text-blue-600">
                                                                {calculatedTotalScore?.toFixed(1) || 0}
                                                            </span>
                                                            <span className="text-sm text-slate-500">/ {assignment.max_score}</span>
                                                        </div> */}
                                                    </div>
                                                ) : (
                                                    /* Single score input */
                                                    <div className="bg-slate-50 p-4 rounded-xl">
                                                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                                            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                                                <Icon icon="solar:medal-star-bold" className="text-xl text-amber-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-700">คะแนนรวม</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={mainScore}
                                                                    onValueChange={setMainScore}
                                                                    min={0}
                                                                    max={assignment.max_score}
                                                                    className="w-20"
                                                                    size="sm"
                                                                    variant="bordered"
                                                                    classNames={{
                                                                        input: "text-center font-semibold",
                                                                        inputWrapper: "bg-white border-slate-200",
                                                                    }}
                                                                />
                                                                <span className="text-sm text-slate-500">/ {assignment.max_score}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Comment */}
                                            <div>
                                                <label className="text-slate-600 font-medium text-sm mb-2 block">หมายเหตุ (ไม่บังคับ)</label>
                                                <Textarea
                                                    placeholder="เพิ่มหมายเหตุ..."
                                                    value={comment}
                                                    onValueChange={setComment}
                                                    variant="bordered"
                                                    minRows={2}
                                                    classNames={{
                                                        inputWrapper: "bg-white border-slate-200",
                                                    }}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                /* Edit Tab */
                                <div className="space-y-5">
                                    {/* Info Banner */}
                                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                                        <div className="flex items-start gap-2">
                                            <Icon icon="solar:info-circle-bold" className="text-xl text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-amber-800">การแก้ไขคะแนน</p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    การแก้ไขคะแนนจะต้องระบุเหตุผล และจะถูกบันทึกไว้ในระบบ
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Search */}
                                    <div>
                                        <label className="text-slate-600 font-medium text-sm mb-2 block">ค้นหานักศึกษาที่ต้องการแก้ไขคะแนน</label>
                                        <Autocomplete
                                            placeholder="พิมพ์รหัสหรือชื่อนักศึกษา..."
                                            inputValue={editSearchQuery}
                                            onInputChange={setEditSearchQuery}
                                            selectedKey={editSelectedStudent?.id.toString() || null}
                                            onSelectionChange={handleEditStudentSelect}
                                            startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                            variant="bordered"
                                            classNames={{
                                                base: "w-full",
                                                listboxWrapper: "max-h-[300px]",
                                            }}
                                        >
                                            {filteredStudents.map((student) => (
                                                <AutocompleteItem
                                                    key={student.id.toString()}
                                                    textValue={`${student.student_id} ${student.full_name}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            name={`${student.full_name}`}
                                                            size="sm"
                                                            className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white shrink-0"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-slate-800">{student.full_name}</p>
                                                            <p className="text-xs text-slate-500">{student.student_id}</p>
                                                        </div>
                                                    </div>
                                                </AutocompleteItem>
                                            ))}
                                        </Autocomplete>
                                    </div>

                                    {/* Selected Student & Current Score */}
                                    {editSelectedStudent && (
                                        <>
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            name={`${editSelectedStudent.full_name}`}
                                                            size="sm"
                                                            className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-slate-800">
                                                                {editSelectedStudent.full_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{editSelectedStudent.student_id}</p>
                                                        </div>
                                                    </div>
                                                    {currentScore ? (
                                                        <Chip color="success" variant="flat" size="sm">มีคะแนนแล้ว</Chip>
                                                    ) : (
                                                        <Chip color="warning" variant="flat" size="sm">ยังไม่มีคะแนน</Chip>
                                                    )}
                                                </div>

                                                {currentScore && (
                                                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-slate-600">คะแนนปัจจุบัน</span>
                                                            <span className="text-2xl font-bold text-slate-800">
                                                                {currentScore.score ?? "-"} <span className="text-sm font-normal text-slate-500">/ {assignment.max_score}</span>
                                                            </span>
                                                        </div>
                                                        {currentScore.graded_by && (
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                ให้คะแนนโดย: {currentScore.graded_by.display_name}
                                                                {currentScore.graded_at && ` เมื่อ ${new Date(currentScore.graded_at).toLocaleDateString("th-TH")}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Edit Form */}
                                            {currentScore && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-slate-600 font-medium text-sm mb-2 block">คะแนนใหม่ *</label>
                                                        <div className="flex items-center gap-3">
                                                            <Input
                                                                type="number"
                                                                placeholder="กรอกคะแนนใหม่"
                                                                value={newScore}
                                                                onValueChange={setNewScore}
                                                                min={0}
                                                                max={assignment.max_score}
                                                                size="lg"
                                                                variant="bordered"
                                                                classNames={{
                                                                    input: "text-center text-xl font-bold",
                                                                    inputWrapper: "w-32 bg-white border-slate-200",
                                                                }}
                                                            />
                                                            <span className="text-lg text-slate-500">/ {assignment.max_score} คะแนน</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-slate-600 font-medium text-sm mb-2 block">
                                                            เหตุผลในการแก้ไข *
                                                        </label>
                                                        <Textarea
                                                            placeholder="กรุณาระบุเหตุผลในการขอแก้ไขคะแนน..."
                                                            value={editReason}
                                                            onValueChange={setEditReason}
                                                            variant="bordered"
                                                            minRows={3}
                                                            isRequired
                                                            classNames={{
                                                                inputWrapper: "bg-white border-slate-200",
                                                            }}
                                                        />
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            * เหตุผลในการแก้ไขจะถูกบันทึกไว้เพื่อการตรวจสอบ
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {!currentScore && (
                                                <div className="text-center py-6">
                                                    <Icon icon="solar:clipboard-remove-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                                                    <p className="text-slate-500">นักศึกษาคนนี้ยังไม่มีคะแนน</p>
                                                    <p className="text-sm text-slate-400">กรุณาไปที่แท็บ "ลงคะแนน" เพื่อให้คะแนนใหม่</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="px-6 py-4 border-t border-slate-200">
                    <div className="flex items-center justify-between w-full">
                        <Button variant="light" onPress={onClose}>
                            ปิด
                        </Button>
                        {activeTab === "grade" ? (
                            <Button
                                color="primary"
                                onPress={handleSubmitGrade}
                                isDisabled={!canSubmitGrade}
                                isLoading={isSubmitting}
                                className="bg-blue-500"
                                startContent={!isSubmitting && <Icon icon="solar:check-circle-bold" />}
                            >
                                บันทึกคะแนน
                            </Button>
                        ) : (
                            <Button
                                color="warning"
                                onPress={handleSubmitEdit}
                                isDisabled={!canSubmitEdit}
                                isLoading={isSubmitting}
                                startContent={!isSubmitting && <Icon icon="solar:pen-2-bold" />}
                            >
                                ส่งคำขอแก้ไข
                            </Button>
                        )}
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
