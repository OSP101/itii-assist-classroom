"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Select, SelectItem } from "@heroui/select";
import { Icon } from "@iconify/react";
import type { AssignmentType, Group } from "./types";
import type { ScoresData } from "@/services/score.service";

interface ScoresTabProps {
    assignments: AssignmentType[];
    selectedAssignment: AssignmentType | null;
    setSelectedAssignment: (assignment: AssignmentType | null) => void;
    scoresData: ScoresData | null;
    isLoading: boolean;
    scoreSearchQuery: string;
    setScoreSearchQuery: (query: string) => void;
    scoreEntries: Record<string, number | "">;
    setScoreEntries: React.Dispatch<React.SetStateAction<Record<string, number | "">>>;
    isSaving: boolean;
    groupsForScore: Group[];
    onFetchScores: (assignment: AssignmentType) => void;
    onSaveScores: () => void;
    onOpenGroupScoreModal: () => void;
    onNavigateToAssignments: () => void;
}

export default function ScoresTab({
    assignments,
    selectedAssignment,
    setSelectedAssignment,
    scoresData,
    isLoading,
    scoreSearchQuery,
    setScoreSearchQuery,
    scoreEntries,
    setScoreEntries,
    isSaving,
    groupsForScore,
    onFetchScores,
    onSaveScores,
    onOpenGroupScoreModal,
    onNavigateToAssignments,
}: ScoresTabProps) {
    return (
        <div className="space-y-4">
            {/* Assignment Selector */}
            <Card className="shadow-sm border border-slate-200">
                <CardHeader className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-md">
                                <Icon icon="solar:chart-2-bold" className="text-xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">ลงคะแนน</h3>
                                <p className="text-sm text-slate-500">เลือกงานเพื่อให้คะแนน</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="p-5">
                    <Select
                        label="เลือกงาน"
                        placeholder="เลือกงานที่ต้องการให้คะแนน"
                        variant="bordered"
                        size="lg"
                        selectedKeys={selectedAssignment ? [String(selectedAssignment.id)] : []}
                        onSelectionChange={(keys) => {
                            const selectedId = Array.from(keys)[0];
                            const assignment = assignments.find(a => a.id === Number(selectedId));
                            if (assignment) {
                                setSelectedAssignment(assignment);
                                onFetchScores(assignment);
                            }
                        }}
                        classNames={{
                            trigger: "h-14 bg-white border-slate-200 hover:border-blue-300",
                        }}
                    >
                        {assignments.map(a => (
                            <SelectItem key={String(a.id)} textValue={a.name}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon 
                                            icon={a.assignment_type === "individual" ? "solar:user-bold" : "solar:users-group-rounded-bold"} 
                                            className={a.assignment_type === "individual" ? "text-blue-500" : "text-purple-500"} 
                                        />
                                        <span>{a.name}</span>
                                    </div>
                                    <Chip size="sm" variant="flat" color={a.assignment_type === "individual" ? "primary" : "secondary"}>
                                        {a.subItems && a.subItems.length > 0 ? `${a.subItems.length} ข้อย่อย` : `${a.max_score} คะแนน`}
                                    </Chip>
                                </div>
                            </SelectItem>
                        ))}
                    </Select>

                    {selectedAssignment && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-slate-700">{selectedAssignment.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            color={selectedAssignment.assignment_type === "individual" ? "primary" : selectedAssignment.assignment_type === "permanent_group" ? "secondary" : "warning"}
                                        >
                                            {selectedAssignment.assignment_type === "individual" ? "รายบุคคล" : selectedAssignment.assignment_type === "permanent_group" ? "กลุ่มถาวร" : `กลุ่มสัปดาห์ ${selectedAssignment.week_number}`}
                                        </Chip>
                                        <span className="text-sm text-slate-500">
                                            คะแนนเต็ม: {selectedAssignment.subItems && selectedAssignment.subItems.length > 0 
                                                ? selectedAssignment.subItems.reduce((acc, s) => acc + Number(s.max_score), 0) 
                                                : selectedAssignment.max_score} คะแนน
                                        </span>
                                    </div>
                                </div>
                                {selectedAssignment.assignment_type !== "individual" && groupsForScore.length > 0 && (
                                    <Button
                                        color="secondary"
                                        variant="flat"
                                        startContent={<Icon icon="solar:users-group-rounded-bold" />}
                                        onPress={onOpenGroupScoreModal}
                                    >
                                        ให้คะแนนรายกลุ่ม
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Scores Table */}
            {selectedAssignment && (
                <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <Input
                                    placeholder="ค้นหาด้วยรหัสหรือชื่อ..."
                                    size="sm"
                                    variant="bordered"
                                    startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                    value={scoreSearchQuery}
                                    onValueChange={setScoreSearchQuery}
                                    className="w-64"
                                    classNames={{
                                        inputWrapper: "bg-white",
                                    }}
                                />
                            </div>
                            <Button
                                color="success"
                                startContent={<Icon icon="solar:diskette-bold" />}
                                isLoading={isSaving}
                                onPress={onSaveScores}
                            >
                                บันทึกทั้งหมด
                            </Button>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Spinner size="lg" color="primary" />
                            </div>
                        ) : scoresData && scoresData.student_scores.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">รหัสนักศึกษา</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">ชื่อ-นามสกุล</th>
                                            {selectedAssignment.assignment_type !== "individual" && (
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">กลุ่ม</th>
                                            )}
                                            {selectedAssignment.subItems && selectedAssignment.subItems.length > 0 ? (
                                                selectedAssignment.subItems.map((subItem) => (
                                                    <th key={subItem.id} className="px-4 py-3 text-center text-sm font-semibold text-slate-600">
                                                        {subItem.name} ({subItem.max_score})
                                                    </th>
                                                ))
                                            ) : (
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">คะแนน ({selectedAssignment.max_score})</th>
                                            )}
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">รวม</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {scoresData.student_scores
                                            .filter(studentScore => {
                                                const student = studentScore.student;
                                                return !scoreSearchQuery || 
                                                    student.student_id.includes(scoreSearchQuery) ||
                                                    `${student.first_name} ${student.last_name}`.toLowerCase().includes(scoreSearchQuery.toLowerCase());
                                            })
                                            .map((studentScore) => {
                                                const student = studentScore.student;
                                                // Calculate total score
                                                let totalScore = 0;
                                                let maxTotal = 0;
                                                
                                                if (selectedAssignment.subItems && selectedAssignment.subItems.length > 0) {
                                                    selectedAssignment.subItems.forEach(subItem => {
                                                        const key = `${student.id}_${subItem.id}`;
                                                        const score = scoreEntries[key];
                                                        if (score !== "" && score !== undefined) {
                                                            totalScore += Number(score);
                                                        }
                                                        maxTotal += Number(subItem.max_score);
                                                    });
                                                } else {
                                                    const key = `${student.id}`;
                                                    const score = scoreEntries[key];
                                                    if (score !== "" && score !== undefined) {
                                                        totalScore = Number(score);
                                                    }
                                                    maxTotal = Number(selectedAssignment.max_score);
                                                }

                                                // Find group info
                                                const studentGroup = groupsForScore.find(g => 
                                                    g.members.some(m => m.student_id === student.student_id)
                                                );

                                                return (
                                                    <tr key={student.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3">
                                                            <span className="font-mono text-sm">{student.student_id}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar
                                                                    size="sm"
                                                                    name={`${student.first_name} ${student.last_name}`}
                                                                    className="shrink-0"
                                                                />
                                                                <span>{student.first_name} {student.last_name}</span>
                                                            </div>
                                                        </td>
                                                        {selectedAssignment.assignment_type !== "individual" && (
                                                            <td className="px-4 py-3">
                                                                {studentGroup ? (
                                                                    <Chip size="sm" variant="flat" color="secondary">
                                                                        {studentGroup.name}
                                                                    </Chip>
                                                                ) : (
                                                                    <span className="text-slate-400 text-sm">ไม่มีกลุ่ม</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        {selectedAssignment.subItems && selectedAssignment.subItems.length > 0 ? (
                                                            selectedAssignment.subItems.map((subItem) => {
                                                                const key = `${student.id}_${subItem.id}`;
                                                                return (
                                                                    <td key={subItem.id} className="px-4 py-3 text-center">
                                                                        <Input
                                                                            type="number"
                                                                            size="sm"
                                                                            variant="bordered"
                                                                            min={0}
                                                                            max={Number(subItem.max_score)}
                                                                            value={String(scoreEntries[key] ?? "")}
                                                                            onValueChange={(val) => {
                                                                                const numVal = val === "" ? "" : Math.min(Number(val), Number(subItem.max_score));
                                                                                setScoreEntries(prev => ({
                                                                                    ...prev,
                                                                                    [key]: numVal
                                                                                }));
                                                                            }}
                                                                            className="w-20 mx-auto"
                                                                            classNames={{
                                                                                inputWrapper: "h-8 min-h-8 bg-white",
                                                                                input: "text-center",
                                                                            }}
                                                                        />
                                                                    </td>
                                                                );
                                                            })
                                                        ) : (
                                                            <td className="px-4 py-3 text-center">
                                                                <Input
                                                                    type="number"
                                                                    size="sm"
                                                                    variant="bordered"
                                                                    min={0}
                                                                    max={Number(selectedAssignment.max_score)}
                                                                    value={String(scoreEntries[`${student.id}`] ?? "")}
                                                                    onValueChange={(val) => {
                                                                        const numVal = val === "" ? "" : Math.min(Number(val), Number(selectedAssignment.max_score));
                                                                        setScoreEntries(prev => ({
                                                                            ...prev,
                                                                            [`${student.id}`]: numVal
                                                                        }));
                                                                    }}
                                                                    className="w-20 mx-auto"
                                                                    classNames={{
                                                                        inputWrapper: "h-8 min-h-8 bg-white",
                                                                        input: "text-center",
                                                                    }}
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <span className={`font-semibold ${totalScore === maxTotal ? 'text-green-600' : totalScore > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                                    {totalScore}
                                                                </span>
                                                                <span className="text-slate-400">/</span>
                                                                <span className="text-slate-500">{maxTotal}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">ไม่พบนักศึกษาในรายวิชานี้</p>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* No assignment selected state */}
            {!selectedAssignment && assignments.length === 0 && (
                <Card className="shadow-sm border border-slate-200">
                    <CardBody className="text-center py-16">
                        <Icon icon="solar:document-add-linear" className="text-6xl text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีงาน</h3>
                        <p className="text-slate-500 mb-4">สร้างงานก่อนเพื่อให้คะแนน</p>
                        <Button
                            color="primary"
                            onPress={onNavigateToAssignments}
                            startContent={<Icon icon="solar:add-circle-bold" />}
                        >
                            ไปสร้างงาน
                        </Button>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
