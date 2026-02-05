"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";
import { addToast } from "@heroui/toast";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Icon } from "@iconify/react";
import { io, Socket } from "socket.io-client";
import QRCode from "react-qr-code";

import { API_BASE_URL } from "@/config/api";
import { Divider } from "@heroui/divider";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface DeskWithStatus {
    id: string;
    number: number;
    type: string;
    label?: string;
    x: number;
    y: number;
    is_enabled: boolean;
    status: {
        grading_status: "not_started" | "waiting" | "in_progress" | "completed";
        help_status: "none" | "waiting" | "in_progress";
    };
    booking?: {
        id: number;
        queue_number: number;
        booking_type: string;
        status: string;
        student_name?: string;
    };
}

interface ProjectorViewData {
    session: {
        id: string;
        title: string;
        pin_code: string;
        status: string;
    };
    classroom: {
        id: string;
        name: string;
        building: string;
    };
    desks: DeskWithStatus[];
    queueStats: {
        grading_waiting: number;
        help_waiting: number;
    };
}

export default function ProjectorViewPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;

    const [data, setData] = useState<ProjectorViewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Modal states
    const [selectedDesk, setSelectedDesk] = useState<DeskWithStatus | null>(null);
    const [isDeskModalOpen, setIsDeskModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            // Use public route without auth
            const response = await fetch(`${API_BASE_URL}/queue/sessions/${sessionId}/desk-statuses`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
                setError(null);
            } else {
                setError(result.error?.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Socket connection for real-time updates
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            console.log("Socket connected");
            socket.emit("join-queue", sessionId);
        });

        // Listen for booking updates
        socket.on("new-booking", () => {
            fetchData();
        });

        socket.on("booking-assigned", () => {
            fetchData();
        });

        socket.on("booking-completed", () => {
            fetchData();
        });

        socket.on("booking-skipped", () => {
            fetchData();
        });

        socket.on("session-status-changed", (eventData: { status: string }) => {
            if (eventData.status === "closed") {
                addToast({
                    title: "Session ปิดแล้ว",
                    description: "การจองคิวถูกปิด",
                    color: "warning",
                });
            }
            fetchData();
        });

        socket.on("pin-changed", () => {
            fetchData();
        });

        socketRef.current = socket;

        return () => {
            socket.emit("leave-queue", sessionId);
            socket.disconnect();
        };
    }, [sessionId, fetchData]);

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "+") {
                setZoom((prev) => Math.min(prev + 0.1, 2));
            } else if (e.key === "-") {
                setZoom((prev) => Math.max(prev - 0.1, 0.5));
            } else if (e.key === "0") {
                setZoom(1);
            } else if (e.key === "f") {
                toggleFullscreen();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Toggle queue status (active <-> paused)
    const handleToggleStatus = async () => {
        if (!data) return;
        
        const newStatus = data.session.status === 'active' ? 'paused' : 'active';
        setIsTogglingStatus(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/queue/sessions/${sessionId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status: newStatus }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                addToast({
                    title: newStatus === 'active' ? "เปิดรับคิวแล้ว" : "หยุดรับคิวแล้ว",
                    description: newStatus === 'active' 
                        ? "นักศึกษาสามารถจองคิวได้แล้ว" 
                        : "นักศึกษาไม่สามารถจองคิวใหม่ได้ แต่คิวที่มีอยู่ยังดำเนินการต่อได้",
                    color: newStatus === 'active' ? "success" : "warning",
                });
                fetchData();
            } else {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: result.error?.message || "ไม่สามารถเปลี่ยนสถานะได้",
                    color: "danger",
                });
            }
        } catch (err) {
            console.error("Error toggling status:", err);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
                color: "danger",
            });
        } finally {
            setIsTogglingStatus(false);
        }
    };

    // Handle desk click
    const handleDeskClick = (desk: DeskWithStatus) => {
        // Only allow click on desks with bookings
        if (desk.status.grading_status === "waiting" || 
            desk.status.grading_status === "in_progress" ||
            desk.status.help_status === "waiting" ||
            desk.status.help_status === "in_progress") {
            setSelectedDesk(desk);
            setIsDeskModalOpen(true);
        }
    };

    // Cancel booking for desk
    const handleCancelDeskBooking = async () => {
        if (!selectedDesk?.booking?.id) return;
        
        setIsCancelling(true);
        try {
            const response = await fetch(`${API_BASE_URL}/queue/bookings/${selectedDesk.booking.id}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            
            const result = await response.json();
            
            if (result.success) {
                addToast({
                    title: "ยกเลิกสำเร็จ",
                    description: `ยกเลิกการจองโต๊ะ ${selectedDesk.number} แล้ว`,
                    color: "success",
                });
                setIsDeskModalOpen(false);
                setSelectedDesk(null);
                fetchData();
            } else {
                addToast({
                    title: "ยกเลิกไม่สำเร็จ",
                    description: result.error?.message || "เกิดข้อผิดพลาด",
                    color: "danger",
                });
            }
        } catch (err) {
            console.error("Error cancelling booking:", err);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถยกเลิกการจองได้",
                color: "danger",
            });
        } finally {
            setIsCancelling(false);
        }
    };

    // Get desk color based on status
    const getDeskColor = (desk: DeskWithStatus) => {
        // Priority: help_status > grading_status
        if (desk.status.help_status === "in_progress") {
            return "bg-amber-500 animate-pulse"; // กำลังช่วยเหลือ
        }
        if (desk.status.help_status === "waiting") {
            return "bg-amber-300"; // รอช่วยเหลือ
        }
        if (desk.status.grading_status === "in_progress") {
            return "bg-blue-500 animate-pulse"; // กำลังตรวจ
        }
        if (desk.status.grading_status === "waiting") {
            return "bg-blue-300"; // รอตรวจ
        }
        if (desk.status.grading_status === "completed") {
            return "bg-emerald-500"; // ตรวจเสร็จแล้ว
        }
        return "bg-slate-200"; // ยังไม่ได้ทำอะไร - เปลี่ยนเป็นสีอ่อน
    };

    // Get desk border based on type
    const getDeskBorder = (desk: DeskWithStatus) => {
        if (desk.type === "teacher") {
            return "border-4 border-purple-400";
        }
        if (desk.type === "computer") {
            return "border-2 border-cyan-400";
        }
        return "border border-slate-500";
    };

    // Get booking URL for QR code
    const getBookingUrl = () => {
        return `${FRONTEND_URL}/queue/book?pin=${data?.session.pin_code}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" color="primary" />
                    <p className="text-slate-600 mt-4">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Icon icon="solar:danger-triangle-bold" className="text-6xl text-red-400 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
                    <p className="text-slate-500 mb-4">{error || "ไม่สามารถโหลดข้อมูลได้"}</p>
                    <Button color="primary" onPress={() => fetchData()}>
                        ลองใหม่
                    </Button>
                </div>
            </div>
        );
    }

    if (data.session.status === "closed") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Icon 
                        icon="solar:stop-circle-bold" 
                        className="text-8xl text-rose-500 mb-4" 
                    />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">ปิดแล้ว</h2>
                    <p className="text-slate-500">การจองคิวถูกปิดแล้ว</p>
                </div>
            </div>
        );
    }

    // For active and paused status, show the room layout
    const isAcceptingQueue = data.session.status === "active";

    // Calculate canvas dimensions based on desk positions
    const desks = data.desks.filter(d => d.is_enabled);
    const maxX = Math.max(...desks.map(d => d.x || 0), 100);
    const maxY = Math.max(...desks.map(d => d.y || 0), 100);
    const canvasWidth = maxX + 100; // Add padding
    const canvasHeight = maxY + 100;

    return (
        <div ref={containerRef} className="min-h-screen bg-slate-100 p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{data.session.title}</h1>
                    <p className="text-slate-500">
                        {data.classroom.name} • {data.classroom.building}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Queue Status Toggle */}
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm ${
                        isAcceptingQueue 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-amber-50 border-amber-200"
                    }`}>
                        <div className="flex items-center gap-2">
                            <Icon 
                                icon={isAcceptingQueue ? "solar:play-circle-bold" : "solar:pause-circle-bold"} 
                                className={`text-xl ${isAcceptingQueue ? "text-emerald-600" : "text-amber-600"}`}
                            />
                            <span className={`font-medium ${isAcceptingQueue ? "text-emerald-700" : "text-amber-700"}`}>
                                {isAcceptingQueue ? "กำลังเปิดรับคิว" : "หยุดรับคิว"}
                            </span>
                        </div>
                        <Switch
                            isSelected={isAcceptingQueue}
                            onValueChange={handleToggleStatus}
                            isDisabled={isTogglingStatus}
                            size="lg"
                            color="success"
                        />
                    </div>

                    {/* Queue Stats */}
                    <div className="flex gap-3">
                        <Chip 
                            size="lg" 
                            color="primary" 
                            variant="flat"
                            classNames={{
                                base: "bg-blue-100 border border-blue-300",
                                content: "text-blue-700 font-bold",
                            }}
                            startContent={<Icon icon="solar:clipboard-check-bold"/>}
                        >
                            <p>รอตรวจ: {data.queueStats.grading_waiting}</p>
                        </Chip>
                        <Chip 
                            size="lg" 
                            color="warning" 
                            variant="flat"
                            classNames={{
                                base: "bg-amber-100 border border-amber-300",
                                content: "text-amber-700 font-bold",
                            }}
                            startContent={<Icon icon="solar:hand-shake-bold"/>}
                        >
                            รอช่วยเหลือ: {data.queueStats.help_waiting}
                        </Chip>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-sm">
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            className="bg-slate-100 text-slate-700 text-2xl"
                            onPress={() => setZoom((prev) => Math.max(prev - 0.1, 0.5))}
                        >
                            {/* <Icon icon="solar:minus-bold" /> */} -
                        </Button>
                        <span className="text-slate-700 text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            className="bg-slate-100 text-slate-700 text-2xl"
                            onPress={() => setZoom((prev) => Math.min(prev + 0.1, 2))}
                        >
                            {/* <Icon icon="solar:add-bold" /> */} +
                        </Button>
                    </div>

                    {/* Fullscreen */}
                    <Button
                        isIconOnly
                        size="lg"
                        variant="flat"
                        className="bg-white text-slate-700 border border-slate-200 shadow-sm"
                        onPress={toggleFullscreen}
                    >
                        <Icon icon={isFullscreen ? "solar:quit-full-screen-bold" : "solar:full-screen-bold"} className="text-xl" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex gap-4">
                {/* Room Layout */}
                <div className="flex-1 bg-white rounded-2xl p-4 overflow-auto border border-slate-200 shadow-sm">
                    <div 
                        className="relative"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: "top left",
                            width: canvasWidth,
                            height: canvasHeight,
                            minWidth: canvasWidth,
                            minHeight: canvasHeight,
                        }}
                    >
                        {/* Desks with absolute positioning */}
                        {desks.map((desk) => {
                            const isTeacher = desk.type === "teacher";
                            const hasActiveBooking = desk.status.grading_status === "waiting" || 
                                desk.status.grading_status === "in_progress" ||
                                desk.status.help_status === "waiting" ||
                                desk.status.help_status === "in_progress";
                            return (
                                <div
                                    key={desk.id}
                                    className={`
                                        absolute flex items-center justify-center rounded-lg
                                        ${getDeskColor(desk)} ${getDeskBorder(desk)}
                                        transition-all duration-300 
                                        ${hasActiveBooking ? "cursor-pointer hover:ring-2 hover:ring-red-400 hover:ring-offset-2" : "cursor-default"}
                                    `}
                                    style={{
                                        left: desk.x,
                                        top: desk.y,
                                        width: isTeacher ? 120 : 60,
                                        height: isTeacher ? 50 : 60,
                                    }}
                                    title={isTeacher ? `โต๊ะอาจารย์ ${desk.number}` : `โต๊ะ ${desk.number}${desk.label ? ` (${desk.label})` : ""}`}
                                    onClick={() => hasActiveBooking && handleDeskClick(desk)}
                                >
                                    <span className={`font-bold ${isTeacher ? "text-sm text-black" : "text-lg"} ${desk.status.grading_status === "not_started" && desk.status.help_status === "none" ? "text-slate-700" : "text-white"}`}>
                                        {isTeacher ? `อาจารย์ ${desk.number}` : desk.number}
                                    </span>

                                {/* Status indicators */}
                                <div className="absolute -top-1 -right-1 flex gap-0.5">
                                    {desk.status.grading_status === "completed" && (
                                        <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                                            <Icon icon="solar:check-bold" className="text-white text-xs" />
                                        </div>
                                    )}
                                    {desk.status.help_status !== "none" && (
                                        <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                                            <Icon icon="solar:hand-shake-bold" className="text-white text-xs" />
                                        </div>
                                    )}
                                </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Sidebar - QR Code & Legend */}
                <div className="w-72 flex flex-col gap-4">
                    {/* QR Code - Only show when active (not paused) */}
                    {isAcceptingQueue ? (
                        <div className="bg-white rounded-2xl p-6 text-center">
                            <div className="mb-3">
                                <QRCode
                                    value={getBookingUrl()}
                                    size={180}
                                    className="mx-auto"
                                />
                            </div>
                            <div className="bg-blue-100 rounded-xl px-4 py-2">
                                <span className="text-sm text-slate-600">PIN Code</span>
                               
                                <p className="text-4xl font-mono font-bold text-blue-700">{data.session.pin_code}</p>
                            </div>
                            <div>
                                <Divider className="my-3" />
                                <p className="font-mono text-slate-800">{`${process.env.NEXT_PUBLIC_FRONTEND_URL}/queue/book`}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 rounded-2xl p-6 text-center border border-amber-200">
                            <Icon icon="solar:pause-circle-bold" className="text-5xl text-amber-500 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-amber-700">หยุดรับคิวชั่วคราว</h3>
                            <p className="text-sm text-amber-600 mt-2">
                                นักศึกษาไม่สามารถจองคิวใหม่ได้ในขณะนี้
                            </p>
                            <p className="text-xs text-amber-500 mt-2">
                                คิวที่มีอยู่ยังดำเนินการต่อได้ตามปกติ
                            </p>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <h3 className="text-slate-800 font-semibold mb-3">สัญลักษณ์</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-slate-200 border border-slate-300" />
                                <span className="text-slate-600 text-sm">ยังไม่ได้ตรวจ</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-blue-300 border border-blue-400" />
                                <span className="text-slate-600 text-sm">รอตรวจงาน</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-blue-500 animate-pulse border border-blue-600" />
                                <span className="text-slate-600 text-sm">กำลังตรวจ</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-emerald-500 border border-emerald-600" />
                                <span className="text-slate-600 text-sm">ตรวจเสร็จแล้ว</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-amber-300 border border-amber-400" />
                                <span className="text-slate-600 text-sm">รอช่วยเหลือ</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-amber-500 animate-pulse border border-amber-600" />
                                <span className="text-slate-600 text-sm">กำลังช่วยเหลือ</span>
                            </div>
                        </div>

                        {/* Desk types */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <h4 className="text-slate-500 text-sm mb-2">ประเภทโต๊ะ</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-200 border-2 border-cyan-400" />
                                    <span className="text-slate-600 text-sm">คอมพิวเตอร์</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-200 border-4 border-purple-400" />
                                    <span className="text-slate-600 text-sm">โต๊ะอาจารย์</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Keyboard shortcuts */}
                    {/* <div className="bg-slate-800 rounded-2xl p-4">
                        <h3 className="text-white font-semibold mb-2">ทางลัด</h3>
                        <div className="text-xs text-slate-400 space-y-1">
                            <p><kbd className="px-1 bg-slate-700 rounded">+</kbd> ซูมเข้า</p>
                            <p><kbd className="px-1 bg-slate-700 rounded">-</kbd> ซูมออก</p>
                            <p><kbd className="px-1 bg-slate-700 rounded">0</kbd> รีเซ็ตซูม</p>
                            <p><kbd className="px-1 bg-slate-700 rounded">F</kbd> เต็มจอ</p>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* Desk Action Modal */}
            <Modal 
                isOpen={isDeskModalOpen} 
                onClose={() => {
                    setIsDeskModalOpen(false);
                    setSelectedDesk(null);
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Icon icon="solar:chair-bold" className="text-amber-600 text-xl" />
                        </div>
                        <span>โต๊ะหมายเลข {selectedDesk?.number}</span>
                    </ModalHeader>
                    <ModalBody>
                        {selectedDesk && (
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-slate-500">สถานะตรวจงาน:</span>
                                        <Chip 
                                            size="sm" 
                                            color={
                                                selectedDesk.status.grading_status === "in_progress" ? "primary" :
                                                selectedDesk.status.grading_status === "waiting" ? "warning" :
                                                selectedDesk.status.grading_status === "completed" ? "success" : "default"
                                            }
                                            variant="flat"
                                        >
                                            {selectedDesk.status.grading_status === "in_progress" ? "กำลังตรวจ" :
                                             selectedDesk.status.grading_status === "waiting" ? "รอตรวจ" :
                                             selectedDesk.status.grading_status === "completed" ? "เสร็จแล้ว" : "ยังไม่ได้ทำ"}
                                        </Chip>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">สถานะช่วยเหลือ:</span>
                                        <Chip 
                                            size="sm" 
                                            color={
                                                selectedDesk.status.help_status === "in_progress" ? "warning" :
                                                selectedDesk.status.help_status === "waiting" ? "secondary" : "default"
                                            }
                                            variant="flat"
                                        >
                                            {selectedDesk.status.help_status === "in_progress" ? "กำลังช่วยเหลือ" :
                                             selectedDesk.status.help_status === "waiting" ? "รอช่วยเหลือ" : "ไม่มี"}
                                        </Chip>
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div className="flex items-start gap-2 text-red-700">
                                        <Icon icon="solar:danger-triangle-bold" className="text-lg mt-0.5" />
                                        <div>
                                            <p className="font-medium">ยกเลิกการจองโต๊ะนี้</p>
                                            <p className="text-sm text-red-600">
                                                การยกเลิกจะล้างค่าโต๊ะนี้และให้นักศึกษาจองใหม่ได้
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button 
                            variant="light" 
                            onPress={() => {
                                setIsDeskModalOpen(false);
                                setSelectedDesk(null);
                            }}
                        >
                            ปิด
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={handleCancelDeskBooking}
                            isLoading={isCancelling}
                            className="bg-red-500"
                        >
                            ยกเลิกการจอง
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
