"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Tooltip } from "@heroui/tooltip";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import examScoreService, { 
    ExamSetting, 
    Student, 
    ExamScore,
    getExamTypeLabel, 
    getComponentLabel,
    getExamName,
    parseExcelData
} from "@/services/examScore.service";

interface ExamScoresTabProps {
    courseId: string;
    isCourseActive?: boolean;
}

interface ScoreMap {
    [settingId: number]: {
        [studentId: number]: ExamScore;
    };
}

export default function ExamScoresTab({ courseId, isCourseActive = true }: ExamScoresTabProps) {
    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<ExamSetting[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [scoreMap, setScoreMap] = useState<ScoreMap>({});
    const [activeTab, setActiveTab] = useState<string>("midterm");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingScore, setEditingScore] = useState<{settingId: number, studentId: number, value: string} | null>(null);
    
    // Bulk import modal
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSettingId, setBulkSettingId] = useState<number | null>(null);
    const [bulkData, setBulkData] = useState("");
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    
    // Parsed bulk data for validation display
    interface ParsedBulkItem {
        inputStudentId: string;
        inputScore: string;
        status: "valid" | "not_found" | "score_exceeds" | "invalid_score" | "negative_score";
        matchedStudent?: Student;
        parsedScore?: number | null;
    }
    const [parsedBulkData, setParsedBulkData] = useState<ParsedBulkItem[]>([]);

    // Settings modal
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [settingsData, setSettingsData] = useState<{[id: number]: Partial<ExamSetting>}>({});

    // Load data
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [settingsRes, scoresRes] = await Promise.all([
                examScoreService.getExamSettings(courseId),
                examScoreService.getExamScores(courseId),
            ]);
            
            setSettings(settingsRes);
            setStudents(scoresRes.students);

            // Build score map
            const map: ScoreMap = {};
            scoresRes.settings.forEach(s => {
                map[s.id] = {};
                s.scores?.forEach(score => {
                    map[s.id][score.student_id] = score;
                });
            });
            setScoreMap(map);
        } catch (error) {
            console.error("Failed to load exam data:", error);
            addToast({ title: "ไม่สามารถโหลดข้อมูลได้", color: "danger" });
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter settings by tab
    const filteredSettings = useMemo(() => {
        if (!settings) return [];
        return settings.filter(s => s.exam_type === activeTab && s.is_active);
    }, [settings, activeTab]);

    // Filter students by search
    const filteredStudents = useMemo(() => {
        if (!students) return [];
        if (!searchQuery) return students;
        const q = searchQuery.toLowerCase();
        return students.filter(s => 
            s.student_id.toLowerCase().includes(q) ||
            s.full_name.toLowerCase().includes(q)
        );
    }, [students, searchQuery]);

    // Save single score
    const handleSaveScore = async (settingId: number, studentId: number, scoreValue: string) => {
        if (!isCourseActive) return;
        
        const score = scoreValue === "" ? null : parseFloat(scoreValue);
        if (scoreValue !== "" && isNaN(score as number)) {
            addToast({ title: "คะแนนไม่ถูกต้อง", color: "danger" });
            return;
        }

        // Check if score exceeds max_score
        const setting = settings.find(s => s.id === settingId);
        if (setting && score !== null && score > setting.max_score) {
            addToast({ title: `คะแนนเกินคะแนนเต็ม (${setting.max_score})`, color: "danger" });
            return;
        }
        if (score !== null && score < 0) {
            addToast({ title: "คะแนนต้องไม่ติดลบ", color: "danger" });
            return;
        }

        setIsSaving(true);
        try {
            const result = await examScoreService.saveExamScore(courseId, {
                exam_setting_id: settingId,
                student_id: studentId,
                score,
            });

            // Update local state
            setScoreMap(prev => ({
                ...prev,
                [settingId]: {
                    ...prev[settingId],
                    [studentId]: result,
                },
            }));
            setEditingScore(null);
            addToast({ title: "บันทึกคะแนนสำเร็จ", color: "success" });
        } catch (error: any) {
            addToast({ title: error?.response?.data?.message || "ไม่สามารถบันทึกได้", color: "danger" });
        } finally {
            setIsSaving(false);
        }
    };

    // Validate bulk data when pasted
    const validateBulkData = useCallback((data: string, settingId: number | null) => {
        if (!data.trim() || !settingId) {
            setParsedBulkData([]);
            return;
        }

        const setting = settings.find(s => s.id === settingId);
        const maxScore = setting?.max_score ?? 100;
        
        // Create a map of student_id to student for quick lookup
        const studentMap = new Map<string, Student>();
        students.forEach(s => {
            studentMap.set(s.student_id.toLowerCase(), s);
        });

        const lines = data.split(/\r?\n/).filter(line => line.trim());
        const parsed: ParsedBulkItem[] = [];

        for (const line of lines) {
            // Split by tab or comma
            const parts = line.split(/[\t,]/).map(p => p.trim());
            if (parts.length < 2) continue;

            const inputStudentId = parts[0];
            const inputScore = parts[1];
            
            // Find student
            const matchedStudent = studentMap.get(inputStudentId.toLowerCase());
            
            // Parse score
            const scoreNum = inputScore === "" || inputScore === "-" ? null : parseFloat(inputScore);
            const isValidScore = inputScore === "" || inputScore === "-" || !isNaN(scoreNum as number);
            
            let status: ParsedBulkItem["status"] = "valid";
            
            if (!matchedStudent) {
                status = "not_found";
            } else if (!isValidScore) {
                status = "invalid_score";
            } else if (scoreNum !== null && scoreNum < 0) {
                status = "negative_score";
            } else if (scoreNum !== null && scoreNum > maxScore) {
                status = "score_exceeds";
            }
            
            parsed.push({
                inputStudentId,
                inputScore,
                status,
                matchedStudent,
                parsedScore: isValidScore ? scoreNum : undefined,
            });
        }

        setParsedBulkData(parsed);
    }, [settings, students]);

    // Handle bulk import
    const handleBulkImport = async () => {
        if (!bulkSettingId) return;
        
        // Get only valid items
        const validItems = parsedBulkData.filter(p => p.status === "valid" && p.matchedStudent);
        if (validItems.length === 0) {
            addToast({ title: "ไม่มีข้อมูลที่ถูกต้อง กรุณาตรวจสอบข้อมูล", color: "danger" });
            return;
        }

        const scores = validItems.map(item => ({
            student_id: item.inputStudentId,
            score: item.parsedScore ?? null,
        }));

        setIsBulkSaving(true);
        try {
            const result = await examScoreService.bulkSaveExamScores(courseId, {
                exam_setting_id: bulkSettingId,
                scores,
            });

            addToast({ title: result.message, color: "success" });
            if (result.errors.length > 0) {
                addToast({ title: `มี ${result.errors.length} รายการที่ไม่สำเร็จ`, color: "warning" });
            }

            // Reload data
            await loadData();
            setIsBulkModalOpen(false);
            setBulkData("");
            setBulkSettingId(null);
            setParsedBulkData([]);
        } catch (error: any) {
            addToast({ title: error?.response?.data?.message || "ไม่สามารถนำเข้าได้", color: "danger" });
        } finally {
            setIsBulkSaving(false);
        }
    };

    // Save settings
    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const updates = Object.entries(settingsData);
            for (const [idStr, data] of updates) {
                const id = parseInt(idStr);
                await examScoreService.updateExamSetting(courseId, id, data);
            }
            addToast({ title: "บันทึกการตั้งค่าสำเร็จ", color: "success" });
            await loadData();
            setIsSettingsModalOpen(false);
            setSettingsData({});
        } catch (error: any) {
            addToast({ title: error?.response?.data?.message || "ไม่สามารถบันทึกได้", color: "danger" });
        } finally {
            setIsSaving(false);
        }
    };

    // Get score value for display
    const getScoreDisplay = (settingId: number, studentId: number): string => {
        const score = scoreMap[settingId]?.[studentId]?.score;
        return score !== null && score !== undefined ? String(score) : "";
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
            </div>
        );
    }

    const activeSettings = settings?.filter(s => s.is_active) || [];
    const hasActiveSettings = activeSettings.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">คะแนนสอบ</h2>
                    <p className="text-sm text-slate-500">จัดการคะแนนสอบกลางภาคและปลายภาค</p>
                </div>
                <Button
                    className="font-medium bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-md hover:shadow-lg"
                    startContent={<Icon icon="solar:settings-bold" />}
                    onPress={() => {
                        // Initialize settings data
                        const data: {[id: number]: Partial<ExamSetting>} = {};
                        settings.forEach(s => {
                            data[s.id] = {
                                max_score: s.max_score,
                                is_visible: s.is_visible,
                                is_active: s.is_active,
                            };
                        });
                        setSettingsData(data);
                        setIsSettingsModalOpen(true);
                    }}
                >
                    ตั้งค่าการสอบ
                </Button>
            </div>

            {!hasActiveSettings ? (
                // No active settings
                <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
                    <CardBody className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                            <Icon icon="solar:document-add-bold-duotone" className="text-5xl text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่เปิดใช้งานการสอบ</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                            กดปุ่ม "ตั้งค่าการสอบ" เพื่อเปิดใช้งานและกำหนดคะแนนเต็มของแต่ละการสอบ
                        </p>
                    </CardBody>
                </Card>
            ) : (
                <>
                    {/* Tabs */}
                    <Tabs
                        selectedKey={activeTab}
                        onSelectionChange={(key) => setActiveTab(key as string)}
                        variant="underlined"
                        classNames={{
                            tabList: "gap-6",
                            cursor: "bg-blue-500",
                            tab: "px-0 h-11",
                            tabContent: "group-data-[selected=true]:text-blue-600 text-slate-500 font-medium"
                        }}
                    >
                        <Tab
                            key="midterm"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:notebook-bold" className="text-lg" />
                                    <span>สอบกลางภาค</span>
                                </div>
                            }
                        />
                        <Tab
                            key="final"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:diploma-bold" className="text-lg" />
                                    <span>สอบปลายภาค</span>
                                </div>
                            }
                        />
                    </Tabs>

                    {/* Search & Actions */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="py-3 px-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <Input
                                    placeholder="ค้นหารหัสหรือชื่อนักศึกษา..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                    startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                    className="w-full sm:max-w-sm"
                                    size="sm"
                                    variant="bordered"
                                    isClearable
                                />
                                <div className="flex items-center gap-2">
                                    <Chip size="sm" variant="flat" className="bg-slate-100">
                                        {filteredStudents.length} คน
                                    </Chip>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Score Tables */}
                    {filteredSettings.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredSettings.map(setting => (
                                <Card key={setting.id} className="shadow-sm border border-slate-200">
                                    <CardHeader className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    setting.component === 'lab' 
                                                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500' 
                                                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                                }`}>
                                                    <Icon 
                                                        icon={setting.component === 'lab' ? 'solar:monitor-bold' : 'solar:book-bold'} 
                                                        className="text-xl text-white" 
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">
                                                        {getComponentLabel(setting.component)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        คะแนนเต็ม {setting.max_score} คะแนน
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {setting.is_visible ? (
                                                    <Chip size="sm" color="success" variant="flat" startContent={<Icon icon="solar:eye-bold" width={14} />}>
                                                        แสดงผล
                                                    </Chip>
                                                ) : (
                                                    <Chip size="sm" variant="flat" className="bg-slate-100" startContent={<Icon icon="solar:eye-closed-linear" width={14} />}>
                                                        ซ่อน
                                                    </Chip>
                                                )}
                                                <Tooltip content="นำเข้าจาก Excel">
                                                    <Button
                                                        
                                                        size="sm"
                                                        variant="flat"
                                                        color="primary"
                                                        isDisabled={!isCourseActive}
                                                        onPress={() => {
                                                            setBulkSettingId(setting.id);
                                                            setIsBulkModalOpen(true);
                                                        }}
                                                    >
                                                        <Icon icon="solar:import-bold" />
                                                        นำเข้าจาก Excel
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="p-0 max-h-96 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="sticky top-0 bg-slate-100/80 backdrop-blur-sm">
                                                <tr>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">รหัสนักศึกษา</th>
                                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">คะแนน</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredStudents.map((student, idx) => {
                                                    const isEditing = editingScore?.settingId === setting.id && editingScore?.studentId === student.id;
                                                    const scoreValue = getScoreDisplay(setting.id, student.id);
                                                    
                                                    return (
                                                        <tr 
                                                            key={student.id} 
                                                            className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                                        >
                                                            <td className="py-3 px-4 text-sm font-mono text-slate-600">
                                                                {student.student_id}
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-slate-800">
                                                                {student.full_name}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-1 justify-end">
                                                                        <Input
                                                                            type="number"
                                                                            size="sm"
                                                                            variant="bordered"
                                                                            className="w-20"
                                                                            value={editingScore.value}
                                                                            onValueChange={(v) => setEditingScore({...editingScore, value: v})}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    handleSaveScore(setting.id, student.id, editingScore.value);
                                                                                } else if (e.key === 'Escape') {
                                                                                    setEditingScore(null);
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            color="success"
                                                                            variant="flat"
                                                                            isLoading={isSaving}
                                                                            onPress={() => handleSaveScore(setting.id, student.id, editingScore.value)}
                                                                        >
                                                                            <Icon icon="solar:check-circle-bold" />
                                                                        </Button>
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="flat"
                                                                            color="danger"
                                                                            onPress={() => setEditingScore(null)}
                                                                        >
                                                                            <Icon icon="solar:close-circle-bold" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        className="inline-flex items-center justify-end gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors min-w-16 text-right"
                                                                        onClick={() => setEditingScore({
                                                                            settingId: setting.id,
                                                                            studentId: student.id,
                                                                            value: scoreValue,
                                                                        })}
                                                                        disabled={!isCourseActive}
                                                                    >
                                                                        <span className={`text-sm font-medium ${scoreValue ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                            {scoreValue || "-"}
                                                                        </span>
                                                                        {isCourseActive && (
                                                                            <Icon icon="solar:pen-linear" className="text-slate-400 text-xs" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {filteredStudents.length === 0 && (
                                            <div className="text-center py-8 text-slate-500">
                                                ไม่พบนักศึกษา
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="text-center py-12">
                                <Icon icon="solar:document-text-linear" className="text-4xl text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">
                                    ยังไม่เปิดใช้งานสอบ{activeTab === 'midterm' ? 'กลางภาค' : 'ปลายภาค'}
                                </p>
                                <p className="text-sm text-slate-400 mt-1">
                                    กดปุ่ม "ตั้งค่าการสอบ" เพื่อเปิดใช้งาน
                                </p>
                            </CardBody>
                        </Card>
                    )}
                </>
            )}

            {/* Bulk Import Modal */}
            <Modal 
                isOpen={isBulkModalOpen} 
                onClose={() => {
                    setIsBulkModalOpen(false);
                    setBulkData("");
                    setParsedBulkData([]);
                }} 
                size="3xl"
                scrollBehavior="outside"
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon icon="solar:import-bold" className="text-xl text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">นำเข้าคะแนนจาก Excel</h3>
                            <p className="text-sm text-slate-500 font-normal">
                                {bulkSettingId && settings.find(s => s.id === bulkSettingId) && (
                                    <>คะแนนเต็ม: {settings.find(s => s.id === bulkSettingId)?.max_score} คะแนน</>
                                )}
                            </p>
                        </div>
                    </ModalHeader>
                    <ModalBody className="space-y-4">
                        {/* Example Format */}
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Icon icon="solar:info-circle-bold" className="text-blue-500" />
                                รูปแบบข้อมูล: คัดลอกจาก Excel แล้ววาง
                            </p>
                            <div className="bg-white rounded border border-slate-200 p-3 font-mono text-xs">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-slate-200">
                                            <th className="text-left pb-2 pr-8">คอลัมน์ A: รหัสนักศึกษา</th>
                                            <th className="text-left pb-2">คอลัมน์ B: คะแนน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700">
                                        <tr><td className="py-1">650705010-1</td><td>85</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ใส่ "-" หรือเว้นว่างถ้าต้องการลบคะแนน
                            </p>
                        </div>

                        {/* Textarea for paste */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">วางข้อมูลที่นี่</label>
                            <textarea
                                className="w-full h-40 p-3 border border-slate-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="วางข้อมูลจาก Excel ที่นี่..."
                                value={bulkData}
                                onChange={(e) => {
                                    setBulkData(e.target.value);
                                    validateBulkData(e.target.value, bulkSettingId);
                                }}
                            />
                        </div>

                        {/* Validation Results */}
                        {parsedBulkData.length > 0 && (
                            <div className="space-y-3">
                                {/* Summary Chips */}
                                <div className="flex flex-wrap gap-2">
                                    <Chip size="sm" color="success" variant="flat" startContent={<Icon icon="solar:check-circle-bold" width={14} />}>
                                        ถูกต้อง {parsedBulkData.filter(p => p.status === "valid").length}
                                    </Chip>
                                    <Chip size="sm" color="danger" variant="flat" startContent={<Icon icon="solar:user-cross-bold" width={14} />}>
                                        ไม่พบรหัส {parsedBulkData.filter(p => p.status === "not_found").length}
                                    </Chip>
                                    <Chip size="sm" color="warning" variant="flat" startContent={<Icon icon="solar:danger-triangle-bold" width={14} />}>
                                        คะแนนเกิน {parsedBulkData.filter(p => p.status === "score_exceeds").length}
                                    </Chip>
                                    {parsedBulkData.filter(p => p.status === "invalid_score" || p.status === "negative_score").length > 0 && (
                                        <Chip size="sm" color="danger" variant="flat" startContent={<Icon icon="solar:close-circle-bold" width={14} />}>
                                            คะแนนไม่ถูกต้อง {parsedBulkData.filter(p => p.status === "invalid_score" || p.status === "negative_score").length}
                                        </Chip>
                                    )}
                                </div>

                                {/* Validation List */}
                                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {parsedBulkData.map((item, index) => (
                                        <div 
                                            key={index}
                                            className={`p-3 flex items-center justify-between ${
                                                item.status === "valid" ? "bg-emerald-50" :
                                                item.status === "not_found" ? "bg-red-50" :
                                                item.status === "score_exceeds" ? "bg-amber-50" :
                                                "bg-red-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon 
                                                    icon={
                                                        item.status === "valid" ? "solar:check-circle-bold" :
                                                        item.status === "not_found" ? "solar:user-cross-bold" :
                                                        item.status === "score_exceeds" ? "solar:danger-triangle-bold" :
                                                        "solar:close-circle-bold"
                                                    }
                                                    className={`text-lg ${
                                                        item.status === "valid" ? "text-emerald-500" :
                                                        item.status === "not_found" ? "text-red-500" :
                                                        item.status === "score_exceeds" ? "text-amber-500" :
                                                        "text-red-500"
                                                    }`}
                                                />
                                                <div>
                                                    <span className="font-mono text-sm font-medium">{item.inputStudentId}</span>
                                                    <span className="mx-2 text-slate-400">→</span>
                                                    <span className="font-mono text-sm">{item.inputScore || "-"}</span>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm">
                                                {item.status === "valid" && item.matchedStudent && (
                                                    <span className="text-emerald-600">{item.matchedStudent.full_name}</span>
                                                )}
                                                {item.status === "not_found" && (
                                                    <span className="text-red-600">ไม่พบนักศึกษา</span>
                                                )}
                                                {item.status === "score_exceeds" && (
                                                    <span className="text-amber-600">เกินคะแนนเต็ม ({settings.find(s => s.id === bulkSettingId)?.max_score})</span>
                                                )}
                                                {item.status === "invalid_score" && (
                                                    <span className="text-red-600">คะแนนไม่ถูกต้อง</span>
                                                )}
                                                {item.status === "negative_score" && (
                                                    <span className="text-red-600">คะแนนต้องไม่ติดลบ</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button 
                            variant="light" 
                            color="danger"
                            onPress={() => {
                                setIsBulkModalOpen(false);
                                setBulkData("");
                                setParsedBulkData([]);
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button 
                            className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md"
                            onPress={handleBulkImport}
                            isLoading={isBulkSaving}
                            isDisabled={parsedBulkData.filter(p => p.status === "valid").length === 0}
                            startContent={!isBulkSaving && <Icon icon="solar:import-bold" />}
                        >
                            นำเข้า {parsedBulkData.filter(p => p.status === "valid").length} รายการ
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Settings Modal */}
            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} size="3xl" scrollBehavior="outside">
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon icon="solar:settings-bold" className="text-xl text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">ตั้งค่าการสอบ</h3>
                            <p className="text-sm text-slate-500 font-normal">กำหนดการเปิดใช้งาน คะแนนเต็ม และการแสดงผล</p>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-6">
                            {/* Midterm */}
                            <div>
                                <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                                    <Icon icon="solar:notebook-bold" className="text-blue-500" />
                                    สอบกลางภาค
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(settings || []).filter(s => s.exam_type === 'midterm').map(setting => (
                                        <Card key={setting.id} className="border border-slate-200">
                                            <CardBody className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Icon 
                                                            icon={setting.component === 'lab' ? 'solar:monitor-bold' : 'solar:book-bold'}
                                                            className={setting.component === 'lab' ? 'text-emerald-500' : 'text-blue-500'}
                                                        />
                                                        <span className="font-medium">{getComponentLabel(setting.component)}</span>
                                                    </div>
                                                    <Switch
                                                        size="sm"
                                                        isSelected={settingsData[setting.id]?.is_active ?? setting.is_active}
                                                        onValueChange={(v) => setSettingsData(prev => ({
                                                            ...prev,
                                                            [setting.id]: { ...prev[setting.id], is_active: v }
                                                        }))}
                                                        isDisabled={!isCourseActive}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Input
                                                        type="number"
                                                        label="คะแนนเต็ม"
                                                        size="sm"
                                                        variant="bordered"
                                                        value={String(settingsData[setting.id]?.max_score ?? setting.max_score)}
                                                        onValueChange={(v) => setSettingsData(prev => ({
                                                            ...prev,
                                                            [setting.id]: { ...prev[setting.id], max_score: parseFloat(v) || 0 }
                                                        }))}
                                                        isDisabled={!isCourseActive || !settingsData[setting.id]?.is_active}
                                                    />
                                                    <Checkbox
                                                        size="sm"
                                                        isSelected={settingsData[setting.id]?.is_visible ?? setting.is_visible}
                                                        onValueChange={(v) => setSettingsData(prev => ({
                                                            ...prev,
                                                            [setting.id]: { ...prev[setting.id], is_visible: v }
                                                        }))}
                                                        isDisabled={!isCourseActive || !settingsData[setting.id]?.is_active}
                                                    >
                                                        <span className="text-sm">เปิดให้นักศึกษาดูคะแนน</span>
                                                    </Checkbox>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Final */}
                            <div>
                                <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                                    <Icon icon="solar:notebook-bold" className="text-indigo-500" />
                                    สอบปลายภาค
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(settings || []).filter(s => s.exam_type === 'final').map(setting => (
                                        <Card key={setting.id} className="border border-slate-200">
                                            <CardBody className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Icon 
                                                            icon={setting.component === 'lab' ? 'solar:monitor-bold' : 'solar:book-bold'}
                                                            className={setting.component === 'lab' ? 'text-emerald-500' : 'text-blue-500'}
                                                        />
                                                        <span className="font-medium">{getComponentLabel(setting.component)}</span>
                                                    </div>
                                                    <Switch
                                                        size="sm"
                                                        isSelected={settingsData[setting.id]?.is_active ?? setting.is_active}
                                                        onValueChange={(v) => setSettingsData(prev => ({
                                                            ...prev,
                                                            [setting.id]: { ...prev[setting.id], is_active: v }
                                                        }))}
                                                        isDisabled={!isCourseActive}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Input
                                                        type="number"
                                                        label="คะแนนเต็ม"
                                                        size="sm"
                                                        variant="bordered"
                                                        value={String(settingsData[setting.id]?.max_score ?? setting.max_score)}
                                                        onValueChange={(v) => setSettingsData(prev => ({
                                                            ...prev,
                                                            [setting.id]: { ...prev[setting.id], max_score: parseFloat(v) || 0 }
                                                        }))}
                                                        isDisabled={!isCourseActive || !settingsData[setting.id]?.is_active}
                                                    />
                                                    <Checkbox
                                                        size="sm"
                                                        isSelected={settingsData[setting.id]?.is_visible ?? setting.is_visible}
                                                        onValueChange={(v) => setSettingsData(prev => ({
                                                            ...prev,
                                                            [setting.id]: { ...prev[setting.id], is_visible: v }
                                                        }))}
                                                        isDisabled={!isCourseActive || !settingsData[setting.id]?.is_active}
                                                    >
                                                        <span className="text-sm">เปิดให้นักศึกษาดูคะแนน</span>
                                                    </Checkbox>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsSettingsModalOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleSaveSettings}
                            isLoading={isSaving}
                            isDisabled={!isCourseActive}
                        >
                            บันทึก
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
