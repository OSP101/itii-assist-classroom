"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Tooltip } from "@heroui/tooltip";
import { Tabs, Tab } from "@heroui/tabs";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import bonusScoreService, { StudentWithBonus, StudentBonusData } from "@/services/bonusScore.service";

interface BonusScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
}

export default function BonusScoreModal({ isOpen, onClose, courseId }: BonusScoreModalProps) {
    const [activeTab, setActiveTab] = useState<"give" | "history">("give");
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<StudentWithBonus[]>([]);
    const [bonusHistory, setBonusHistory] = useState<StudentBonusData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [givingTo, setGivingTo] = useState<number | null>(null);

    // Fetch enrolled students
    const fetchStudents = useCallback(async () => {
        if (!courseId) return;
        setIsLoading(true);
        try {
            const response = await bonusScoreService.getEnrolledStudents(courseId, searchQuery);
            if (response.success && response.data) {
                setStudents(response.data.students);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, searchQuery]);

    // Fetch bonus history
    const fetchBonusHistory = useCallback(async () => {
        if (!courseId) return;
        setIsLoadingHistory(true);
        try {
            const response = await bonusScoreService.getBonusScoresByCourse(courseId);
            if (response.success && response.data) {
                setBonusHistory(response.data.studentBonusScores);
            }
        } catch (error) {
            console.error("Error fetching bonus history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [courseId]);

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen && courseId) {
            fetchStudents();
            fetchBonusHistory();
        }
    }, [isOpen, courseId, fetchStudents, fetchBonusHistory]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) {
                fetchStudents();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, isOpen, fetchStudents]);

    // Give bonus score
    const handleGiveBonus = async (studentId: number, studentName: string) => {
        setGivingTo(studentId);
        try {
            const response = await bonusScoreService.giveBonusScore({
                course_id: courseId,
                student_id: studentId,
                score: 1,
                reason: "ตอบคำถามในห้องเรียน",
            });

            if (response.success && response.data) {
                addToast({
                    title: "ให้คะแนนสำเร็จ",
                    description: `${studentName} ได้รับ +1 คะแนน (รวม ${response.data.totalBonus} คะแนน)`,
                    color: "success",
                });

                // Update local state
                const newTotalBonus = response.data.totalBonus;
                setStudents(prev =>
                    prev.map(s =>
                        s.id === studentId
                            ? { ...s, totalBonus: newTotalBonus }
                            : s
                    )
                );

                // Refresh history
                fetchBonusHistory();
            }
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถให้คะแนนได้",
                color: "danger",
            });
        } finally {
            setGivingTo(null);
        }
    };

    // Delete bonus record
    const handleDeleteBonus = async (recordId: number) => {
        try {
            const response = await bonusScoreService.deleteBonusScore(recordId);
            if (response.success) {
                addToast({
                    title: "ลบสำเร็จ",
                    description: "ลบคะแนนพิเศษเรียบร้อยแล้ว",
                    color: "success",
                });
                fetchBonusHistory();
                fetchStudents();
            }
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถลบคะแนนได้",
                color: "danger",
            });
        }
    };

    // Filter students by search
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const query = searchQuery.toLowerCase();
        return students.filter(
            s =>
                s.student_id.toLowerCase().includes(query) ||
                s.full_name.toLowerCase().includes(query)
        );
    }, [students, searchQuery]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="3xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                            <Icon icon="solar:star-bold" className="text-2xl text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">คะแนนพิเศษ</h3>
                            <p className="text-sm text-slate-500 font-normal mt-1">
                                ให้คะแนนจากการถามตอบในห้องเรียน
                            </p>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="px-6 py-4">
                    <Tabs
                        selectedKey={activeTab}
                        onSelectionChange={(key) => setActiveTab(key as "give" | "history")}
                        variant="underlined"
                        classNames={{
                            tabList: "gap-6",
                            cursor: "bg-amber-500",
                            tab: "px-0 h-10",
                            tabContent: "group-data-[selected=true]:text-amber-600 text-slate-500 font-medium",
                        }}
                    >
                        {/* Give Score Tab */}
                        <Tab
                            key="give"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                                    <span>ให้คะแนน</span>
                                </div>
                            }
                        >
                            <div className="space-y-4 mt-4">
                                {/* Search */}
                                <Input
                                    placeholder="ค้นหานักศึกษา (รหัส หรือ ชื่อ)"
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                    startContent={<Icon icon="solar:magnifer-linear" className="text-amber-500 text-lg" />}
                                    isClearable
                                    variant="bordered"
                                    classNames={{
                                        inputWrapper: "border-amber-200 hover:border-amber-300 focus-within:!border-amber-500",
                                    }}
                                />

                                {/* Student List */}
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Spinner size="lg" color="warning" />
                                    </div>
                                ) : filteredStudents.length > 0 ? (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {filteredStudents.map((student) => (
                                            <Card
                                                key={student.id}
                                                className="border border-slate-200 shadow-sm hover:shadow-md transition-all"
                                            >
                                                <CardBody className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        {/* Avatar */}
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                                            {student.full_name.charAt(0)}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-slate-800 truncate">
                                                                {student.full_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                <span className="font-mono">{student.student_id}</span>
                                                                <span>•</span>
                                                                <span>กลุ่ม {student.section_no}</span>
                                                            </div>
                                                        </div>

                                                        {/* Current Bonus */}
                                                        {student.totalBonus > 0 && (
                                                            <Chip
                                                                size="sm"
                                                                color="warning"
                                                                variant="flat"
                                                                startContent={<Icon icon="solar:star-bold" className="text-xs" />}
                                                            >
                                                                {student.totalBonus} คะแนน
                                                            </Chip>
                                                        )}

                                                        {/* Give Button */}
                                                        <Tooltip content="ให้ +1 คะแนน">
                                                            <Button
                                                                isIconOnly
                                                                color="warning"
                                                                variant="flat"
                                                                size="sm"
                                                                isLoading={givingTo === student.id}
                                                                onPress={() => handleGiveBonus(student.id, student.full_name)}
                                                                className="shrink-0"
                                                            >
                                                                {givingTo !== student.id && (
                                                                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                                                                )}
                                                            </Button>
                                                        </Tooltip>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-500">
                                        <Icon icon="solar:user-cross-rounded-bold-duotone" className="text-5xl mx-auto mb-3 text-slate-300" />
                                        <p>ไม่พบนักศึกษา</p>
                                        {searchQuery && (
                                            <Button
                                                size="sm"
                                                variant="light"
                                                className="mt-2"
                                                onPress={() => setSearchQuery("")}
                                            >
                                                ล้างการค้นหา
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Tab>

                        {/* History Tab */}
                        <Tab
                            key="history"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:history-bold" className="text-lg" />
                                    <span>ประวัติ</span>
                                    {bonusHistory.length > 0 && (
                                        <Chip size="sm" variant="flat" className="bg-amber-100 text-amber-700 h-5 min-w-5 px-1">
                                            {bonusHistory.length}
                                        </Chip>
                                    )}
                                </div>
                            }
                        >
                            <div className="space-y-4 mt-4">
                                {isLoadingHistory ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Spinner size="lg" color="warning" />
                                    </div>
                                ) : bonusHistory.length > 0 ? (
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                        {bonusHistory.map((data) => (
                                            <Card
                                                key={data.student.id}
                                                className="border border-slate-200 shadow-sm"
                                            >
                                                <CardBody className="p-4">
                                                    {/* Student Header */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                                                                {data.student.full_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">
                                                                    {data.student.full_name}
                                                                </p>
                                                                <p className="text-sm text-slate-500 font-mono">
                                                                    {data.student.student_id}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Chip
                                                            size="lg"
                                                            color="warning"
                                                            variant="solid"
                                                            startContent={<Icon icon="solar:star-bold" />}
                                                        >
                                                            {data.totalScore} คะแนน
                                                        </Chip>
                                                    </div>

                                                    {/* Records */}
                                                    <div className="space-y-1.5 pl-13">
                                                        {data.records.slice(0, 5).map((record) => (
                                                            <div
                                                                key={record.id}
                                                                className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Chip size="sm" color="success" variant="flat">
                                                                        +{record.score}
                                                                    </Chip>
                                                                    <span className="text-slate-600">{record.reason}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-slate-400 text-xs">
                                                                        {new Date(record.given_at).toLocaleString("th-TH", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        })}
                                                                    </span>
                                                                    <Tooltip content="ลบคะแนนนี้" color="danger">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            color="danger"
                                                                            onPress={() => handleDeleteBonus(record.id)}
                                                                        >
                                                                            <Icon icon="solar:trash-bin-trash-linear" className="text-sm" />
                                                                        </Button>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {data.records.length > 5 && (
                                                            <p className="text-xs text-slate-400 text-center pt-1">
                                                                และอีก {data.records.length - 5} รายการ
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-500">
                                        <Icon icon="solar:star-fall-bold-duotone" className="text-5xl mx-auto mb-3 text-slate-300" />
                                        <p>ยังไม่มีประวัติการให้คะแนนพิเศษ</p>
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>
                </ModalBody>

                <ModalFooter className="px-6 py-4 border-t border-slate-100">
                    <Button variant="light" onPress={onClose}>
                        ปิด
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
