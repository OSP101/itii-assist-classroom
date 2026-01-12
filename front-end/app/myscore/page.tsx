"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Tabs, Tab } from "@heroui/tabs";
import { Link } from "@heroui/link";
import { Tooltip } from "@heroui/tooltip";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { studentService, StudentScoreLookupResponse, CourseScoreData, AssignmentScore } from "@/services/student.service";

export default function MyScorePage() {
    const [studentId, setStudentId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<StudentScoreLookupResponse | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!studentId.trim()) {
            addToast({
                title: "กรุณากรอกรหัสนักศึกษา",
                description: "กรุณากรอกรหัสนักศึกษาเพื่อค้นหาคะแนน",
                color: "warning",
            });
            return;
        }

        setIsLoading(true);
        setHasSearched(true);

        try {
            const response = await studentService.lookupStudentScores(studentId.trim());
            if (response.success && response.data) {
                setData(response.data);
                addToast({
                    title: "ค้นหาสำเร็จ",
                    description: `พบข้อมูลของ ${response.data.student.full_name}`,
                    color: "success",
                });
            } else {
                setData(null);
                addToast({
                    title: "ไม่พบข้อมูล",
                    description: "ไม่พบข้อมูลนักศึกษาในระบบ",
                    color: "danger",
                });
            }
        } catch (error: unknown) {
            setData(null);
            const errorMessage = error instanceof Error ? error.message : "ไม่พบข้อมูลนักศึกษาในระบบ";
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: errorMessage,
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const getAttendanceConfig = (status: string) => {
        const config: Record<string, { color: "success" | "warning" | "secondary" | "danger"; label: string; icon: string; bg: string }> = {
            present: { color: "success", label: "มาเรียน", icon: "solar:check-circle-bold", bg: "bg-green-50 border-green-200" },
            late: { color: "warning", label: "สาย", icon: "solar:clock-circle-bold", bg: "bg-amber-50 border-amber-200" },
            leave: { color: "secondary", label: "ลา", icon: "solar:document-text-bold", bg: "bg-gray-50 border-gray-200" },
            absent: { color: "danger", label: "ขาด", icon: "solar:close-circle-bold", bg: "bg-red-50 border-red-200" },
        };
        return config[status] || { color: "secondary" as const, label: status, icon: "solar:question-circle-bold", bg: "bg-gray-50" };
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatShortDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString("th-TH", {
            day: "numeric",
            month: "short",
        });
    };

    const getScoreColor = (score: number | null, maxScore: number, isGraded: boolean = true) => {
        if (score === null || !isGraded) return "text-gray-400";
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return "text-green-600";
        if (percentage >= 60) return "text-blue-600";
        if (percentage >= 40) return "text-amber-600";
        return "text-red-500";
    };

    const getDisplayScore = (score: number | null, isGraded: boolean): string => {
        if (!isGraded) return "0";
        if (score === null) return "0";
        return score.toFixed(1);
    };

    const renderAssignmentCard = (assignment: AssignmentScore) => {
        const hasSubItems = assignment.sub_items && assignment.sub_items.length > 0;
        const isGroupWork = assignment.is_group_assignment || assignment.type !== "individual";

        return (
            <div
                key={assignment.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-semibold text-gray-800 truncate">{assignment.title}</h4>
                                {isGroupWork && (
                                    <Chip
                                        size="sm"
                                        variant="flat"
                                        color="secondary"
                                        startContent={<Icon icon="solar:users-group-rounded-bold" className="text-xs" />}
                                    >
                                        กลุ่ม
                                    </Chip>
                                )}
                            </div>
                            {assignment.group_info && (
                                <p className="text-xs text-purple-600 flex items-center gap-1">
                                    <Icon icon="solar:users-group-rounded-linear" />
                                    {assignment.group_info.name}
                                </p>
                            )}
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className={`text-2xl font-bold ${getScoreColor(assignment.score, assignment.max_score, assignment.status === "graded")}`}>
                                {getDisplayScore(assignment.score, assignment.status === "graded")}<span className="text-xs text-gray-400">/ {assignment.max_score}</span>
                            </div>
                            
                        </div>
                    </div>
                </div>

                {/* Sub Items */}
                {hasSubItems && (
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <Icon icon="solar:list-check-linear" />
                            รายละเอียดคะแนน
                        </p>
                        <div className="space-y-2">
                            {assignment.sub_items.map((subItem) => {
                                const subItemGraded = subItem.score !== null;
                                return (
                                    <div key={subItem.id} className="bg-white/60 rounded-lg px-3 py-2 flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{subItem.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-bold ${
                                                subItemGraded ? "text-blue-600" : "text-gray-400"
                                            }`}>
                                                {subItemGraded ? subItem.score : 0}/{subItem.max_score}
                                            </span>
                                            {subItemGraded ? (
                                                <Tooltip content={subItem.grader ? `ตรวจโดย ${subItem.grader}` : "ตรวจแล้ว"}>
                                                    <span className="text-[10px] text-green-600 flex items-center gap-0.5 cursor-help whitespace-nowrap">
                                                        <Icon icon="solar:check-circle-bold" className="text-xs" />
                                                        {formatShortDate(subItem.graded_at)}
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-[10px] text-amber-500 flex items-center gap-0.5 whitespace-nowrap">
                                                    <Icon icon="solar:clock-circle-bold" className="text-xs" />
                                                    รอตรวจ
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        {assignment.status === "graded" ? (
                            <span className="flex items-center gap-1 text-green-600">
                                <Icon icon="solar:check-circle-bold" />
                                ตรวจแล้ว
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-amber-500">
                                <Icon icon="solar:clock-circle-bold" />
                                รอตรวจ
                            </span>
                        )}
                    </div>
                    {assignment.status === "graded" && (
                        <div className="flex items-center gap-2">
                            {assignment.grader && (
                                <span className="flex items-center gap-1">
                                    <Icon icon="solar:user-check-linear" />
                                    {assignment.grader}
                                </span>
                            )}
                            {assignment.graded_at && (
                                <span className="flex items-center gap-1 text-gray-400">
                                    <Icon icon="solar:calendar-linear" />
                                    {formatDate(assignment.graded_at)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Comment */}
                {assignment.comment && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                        <p className="text-xs text-amber-700 flex items-start gap-1">
                            <Icon icon="solar:chat-square-text-linear" className="mt-0.5 flex-shrink-0" />
                            <span className="italic">&quot;{assignment.comment}&quot;</span>
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderCourseCard = (courseData: CourseScoreData) => {
        const { course, assignments, totalScore, totalMaxScore, progress, attendance, bonusScore } = courseData;
        const gradedCount = assignments.filter(a => a.status === "graded").length;

        return (
            <Card key={course.id} className="mb-6 shadow-lg border-none overflow-visible">
                {/* Course Header */}
                <CardHeader className="flex flex-col gap-3 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white p-5 sm:p-6 rounded-t-xl">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start w-full gap-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                    <Icon icon="solar:book-2-bold" className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{course.code}</h3>
                                    <p className="text-blue-100 text-sm">{course.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-blue-200 text-xs">
                                <Icon icon="solar:calendar-linear" />
                                <span>ปีการศึกษา {course.year} / ภาคเรียนที่ {course.semester}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {bonusScore && bonusScore.total > 0 && (
                                <div className="flex items-center gap-1 bg-amber-400/20 rounded-xl px-3 py-2">
                                    <Icon icon="solar:star-bold" className="text-amber-300" />
                                    <span className="text-2xl font-bold text-amber-300">+{bonusScore.total}</span>
                                </div>
                            )}
                            <div className="flex items-end gap-1 bg-white/10 rounded-xl px-4 py-3">
                                <span className="text-4xl font-bold">{totalScore.toFixed(1)}</span>
                                <span className="text-blue-200 text-sm mb-1">/ {totalMaxScore.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-blue-100">คะแนนรวม {progress}%</span>
                            <span className="text-blue-100">{gradedCount}/{assignments.length} รายการ</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </CardHeader>

                {/* Tabs Content */}
                <CardBody className="p-0">
                    <Tabs
                        aria-label="Course tabs"
                        color="primary"
                        variant="underlined"
                        classNames={{
                            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider px-4",
                            cursor: "w-full bg-blue-500",
                            tab: "max-w-fit px-0 h-12",
                            tabContent: "group-data-[selected=true]:text-blue-600",
                        }}
                    >
                        {/* Scores Tab */}
                        <Tab
                            key="scores"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:document-text-linear" className="text-lg" />
                                    <span>คะแนนเก็บ</span>
                                    <Chip size="sm" variant="flat" color="primary">{assignments.length}</Chip>
                                </div>
                            }
                        >
                            <div className="p-4 sm:p-5">
                                {assignments.length > 0 ? (
                                    <div className="grid gap-3 sm:gap-4">
                                        {assignments.map(renderAssignmentCard)}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Icon icon="solar:document-text-linear" className="text-5xl mx-auto mb-2 opacity-50" />
                                        <p>ยังไม่มีคะแนน</p>
                                    </div>
                                )}
                            </div>
                        </Tab>

                        {/* Attendance Tab */}
                        <Tab
                            key="attendance"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:calendar-mark-linear" className="text-lg" />
                                    <span>เช็คชื่อ</span>
                                    <Chip size="sm" variant="flat" color="success">{attendance.records.length}</Chip>
                                </div>
                            }
                        >
                            <div className="p-4 sm:p-5">
                                {/* Attendance Summary */}
                                <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
                                    {[
                                        { key: "present", label: "มาเรียน", color: "bg-green-500", icon: "solar:check-circle-bold" },
                                        { key: "late", label: "สาย", color: "bg-amber-500", icon: "solar:clock-circle-bold" },
                                        { key: "leave", label: "ลา", color: "bg-gray-400", icon: "solar:document-text-bold" },
                                        { key: "absent", label: "ขาด", color: "bg-red-500", icon: "solar:close-circle-bold" },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className="bg-gray-50 rounded-xl p-3 text-center"
                                        >
                                            <div className={`w-8 h-8 ${item.color} rounded-full flex items-center justify-center mx-auto mb-1`}>
                                                <Icon icon={item.icon} className="text-white text-sm" />
                                            </div>
                                            <p className="text-xl font-bold text-gray-700">
                                                {attendance.summary[item.key as keyof typeof attendance.summary]}
                                            </p>
                                            <p className="text-xs text-gray-500">{item.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Attendance Records */}
                                {attendance.records.length > 0 ? (
                                    <div className="space-y-2">
                                        {attendance.records.map((record) => {
                                            const config = getAttendanceConfig(record.status);
                                            return (
                                                <div
                                                    key={record.id}
                                                    className={`flex items-center justify-between p-3 rounded-xl border ${config.bg}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                            record.status === "present" ? "bg-green-100" :
                                                            record.status === "late" ? "bg-amber-100" :
                                                            record.status === "absent" ? "bg-red-100" : "bg-gray-100"
                                                        }`}>
                                                            <Icon icon={config.icon} className={`text-lg ${
                                                                record.status === "present" ? "text-green-600" :
                                                                record.status === "late" ? "text-amber-600" :
                                                                record.status === "absent" ? "text-red-600" : "text-gray-600"
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-800 text-sm">{record.session_title}</p>
                                                            <p className="text-xs text-gray-500">{formatShortDate(record.date)}</p>
                                                        </div>
                                                    </div>
                                                    <Chip size="sm" color={config.color} variant="flat">
                                                        {config.label}
                                                    </Chip>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Icon icon="solar:calendar-mark-linear" className="text-5xl mx-auto mb-2 opacity-50" />
                                        <p>ยังไม่มีข้อมูลเช็คชื่อ</p>
                                    </div>
                                )}
                            </div>
                        </Tab>

                        {/* Bonus Score Tab */}
                        <Tab
                            key="bonus"
                            title={
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:star-bold" className="text-lg text-amber-500" />
                                    <span>คะแนนพิเศษ</span>
                                    {bonusScore && bonusScore.total > 0 && (
                                        <Chip size="sm" variant="flat" color="warning">{bonusScore.total}</Chip>
                                    )}
                                </div>
                            }
                        >
                            <div className="p-4 sm:p-5">
                                {/* Bonus Score Summary */}
                                <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                        <Icon icon="solar:star-bold" className="text-3xl text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-amber-700">คะแนนพิเศษรวม</p>
                                        <p className="text-4xl font-bold text-amber-600">+{bonusScore?.total || 0}</p>
                                        <p className="text-xs text-amber-500">คะแนน</p>
                                    </div>
                                </div>

                                {/* Bonus Score Records */}
                                {bonusScore && bonusScore.records.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                                            <Icon icon="solar:history-linear" />
                                            ประวัติการได้รับคะแนน ({bonusScore.records.length} รายการ)
                                        </p>
                                        {bonusScore.records.map((record, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                        <Icon icon="solar:star-bold" className="text-lg text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 text-sm">{record.reason}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            {record.given_by && (
                                                                <span className="flex items-center gap-1">
                                                                    <Icon icon="solar:user-check-linear" />
                                                                    {record.given_by}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <Icon icon="solar:calendar-linear" />
                                                                {formatDate(record.given_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Chip size="sm" color="warning" variant="flat" className="font-bold">
                                                    +{record.score}
                                                </Chip>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Icon icon="solar:star-linear" className="text-5xl mx-auto mb-2 opacity-50" />
                                        <p>ยังไม่มีคะแนนพิเศษ</p>
                                        <p className="text-xs mt-1">คะแนนพิเศษจะได้รับจากการตอบคำถามในห้องเรียน</p>
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>
                </CardBody>
            </Card>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
                </div>

                <div className="relative max-w-4xl mx-auto px-4 py-8 sm:py-12">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4">
                            <Icon icon="solar:graduation-cap-bold" className="text-lg" />
                            <span className="text-sm font-medium">ITII Assist Classroom</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3">ค้นหาคะแนนรายบุคคล</h1>
                        <p className="text-blue-100 text-sm sm:text-base max-w-md mx-auto">
                            ตรวจสอบคะแนนเก็บและความคืบหน้าการเรียนของคุณได้ทันที
                        </p>
                    </div>
                </div>
            </div>

            {/* Search Section */}
            <div className="max-w-4xl mx-auto w-full px-4 -mt-6 z-10">
                <Card className="shadow-xl border-none">
                    <CardBody className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="กรอกรหัสนักศึกษา เช่น 660705010-1"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                onKeyPress={handleKeyPress}
                                size="lg"
                                variant="bordered"
                                isClearable
                                onClear={() => setStudentId("")}
                                startContent={
                                    <Icon icon="solar:user-id-bold" className="text-blue-500 text-xl" />
                                }
                                classNames={{
                                    inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:!border-blue-500 h-14",
                                    input: "text-base",
                                }}
                            />
                            <Button
                                color="primary"
                                size="lg"
                                onPress={handleSearch}
                                isLoading={isLoading}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 h-14 min-w-[140px] text-base font-medium"
                                startContent={!isLoading && <Icon icon="solar:magnifer-bold" className="text-xl" />}
                            >
                                ค้นหาคะแนน
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="relative">
                            <Spinner size="lg" color="primary" />
                        </div>
                        <p className="text-gray-500 mt-4 animate-pulse">กำลังค้นหาข้อมูล...</p>
                    </div>
                ) : data ? (
                    <>
                        {/* Student Info Card */}
                        <Card className="mb-6 shadow-lg border-none overflow-hidden">
                            <CardBody className="p-0">
                                <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5 sm:p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                                            <Icon icon="solar:user-bold" className="text-white text-3xl sm:text-4xl" />
                                        </div>
                                        <div className="text-white">
                                            <h2 className="text-xl sm:text-2xl font-bold mb-1">
                                                {data.student.full_name}
                                            </h2>
                                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                                                <Icon icon="solar:card-2-linear" />
                                                <span>{data.student.student_id}</span>
                                            </div>
                                            {data.student.email && (
                                                <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                                    <Icon icon="solar:letter-linear" />
                                                    <span>{data.student.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 divide-x divide-gray-100">
                                    <div className="p-4 text-center">
                                        <p className="text-3xl font-bold text-blue-600">{data.courses.length}</p>
                                        <p className="text-xs text-gray-500 mt-1">รายวิชา</p>
                                    </div>
                                    <div className="p-4 text-center">
                                        <p className="text-3xl font-bold text-green-600">
                                            {data.courses.reduce((sum, c) => sum + c.assignments.filter(a => a.status === "graded").length, 0)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">ตรวจแล้ว</p>
                                    </div>
                                    <div className="p-4 text-center">
                                        <p className="text-3xl font-bold text-purple-600">
                                            {data.courses.reduce((sum, c) => sum + c.attendance.records.length, 0)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">เช็คชื่อ</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Course Cards */}
                        {data.courses.length > 0 ? (
                            data.courses.map(renderCourseCard)
                        ) : (
                            <Card className="shadow-lg border-none">
                                <CardBody className="p-12 text-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icon icon="solar:notebook-linear" className="text-4xl text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 font-medium mb-1">ไม่พบรายวิชา</p>
                                    <p className="text-gray-400 text-sm">นักศึกษายังไม่ได้ลงทะเบียนรายวิชาใดๆ</p>
                                </CardBody>
                            </Card>
                        )}
                    </>
                ) : hasSearched ? (
                    <Card className="shadow-lg border-none">
                        <CardBody className="p-12 text-center">
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon icon="solar:user-cross-bold" className="text-5xl text-red-400" />
                            </div>
                            <p className="text-gray-700 font-semibold text-lg mb-2">ไม่พบข้อมูลนักศึกษา</p>
                            <p className="text-gray-400 text-sm">กรุณาตรวจสอบรหัสนักศึกษาและลองใหม่อีกครั้ง</p>
                        </CardBody>
                    </Card>
                ) : (
                    <Card className="shadow-lg border-none">
                        <CardBody className="p-12 text-center">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon icon="solar:magnifer-bold" className="text-5xl text-blue-400" />
                            </div>
                            <p className="text-gray-700 font-semibold text-lg mb-2">เริ่มต้นค้นหาคะแนน</p>
                            <p className="text-gray-400 text-sm">กรอกรหัสนักศึกษาด้านบนเพื่อดูคะแนนและการเช็คชื่อ</p>
                        </CardBody>
                    </Card>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto py-4 text-center text-slate-400 text-xs sm:text-sm px-4 font-light bg-white/50">
                © 2025 ITII Assist Classroom. All Rights Reserved. Made with ❤️ by{" "}
                <Link href="https://github.com/OSP101" target="_blank" className="text-blue-500 hover:text-blue-600">
                    OSP101
                </Link>
            </div>
        </div>
    );
}
