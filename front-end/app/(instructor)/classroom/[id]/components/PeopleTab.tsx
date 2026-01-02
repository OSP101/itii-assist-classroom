"use client";

import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Avatar } from "@heroui/avatar";
import { Skeleton } from "@heroui/skeleton";
import {
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
} from "@heroui/table";
import { Icon } from "@iconify/react";

// Types for the component
interface Instructor {
    id: number;
    full_name: string;
    email: string | null;
    username?: string;
    avatar: string | null;
}

interface TA {
    id: number;
    full_name: string;
    email: string | null;
    username: string;
    avatar: string | null;
}

interface Course {
    instructor?: Instructor | null;
    tas?: TA[];
}

interface PeopleTabProps {
    course: Course;
    isLoading: boolean;
    isPeopleLoading: boolean;
    onOpenAddTAModal: () => void;
    onRemoveTA: (taId: number) => void;
}

// Loading Skeleton
function PeopleTableSkeleton() {
    return (
        <Card className="shadow-sm border border-slate-200">
            <CardBody className="p-2">
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="w-32 h-4 rounded-lg" />
                                <Skeleton className="w-48 h-3 rounded-lg" />
                            </div>
                            <Skeleton className="w-24 h-6 rounded-full" />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}

export default function PeopleTab({
    course,
    isLoading,
    isPeopleLoading,
    onOpenAddTAModal,
    onRemoveTA,
}: PeopleTabProps) {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">บุคลากรในรายวิชา</h2>
                    <p className="text-sm text-slate-500">จัดการอาจารย์ผู้สอนและผู้ช่วยสอน (TA)</p>
                </div>
                <Button
                    color="primary"
                    startContent={<Icon icon="solar:user-plus-bold" />}
                    onPress={onOpenAddTAModal}
                    isDisabled={isPeopleLoading}
                    className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-400/25"
                >
                    เพิ่มผู้ช่วยสอน
                </Button>
            </div>

            {/* Loading state */}
            {isLoading ? (
                <>
                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="shadow-sm border border-slate-200">
                                <CardBody className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-12 h-12 rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="w-20 h-3 rounded-lg" />
                                            <Skeleton className="w-8 h-6 rounded-lg" />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                    <PeopleTableSkeleton />
                </>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 rounded-xl">
                                        <Icon icon="solar:users-group-rounded-bold" className="text-2xl text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">บุคลากรทั้งหมด</p>
                                        <p className="text-2xl font-bold text-slate-800">
                                            {(course.instructor ? 1 : 0) + (course.tas?.length || 0)}
                                        </p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-100 rounded-xl">
                                        <Icon icon="solar:user-circle-bold" className="text-2xl text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">อาจารย์ผู้สอน</p>
                                        <p className="text-2xl font-bold text-slate-800">{course.instructor ? 1 : 0}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                        <Card className="shadow-sm border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                                        <Icon icon="solar:user-hands-bold" className="text-2xl text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">ผู้ช่วยสอน (TA)</p>
                                        <p className="text-2xl font-bold text-slate-800">{course.tas?.length || 0}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* People Table */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="p-2">
                            <div className="overflow-x-auto">
                                <Table
                                    aria-label="People table"
                                    removeWrapper
                                    classNames={{
                                        th: "bg-slate-50 text-slate-600 font-semibold text-sm",
                                        td: "py-3",
                                    }}
                                >
                                    <TableHeader>
                                        <TableColumn>ชื่อ-นามสกุล</TableColumn>
                                        <TableColumn>อีเมล / Username</TableColumn>
                                        <TableColumn>บทบาท</TableColumn>
                                        <TableColumn align="center">จัดการ</TableColumn>
                                    </TableHeader>
                                    <TableBody emptyContent={
                                        <div className="py-10 text-center">
                                            <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-400">ยังไม่มีบุคลากรในรายวิชานี้</p>
                                        </div>
                                    }>
                                        {[
                                            // Instructor Row
                                            ...(course.instructor ? [{
                                                id: `instructor-${course.instructor.id}`,
                                                type: 'instructor' as const,
                                                full_name: course.instructor.full_name,
                                                email: course.instructor.email || "-",
                                                avatar: course.instructor.avatar,
                                            }] : []),
                                            // TA Rows
                                            ...(course.tas?.map(ta => ({
                                                id: `ta-${ta.id}`,
                                                type: 'ta' as const,
                                                full_name: ta.full_name,
                                                email: ta.email || ta.username || "-",
                                                taId: ta.id,
                                                avatar: ta.avatar,
                                            })) || [])
                                        ].map((person) => (
                                            <TableRow key={person.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            name={person.full_name}
                                                            src={person.avatar || undefined}
                                                            size="sm"
                                                            className={person.type === 'instructor' 
                                                                ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                                                                : "bg-gradient-to-br from-emerald-500 to-teal-500"
                                                            }
                                                        />
                                                        <div>
                                                            <p className="font-medium text-slate-800">{person.full_name}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-slate-600">{person.email}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {person.type === 'instructor' ? (
                                                        <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            className="bg-blue-100 text-blue-700"
                                                            startContent={<Icon icon="solar:crown-bold" className="text-sm" />}
                                                        >
                                                            อาจารย์ผู้สอน
                                                        </Chip>
                                                    ) : (
                                                        <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            className="bg-emerald-100 text-emerald-700"
                                                            startContent={<Icon icon="solar:user-hands-bold" className="text-sm" />}
                                                        >
                                                            ผู้ช่วยสอน
                                                        </Chip>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {person.type === 'instructor' ? (
                                                            <Tooltip content="อาจารย์ผู้สอนไม่สามารถลบได้">
                                                                <span className="text-slate-300">
                                                                    <Icon icon="solar:lock-keyhole-bold" className="text-lg" />
                                                                </span>
                                                            </Tooltip>
                                                        ) : (
                                                            <Tooltip content="ลบออกจากรายวิชา" color="danger">
                                                                <Button
                                                                    isIconOnly
                                                                    size="sm"
                                                                    variant="light"
                                                                    color="danger"
                                                                    onPress={() => 'taId' in person && onRemoveTA(person.taId as number)}
                                                                >
                                                                    <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Empty state when no people at all */}
                    {!course.instructor && (!course.tas || course.tas.length === 0) && (
                        <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
                            <CardBody className="text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                    <Icon icon="solar:users-group-rounded-bold-duotone" className="text-5xl text-blue-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีบุคลากร</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    เพิ่มผู้ช่วยสอน (TA) เพื่อช่วยจัดการรายวิชานี้
                                </p>
                                <Button
                                    color="primary"
                                    startContent={<Icon icon="solar:user-plus-bold" />}
                                    onPress={onOpenAddTAModal}
                                    className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-400/25"
                                >
                                    เพิ่มผู้ช่วยสอน
                                </Button>
                            </CardBody>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
