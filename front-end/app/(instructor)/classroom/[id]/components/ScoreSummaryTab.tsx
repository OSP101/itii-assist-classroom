"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Tooltip } from "@heroui/tooltip";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Icon } from "@iconify/react";
import scoreService, { ScoreSummaryMatrix } from "@/services/score.service";
import { Link } from "@heroui/link";

interface ScoreSummaryTabProps {
    courseId: string;
}

type AssignmentTabType = "lab" | "assignment" | "group";

interface ScoreDetailModal {
    isOpen: boolean;
    studentName: string;
    studentId: string;
    assignmentTitle: string;
    subItemName?: string;
    score: number | null;
    maxScore: number;
    gradedBy?: string;
    gradedAt?: string;
    updatedAt?: string;
}

// Helper: safely parse to number
const toNum = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    const n = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(n) ? 0 : n;
};

// Helper: format score display
const fmtScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return "-";
    const n = toNum(score);
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
};

// Helper: format date
const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function ScoreSummaryTab({ courseId }: ScoreSummaryTabProps) {
    const [selectedTab, setSelectedTab] = useState<AssignmentTabType>("lab");
    const [selectedSection, setSelectedSection] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hoverRowId, setHoverRowId] = useState<string | null>(null);
    const [hoverColKey, setHoverColKey] = useState<string | null>(null);


    // Cache data for all tabs - avoid re-fetching when switching
    const [labData, setLabData] = useState<ScoreSummaryMatrix | null>(null);
    const [assignmentData, setAssignmentData] = useState<ScoreSummaryMatrix | null>(null);
    const [groupData, setGroupData] = useState<ScoreSummaryMatrix | null>(null);
    const hasFetchedRef = useRef({ lab: false, assignment: false, group: false });

    // Score detail modal
    const [scoreModal, setScoreModal] = useState<ScoreDetailModal>({
        isOpen: false,
        studentName: "",
        studentId: "",
        assignmentTitle: "",
        score: null,
        maxScore: 0,
    });

    // Get current matrix data based on selected tab
    const matrixData = selectedTab === "lab" ? labData : selectedTab === "assignment" ? assignmentData : groupData;

    // Fetch matrix data (with caching)
    const fetchMatrix = useCallback(async (type: AssignmentTabType, forceRefresh = false) => {
        // Skip if already fetched and not forcing refresh
        if (!forceRefresh && hasFetchedRef.current[type]) return;

        setIsLoading(true);
        try {
            // Map tab type to API assignment type
            const apiType = type === "lab" ? "individual" : type === "assignment" ? "assignment" : "group";
            const data = await scoreService.getScoreSummaryMatrix(courseId, {
                assignmentType: apiType,
            });
            if (type === "lab") {
                setLabData(data);
            } else if (type === "assignment") {
                setAssignmentData(data);
            } else {
                setGroupData(data);
            }
            hasFetchedRef.current[type] = true;
        } catch (error) {
            console.error("Failed to fetch score matrix:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    // Initial fetch for current tab
    useEffect(() => {
        fetchMatrix(selectedTab);
    }, [selectedTab, fetchMatrix]);

    // Filter students by search query and section
    const filteredStudents = useMemo(() => {
        if (!matrixData?.students) return [];
        return matrixData.students.filter(student => {
            // Section filter
            if (selectedSection !== "all") {
                const sectionId = matrixData.sections?.find(s => String(s.id) === selectedSection);
                if (sectionId && student.section_number !== sectionId.section_number) {
                    return false;
                }
            }
            // Search filter
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                student.student_id.toLowerCase().includes(query) ||
                student.full_name.toLowerCase().includes(query)
            );
        });
    }, [matrixData?.students, matrixData?.sections, searchQuery, selectedSection]);

    // Get assignment columns
    const columns = useMemo(() => {
        if (!matrixData?.assignments) return [];

        // Debug: log assignments data
        console.log('assignments from API:', matrixData.sections);

        const cols: {
            key: string;
            assignmentId: number;
            assignmentTitle: string;
            assignmentShortTitle: string;
            subItemId?: number;
            subItemName?: string;
            maxScore: number;
        }[] = [];

        for (const assignment of matrixData.assignments) {
            const title = assignment.title || `งาน #${assignment.id}`;
            const shortTitle = assignment.short_title || title;

            if (assignment.subItems && assignment.subItems.length > 0) {
                for (const subItem of assignment.subItems) {
                    cols.push({
                        key: `${assignment.id}_${subItem.id}`,
                        assignmentId: assignment.id,
                        assignmentTitle: title,
                        assignmentShortTitle: shortTitle,
                        subItemId: subItem.id,
                        subItemName: subItem.name,
                        maxScore: toNum(subItem.max_score),
                    });
                }
            } else {
                cols.push({
                    key: `${assignment.id}_main`,
                    assignmentId: assignment.id,
                    assignmentTitle: title,
                    assignmentShortTitle: shortTitle,
                    maxScore: toNum(assignment.max_score),
                });
            }
        }

        console.log('columns result:', cols);
        return cols;
    }, [matrixData?.assignments]);

    // Group assignments for header (for colspan)
    const assignmentGroups = useMemo(() => {
        if (!matrixData?.assignments) return [];
        return matrixData.assignments.map(a => ({
            id: a.id,
            title: a.title || a.short_title || `งาน #${a.id}`,
            colSpan: a.subItems && a.subItems.length > 0 ? a.subItems.length : 1,
            hasSubItems: a.subItems && a.subItems.length > 0,
        }));
    }, [matrixData?.assignments]);

    // Total max score
    const totalMaxScore = useMemo(() => columns.reduce((sum, c) => sum + c.maxScore, 0), [columns]);


    const classAverage = useMemo(() => {
        if (totalMaxScore === 0) return 0;


        const studentsWithScores = filteredStudents.filter(s => {
            if (toNum(s.total_score) > 0) return true;
            if (s.scores) {
                return Object.values(s.scores).some(score => score?.score !== null && score?.score !== undefined);
            }
            return false;
        });

        if (studentsWithScores.length === 0) return 0;

        const total = studentsWithScores.reduce((sum, s) => sum + toNum(s.total_score), 0);
        const avgScore = total / studentsWithScores.length;
        return (avgScore / totalMaxScore) * 100;
    }, [filteredStudents, totalMaxScore]);

    // Get score color based on percentage
    const getScoreColor = (score: number | null, max: number) => {
        if (score === null) return { bg: "bg-slate-50", text: "text-slate-400", border: "border-slate-200" };
        if (max === 0) return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
        const pct = (score / max) * 100;
        if (pct >= 80) return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" };
        if (pct >= 60) return { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" };
        if (pct >= 40) return { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" };
        if (pct > 0) return { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" };
        return { bg: "bg-red-50", text: "text-red-500", border: "border-red-200" };
    };

    // Handle score cell click
    const handleScoreClick = (
        student: typeof filteredStudents[0],
        col: typeof columns[0],
        scoreData: { score: number | null; max_score: number; sub_item_name?: string; graded_by?: string | null; graded_at?: string | null; updated_at?: string | null } | undefined
    ) => {
        setScoreModal({
            isOpen: true,
            studentName: student.full_name,
            studentId: student.student_id,
            assignmentTitle: col.assignmentTitle,
            subItemName: col.subItemName,
            score: scoreData?.score !== undefined ? toNum(scoreData.score) : null,
            maxScore: col.maxScore,
            gradedBy: scoreData?.graded_by ?? undefined,
            gradedAt: scoreData?.graded_at ?? undefined,
            updatedAt: scoreData?.updated_at ?? undefined,
        });
    };

    // Count assignments for each tab from cache
    const labCount = labData?.assignments?.length || 0;
    const assignmentCount = assignmentData?.assignments?.length || 0;
    const groupCount = groupData?.assignments?.length || 0;

    console.log("Title: ScoreSummaryTab render", columns);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">คะแนนในชั้นเรียน</h2>
                    <p className="text-sm text-slate-500">ดูภาพรวมคะแนนทั้งหมดของนักศึกษา</p>
                </div>
                <Link isExternal showAnchorIcon className="text-blue-600 hover:underline" href="/myscore">
                    เช็คคะแนนรายบุคคล
                </Link>
            </div>

            {/* Tabs */}
            <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(key) => setSelectedTab(key as AssignmentTabType)}
                variant="underlined"
                classNames={{
                    tabList: "gap-4 md:gap-6 flex-nowrap min-w-max",
                    cursor: "bg-blue-500",
                    tab: "px-0 h-10",
                    tabContent: "group-data-[selected=true]:text-blue-600 text-slate-500 font-medium text-sm",
                }}
            >
                <Tab
                    key="lab"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:monitor-bold" className="text-base" />
                            <span>Laboratory</span>
                            {labCount > 0 && (
                                <Chip size="sm" variant="flat" className="bg-indigo-100 text-indigo-600 h-5 px-1.5 text-xs">
                                    {labCount}
                                </Chip>
                            )}
                        </div>
                    }
                />
                <Tab
                    key="assignment"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:document-text-bold" className="text-base" />
                            <span>Assignment</span>
                            {assignmentCount > 0 && (
                                <Chip size="sm" variant="flat" className="bg-amber-100 text-amber-600 h-5 px-1.5 text-xs">
                                    {assignmentCount}
                                </Chip>
                            )}
                        </div>
                    }
                />
                <Tab
                    key="group"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:users-group-rounded-bold" className="text-base" />
                            <span>งานกลุ่ม</span>
                            {groupCount > 0 && (
                                <Chip size="sm" variant="flat" className="bg-emerald-100 text-emerald-600 h-5 px-1.5 text-xs">
                                    {groupCount}
                                </Chip>
                            )}
                        </div>
                    }
                />
            </Tabs>

            {/* Filter Bar */}
            <Card className="shadow-sm">
                <CardBody className="py-3 px-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="flex gap-2 items-center flex-1">


                            <Input
                                placeholder="ค้นหา..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                startContent={<Icon icon="solar:magnifer-linear" className="text-blue-400 text-sm" />}
                                className="w-full"
                                size="md"
                                variant="bordered"
                                isClearable
                                classNames={{
                                    inputWrapper: "border-blue-200 hover:border-blue-300 focus-within:!border-blue-400",
                                    label: "text-blue-400 text-sm",
                                }}
                            />

                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        variant="bordered"
                                        size="md"
                                        className="min-w-28 justify-between border-slate-200"
                                        endContent={<Icon icon="solar:alt-arrow-down-linear" className="text-slate-400 text-sm" />}
                                    >
                                        {selectedSection === "all"
                                            ? "ทุกกลุ่ม"
                                            : `Sec ${matrixData?.sections?.find((s) => String(s.id) === selectedSection)?.section_number}`}
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    selectionMode="single"
                                    selectedKeys={new Set([selectedSection])}
                                    onSelectionChange={(keys) => setSelectedSection(Array.from(keys)[0] as string)}
                                    items={[
                                        { key: "all", label: "ทุกกลุ่ม" },
                                        ...(matrixData?.sections || []).map((s) => ({
                                            key: String(s.id),
                                            label: `Section ${s.section_number}`,
                                        })),
                                    ]}
                                >
                                    {(item) => <DropdownItem key={item.key}>{item.label}</DropdownItem>}
                                </DropdownMenu>
                            </Dropdown>
                        </div>

                        {/* <div className="flex gap-3 items-center text-xs text-slate-500">
                            <span>
                                <span className="font-semibold text-slate-700">{filteredStudents.length}</span> คน
                            </span>
                            <span>|</span>
                            <span>
                                <span className="font-semibold text-slate-700">{matrixData?.assignments?.length || 0}</span> งาน
                            </span>
                            <span>|</span>
                            <span>
                                เฉลี่ย{" "}
                                <span className="font-semibold text-emerald-600">
                                    {classAverage.toFixed(1)}
                                </span>
                                <span className="text-slate-400">/{totalMaxScore}</span>
                            </span>
                        </div> */}
                    </div>
                </CardBody>
            </Card>

            {/* Score Matrix */}
            <Card className="shadow-sm border border-slate-200">
                <CardBody className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner size="lg" color="primary" />
                        </div>
                    ) : !matrixData || matrixData.assignments.length === 0 ? (
                        <div className="text-center py-20">
                            <Icon icon="solar:clipboard-list-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">ยังไม่มี{selectedTab === "lab" ? "Lab" : selectedTab === "assignment" ? "Assignment" : "งานกลุ่ม"}</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-20">
                            <Icon icon="solar:user-cross-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">ไม่พบนักศึกษา</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-[590px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                    {/* Row 1: Assignment names with colspan */}
                                    <tr className="bg-slate-100 border-b border-slate-200 ">
                                        <th rowSpan={2} className="px-3 py-2 text-center text-slate-600 font-semibold w-12 border-r border-slate-200 bg-slate-100">#</th>
                                        <th rowSpan={2} className="px-3 py-2 text-center text-slate-600 font-semibold min-w-[120px] border-r border-slate-200 bg-slate-100">รหัสนักศึกษา</th>
                                        <th rowSpan={2} className="px-3 py-2 text-center text-slate-600 font-semibold min-w-[200px] border-r border-slate-200 bg-slate-100">ชื่อ-นามสกุล</th>
                                        <th rowSpan={2} className="px-2 py-2 text-center text-slate-600 font-semibold w-14 border-r border-slate-200 bg-slate-100">Sec</th>
                                        {assignmentGroups.map((group) => (
                                            <th
                                                key={group.id}
                                                colSpan={group.colSpan}
                                                className="px-2 py-2 text-center font-semibold text-slate-700 border-l border-slate-300 bg-slate-200 "
                                            >
                                                {group.title}
                                            </th>
                                        ))}
                                        <th rowSpan={2} className="px-3 py-2 text-center text-slate-600 font-semibold min-w-[80px] border-l border-slate-300 bg-slate-200">
                                            <div>รวม</div>
                                            <div className="font-normal text-slate-400 text-xs">({totalMaxScore})</div>
                                        </th>
                                        <th rowSpan={2} className="px-3 py-2 text-center text-amber-600 font-semibold min-w-[70px] border-l border-amber-300 bg-amber-50">
                                            <div className="flex items-center justify-center gap-1">
                                                <Icon icon="solar:star-bold" className="text-amber-500" />
                                                <span>พิเศษ</span>
                                            </div>
                                        </th>
                                    </tr>
                                    {/* Row 2: Sub-items / Max scores */}
                                    <tr className="bg-slate-50 border-b border-slate-300">
                                        {columns.map((col) => (
                                            <th
                                                key={col.key}
                                                onMouseEnter={() => setHoverColKey(col.key)}
                                                onMouseLeave={() => setHoverColKey(null)}
                                                className={`px-2 py-2 text-center min-w-[80px] border-l border-slate-200
    ${hoverColKey === col.key ? "bg-blue-100" : "bg-slate-50"}
  `}
                                            >

                                                {col.subItemName ? (
                                                    <div className="font-medium text-slate-600 text-xs">
                                                        {col.subItemName}
                                                    </div>
                                                ) : (
                                                    <div className="font-medium text-slate-600 text-xs">
                                                        ข้อ 1
                                                    </div>
                                                )}
                                                {/* <div className="font-normal text-slate-400 text-xs">
                                                    ({col.maxScore})
                                                </div> */}
                                            </th>
                                        ))}
                                    </tr>
                                    {/* Average Row */}
                                    <tr className="bg-blue-50 border-b-2 border-blue-200">
                                        <td colSpan={4} className="px-3 py-2 text-center text-blue-700 font-semibold bg-blue-50">ค่าเฉลี่ย</td>
                                        {columns.map((col) => (
                                            <td key={col.key} className="px-2 py-2 text-center text-blue-600 font-medium border-l border-blue-100 bg-blue-50">
                                                {matrixData.averages?.[col.key] ?? "-"}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-center text-blue-700 font-bold border-l border-blue-200 bg-blue-50">
                                            {classAverage.toFixed(1)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-amber-600 font-bold border-l border-amber-200 bg-amber-50">
                                            -
                                        </td>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.map((student, index) => {
                                        const studentTotal = toNum(student.total_score);
                                        const studentMax = toNum(student.total_max_score);
                                        const totalColor = getScoreColor(studentTotal, studentMax);

                                        return (
                                            <tr
                                                key={student.student_id}
                                                onMouseEnter={() => setHoverRowId(student.student_id)}
                                                onMouseLeave={() => setHoverRowId(null)}
                                                className={`transition-colors
    ${hoverRowId === student.student_id ? "bg-blue-50/60" : ""}
  `}
                                            >

                                                <td className="px-3 py-3 text-center text-slate-800">{index + 1}</td>
                                                <td className="px-3 py-3 font-mono text-slate-800">{student.student_id}</td>
                                                <td className="px-3 py-3 font-mono text-slate-800">{student.full_name}</td>
                                                <td className="px-2 py-3 font-mono text-slate-800 text-center">
                                                    {student.section_number}
                                                </td>
                                                {columns.map((col) => {
                                                    const scoreData = student.scores?.[col.key];
                                                    const score = scoreData?.score !== null && scoreData?.score !== undefined
                                                        ? toNum(scoreData.score)
                                                        : null;
                                                    const color = getScoreColor(score, col.maxScore);

                                                    return (
                                                        <td
                                                            key={col.key}
                                                            onMouseEnter={() => setHoverColKey(col.key)}
                                                            onMouseLeave={() => setHoverColKey(null)}
                                                            className={`px-2 py-2 text-center border-l transition-colors border-slate-100
    ${hoverColKey === col.key ? "bg-blue-50" : ""}
  `}
                                                        >

                                                            <button
                                                                onClick={() => handleScoreClick(student, col, scoreData)}
                                                                className={`inline-flex items-center justify-center min-w-[40px] h-7 px-2 rounded-md text-sm font-medium transition-all hover:scale-105 hover:shadow-sm ${color.bg} ${color.text}`}
                                                            >
                                                                {fmtScore(score)}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-2 text-center border-l border-slate-100">
                                                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${totalColor.bg}`}>
                                                        <span className={`text-sm font-bold ${totalColor.text}`}>
                                                            {fmtScore(studentTotal)}
                                                        </span>
                                                        <span className="text-xs text-slate-400">/{studentMax}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center border-l border-amber-100 bg-amber-50/30">
                                                    {student.bonus_score > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 font-bold text-sm">
                                                            {student.bonus_score}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>


            {/* Score Detail Modal */}
            <Modal isOpen={scoreModal.isOpen} onClose={() => setScoreModal((prev) => ({ ...prev, isOpen: false }))} size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 pb-2">
                        <span className="text-lg font-semibold text-slate-800">รายละเอียดคะแนน</span>
                    </ModalHeader>
                    <Divider />
                    <ModalBody className="py-4">
                        <div className="space-y-4">
                            {/* Student Info */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Icon icon="solar:user-bold" className="text-xl text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{scoreModal.studentName}</p>
                                    <p className="text-sm text-slate-500 font-mono">{scoreModal.studentId}</p>
                                </div>
                            </div>

                            {/* Assignment Info */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                        <Icon icon="solar:document-text-bold" className="text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500">งาน</p>
                                        <p className="font-medium text-slate-800">{scoreModal.assignmentTitle}</p>
                                        {scoreModal.subItemName && (
                                            <p className="text-sm text-slate-600 mt-0.5">
                                                <Icon icon="solar:arrow-right-linear" className="inline text-slate-400 mr-1" />
                                                {scoreModal.subItemName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                        <Icon icon="solar:star-bold" className="text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500">คะแนน</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {scoreModal.score !== null ? (
                                                <>
                                                    <span className={getScoreColor(scoreModal.score, scoreModal.maxScore).text}>
                                                        {fmtScore(scoreModal.score)}
                                                    </span>
                                                    <span className="text-slate-400 font-normal text-base"> / {scoreModal.maxScore}</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-400">ยังไม่ได้ให้คะแนน</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Grader Info */}
                                {scoreModal.gradedBy && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Icon icon="solar:pen-bold" className="text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">ผู้ให้คะแนน</p>
                                            <p className="font-medium text-slate-800">{scoreModal.gradedBy}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Date Info */}
                                {scoreModal.gradedAt && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                                            <Icon icon="solar:calendar-bold" className="text-sky-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">วันที่ให้คะแนน</p>
                                            <p className="font-medium text-slate-800">{formatDate(scoreModal.gradedAt)}</p>
                                            {scoreModal.updatedAt && scoreModal.updatedAt !== scoreModal.gradedAt && (
                                                <p className="text-xs text-amber-600 mt-0.5">
                                                    <Icon icon="solar:pen-2-linear" className="inline mr-1" />
                                                    แก้ไขล่าสุด: {formatDate(scoreModal.updatedAt)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* No score info */}
                                {scoreModal.score === null && (
                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                        <Icon icon="solar:info-circle-linear" className="text-2xl text-slate-400 mb-1" />
                                        <p className="text-sm text-slate-500">ยังไม่มีการบันทึกคะแนนสำหรับรายการนี้</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ModalBody>
                    <Divider />
                    <ModalFooter>
                        <Button color="primary" variant="light" onPress={() => setScoreModal((prev) => ({ ...prev, isOpen: false }))}>
                            ปิด
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
