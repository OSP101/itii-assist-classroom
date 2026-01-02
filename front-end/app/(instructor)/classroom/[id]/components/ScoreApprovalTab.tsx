"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Divider } from "@heroui/divider";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import scoreEditRequestService, { type ScoreEditRequest } from "@/services/scoreEditRequest.service";

interface ScoreApprovalTabProps {
    courseId: string;
    onPendingCountChange?: (count: number) => void;
}

type FilterStatus = "pending" | "approved" | "rejected" | "all";

// Format date helper
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function ScoreApprovalTab({ courseId, onPendingCountChange }: ScoreApprovalTabProps) {
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
    const [requests, setRequests] = useState<ScoreEditRequest[]>([]);
    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // Action modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: "approve" | "reject";
        request: ScoreEditRequest | null;
    }>({ isOpen: false, type: "approve", request: null });
    const [actionComment, setActionComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch requests
    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const status = filterStatus === "all" ? undefined : filterStatus;
            const response = await scoreEditRequestService.getEditRequests(courseId, status);
            if (response) {
                setRequests(response.data || []);
                const countsData = response.counts || { pending: 0, approved: 0, rejected: 0 };
                setCounts(countsData);
                onPendingCountChange?.(countsData.pending);
            }
        } catch (error) {
            console.error("Failed to fetch edit requests:", error);
            setRequests([]);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถโหลดข้อมูลได้",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, filterStatus]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Handle approve
    const handleApprove = async () => {
        if (!actionModal.request) return;

        setIsSubmitting(true);
        try {
            await scoreEditRequestService.approveEditRequest(actionModal.request.id, actionComment || undefined);
            addToast({
                title: "อนุมัติสำเร็จ",
                description: "อนุมัติการแก้ไขคะแนนเรียบร้อยแล้ว",
                color: "success",
            });
            setActionModal({ isOpen: false, type: "approve", request: null });
            setActionComment("");
            fetchRequests();
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถอนุมัติได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle reject
    const handleReject = async () => {
        if (!actionModal.request) return;

        if (!actionComment.trim()) {
            addToast({
                title: "กรุณาระบุเหตุผล",
                description: "ต้องระบุเหตุผลในการปฏิเสธ",
                color: "warning",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await scoreEditRequestService.rejectEditRequest(actionModal.request.id, actionComment);
            addToast({
                title: "ปฏิเสธสำเร็จ",
                description: "ปฏิเสธการแก้ไขคะแนนเรียบร้อยแล้ว",
                color: "success",
            });
            setActionModal({ isOpen: false, type: "reject", request: null });
            setActionComment("");
            fetchRequests();
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถปฏิเสธได้",
                color: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get status chip
    const getStatusChip = (status: string) => {
        switch (status) {
            case "pending":
                return <Chip size="sm" color="warning" variant="flat">รออนุมัติ</Chip>;
            case "approved":
                return <Chip size="sm" color="success" variant="flat">อนุมัติแล้ว</Chip>;
            case "rejected":
                return <Chip size="sm" color="danger" variant="flat">ปฏิเสธ</Chip>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">อนุมัติการแก้ไขคะแนน</h2>
                    <p className="text-sm text-slate-500">ตรวจสอบและอนุมัติคำร้องขอแก้ไขคะแนนจาก TA</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <Tabs
                selectedKey={filterStatus}
                onSelectionChange={(key) => setFilterStatus(key as FilterStatus)}
                variant="underlined"
                classNames={{
                    tabList: "gap-6",
                    cursor: "bg-blue-500",
                    tab: "px-0 h-10",
                    tabContent: "group-data-[selected=true]:text-blue-600 text-slate-500 font-medium text-sm",
                }}
            >
                <Tab
                    key="pending"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:hourglass-bold" className="text-base" />
                            <span>รออนุมัติ</span>
                            {counts.pending > 0 && (
                                <Chip size="sm" color="warning" variant="flat" className="h-5 px-1.5 text-xs">
                                    {counts.pending}
                                </Chip>
                            )}
                        </div>
                    }
                />
                <Tab
                    key="approved"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:check-circle-bold" className="text-base" />
                            <span>อนุมัติแล้ว</span>
                            {counts.approved > 0 && (
                                <Chip size="sm" color="success" variant="flat" className="h-5 px-1.5 text-xs">
                                    {counts.approved}
                                </Chip>
                            )}
                        </div>
                    }
                />
                <Tab
                    key="rejected"
                    title={
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:close-circle-bold" className="text-base" />
                            <span>ปฏิเสธ</span>
                            {counts.rejected > 0 && (
                                <Chip size="sm" color="danger" variant="flat" className="h-5 px-1.5 text-xs">
                                    {counts.rejected}
                                </Chip>
                            )}
                        </div>
                    }
                />
            </Tabs>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" color="primary" />
                </div>
            ) : requests.length === 0 ? (
                <Card className="shadow-sm">
                    <CardBody className="py-16">
                        <div className="text-center">
                            <Icon
                                icon={filterStatus === "pending" ? "solar:inbox-linear" : "solar:clipboard-check-linear"}
                                className="text-5xl text-slate-300 mx-auto mb-3"
                            />
                            <p className="text-slate-500">
                                {filterStatus === "pending"
                                    ? "ไม่มีคำร้องรออนุมัติ"
                                    : filterStatus === "approved"
                                        ? "ยังไม่มีคำร้องที่อนุมัติ"
                                        : "ยังไม่มีคำร้องที่ปฏิเสธ"
                                }
                            </p>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <Accordion
                    variant="splitted"
                    selectionMode="multiple"
                    className="px-0 gap-3"
                    itemClasses={{
                        base: "shadow-sm border border-slate-200 rounded-xl",
                        title: "font-medium text-slate-700",
                        trigger: "px-4 py-3 data-[hover=true]:bg-slate-50 rounded-xl",
                        content: "px-4 pb-4",
                    }}
                >
                    {requests.map((request) => (
                        <AccordionItem
                            key={request.id}
                            aria-label={`${request.assignment.name} - ${request.student.full_name}`}
                            startContent={
                                <div className="flex items-center gap-3">
                                    {getStatusChip(request.status)}
                                    {/* <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Icon icon="solar:user-bold" className="text-blue-600 text-sm" />
                                    </div> */}
                                </div>
                            }
                            title={
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span className="font-medium text-slate-800">{request.student.full_name}</span>
                                    <span className="text-slate-800 font-medium">{request.student.student_id}</span>
                                </div>
                            }
                            subtitle={
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-slate-600">{request.assignment.name}</span>
                                    {request.sub_item && (
                                        <span className="text-slate-400">• {request.sub_item.name}</span>
                                    )}
                                    <span className="text-slate-400">•</span>
                                    <span className="font-medium">
                                        <span className="text-slate-500">{request.old_score ?? "-"}</span>
                                        <span className="mx-1 text-slate-400">→</span>
                                        <span className="text-emerald-600">{request.new_score}</span>
                                        <span className="text-slate-400 text-xs">/{request.sub_item?.max_score ?? request.assignment.max_score}</span>
                                    </span>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                {/* Score Change Details */}
                                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                                    <div className="text-center flex-1">
                                        <p className="text-xs text-slate-500 mb-1">คะแนนเดิม</p>
                                        <p className="text-2xl font-bold text-slate-600">
                                            {request.old_score ?? "-"}
                                        </p>
                                    </div>
                                    <Icon icon="solar:arrow-right-linear" className="text-2xl text-slate-300" />
                                    <div className="text-center flex-1">
                                        <p className="text-xs text-slate-500 mb-1">คะแนนใหม่</p>
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {request.new_score}
                                        </p>
                                    </div>
                                    <div className="text-center flex-1 pl-4 border-l border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1">คะแนนเต็ม</p>
                                        <p className="text-2xl font-medium text-slate-400">
                                            {request.sub_item?.max_score ?? request.assignment.max_score}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason */}
                                {request.reason && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                        <p className="text-xs text-amber-600 font-medium mb-1">
                                            <Icon icon="solar:chat-round-line-bold" className="inline mr-1" />
                                            เหตุผลการแก้ไข
                                        </p>
                                        <p className="text-sm text-slate-700">{request.reason}</p>
                                    </div>
                                )}

                                {/* Review Comment (for approved/rejected) */}
                                {request.review_comment && request.status !== "pending" && (
                                    <div className={`p-3 rounded-lg border ${request.status === "approved"
                                        ? "bg-emerald-50 border-emerald-100"
                                        : "bg-red-50 border-red-100"
                                        }`}>
                                        <p className={`text-xs font-medium mb-1 ${request.status === "approved" ? "text-emerald-600" : "text-red-600"
                                            }`}>
                                            <Icon icon={request.status === "approved" ? "solar:check-circle-bold" : "solar:close-circle-bold"} className="inline mr-1" />
                                            {request.status === "approved" ? "หมายเหตุการอนุมัติ" : "เหตุผลการปฏิเสธ"}
                                        </p>
                                        <p className="text-sm text-slate-700">{request.review_comment}</p>
                                    </div>
                                )}

                                {/* Meta Info & Actions */}
                                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Icon icon="solar:user-linear" />
                                            <span>ร้องขอโดย: {request.requester.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Icon icon="solar:calendar-linear" />
                                            <span>{formatDate(request.created_at)}</span>
                                        </div>
                                        {request.reviewer && request.reviewed_at && (
                                            <div className="flex items-center gap-1">
                                                <Icon icon="solar:check-read-linear" />
                                                <span className="mr-2">
                                                    {request.status === "approved" ? "อนุมัติ" : "ปฏิเสธ"}โดย: {request.reviewer.full_name}

                                                </span>
                                                <Icon icon="solar:calendar-linear" />
                                                <span> {formatDate(request.reviewed_at)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions (only for pending) */}
                                    {request.status === "pending" && (
                                        <div className="flex gap-2">
                                            <Button
                                                color="success"
                                                variant="flat"
                                                size="sm"
                                                startContent={<Icon icon="solar:check-circle-bold" />}
                                                onPress={() => setActionModal({ isOpen: true, type: "approve", request })}
                                            >
                                                อนุมัติ
                                            </Button>
                                            <Button
                                                color="danger"
                                                variant="flat"
                                                size="sm"
                                                startContent={<Icon icon="solar:close-circle-bold" />}
                                                onPress={() => setActionModal({ isOpen: true, type: "reject", request })}
                                            >
                                                ปฏิเสธ
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}

            {/* Action Modal */}
            <Modal
                isOpen={actionModal.isOpen}
                onClose={() => {
                    setActionModal({ isOpen: false, type: "approve", request: null });
                    setActionComment("");
                }}
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${actionModal.type === "approve" ? "bg-emerald-100" : "bg-red-100"}`}>
                            <Icon
                                icon={actionModal.type === "approve" ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                                className={`text-xl ${actionModal.type === "approve" ? "text-emerald-600" : "text-red-600"}`}
                            />
                        </div>
                        <span>{actionModal.type === "approve" ? "อนุมัติการแก้ไขคะแนน" : "ปฏิเสธการแก้ไขคะแนน"}</span>
                    </ModalHeader>
                    <Divider />
                    <ModalBody className="py-4">
                        {actionModal.request && (
                            <div className="space-y-4">
                                {/* Request Summary */}
                                <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                                    <p className="text-sm">
                                        <span className="text-slate-500">งาน:</span>{" "}
                                        <span className="font-medium">{actionModal.request.assignment.name}</span>
                                        {actionModal.request.sub_item && (
                                            <span className="text-slate-500"> - {actionModal.request.sub_item.name}</span>
                                        )}
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-slate-500">นักศึกษา:</span>{" "}
                                        <span className="font-medium">{actionModal.request.student.student_id} - {actionModal.request.student.full_name}</span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-slate-500">คะแนน:</span>{" "}
                                        <span className="text-slate-600">{actionModal.request.old_score ?? "-"}</span>
                                        <span className="mx-2">→</span>
                                        <span className="font-bold text-emerald-600">{actionModal.request.new_score}</span>
                                        <span className="text-slate-400"> / {actionModal.request.sub_item?.max_score ?? actionModal.request.assignment.max_score}</span>
                                    </p>
                                </div>

                                {/* Comment Input */}
                                <Textarea
                                    label={actionModal.type === "approve" ? "หมายเหตุ (ไม่บังคับ)" : "เหตุผลการปฏิเสธ *"}
                                    placeholder={actionModal.type === "approve"
                                        ? "ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                                        : "กรุณาระบุเหตุผลในการปฏิเสธ..."
                                    }
                                    value={actionComment}
                                    onValueChange={setActionComment}
                                    variant="bordered"
                                    minRows={3}
                                    isRequired={actionModal.type === "reject"}
                                />
                            </div>
                        )}
                    </ModalBody>
                    <Divider />
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={() => {
                                setActionModal({ isOpen: false, type: "approve", request: null });
                                setActionComment("");
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color={actionModal.type === "approve" ? "success" : "danger"}
                            isLoading={isSubmitting}
                            onPress={actionModal.type === "approve" ? handleApprove : handleReject}
                        >
                            {actionModal.type === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
