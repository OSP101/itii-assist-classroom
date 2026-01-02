"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Progress } from "@heroui/progress";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from "@heroui/table";
import { Icon } from "@iconify/react";
import { OverviewSkeleton } from "./Skeletons";
import type { Course, CourseOverview } from "@/services/course.service";
import type { AssignmentType } from "./types";

interface OverviewTabProps {
    course: Course;
    overview: CourseOverview | null;
    isLoading: boolean;
    userRole: string;
    assignments: AssignmentType[];
    onNavigateToAssignments: () => void;
}

export default function OverviewTab({
    course,
    overview,
    isLoading,
    userRole,
    assignments,
    onNavigateToAssignments,
}: OverviewTabProps) {
    if (isLoading) {
        return <OverviewSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Course Detail Card */}
            <Card className="shadow-sm border border-slate-200 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-20 w-48 h-48 bg-white rounded-full blur-3xl"></div>
                </div>
                <CardBody className="relative p-5">
                    <div className="flex flex-col md:flex-row gap-5">
                        {/* Course Image */}
                        <div className="shrink-0">
                            {course.image ? (
                                <img
                                    src={course.image}
                                    alt={course.name}
                                    className="w-full md:w-32 h-32 object-cover rounded-xl border-2 border-white/20"
                                />
                            ) : (
                                <div className="w-full md:w-32 h-32 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/20">
                                    <Icon icon="solar:book-2-bold-duotone" className="text-4xl text-white/60" />
                                </div>
                            )}
                        </div>
                        {/* Course Info */}
                        <div className="flex-1">
                            <div className="flex flex-wrap gap-2 mb-3">
                                <Chip size="sm" className="bg-white/20 text-white border-0">{course.code}</Chip>
                                <Chip size="sm" className="bg-white/20 text-white border-0">
                                    {course.year}/{course.semester === 3 ? "ฤดูร้อน" : course.semester}
                                </Chip>
                                <Chip size="sm" className={`border-0 ${course.is_active ? "bg-emerald-500/30 text-emerald-100" : "bg-slate-500/30 text-slate-200"}`}>
                                    {course.is_active ? "เปิดใช้งาน" : "ปิด"}
                                </Chip>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold mb-2">{course.name}</h2>
                            {course.description && (
                                <p className="text-white/80 text-sm mb-3 line-clamp-2">{course.description}</p>
                            )}
                            {course.instructor && (
                                <div className="flex items-center gap-2 text-white/70 text-sm">
                                    <span>{course.instructor.full_name}</span>
                                </div>
                            )}
                        </div>
                        {/* Quick Stats */}
                        <div className="flex md:flex-col gap-4 md:gap-2 justify-around md:justify-center md:border-l md:border-white/20 md:pl-5">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{overview?.summary.totalStudents || course.studentCount || 0}</p>
                                <p className="text-xs text-white/70">นักศึกษา</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold">{course.sections?.length || 0}</p>
                                <p className="text-xs text-white/70">กลุ่มเรียน</p>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

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
                        {/* Performance Stats */}
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
                                            <span className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full ${index === 0 ? "bg-amber-100 text-amber-600" :
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
                                        <span className={`text-sm font-bold ${(student.percentage || 0) < 30 ? "text-red-500" : "text-amber-500"}`}>
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
                                                <p className="text-xs text-slate-400">คะแนนเต็ม: {assignment.max_score}</p>
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
                                onPress={onNavigateToAssignments}
                            >
                                สร้างงานใหม่
                            </Button>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Row 4: TA Activity & Course Info */}
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
        </div>
    );
}
