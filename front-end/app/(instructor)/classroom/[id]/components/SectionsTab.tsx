"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Tooltip } from "@heroui/tooltip";
import { Avatar } from "@heroui/avatar";
import { Tabs, Tab } from "@heroui/tabs";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from "@heroui/table";
import { Icon } from "@iconify/react";
import type { Course, SectionStudent } from "@/services/course.service";
import { TeamsGridSkeleton } from "./Skeletons";
import type { PermanentTeam, WeeklyTeam, TeamMember } from "./types";

interface SectionsTabProps {
    course: Course;
    sectionSubTab: "students" | "permanent" | "weekly";
    setSectionSubTab: (tab: "students" | "permanent" | "weekly") => void;
    sectionSearchQuery: string;
    setSectionSearchQuery: (query: string) => void;
    totalStudents: number;
    permanentTeams: PermanentTeam[];
    weeklyTeams: Record<number, WeeklyTeam[]>;
    selectedWeek: number;
    setSelectedWeek: (week: number) => void;
    totalWeeks: number;
    expandedSections: number[];
    isTeamsLoading: boolean;
    sectionStudents: Record<number, SectionStudent[]>;
    // Handlers
    onToggleSection: (sectionId: number) => void;
    onOpenAddSectionModal: () => void;
    onOpenAddStudentModal: (sectionId: number) => void;
    onRemoveSection: (sectionId: number) => void;
    onOpenDeleteStudentModal: (sectionId: number, student: SectionStudent) => void;
    onOpenCreateTeamModal: (type: "permanent" | "weekly", method: "manual" | "random") => void;
    onOpenDeleteTeamModal: (teamId: number, type: "permanent" | "weekly", weekNumber?: number) => void;
    onCopyTeamsFromWeek: (sourceWeek: number) => void;
    onOpenBulkDeleteModal: () => void;
    getFilteredSectionStudents: (sectionId: number) => SectionStudent[];
    findStudentTeam: (studentId: number, type: "permanent" | "weekly", weekNumber?: number) => string | null;
}

export default function SectionsTab({
    course,
    sectionSubTab,
    setSectionSubTab,
    sectionSearchQuery,
    setSectionSearchQuery,
    totalStudents,
    permanentTeams,
    weeklyTeams,
    selectedWeek,
    setSelectedWeek,
    totalWeeks,
    expandedSections,
    isTeamsLoading,
    sectionStudents,
    onToggleSection,
    onOpenAddSectionModal,
    onOpenAddStudentModal,
    onRemoveSection,
    onOpenDeleteStudentModal,
    onOpenCreateTeamModal,
    onOpenDeleteTeamModal,
    onCopyTeamsFromWeek,
    onOpenBulkDeleteModal,
    getFilteredSectionStudents,
    findStudentTeam,
}: SectionsTabProps) {
    return (
        <div className="space-y-6 h-auto">
            {/* Header Card with Sub-tabs */}
            <div className="">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">จัดการกลุ่มเรียน</h2>
                            <p className="text-sm text-slate-500">จัดการนักศึกษาและกลุ่มทำงานในรายวิชา</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-3 lg:mx-0 lg:px-0">
                <Tabs
                    selectedKey={sectionSubTab}
                    onSelectionChange={(key) => setSectionSubTab(key as "students" | "permanent" | "weekly")}
                    variant="underlined"
                    classNames={{
                        tabList: "gap-4 md:gap-6 flex-nowrap min-w-max",
                        cursor: "bg-blue-500",
                        tab: "px-0 h-11 whitespace-nowrap",
                        tabContent: "group-data-[selected=true]:text-blue-600 text-slate-500 font-medium text-sm"
                    }}
                >
                    <Tab
                        key="students"
                        title={
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:users-group-rounded-bold" className="text-lg" />
                                <span className="hidden sm:inline">รายชื่อนักศึกษา</span>
                                <span className="sm:hidden">นักศึกษา</span>
                                {totalStudents > 0 && (
                                    <Chip size="sm" variant="flat" className="bg-amber-100 text-amber-700 h-5 min-w-5 px-1">
                                        {totalStudents}
                                    </Chip>
                                )}
                            </div>
                        }
                    />
                    <Tab
                        key="permanent"
                        title={
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:users-group-two-rounded-bold" className="text-lg" />
                                <span>กลุ่มถาวร</span>
                                {permanentTeams.length > 0 && (
                                    <Chip size="sm" variant="flat" className="bg-purple-100 text-purple-700 h-5 min-w-5 px-1">
                                        {permanentTeams.length}
                                    </Chip>
                                )}
                            </div>
                        }
                    />
                    <Tab
                        key="weekly"
                        title={
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:calendar-bold" className="text-lg" />
                                <span className="hidden sm:inline">กลุ่มรายสัปดาห์</span>
                                <span className="sm:hidden">รายสัปดาห์</span>
                                {Object.keys(weeklyTeams).filter(k => weeklyTeams[parseInt(k)]?.length > 0).length > 0 && (
                                    <Chip size="sm" variant="flat" className="bg-emerald-100 text-emerald-700 h-5 min-w-5 px-1">
                                        W{selectedWeek}
                                    </Chip>
                                )}
                            </div>
                        }
                    />
                </Tabs>
            </div>

            {/* Sub-tab: Students (Table View) */}
            {sectionSubTab === "students" && (
                <div className="space-y-4">
                    {/* Search & Actions Bar */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="py-3 px-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <Input
                                        placeholder="ค้นหารหัสหรือชื่อนักศึกษา..."
                                        value={sectionSearchQuery}
                                        onValueChange={setSectionSearchQuery}
                                        startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                        className="w-full sm:max-w-72"
                                        size="md"
                                        variant="bordered"
                                        isClearable
                                        classNames={{
                                            inputWrapper: "bg-slate-50 border-slate-200"
                                        }}
                                    />
                                </div>
                                <Button
                                    color="primary"
                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                    onPress={onOpenAddSectionModal}
                                    className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-indigo-500/25 w-full sm:w-auto"
                                >
                                    เพิ่มกลุ่มเรียน
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Sections with Table */}
                    {course.sections && course.sections.length > 0 ? (
                        <div className="space-y-4">
                            {course.sections.map((section) => (
                                <Card key={section.id} className="shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Section Header */}
                                    <div
                                        className={`flex items-center justify-between p-4 cursor-pointer transition-all ${expandedSections.includes(section.id)
                                            ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                                            : "bg-white hover:from-amber-50 hover:to-blue-50"
                                            }`}
                                        onClick={() => onToggleSection(section.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className={`font-semibold ${expandedSections.includes(section.id) ? "text-white" : "text-slate-800"}`}>
                                                    Section {section.section_no}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Icon
                                                        icon="solar:users-group-rounded-linear"
                                                        className={expandedSections.includes(section.id) ? "text-white/70" : "text-slate-400"}
                                                    />
                                                    <span className={`text-sm ${expandedSections.includes(section.id) ? "text-white/80" : "text-slate-500"}`}>
                                                        {section.studentCount || 0} นักศึกษา
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Tooltip content="เพิ่มนักศึกษา">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="flat"
                                                    className={expandedSections.includes(section.id) ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"}
                                                    onPress={() => onOpenAddStudentModal(section.id)}
                                                >
                                                    <Icon icon="solar:user-plus-bold" className="text-lg" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content="ลบกลุ่มเรียน" color="danger">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="flat"
                                                    className={expandedSections.includes(section.id) ? "bg-white/20 text-white hover:bg-red-500" : "bg-red-100 text-red-600"}
                                                    onPress={() => onRemoveSection(section.id)}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                                </Button>
                                            </Tooltip>
                                            <div className={`ml-2 p-1 rounded-lg ${expandedSections.includes(section.id) ? "bg-white/20" : "bg-slate-200"}`}>
                                                <Icon
                                                    icon={expandedSections.includes(section.id) ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                                                    className={`text-xl ${expandedSections.includes(section.id) ? "text-white" : "text-slate-500"}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Table (expanded) */}
                                    {expandedSections.includes(section.id) && (
                                        <CardBody className="p-0 bg-white overflow-hidden">
                                            {getFilteredSectionStudents(section.id).length > 0 ? (
                                                <div className="overflow-x-auto max-w-full">
                                                    <Table
                                                        aria-label={`นักศึกษากลุ่ม ${section.section_no}`}
                                                        removeWrapper
                                                        classNames={{
                                                            base: "min-w-[640px]",
                                                            th: "bg-slate-50/80 text-slate-600 font-semibold text-xs uppercase tracking-wide",
                                                            td: "py-3 border-b border-slate-50",
                                                            tr: "hover:bg-amber-50/50 transition-colors",
                                                        }}
                                                    >
                                                        <TableHeader>
                                                            <TableColumn width={50}>ลำดับ</TableColumn>
                                                            <TableColumn width={100}>รหัส</TableColumn>
                                                            <TableColumn>ชื่อ-นามสกุล</TableColumn>
                                                            <TableColumn width={120}>กลุ่มถาวร</TableColumn>
                                                            <TableColumn width={80}>สถานะ</TableColumn>
                                                            <TableColumn width={50} align="center">จัดการ</TableColumn>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {getFilteredSectionStudents(section.id).map((student, idx) => (
                                                                <TableRow key={student.id}>
                                                                    <TableCell>
                                                                        <div className="text-sm font-medium text-black text-center">{idx + 1}</div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="text-xs font-medium text-black">{student.student_id}</div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <Avatar
                                                                                name={student.full_name}
                                                                                size="sm"
                                                                                className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex-shrink-0"
                                                                            />
                                                                            <span className="font-medium text-black text-sm">{student.full_name}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {findStudentTeam(student.id, "permanent") ? (
                                                                            <Chip
                                                                                size="sm"
                                                                                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                                                                            >
                                                                                {findStudentTeam(student.id, "permanent")}
                                                                            </Chip>
                                                                        ) : (
                                                                            <span className="text-slate-300 text-xs">-</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            size="sm"
                                                                            variant="dot"
                                                                            color={student.is_active ? "success" : "default"}
                                                                            classNames={{
                                                                                base: "px-1",
                                                                                dot: student.is_active ? "bg-green-500" : "bg-slate-300"
                                                                            }}
                                                                        >
                                                                            <span className="text-xs">{student.is_active ? "ใช้งาน" : "ไม่ใช้"}</span>
                                                                        </Chip>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Tooltip content="นำออกจากกลุ่ม" color="danger">
                                                                            <Button
                                                                                isIconOnly
                                                                                size="sm"
                                                                                variant="light"
                                                                                color="danger"
                                                                                onPress={() => onOpenDeleteStudentModal(section.id, student)}
                                                                            >
                                                                                <Icon icon="solar:user-minus-bold" className="text-lg" />
                                                                            </Button>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : sectionStudents[section.id] && sectionStudents[section.id].length > 0 ? (
                                                <div className="text-center py-12 bg-slate-50/50">
                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <Icon icon="solar:magnifer-linear" className="text-3xl text-slate-400" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">ไม่พบนักศึกษาที่ค้นหา</p>
                                                    <p className="text-sm text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาใหม่</p>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 bg-gradient-to-b from-slate-50 to-white">
                                                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
                                                        <Icon icon="solar:users-group-rounded-bold-duotone" className="text-4xl text-amber-500" />
                                                    </div>
                                                    <p className="text-slate-600 font-medium mb-1">ยังไม่มีนักศึกษาในกลุ่มนี้</p>
                                                    <p className="text-sm text-slate-400 mb-4">เพิ่มนักศึกษาเพื่อเริ่มต้นจัดการกลุ่มเรียน</p>
                                                    <Button
                                                        color="primary"
                                                        variant="flat"
                                                        startContent={<Icon icon="solar:user-plus-bold" />}
                                                        onPress={() => onOpenAddStudentModal(section.id)}
                                                        className="bg-amber-100 text-amber-700"
                                                    >
                                                        เพิ่มนักศึกษา
                                                    </Button>
                                                </div>
                                            )}
                                        </CardBody>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
                            <CardBody className="text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                    <Icon icon="solar:notebook-bold-duotone" className="text-5xl text-amber-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีกลุ่มเรียน</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    สร้างกลุ่มเรียนเพื่อจัดการนักศึกษาในรายวิชานี้
                                </p>
                                <Button
                                    color="primary"
                                    size="lg"
                                    startContent={<Icon icon="solar:add-circle-bold" />}
                                    onPress={onOpenAddSectionModal}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
                                >
                                    เพิ่มกลุ่มเรียนแรก
                                </Button>
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}

            {/* Sub-tab: Permanent Teams */}
            {sectionSubTab === "permanent" && (
                <div className="space-y-4">
                    {/* Action Bar */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="py-3 px-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                                        <Icon icon="solar:info-circle-bold" className="text-xl text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-700">กลุ่มถาวร</p>
                                        <p className="text-sm text-slate-500 ">กลุ่มที่ใช้ตลอดทั้งเทอม สำหรับโปรเจกต์ระยะยาว</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        color="secondary"
                                        variant="flat"
                                        startContent={<Icon icon="solar:shuffle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("permanent", "random")}
                                        className="bg-purple-100 text-purple-700 flex-1 sm:flex-initial"
                                        size="md"
                                        isDisabled={isTeamsLoading}
                                    >
                                        <span className="hidden sm:inline">สุ่มกลุ่มอัตโนมัติ</span>
                                        <span className="sm:hidden">สุ่มกลุ่ม</span>
                                    </Button>
                                    <Button
                                        color="primary"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("permanent", "manual")}
                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25 flex-1 sm:flex-initial"
                                        size="md"
                                        isDisabled={isTeamsLoading}
                                    >
                                        <span className="hidden sm:inline">สร้างกลุ่มใหม่</span>
                                        <span className="sm:hidden">สร้างกลุ่ม</span>
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Teams Grid */}
                    {isTeamsLoading ? (
                        <TeamsGridSkeleton />
                    ) : permanentTeams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {permanentTeams.map((team, teamIdx) => (
                                <Card key={team.id} className="shadow-sm border border-slate-200 hover:shadow-lg hover:border-purple-200 transition-all group">
                                    <CardHeader className="px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white">
                                                    {teamIdx + 1}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-white">{team.name}</span>
                                                    <p className="text-xs text-white/70">{team.members.length} สมาชิก</p>
                                                </div>
                                            </div>
                                            <Tooltip content="ลบกลุ่ม" color="danger">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="flat"
                                                    className="bg-white/20 text-white hover:bg-red-500"
                                                    onPress={() => onOpenDeleteTeamModal(team.id, "permanent")}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="px-4 py-3">
                                        <div className="space-y-2">
                                            {team.members.map((member, idx) => (
                                                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{member.full_name}</p>
                                                        <p className="text-xs text-slate-400">{member.student_id}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="shadow-sm border border-dashed border-purple-200 bg-purple-50/30">
                            <CardBody className="text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                    <Icon icon="solar:users-group-two-rounded-bold-duotone" className="text-5xl text-purple-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีกลุ่มถาวร</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    สร้างกลุ่มสำหรับโปรเจกต์หรืองานกลุ่มระยะยาวที่ต้องทำงานร่วมกันตลอดเทอม
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <Button
                                        variant="flat"
                                        startContent={<Icon icon="solar:shuffle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("permanent", "random")}
                                        className="bg-purple-100 text-purple-700"
                                    >
                                        สุ่มกลุ่มอัตโนมัติ
                                    </Button>
                                    <Button
                                        color="primary"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("permanent", "manual")}
                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25"
                                    >
                                        สร้างกลุ่มเอง
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}

            {/* Sub-tab: Weekly Teams */}
            {sectionSubTab === "weekly" && (
                <div className="space-y-4">
                    {/* Week Selector Bar */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="py-3 px-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                                            <Icon icon="solar:calendar-bold" className="text-xl text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-700">สัปดาห์ที่ {selectedWeek}</p>
                                            <p className="text-sm text-slate-500">
                                                {weeklyTeams[selectedWeek]?.length || 0} กลุ่ม
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                                    {/* Copy from week dropdown */}
                                    {!weeklyTeams[selectedWeek]?.length && 
                                     Object.keys(weeklyTeams).some(k => parseInt(k) !== selectedWeek && weeklyTeams[parseInt(k)]?.length > 0) && (
                                        <Dropdown>
                                            <DropdownTrigger>
                                                <Button
                                                    variant="flat"
                                                    size="md"
                                                    startContent={<Icon icon="solar:copy-bold" />}
                                                    endContent={<Icon icon="solar:alt-arrow-down-linear" className="text-sm" />}
                                                    className="bg-slate-100 flex-shrink-0"
                                                >
                                                    <span className="hidden sm:inline">คัดลอกจาก</span>
                                                    <span className="sm:hidden">คัดลอก</span>
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu 
                                                aria-label="เลือกสัปดาห์ที่จะคัดลอก"
                                                onAction={(key) => onCopyTeamsFromWeek(parseInt(key as string))}
                                            >
                                                {Array.from({ length: totalWeeks }, (_, i) => i + 1)
                                                    .filter(week => week !== selectedWeek && weeklyTeams[week]?.length > 0)
                                                    .map((week) => (
                                                        <DropdownItem 
                                                            key={week.toString()}
                                                            startContent={<Icon icon="solar:calendar-linear" className="text-emerald-500" />}
                                                            description={`${weeklyTeams[week]?.length || 0} กลุ่ม`}
                                                        >
                                                            สัปดาห์ที่ {week}
                                                        </DropdownItem>
                                                    ))
                                                }
                                            </DropdownMenu>
                                        </Dropdown>
                                    )}
                                    {weeklyTeams[selectedWeek]?.length > 0 && (
                                        <Button
                                            variant="flat"
                                            size="md"
                                            color="danger"
                                            startContent={<Icon icon="solar:eraser-bold" />}
                                            onPress={onOpenBulkDeleteModal}
                                            className="flex-shrink-0"
                                        >
                                            <span className="hidden sm:inline">ล้างทั้งหมด</span>
                                            <span className="sm:hidden">ล้าง</span>
                                        </Button>
                                    )}
                                    <Button
                                        variant="flat"
                                        size="md"
                                        startContent={<Icon icon="solar:shuffle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("weekly", "random")}
                                        className="bg-emerald-100 text-emerald-700 flex-shrink-0"
                                    >
                                        สุ่มกลุ่ม
                                    </Button>
                                    <Button
                                        color="primary"
                                        size="md"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("weekly", "manual")}
                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 flex-shrink-0"
                                    >
                                        สร้างกลุ่ม
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Week Navigation Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 lg:mx-0 lg:px-1">
                        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
                            const hasTeams = weeklyTeams[week] && weeklyTeams[week].length > 0;
                            const isSelected = week === selectedWeek;
                            return (
                                <button
                                    key={week}
                                    onClick={() => setSelectedWeek(week)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all ${isSelected
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                                        : hasTeams
                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                >
                                    W{week}
                                    {hasTeams && !isSelected && (
                                        <Icon icon="solar:check-circle-bold" className="ml-1 text-emerald-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Teams Grid */}
                    {isTeamsLoading ? (
                        <TeamsGridSkeleton />
                    ) : weeklyTeams[selectedWeek] && weeklyTeams[selectedWeek].length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {weeklyTeams[selectedWeek].map((team, teamIdx) => (
                                <Card key={team.id} className="shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-200 transition-all group">
                                    <CardHeader className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white">
                                                    {teamIdx + 1}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-white">{team.name}</span>
                                                    <p className="text-xs text-white/70">{team.members.length} สมาชิก</p>
                                                </div>
                                            </div>
                                            <Tooltip content="ลบกลุ่ม" color="danger">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="flat"
                                                    className="bg-white/20 text-white hover:bg-red-500"
                                                    onPress={() => onOpenDeleteTeamModal(team.id, "weekly", selectedWeek)}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="px-4 py-3">
                                        <div className="space-y-2">
                                            {team.members.map((member, idx) => (
                                                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{member.full_name}</p>
                                                        <p className="text-xs text-slate-400">{member.student_id}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="shadow-sm border border-dashed border-emerald-200 bg-emerald-50/30">
                            <CardBody className="text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                    <Icon icon="solar:calendar-bold-duotone" className="text-5xl text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีกลุ่มสำหรับสัปดาห์ที่ {selectedWeek}</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    สร้างกลุ่มใหม่หรือคัดลอกจากสัปดาห์ก่อนหน้าเพื่อเริ่มต้น
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    {Object.keys(weeklyTeams).some(k => parseInt(k) !== selectedWeek && weeklyTeams[parseInt(k)]?.length > 0) && (
                                        <Dropdown>
                                            <DropdownTrigger>
                                                <Button
                                                    variant="flat"
                                                    startContent={<Icon icon="solar:copy-bold" />}
                                                    endContent={<Icon icon="solar:alt-arrow-down-linear" className="text-sm" />}
                                                    className="bg-slate-100"
                                                >
                                                    คัดลอกจากสัปดาห์อื่น
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu 
                                                aria-label="เลือกสัปดาห์ที่จะคัดลอก"
                                                onAction={(key) => onCopyTeamsFromWeek(parseInt(key as string))}
                                            >
                                                {Array.from({ length: totalWeeks }, (_, i) => i + 1)
                                                    .filter(week => week !== selectedWeek && weeklyTeams[week]?.length > 0)
                                                    .map((week) => (
                                                        <DropdownItem 
                                                            key={week.toString()}
                                                            startContent={<Icon icon="solar:calendar-linear" className="text-emerald-500" />}
                                                            description={`${weeklyTeams[week]?.length || 0} กลุ่ม`}
                                                        >
                                                            สัปดาห์ที่ {week}
                                                        </DropdownItem>
                                                    ))
                                                }
                                            </DropdownMenu>
                                        </Dropdown>
                                    )}
                                    <Button
                                        variant="flat"
                                        startContent={<Icon icon="solar:shuffle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("weekly", "random")}
                                        className="bg-emerald-100 text-emerald-700"
                                    >
                                        สุ่มกลุ่มอัตโนมัติ
                                    </Button>
                                    <Button
                                        color="primary"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={() => onOpenCreateTeamModal("weekly", "manual")}
                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25"
                                    >
                                        สร้างกลุ่มเอง
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
