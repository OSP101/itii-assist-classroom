"use client";

import { useState, useMemo } from "react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Tooltip } from "@heroui/tooltip";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import assignmentService from "@/services/assignment.service";
import type { AssignmentType, NewAssignment, LocalSubItem } from "./types";

interface AssignmentsTabProps {
    assignments: AssignmentType[];
    setAssignments: React.Dispatch<React.SetStateAction<AssignmentType[]>>;
    isLoading: boolean;
    expandedAssignments: number[];
    setExpandedAssignments: React.Dispatch<React.SetStateAction<number[]>>;
    onOpenCreateModal: () => void;
    onOpenEditModal: (assignment: AssignmentType) => void;
    onOpenScoreModal?: (assignment: AssignmentType) => void;
}

export default function AssignmentsTab({
    assignments,
    setAssignments,
    isLoading,
    expandedAssignments,
    setExpandedAssignments,
    onOpenCreateModal,
    onOpenEditModal,
    onOpenScoreModal,
}: AssignmentsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "individual" | "group">("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");

    const handleDeleteAssignment = async (assignment: AssignmentType) => {
        if (confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) {
            try {
                await assignmentService.deleteAssignment(assignment.id);
                setAssignments(prev => prev.filter(a => a.id !== assignment.id));
                addToast({
                    title: "สำเร็จ",
                    description: "ลบงานเรียบร้อยแล้ว",
                    color: "success",
                });
            } catch (error) {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถลบงานได้",
                    color: "danger",
                });
            }
        }
    };

    const toggleExpanded = (assignmentId: number) => {
        setExpandedAssignments(prev =>
            prev.includes(assignmentId)
                ? prev.filter(id => id !== assignmentId)
                : [...prev, assignmentId]
        );
    };

    // Separate individual and group assignments
    const individualAssignments = assignments.filter(a => a.assignment_type === "individual");
    const groupAssignments = assignments.filter(a => a.assignment_type !== "individual");

    // Get current tab assignments
    const currentAssignments = useMemo(() => {
        let list = assignments;
        if (activeTab === "individual") list = individualAssignments;
        if (activeTab === "group") list = groupAssignments;
        
        if (searchQuery) {
            list = list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return list;
    }, [assignments, activeTab, searchQuery, individualAssignments, groupAssignments]);

    // Get type label and color
    const getTypeInfo = (type: string) => {
        switch (type) {
            case "individual":
                return { label: "เดี่ยว", color: "bg-indigo-100 text-indigo-700", icon: "solar:user-bold" };
            case "permanent_group":
                return { label: "กลุ่มถาวร", color: "bg-purple-100 text-purple-700", icon: "solar:users-group-two-rounded-bold" };
            default:
                return { label: "กลุ่มสัปดาห์", color: "bg-emerald-100 text-emerald-700", icon: "solar:users-group-rounded-bold" };
        }
    };

    // Render grid card view
    const renderGridCard = (assignment: AssignmentType) => {
        const typeInfo = getTypeInfo(assignment.assignment_type);
        return (
            <Card key={assignment.id} className="shadow-sm border border-slate-200 hover:shadow-md transition-all">
                <CardBody className="p-4">
                    {/* Header with Actions */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`p-2 rounded-lg ${assignment.assignment_type === "individual" ? "bg-indigo-100" : assignment.assignment_type === "permanent_group" ? "bg-purple-100" : "bg-emerald-100"}`}>
                            <Icon icon={typeInfo.icon} className={`text-xl ${assignment.assignment_type === "individual" ? "text-indigo-600" : assignment.assignment_type === "permanent_group" ? "text-purple-600" : "text-emerald-600"}`} />
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip content="ลงคะแนน">
                                <Button isIconOnly size="sm" variant="flat" color="primary" onPress={() => onOpenScoreModal?.(assignment)}>
                                    <Icon icon="solar:pen-new-square-bold" />
                                </Button>
                            </Tooltip>
                            <Tooltip content="แก้ไข">
                                <Button isIconOnly size="sm" variant="light" color="default" onPress={() => onOpenEditModal(assignment)}>
                                    <Icon icon="solar:pen-linear" />
                                </Button>
                            </Tooltip>
                            <Tooltip content="ลบ" color="danger">
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDeleteAssignment(assignment)}>
                                    <Icon icon="solar:trash-bin-trash-linear" />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                    
                    {/* Title */}
                    <p className="font-semibold text-slate-800 mb-2 line-clamp-2">{assignment.name}</p>
                    
                    {/* Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <Chip size="sm" className={typeInfo.color}>{typeInfo.label}</Chip>
                        {assignment.week_number && (
                            <Chip size="sm" variant="flat" className="bg-blue-50 text-blue-600">W{assignment.week_number}</Chip>
                        )}
                        {assignment.subItems && assignment.subItems.length > 0 && (
                            <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600">{assignment.subItems.length} ข้อย่อย</Chip>
                        )}
                    </div>
                    
                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                            <Icon icon="solar:medal-star-bold" className="text-amber-500" />
                            <span className="font-medium text-slate-700">{assignment.max_score}</span> คะแนน
                        </span>
                        {/* {assignment.due_date && (
                            <span className="flex items-center gap-1">
                                <Icon icon="solar:calendar-linear" />
                                {new Date(assignment.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                            </span>
                        )} */}
                    </div>
                </CardBody>
            </Card>
        );
    };

    // Render list row view
    const renderListRow = (assignment: AssignmentType, index: number) => {
        const typeInfo = getTypeInfo(assignment.assignment_type);
        return (
            
            <Card key={assignment.id} className="shadow-sm border border-slate-200 hover:shadow-md transition-all">
                <CardBody className="p-3 sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Icon */}
                        <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${assignment.assignment_type === "individual" ? "bg-indigo-100" : assignment.assignment_type === "permanent_group" ? "bg-purple-100" : "bg-emerald-100"}`}>
                            <Icon icon={typeInfo.icon} className={`text-lg sm:text-xl ${assignment.assignment_type === "individual" ? "text-indigo-600" : assignment.assignment_type === "permanent_group" ? "text-purple-600" : "text-emerald-600"}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                <p className="font-semibold text-slate-800 truncate">{assignment.name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Chip size="sm" className={typeInfo.color}>{typeInfo.label}</Chip>
                                    {assignment.week_number && (
                                        <Chip size="sm" variant="flat" className="bg-blue-50 text-blue-600">W{assignment.week_number}</Chip>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Icon icon="solar:medal-star-linear" className="text-amber-500" />
                                    {assignment.max_score} คะแนน
                                </span>
                                {assignment.subItems && assignment.subItems.length > 0 && (
                                    <span className="hidden sm:flex items-center gap-1">
                                        <Icon icon="solar:list-bold" className="text-slate-400" />
                                        {assignment.subItems.length} ข้อย่อย
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <Tooltip content="ลงคะแนน">
                                <Button isIconOnly size="sm" variant="flat" color="primary" onPress={() => onOpenScoreModal?.(assignment)}>
                                    <Icon icon="solar:pen-new-square-bold" className="text-lg" />
                                </Button>
                            </Tooltip>
                            <Tooltip content="แก้ไข">
                                <Button isIconOnly size="sm" variant="light" color="default" onPress={() => onOpenEditModal(assignment)}>
                                    <Icon icon="solar:pen-linear" className="text-lg" />
                                </Button>
                            </Tooltip>
                            <Tooltip content="ลบ" color="danger">
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDeleteAssignment(assignment)}>
                                    <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                </CardBody>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">จัดการงาน</h2>
                    <p className="text-sm text-slate-500">สร้างและจัดการหัวข้องานสำหรับการลงคะแนน</p>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                </div>
            ) : (
                <>
                    {/* Sub-tabs Navigation */}
                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-3 lg:mx-0 lg:px-0">
                        <Tabs
                            selectedKey={activeTab}
                            onSelectionChange={(key) => setActiveTab(key as "all" | "individual" | "group")}
                            variant="underlined"
                            classNames={{
                                tabList: "gap-4 md:gap-6 flex-nowrap min-w-max",
                                cursor: "bg-blue-500",
                                tab: "px-0 h-11 whitespace-nowrap",
                                tabContent: "group-data-[selected=true]:text-blue-600 text-slate-500 font-medium text-sm"
                            }}
                        >
                            <Tab
                                key="all"
                                title={
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:clipboard-list-bold" className="text-lg" />
                                        <span>ทั้งหมด</span>
                                        {assignments.length > 0 && (
                                            <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-700 h-5 min-w-5 px-1">
                                                {assignments.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            />
                            <Tab
                                key="individual"
                                title={
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:user-bold" className="text-lg" />
                                        <span>งานเดี่ยว</span>
                                        {individualAssignments.length > 0 && (
                                            <Chip size="sm" variant="flat" className="bg-indigo-100 text-indigo-700 h-5 min-w-5 px-1">
                                                {individualAssignments.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            />
                            <Tab
                                key="group"
                                title={
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:users-group-rounded-bold" className="text-lg" />
                                        <span className="hidden sm:inline">งานกลุ่ม</span>
                                        <span className="sm:hidden">กลุ่ม</span>
                                        {groupAssignments.length > 0 && (
                                            <Chip size="sm" variant="flat" className="bg-emerald-100 text-emerald-700 h-5 min-w-5 px-1">
                                                {groupAssignments.length}
                                            </Chip>
                                        )}
                                    </div>
                                }
                            />
                        </Tabs>
                    </div>

                    {/* Search & Actions Bar */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="py-3 px-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <Input
                                        placeholder="ค้นหาชื่องาน..."
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                        startContent={<Icon icon="solar:magnifer-linear" className="text-slate-400" />}
                                        className="w-full"
                                        size="md"
                                        variant="bordered"
                                        isClearable
                                        classNames={{
                                            inputWrapper: "bg-slate-50 border-slate-200"
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* View Mode Toggle */}
                                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                        <Tooltip content="แบบการ์ด">
                                            <Button 
                                                isIconOnly 
                                                size="sm" 
                                                variant="light"
                                                className={`rounded-none ${viewMode === "grid" ? "bg-slate-100" : ""}`}
                                                onPress={() => setViewMode("grid")}
                                            >
                                                <Icon icon="solar:widget-bold" className={`text-lg ${viewMode === "grid" ? "text-blue-600" : "text-slate-400"}`} />
                                            </Button>
                                        </Tooltip>
                                        <div className="w-px h-5 bg-slate-200" />
                                        <Tooltip content="แบบรายการ">
                                            <Button 
                                                isIconOnly 
                                                size="sm" 
                                                variant="light"
                                                className={`rounded-none ${viewMode === "list" ? "bg-slate-100" : ""}`}
                                                onPress={() => setViewMode("list")}
                                            >
                                                <Icon icon="solar:list-bold" className={`text-lg ${viewMode === "list" ? "text-blue-600" : "text-slate-400"}`} />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                    
                                    {/* Stats Info - Desktop Only */}
                                    {/* <div className="hidden lg:flex items-center gap-3 mr-2 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Icon icon="solar:medal-star-bold" className="text-amber-500" />
                                            รวม {assignments.reduce((acc, a) => acc + Number(a.max_score || 0), 0)} คะแนน
                                        </span>
                                    </div> */}
                                    
                                    <Button
                                        color="primary"
                                        startContent={<Icon icon="solar:add-circle-bold" />}
                                        onPress={onOpenCreateModal}
                                        className="bg-linear-to-r from-blue-400 to-indigo-500 shadow-lg shadow-indigo-500/25 w-full sm:w-auto"
                                    >
                                        <span className="hidden sm:inline">สร้างงานใหม่</span>
                                        <span className="sm:hidden">สร้างงาน</span>
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Content */}
                    {currentAssignments.length > 0 ? (
                        viewMode === "grid" ? (
                            /* Grid View */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {currentAssignments.map(renderGridCard)}
                            </div>
                        ) : (
                            /* List View */
                            <div className="space-y-2">
                                {currentAssignments.map((assignment, idx) => renderListRow(assignment, idx))}
                            </div>
                        )
                    ) : (
                        <Card className="shadow-sm border border-dashed border-slate-300 bg-slate-50/50">
                            <CardBody className="text-center py-16">
                                {searchQuery ? (
                                    <>
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Icon icon="solar:magnifer-linear" className="text-3xl text-slate-400" />
                                        </div>
                                        <p className="text-slate-600 font-medium">ไม่พบงานที่ค้นหา</p>
                                        <p className="text-sm text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาใหม่</p>
                                        <Button
                                            size="sm"
                                            variant="light"
                                            className="mt-4"
                                            onPress={() => setSearchQuery("")}
                                        >
                                            ล้างการค้นหา
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                            <Icon icon="solar:clipboard-list-bold-duotone" className="text-5xl text-blue-500" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                                            {activeTab === "individual" ? "ยังไม่มีงานเดี่ยว" : 
                                             activeTab === "group" ? "ยังไม่มีงานกลุ่ม" : "ยังไม่มีงาน"}
                                        </h3>
                                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                            สร้างงานเพื่อกำหนดหัวข้อการลงคะแนนให้นักศึกษา
                                        </p>
                                        <Button
                                            color="primary"
                                            size="lg"
                                            startContent={<Icon icon="solar:add-circle-bold" />}
                                            onPress={onOpenCreateModal}
                                            className="bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-indigo-500/25"
                                        >
                                            สร้างงานแรก
                                        </Button>
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
