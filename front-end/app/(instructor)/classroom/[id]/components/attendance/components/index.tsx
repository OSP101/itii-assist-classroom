/**
 * AttendanceTab Sub-components
 * Memoized components for better performance
 */

"use client";

import React, { memo, Suspense, lazy } from "react";
import Link from "next/link";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Skeleton } from "@heroui/skeleton";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import {
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
} from "@heroui/table";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Icon } from "@iconify/react";
import { type DateValue } from "@internationalized/date";

import {
    type SessionWithComputedStatus,
    type AttendanceStats,
    type Section,
    type CreateAttendanceData,
    SESSION_TYPE_DISPLAY,
    STATUS_DISPLAY,
    RADIUS_OPTIONS,
    LATE_THRESHOLD_OPTIONS,
    formatDate,
    formatTime,
} from "../config";
import { type AttendanceSession } from "@/services/attendance.service";

// Lazy load LocationPicker
const LocationPicker = lazy(() => import("@/components/map/LocationPicker"));

// ============================================================================
// Loading Skeleton
// ============================================================================

export const AttendanceTableSkeleton = memo(function AttendanceTableSkeleton() {
    return (
        <Card className="shadow-sm border border-slate-200">
            <CardBody className="p-2">
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="w-48 h-4 rounded-lg" />
                                <Skeleton className="w-32 h-3 rounded-lg" />
                            </div>
                            <Skeleton className="w-20 h-6 rounded-full" />
                            <Skeleton className="w-24 h-8 rounded-lg" />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
});

export const StatsSkeleton = memo(function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
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
    );
});

// ============================================================================
// Stats Cards
// ============================================================================

interface StatsCardsProps {
    stats: AttendanceStats;
}

export const StatsCards = memo(function StatsCards({ stats }: StatsCardsProps) {
    const items = [
        {
            label: "ทั้งหมด",
            value: stats.total,
            icon: "solar:calendar-bold",
            iconClass: "text-blue-600",
            bgClass: "bg-blue-100",
        },
        {
            label: "กำลังเปิด",
            value: stats.active,
            icon: "solar:play-circle-bold",
            iconClass: "text-emerald-600",
            bgClass: "bg-emerald-100",
        },
        {
            label: "ฉบับร่าง",
            value: stats.draft,
            icon: "solar:document-bold",
            iconClass: "text-slate-600",
            bgClass: "bg-slate-100",
        },
        {
            label: "ปิดแล้ว",
            value: stats.closed,
            icon: "solar:stop-circle-bold",
            iconClass: "text-red-600",
            bgClass: "bg-red-100",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((item) => (
                <Card key={item.label} className="shadow-sm border border-slate-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 ${item.bgClass} rounded-xl`}>
                                <Icon icon={item.icon} className={`text-2xl ${item.iconClass}`} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">{item.label}</p>
                                <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
});

// ============================================================================
// Filters Card
// ============================================================================

interface FiltersCardProps {
    searchQuery: string;
    statusFilter: string;
    typeFilter: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onTypeChange: (value: string) => void;
}

export const FiltersCard = memo(function FiltersCard({
    searchQuery,
    statusFilter,
    typeFilter,
    onSearchChange,
    onStatusChange,
    onTypeChange,
}: FiltersCardProps) {
    return (
        <Card className="shadow-sm border border-slate-200">
            <CardBody className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                        placeholder="ค้นหาชื่อรอบการเช็คชื่อ..."
                        value={searchQuery}
                        onValueChange={onSearchChange}
                        startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                        className="flex-1"
                        size="md"
                        variant="bordered"
                        isClearable
                        classNames={{
                            inputWrapper: "border-blue-200 hover:border-blue-300 focus-within:!border-blue-400",
                            label: "text-blue-400 text-sm",
                        }}
                    />
                    <Select
                        placeholder="สถานะ"
                        selectedKeys={[statusFilter]}
                        onSelectionChange={(keys) => onStatusChange(Array.from(keys)[0] as string)}
                        className="w-full sm:w-40"
                        variant="bordered"
                        size="md"
                    >
                        <SelectItem key="all">ทุกสถานะ</SelectItem>
                        <SelectItem key="draft">ฉบับร่าง</SelectItem>
                        <SelectItem key="active">กำลังเปิด</SelectItem>
                        <SelectItem key="closed">ปิดแล้ว</SelectItem>
                    </Select>
                    <Select
                        placeholder="ประเภท"
                        selectedKeys={[typeFilter]}
                        onSelectionChange={(keys) => onTypeChange(Array.from(keys)[0] as string)}
                        className="w-full sm:w-40"
                        variant="bordered"
                        size="md"
                    >
                        <SelectItem key="all">ทุกประเภท</SelectItem>
                        <SelectItem key="lecture">บรรยาย</SelectItem>
                        <SelectItem key="lab">ปฏิบัติ</SelectItem>
                        <SelectItem key="online">ออนไลน์</SelectItem>
                    </Select>
                </div>
            </CardBody>
        </Card>
    );
});

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
    onCreateClick: () => void;
}

export const EmptyState = memo(function EmptyState({ onCreateClick }: EmptyStateProps) {
    return (
        <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
            <CardBody className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <Icon
                        icon="solar:clipboard-check-bold-duotone"
                        className="text-5xl text-blue-500"
                    />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีรอบการเช็คชื่อ</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    สร้างรอบการเช็คชื่อเพื่อให้นักศึกษาสามารถเช็คชื่อเข้าเรียนได้
                </p>
                <Button
                    color="primary"
                    startContent={<Icon icon="solar:add-circle-bold" />}
                    onPress={onCreateClick}
                    className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-400/25"
                >
                    สร้างรอบเช็คชื่อแรก
                </Button>
            </CardBody>
        </Card>
    );
});

// ============================================================================
// Session Table Row
// ============================================================================

interface SessionRowActionsProps {
    session: SessionWithComputedStatus;
    courseId: string;
    onActivate: (session: AttendanceSession) => void;
    onEdit: (session: AttendanceSession) => void;
    onDelete: (session: AttendanceSession) => void;
    onClose: (session: AttendanceSession) => void;
}

const SessionRowActions = memo(function SessionRowActions({
    session,
    courseId,
    onActivate,
    onEdit,
    onDelete,
    onClose,
}: SessionRowActionsProps) {
    if (session.status === "draft") {
        return (
            <>
                <Tooltip content="เริ่มเปิดเช็คชื่อทันที">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="success"
                        onPress={() => onActivate(session)}
                    >
                        <Icon icon="solar:play-bold" className="text-lg" />
                    </Button>
                </Tooltip>
                <Tooltip content="แก้ไข">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => onEdit(session)}
                    >
                        <Icon icon="solar:pen-bold" className="text-lg" />
                    </Button>
                </Tooltip>
                <Tooltip content="ลบ" color="danger">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => onDelete(session)}
                    >
                        <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                    </Button>
                </Tooltip>
            </>
        );
    }

    if (session.status === "active") {
        return (
            <>
                <Tooltip content="ดูหน้าเช็คชื่อ">
                    <Link
                        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                        href={`/attendance/${courseId}/session/${session.id}/live`}
                        target="_blank"
                    >
                        <Icon icon="solar:eye-bold" className="text-lg text-blue-600" />
                    </Link>
                </Tooltip>
                <Tooltip content="ดูสรุป">
                    <Link
                        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                        href={`/classroom/${courseId}/attendance/${session.id}/summary`}
                        target="_blank"
                    >
                        <Icon icon="solar:chart-bold" className="text-lg" />
                    </Link>
                </Tooltip>
                <Tooltip content="แก้ไขเวลา">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => onEdit(session)}
                    >
                        <Icon icon="solar:pen-bold" className="text-lg" />
                    </Button>
                </Tooltip>
                <Tooltip content="ปิดทันที" color="danger">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => onClose(session)}
                    >
                        <Icon icon="solar:stop-bold" className="text-lg" />
                    </Button>
                </Tooltip>
            </>
        );
    }

    // closed status
    return (
        <>
            <Tooltip content="ดูหน้าเช็คชื่อ">
                <Link
                    className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                    href={`/attendance/${courseId}/session/${session.id}/live`}
                    target="_blank"
                >
                    <Icon icon="solar:eye-bold" className="text-lg" />
                </Link>
            </Tooltip>
            <Tooltip content="ดูสรุป">
                <Link
                    className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                    href={`/classroom/${courseId}/attendance/${session.id}/summary`}
                    target="_blank"
                >
                    <Icon icon="solar:chart-bold" className="text-lg" />
                </Link>
            </Tooltip>
            <Tooltip content="แก้ไข/ขยายเวลา">
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="primary"
                    onPress={() => onEdit(session)}
                >
                    <Icon icon="solar:pen-bold" className="text-lg" />
                </Button>
            </Tooltip>
            <Tooltip content="ลบ" color="danger">
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => onDelete(session)}
                >
                    <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                </Button>
            </Tooltip>
        </>
    );
});

// ============================================================================
// Sessions Table
// ============================================================================

interface SessionsTableProps {
    sessions: SessionWithComputedStatus[];
    courseId: string;
    onCreateClick: () => void;
    onActivate: (session: AttendanceSession) => void;
    onEdit: (session: AttendanceSession) => void;
    onDelete: (session: AttendanceSession) => void;
    onClose: (session: AttendanceSession) => void;
}

export const SessionsTable = memo(function SessionsTable({
    sessions,
    courseId,
    onCreateClick,
    onActivate,
    onEdit,
    onDelete,
    onClose,
}: SessionsTableProps) {
    return (
        <Card className="shadow-sm border border-slate-200">
            <CardBody className="p-2">
                <div className="overflow-x-auto">
                    <Table
                        aria-label="Attendance sessions table"
                        removeWrapper
                        classNames={{
                            th: "bg-slate-50 text-slate-600 font-semibold text-sm",
                            td: "py-3",
                        }}
                    >
                        <TableHeader>
                            <TableColumn>รอบการเช็คชื่อ</TableColumn>
                            <TableColumn>เซคชัน</TableColumn>
                            <TableColumn>ประเภท</TableColumn>
                            <TableColumn>วันเวลา</TableColumn>
                            <TableColumn>สถานะ</TableColumn>
                            <TableColumn>สถิติ</TableColumn>
                            <TableColumn align="center">จัดการ</TableColumn>
                        </TableHeader>
                        <TableBody
                            emptyContent={
                                <div className="py-10 text-center">
                                    <Icon
                                        icon="solar:clipboard-list-linear"
                                        className="text-5xl text-slate-300 mx-auto mb-3"
                                    />
                                    <p className="text-slate-400">ไม่พบรอบการเช็คชื่อที่ตรงกับเงื่อนไข</p>
                                    <Button
                                        color="primary"
                                        variant="flat"
                                        size="sm"
                                        className="mt-3"
                                        onPress={onCreateClick}
                                    >
                                        สร้างรอบเช็คชื่อ
                                    </Button>
                                </div>
                            }
                        >
                            {sessions.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="font-medium text-slate-800">{session.title}</p>
                                                {session.check_location && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <span>ตรวจสอบตำแหน่ง</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {session.sections && session.sections.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {session.sections.map((sec) => (
                                                    <Chip key={sec.id} size="sm" variant="flat" color="default">
                                                        {sec.section_no}
                                                    </Chip>
                                                ))}
                                            </div>
                                        ) : session.section ? (
                                            <Chip size="sm" variant="flat" color="default">
                                                {session.section.section_no}
                                            </Chip>
                                        ) : (
                                            <span className="text-slate-500 text-sm">ทุกเซคชัน</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="sm"
                                            color={SESSION_TYPE_DISPLAY[session.session_type]?.color || "default"}
                                            variant="flat"
                                        >
                                            {SESSION_TYPE_DISPLAY[session.session_type]?.label || session.session_type}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <p className="text-slate-800">{formatDate(session.start_time)}</p>
                                            <p className="text-slate-500">
                                                {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="sm"
                                            color={STATUS_DISPLAY[session.status]?.color || "default"}
                                            variant="flat"
                                            startContent={
                                                session.status === "active" ? (
                                                    <span className="relative flex h-2 w-2 mr-1">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                ) : undefined
                                            }
                                        >
                                            {STATUS_DISPLAY[session.status]?.label || session.status}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        {session.stats ? (
                                            <div className="flex items-center gap-2">
                                                <Tooltip content="มาเรียน">
                                                    <Chip size="sm" color="success" variant="flat">
                                                        {session.stats.present + session.stats.late}
                                                    </Chip>
                                                </Tooltip>
                                                <Tooltip content="สาย">
                                                    <Chip size="sm" color="warning" variant="flat">
                                                        {session.stats.late}
                                                    </Chip>
                                                </Tooltip>
                                                <Tooltip content="ขาด">
                                                    <Chip size="sm" color="danger" variant="flat">
                                                        {session.stats.absent}
                                                    </Chip>
                                                </Tooltip>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <SessionRowActions
                                                session={session}
                                                courseId={courseId}
                                                onActivate={onActivate}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onClose={onClose}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardBody>
        </Card>
    );
});

// ============================================================================
// Location Check Card
// ============================================================================

interface LocationCheckCardProps {
    checkLocation: boolean;
    locationLat?: number;
    locationLng?: number;
    radiusMeters: number;
    isGettingLocation: boolean;
    onToggle: () => void;
    onGetCurrentLocation: () => void;
    onLocationChange: (lat: number, lng: number) => void;
    onRadiusChange: (radius: number) => void;
    onClearLocation: () => void;
}

export const LocationCheckCard = memo(function LocationCheckCard({
    checkLocation,
    locationLat,
    locationLng,
    radiusMeters,
    isGettingLocation,
    onToggle,
    onGetCurrentLocation,
    onLocationChange,
    onRadiusChange,
    onClearLocation,
}: LocationCheckCardProps) {
    return (
        <Card className="border border-slate-200 overflow-hidden">
            <CardBody className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <Icon icon="solar:map-point-bold" className="text-xl text-blue-600" />
                        </div>
                        <div>
                            <span className="font-semibold text-slate-800">ตรวจสอบตำแหน่ง GPS</span>
                            <p className="text-xs text-slate-500">ให้นักศึกษาต้องอยู่ในบริเวณที่กำหนด</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant={checkLocation ? "solid" : "bordered"}
                        color={checkLocation ? "primary" : "default"}
                        onPress={onToggle}
                        startContent={
                            <Icon
                                icon={checkLocation ? "solar:check-circle-bold" : "solar:close-circle-linear"}
                                className="text-lg"
                            />
                        }
                    >
                        {checkLocation ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Button>
                </div>

                {checkLocation && (
                    <div className="p-4 space-y-4">
                        {/* GPS Button */}
                        <button
                            type="button"
                            onClick={onGetCurrentLocation}
                            disabled={isGettingLocation}
                            className={`group relative p-4 rounded-xl border-2 border-dashed transition-all duration-200 w-full ${
                                isGettingLocation
                                    ? "border-blue-400 bg-blue-50 cursor-wait"
                                    : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
                            }`}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div className={`p-3 rounded-full transition-colors ${
                                    isGettingLocation
                                        ? "bg-blue-200 animate-pulse"
                                        : "bg-blue-100 group-hover:bg-blue-200"
                                }`}>
                                    <Icon
                                        icon="solar:gps-bold"
                                        className={`text-2xl text-blue-600 ${isGettingLocation ? "animate-spin" : ""}`}
                                    />
                                </div>
                                <span className="font-medium text-slate-700">
                                    {isGettingLocation ? "กำลังดึง GPS..." : "ดึงจาก GPS ของเครื่อง"}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {isGettingLocation ? "รอสักครู่..." : "ใช้ GPS ความแม่นยำสูง"}
                                </span>
                            </div>
                            {isGettingLocation && (
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-50/50 rounded-xl">
                                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </button>

                        {/* Location Status */}
                        {locationLat && locationLng ? (
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Icon icon="solar:map-point-wave-bold" className="text-xl text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:check-circle-bold" className="text-green-600" />
                                            <span className="font-medium text-green-700">กำหนดตำแหน่งแล้ว</span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-500">Lat:</span>
                                                <code className="px-1.5 py-0.5 bg-white rounded text-green-700 font-mono text-xs">
                                                    {Number(locationLat).toFixed(6)}
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-500">Lng:</span>
                                                <code className="px-1.5 py-0.5 bg-white rounded text-green-700 font-mono text-xs">
                                                    {Number(locationLng).toFixed(6)}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        color="danger"
                                        onPress={onClearLocation}
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <Icon icon="solar:map-point-search-bold" className="text-xl text-amber-600" />
                                    </div>
                                    <div>
                                        <span className="font-medium text-amber-700">ยังไม่ได้กำหนดตำแหน่ง</span>
                                        <p className="text-xs text-amber-600 mt-0.5">กรุณาเลือกวิธีกำหนดตำแหน่งด้านบน</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Map Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:map-bold" className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-600">แผนที่ (คลิกเพื่อปักหมุด)</span>
                            </div>
                            <Suspense fallback={
                                <div className="h-[280px] bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-white rounded-full shadow-sm">
                                            <Icon icon="solar:map-bold" className="text-4xl text-slate-400 animate-pulse" />
                                        </div>
                                        <span className="text-sm text-slate-500">กำลังโหลดแผนที่...</span>
                                    </div>
                                </div>
                            }>
                                <LocationPicker
                                    latitude={locationLat}
                                    longitude={locationLng}
                                    radius={radiusMeters}
                                    onLocationChange={onLocationChange}
                                />
                            </Suspense>
                        </div>

                        {/* Radius Setting */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-violet-100 rounded-lg">
                                    <Icon icon="solar:ruler-angular-bold" className="text-lg text-violet-600" />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-700">รัศมีที่อนุญาต</span>
                                    <p className="text-xs text-slate-500">ระยะห่างจากจุดกำหนดที่อนุญาตให้เช็คชื่อได้</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    variant="bordered"
                                    value={String(radiusMeters)}
                                    onValueChange={(value) => onRadiusChange(parseInt(value) || 10)}
                                    size="sm"
                                    endContent={<span className="text-slate-400 text-sm">เมตร</span>}
                                    className="max-w-[150px]"
                                />
                                <div className="flex gap-1.5">
                                    {RADIUS_OPTIONS.map((r) => (
                                        <Button
                                            key={r}
                                            size="sm"
                                            variant={radiusMeters === r ? "solid" : "flat"}
                                            color={radiusMeters === r ? "primary" : "default"}
                                            onPress={() => onRadiusChange(r)}
                                            className="min-w-0 px-3"
                                        >
                                            {r}m
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
});

// ============================================================================
// Create Session Modal
// ============================================================================

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: CreateAttendanceData;
    setFormData: React.Dispatch<React.SetStateAction<CreateAttendanceData>>;
    startDateTime: DateValue;
    setStartDateTime: (value: DateValue) => void;
    endDateTime: DateValue;
    setEndDateTime: (value: DateValue) => void;
    sections: Section[];
    isSubmitting: boolean;
    isGettingLocation: boolean;
    onSubmit: () => Promise<void>;
    onGetCurrentLocation: () => void;
}

export const CreateSessionModal = memo(function CreateSessionModal({
    isOpen,
    onClose,
    formData,
    setFormData,
    startDateTime,
    setStartDateTime,
    endDateTime,
    setEndDateTime,
    sections,
    isSubmitting,
    isGettingLocation,
    onSubmit,
    onGetCurrentLocation,
}: CreateSessionModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            isDismissable={false}
            isKeyboardDismissDisabled={true}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <span>สร้างรอบการเช็คชื่อ</span>
                    <span className="text-sm font-normal text-slate-500">
                        กำหนดรายละเอียดการเช็คชื่อเข้าเรียน
                    </span>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* Title */}
                        <Input
                            label="ชื่อรอบการเช็คชื่อ"
                            value={formData.title}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                            isRequired
                            labelPlacement="outside-top"
                            variant="bordered"
                            size="md"
                        />

                        {/* Section - Multi-select */}
                        <Select
                            label="กลุ่มเรียน"
                            placeholder="เลือกกลุ่มเรียน"
                            selectionMode="multiple"
                            selectedKeys={new Set((formData.course_section_ids || []).map(String))}
                            labelPlacement="outside-top"
                            variant="bordered"
                            size="md"
                            onSelectionChange={(keys) => {
                                const selectedIds = Array.from(keys).map((k) => Number(k));
                                setFormData((prev: CreateAttendanceData) => ({
                                    ...prev,
                                    course_section_ids: selectedIds,
                                    course_section_id: selectedIds.length === 1 ? selectedIds[0] : null,
                                }));
                            }}
                        >
                            {sections.map((section) => (
                                <SelectItem key={String(section.id)} textValue={`${section.section_no}${section.note ? ` - ${section.note}` : ""}`}>
                                    {section.section_no}{section.note ? ` - ${section.note}` : ""}
                                </SelectItem>
                            ))}
                        </Select>

                        {/* Session Type */}
                        <Select
                            label="ประเภทการเรียน"
                            selectedKeys={[formData.session_type]}
                            variant="bordered"
                            onSelectionChange={(keys) => {
                                const selected = Array.from(keys)[0] as "lecture" | "lab" | "online";
                                setFormData((prev: CreateAttendanceData) => ({ ...prev, session_type: selected }));
                            }}
                            isRequired
                            labelPlacement="outside-top"
                            size="md"
                        >
                            <SelectItem key="lecture">บรรยาย (Lecture)</SelectItem>
                            <SelectItem key="lab">ปฏิบัติ (Lab)</SelectItem>
                            <SelectItem key="online">ออนไลน์ (Online)</SelectItem>
                        </Select>

                        {/* Date Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DatePicker
                                label="เวลาเริ่มต้น"
                                variant="bordered"
                                labelPlacement="outside"
                                granularity="minute"
                                hideTimeZone
                                showMonthAndYearPickers
                                value={startDateTime}
                                onChange={(value) => value && setStartDateTime(value)}
                                isRequired
                                popoverProps={{
                                    placement: "bottom",
                                    classNames: { content: "z-[9999]" },
                                }}
                                calendarProps={{
                                    classNames: {
                                        base: "bg-white shadow-xl",
                                        headerWrapper: "pt-4 bg-white",
                                        prevButton: "border-1 border-default-200 rounded-small",
                                        nextButton: "border-1 border-default-200 rounded-small",
                                        gridHeader: "bg-white shadow-none",
                                        cellButton: ["data-[today=true]:bg-primary-100 data-[selected=true]:bg-primary"],
                                    },
                                }}
                            />
                            <DatePicker
                                label="เวลาสิ้นสุด"
                                variant="bordered"
                                labelPlacement="outside"
                                granularity="minute"
                                hideTimeZone
                                showMonthAndYearPickers
                                value={endDateTime}
                                onChange={(value) => value && setEndDateTime(value)}
                                isRequired
                                popoverProps={{
                                    placement: "bottom",
                                    classNames: { content: "z-[9999]" },
                                }}
                                calendarProps={{
                                    classNames: {
                                        base: "bg-white shadow-xl",
                                        headerWrapper: "pt-4 bg-white",
                                        prevButton: "border-1 border-default-200 rounded-small",
                                        nextButton: "border-1 border-default-200 rounded-small",
                                        gridHeader: "bg-white shadow-none",
                                        cellButton: ["data-[today=true]:bg-primary-100 data-[selected=true]:bg-primary"],
                                    },
                                }}
                            />
                        </div>

                        {/* Late Threshold */}
                        <Input
                            type="number"
                            label="เวลาสาย (นาที)"
                            labelPlacement="outside-top"
                            variant="bordered"
                            value={String(formData.late_threshold_minutes)}
                            onValueChange={(value) =>
                                setFormData((prev: CreateAttendanceData) => ({
                                    ...prev,
                                    late_threshold_minutes: parseInt(value) || 15,
                                }))
                            }
                            description="หลังเวลาเริ่มต้นกี่นาทีจึงนับว่ามาสาย"
                            endContent={<span className="text-slate-400 text-sm">นาที</span>}
                            size="md"
                        />

                        {/* Location Check */}
                        <LocationCheckCard
                            checkLocation={formData.check_location}
                            locationLat={formData.location_lat}
                            locationLng={formData.location_lng}
                            radiusMeters={formData.radius_meters ?? 100}
                            isGettingLocation={isGettingLocation}
                            onToggle={() => setFormData((prev: CreateAttendanceData) => ({ ...prev, check_location: !prev.check_location }))}
                            onGetCurrentLocation={onGetCurrentLocation}
                            onLocationChange={(lat, lng) => setFormData((prev: CreateAttendanceData) => ({ ...prev, location_lat: lat, location_lng: lng }))}
                            onRadiusChange={(radius) => setFormData((prev: CreateAttendanceData) => ({ ...prev, radius_meters: radius }))}
                            onClearLocation={() => setFormData((prev: CreateAttendanceData) => ({ ...prev, location_lat: undefined, location_lng: undefined }))}
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        color="primary"
                        onPress={onSubmit}
                        isLoading={isSubmitting}
                        className="bg-gradient-to-r from-blue-400 to-indigo-500"
                    >
                        สร้างรอบเช็คชื่อ
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});

// ============================================================================
// Edit Session Modal
// ============================================================================

interface EditSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    editTarget: AttendanceSession | null;
    formData: CreateAttendanceData;
    setFormData: React.Dispatch<React.SetStateAction<CreateAttendanceData>>;
    startDateTime: DateValue;
    setStartDateTime: (value: DateValue) => void;
    endDateTime: DateValue;
    setEndDateTime: (value: DateValue) => void;
    sections: Section[];
    allSectionIds: number[];
    isSubmitting: boolean;
    isGettingLocation: boolean;
    onSubmit: () => Promise<void>;
    onGetCurrentLocation: () => void;
}

export const EditSessionModal = memo(function EditSessionModal({
    isOpen,
    onClose,
    editTarget,
    formData,
    setFormData,
    startDateTime,
    setStartDateTime,
    endDateTime,
    setEndDateTime,
    sections,
    allSectionIds,
    isSubmitting,
    isGettingLocation,
    onSubmit,
    onGetCurrentLocation,
}: EditSessionModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            isDismissable={false}
            isKeyboardDismissDisabled={true}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <span>แก้ไขรอบการเช็คชื่อ</span>
                    <span className="text-sm font-normal text-slate-500">
                        แก้ไขรายละเอียดการเช็คชื่อ: {editTarget?.title}
                    </span>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* Title */}
                        <Input
                            label="ชื่อรอบการเช็คชื่อ"
                            value={formData.title}
                            onValueChange={(value) => setFormData((prev: CreateAttendanceData) => ({ ...prev, title: value }))}
                            isRequired
                            labelPlacement="outside-top"
                            variant="bordered"
                            size="md"
                        />

                        {/* Section - Multi-select */}
                        <Select
                            label="กลุ่มเรียน"
                            placeholder="เลือกกลุ่มเรียน"
                            selectionMode="multiple"
                            selectedKeys={new Set((formData.course_section_ids || []).map(String))}
                            labelPlacement="outside-top"
                            variant="bordered"
                            size="md"
                            onSelectionChange={(keys) => {
                                const selectedIds = Array.from(keys).map((k) => Number(k));
                                setFormData((prev: CreateAttendanceData) => ({
                                    ...prev,
                                    course_section_ids: selectedIds,
                                    course_section_id: selectedIds.length === 1 ? selectedIds[0] : null,
                                }));
                            }}
                            description={
                                (formData.course_section_ids || []).length === allSectionIds.length
                                    ? "เลือกทุกกลุ่มเรียนแล้ว"
                                    : `เลือกแล้ว ${(formData.course_section_ids || []).length} จาก ${allSectionIds.length} กลุ่มเรียน`
                            }
                            classNames={{ trigger: "min-h-[50px]" }}
                        >
                            {sections.map((section) => (
                                <SelectItem key={String(section.id)} textValue={`${section.section_no}${section.note ? ` - ${section.note}` : ""}`}>
                                    {section.section_no}{section.note ? ` - ${section.note}` : ""}
                                </SelectItem>
                            ))}
                        </Select>

                        {/* Session Type */}
                        <Select
                            label="ประเภทการสอน"
                            selectedKeys={[formData.session_type]}
                            labelPlacement="outside-top"
                            variant="bordered"
                            size="md"
                            onSelectionChange={(keys) => {
                                const selected = Array.from(keys)[0] as "lecture" | "lab" | "online";
                                setFormData((prev: CreateAttendanceData) => ({ ...prev, session_type: selected }));
                            }}
                        >
                            <SelectItem key="lecture" startContent={<Icon icon="solar:presentation-graph-bold" />}>
                                บรรยาย
                            </SelectItem>
                            <SelectItem key="lab" startContent={<Icon icon="solar:test-tube-bold" />}>
                                ปฏิบัติ
                            </SelectItem>
                            <SelectItem key="online" startContent={<Icon icon="solar:laptop-bold" />}>
                                ออนไลน์
                            </SelectItem>
                        </Select>

                        {/* Time Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DatePicker
                                label="เวลาเริ่มต้น"
                                value={startDateTime}
                                onChange={(value) => value && setStartDateTime(value)}
                                granularity="minute"
                                hideTimeZone
                                labelPlacement="outside-top"
                                variant="bordered"
                            />
                            <DatePicker
                                label="เวลาสิ้นสุด"
                                value={endDateTime}
                                onChange={(value) => value && setEndDateTime(value)}
                                granularity="minute"
                                hideTimeZone
                                labelPlacement="outside-top"
                                variant="bordered"
                            />
                        </div>

                        {/* Late Threshold */}
                        <div>
                            <label className="text-sm text-slate-700 mb-2 block">
                                เวลาสายหลังเริ่มต้น (นาที)
                            </label>
                            <div className="flex gap-2">
                                {LATE_THRESHOLD_OPTIONS.map((mins) => (
                                    <Button
                                        key={mins}
                                        size="sm"
                                        variant={formData.late_threshold_minutes === mins ? "solid" : "flat"}
                                        color={formData.late_threshold_minutes === mins ? "primary" : "default"}
                                        onPress={() => setFormData((prev: CreateAttendanceData) => ({ ...prev, late_threshold_minutes: mins }))}
                                    >
                                        {mins} นาที
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Location Check */}
                        <Card className="border border-slate-200">
                            <CardBody className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="font-medium text-slate-700">ตรวจสอบตำแหน่ง GPS</p>
                                        <p className="text-sm text-slate-500">ให้นักศึกษาเช็คชื่อได้เฉพาะในพื้นที่ที่กำหนด</p>
                                    </div>
                                    <Button
                                        color={formData.check_location ? "primary" : "default"}
                                        variant={formData.check_location ? "solid" : "flat"}
                                        onPress={() => setFormData((prev: CreateAttendanceData) => ({ ...prev, check_location: !prev.check_location }))}
                                    >
                                        {formData.check_location ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                    </Button>
                                </div>

                                {formData.check_location && (
                                    <div className="space-y-4">
                                        {/* Map */}
                                        <div className="rounded-xl overflow-hidden border border-slate-200">
                                            <Suspense fallback={
                                                <div className="h-64 bg-slate-100 flex items-center justify-center">
                                                    <span className="text-slate-400">กำลังโหลดแผนที่...</span>
                                                </div>
                                            }>
                                                <LocationPicker
                                                    latitude={formData.location_lat || 16.4728}
                                                    longitude={formData.location_lng || 102.8233}
                                                    radius={formData.radius_meters || 50}
                                                    onLocationChange={(lat, lng) => {
                                                        setFormData((prev: CreateAttendanceData) => ({
                                                            ...prev,
                                                            location_lat: lat,
                                                            location_lng: lng,
                                                        }));
                                                    }}
                                                />
                                            </Suspense>
                                        </div>

                                        {/* Location Controls */}
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="primary"
                                                startContent={isGettingLocation ? null : <Icon icon="solar:map-point-wave-bold" />}
                                                onPress={onGetCurrentLocation}
                                                isLoading={isGettingLocation}
                                            >
                                                {isGettingLocation ? "กำลังระบุตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน (GPS)"}
                                            </Button>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500">
                                                    ตำแหน่ง: {formData.location_lat ? Number(formData.location_lat).toFixed(6) : "-"}, {formData.location_lng ? Number(formData.location_lng).toFixed(6) : "-"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Radius */}
                                        <div>
                                            <p className="text-sm text-slate-600 mb-2">รัศมีการเช็คชื่อ</p>
                                            <div className="flex gap-1.5">
                                                {RADIUS_OPTIONS.map((r) => (
                                                    <Button
                                                        key={r}
                                                        size="sm"
                                                        variant={formData.radius_meters === r ? "solid" : "flat"}
                                                        color={formData.radius_meters === r ? "primary" : "default"}
                                                        onPress={() => setFormData((prev: CreateAttendanceData) => ({ ...prev, radius_meters: r }))}
                                                        className="min-w-0 px-3"
                                                    >
                                                        {r}m
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        color="primary"
                        onPress={onSubmit}
                        isLoading={isSubmitting}
                        className="bg-gradient-to-r from-blue-400 to-indigo-500"
                    >
                        บันทึกการแก้ไข
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetTitle: string | undefined;
    isSubmitting: boolean;
    onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal = memo(function DeleteConfirmModal({
    isOpen,
    onClose,
    targetTitle,
    isSubmitting,
    onConfirm,
}: DeleteConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalContent>
                <ModalHeader>ยืนยันการลบ</ModalHeader>
                <ModalBody>
                    <p>
                        คุณต้องการลบรอบการเช็คชื่อ <strong>{targetTitle}</strong> หรือไม่?
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        ยกเลิก
                    </Button>
                    <Button color="danger" onPress={onConfirm} isLoading={isSubmitting}>
                        ลบ
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});

// ============================================================================
// Close Session Modal
// ============================================================================

interface CloseSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetTitle: string | undefined;
    isSubmitting: boolean;
    onConfirm: () => Promise<void>;
}

export const CloseSessionModal = memo(function CloseSessionModal({
    isOpen,
    onClose,
    targetTitle,
    isSubmitting,
    onConfirm,
}: CloseSessionModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Icon icon="solar:stop-bold" className="text-xl text-red-600" />
                        </div>
                        <span>ยืนยันการปิดรอบเช็คชื่อ</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p>
                        คุณต้องการปิดรอบการเช็คชื่อ <strong>{targetTitle}</strong> ทันทีหรือไม่?
                    </p>
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Icon icon="solar:danger-triangle-bold" className="text-amber-500 text-lg mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">หลังจากปิดแล้ว:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>นักศึกษาจะไม่สามารถเช็คชื่อได้อีก</li>
                                    <li>สถานะจะเปลี่ยนเป็น &quot;ปิดแล้ว&quot;</li>
                                    <li>สามารถเปิดใหม่ได้โดยการขยายเวลา</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        ยกเลิก
                    </Button>
                    <Button color="danger" onPress={onConfirm} isLoading={isSubmitting}>
                        <Icon icon="solar:stop-bold" className="text-lg" />
                        ปิดรอบเช็คชื่อ
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});
