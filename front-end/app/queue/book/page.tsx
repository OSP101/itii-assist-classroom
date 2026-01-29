"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { RadioGroup, Radio } from "@heroui/radio";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import { io, Socket } from "socket.io-client";

import { API_BASE_URL } from "@/config/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface VerifyPINResponse {
    session_id: number;
    title: string;
    course: {
        id: string;
        code: string;
        name: string;
    };
    classroom: {
        id: number;
        name: string;
        building: string;
    };
    require_attendance: boolean;
}

interface BookingResult {
    id: number;
    queue_number: number;
    session_title: string;
    booking_type: string;
    desk_number: string;
    status: string;
}

interface BookingStatus {
    id: number;
    queue_number: number;
    booking_type: string;
    desk_number: string;
    status: string;
    position_in_queue: number;
    assignedWorker?: {
        id: number;
        full_name: string;
    };
    queueSession?: {
        id: number;
        title: string;
        status: string;
    };
}

function BookQueueContent() {
    const searchParams = useSearchParams();
    const initialPin = searchParams.get("pin") || "";

    // Step states
    const [step, setStep] = useState<"pin" | "form" | "status">("pin");

    // PIN verification
    const [pinCode, setPinCode] = useState(initialPin);
    const [sessionInfo, setSessionInfo] = useState<VerifyPINResponse | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Booking form
    const [studentId, setStudentId] = useState("");
    const [deskNumber, setDeskNumber] = useState("");
    const [bookingType, setBookingType] = useState<"grading" | "help">("grading");
    const [note, setNote] = useState("");
    const [isBooking, setIsBooking] = useState(false);

    // Booking status
    const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
    const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    // Socket and polling refs
    const socketRef = useRef<Socket | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentBookingIdRef = useRef<number | null>(null);

    // Auto verify if PIN is in URL
    useEffect(() => {
        if (initialPin) {
            handleVerifyPIN();
        }
    }, [initialPin]);

    // Verify PIN
    const handleVerifyPIN = async () => {
        if (!pinCode.trim()) {
            addToast({
                title: "กรุณากรอก PIN",
                description: "กรุณากรอก PIN Code",
                color: "warning",
            });
            return;
        }

        setIsVerifying(true);
        try {
            const response = await fetch(`${API_BASE_URL}/queue/verify-pin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin_code: pinCode }),
            });

            const result = await response.json();

            if (result.success) {
                setSessionInfo(result.data);
                setStep("form");
            } else {
                addToast({
                    title: "PIN ไม่ถูกต้อง",
                    description: result.error?.message || "ไม่พบการจองคิวที่เปิดอยู่",
                    color: "danger",
                });
            }
        } catch (error) {
            console.error("Error verifying PIN:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถตรวจสอบ PIN ได้",
                color: "danger",
            });
        } finally {
            setIsVerifying(false);
        }
    };

    // Create booking
    const handleCreateBooking = async () => {
        if (!studentId.trim()) {
            addToast({
                title: "กรุณากรอกรหัสนักศึกษา",
                color: "warning",
            });
            return;
        }

        if (!deskNumber.trim()) {
            addToast({
                title: "กรุณากรอกเลขโต๊ะ",
                color: "warning",
            });
            return;
        }

        setIsBooking(true);
        try {
            const response = await fetch(`${API_BASE_URL}/queue/bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pin_code: pinCode,
                    student_id: studentId,
                    desk_number: deskNumber,
                    booking_type: bookingType,
                    note: note || undefined,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setBookingResult(result.data);
                setStep("status");
                addToast({
                    title: "จองคิวสำเร็จ!",
                    description: `คิวที่ ${result.data.queue_number}`,
                    color: "success",
                });

                // Start polling status with session ID for real-time position updates
                startStatusPolling(result.data.id, sessionInfo?.session_id);
            } else {
                addToast({
                    title: "จองคิวไม่สำเร็จ",
                    description: result.error?.message || "เกิดข้อผิดพลาด",
                    color: "danger",
                });
            }
        } catch (error) {
            console.error("Error creating booking:", error);
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถจองคิวได้",
                color: "danger",
            });
        } finally {
            setIsBooking(false);
        }
    };

    // Fetch booking status
    const fetchBookingStatus = useCallback(async (bookingId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/queue/bookings/${bookingId}/status`);
            const result = await response.json();

            if (result.success) {
                setBookingStatus(result.data);
            }
        } catch (error) {
            console.error("Error fetching status:", error);
        }
    }, []);

    // Cleanup previous polling/socket
    const cleanupPolling = useCallback(() => {
        if (socketRef.current) {
            if (currentBookingIdRef.current) {
                socketRef.current.emit("leave-booking", currentBookingIdRef.current);
            }
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Start status polling and socket connection
    const startStatusPolling = useCallback((bookingId: number, sessionId?: number) => {
        // Cleanup any existing connections first
        cleanupPolling();
        
        // Set current booking ID
        currentBookingIdRef.current = bookingId;
        
        // Reset booking status for new booking
        setBookingStatus(null);
        
        // Initial fetch
        fetchBookingStatus(bookingId);

        // Connect to socket for real-time updates
        const socket = io(SOCKET_URL, {
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            console.log("Socket connected");
            socket.emit("join-booking", bookingId);
            // Also join queue session room to receive position updates
            if (sessionId) {
                socket.emit("join-queue", sessionId);
            }
        });

        socket.on("your-booking-completed", () => {
            fetchBookingStatus(bookingId);
            addToast({
                title: "ตรวจเสร็จแล้ว!",
                description: "คิวของคุณเสร็จสิ้นแล้ว",
                color: "success",
            });
        });

        socket.on("booking-assigned", () => {
            fetchBookingStatus(bookingId);
        });

        // Listen for queue position updates (when other bookings complete)
        socket.on("queue-position-updated", () => {
            // Re-fetch status to get updated position
            fetchBookingStatus(bookingId);
        });

        socketRef.current = socket;

        // Also poll every 10 seconds as backup
        intervalRef.current = setInterval(() => {
            fetchBookingStatus(bookingId);
        }, 10000);

        return () => {
            cleanupPolling();
        };
    }, [fetchBookingStatus, cleanupPolling]);

    // Cleanup socket and interval on unmount
    useEffect(() => {
        return () => {
            cleanupPolling();
        };
    }, [cleanupPolling]);

    // Get status display
    const getStatusDisplay = (status: string) => {
        const statusMap: Record<string, { label: string; color: "default" | "primary" | "secondary" | "success" | "warning" | "danger"; icon: string }> = {
            waiting: { label: "รอคิว", color: "primary", icon: "solar:hourglass-bold" },
            in_progress: { label: "กำลังตรวจ", color: "warning", icon: "solar:clipboard-check-bold" },
            completed: { label: "เสร็จสิ้น", color: "success", icon: "solar:check-circle-bold" },
            cancelled: { label: "ยกเลิก", color: "danger", icon: "solar:close-circle-bold" },
            no_show: { label: "ไม่พบ", color: "default", icon: "solar:user-cross-bold" },
        };
        return statusMap[status] || { label: status, color: "default", icon: "solar:question-circle-bold" };
    };

    // Render PIN step
    if (step === "pin") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl border-0">
                    <CardHeader className="flex flex-col items-center pt-8 pb-2">
                        <div className="p-4 rounded-full bg-blue-100 mb-4">
                            <Icon icon="solar:ticket-bold" className="text-4xl text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">จองคิวตรวจงาน</h1>
                        <p className="text-slate-500 text-center mt-2">
                            กรอก PIN Code เพื่อเริ่มจองคิว
                        </p>
                    </CardHeader>
                    <CardBody className="px-8 pb-8">
                        <div className="space-y-4">
                            <Input
                                label="PIN Code"
                                placeholder="กรอก PIN 6 หลัก"
                                value={pinCode}
                                onValueChange={setPinCode}
                                size="lg"
                                variant="bordered"
                                classNames={{
                                    input: "text-center text-2xl font-mono tracking-widest",
                                }}
                                maxLength={6}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleVerifyPIN();
                                    }
                                }}
                            />
                            <Button
                                color="primary"
                                size="lg"
                                className="w-full"
                                onPress={handleVerifyPIN}
                                isLoading={isVerifying}
                            >
                                ยืนยัน PIN
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Render form step
    if (step === "form" && sessionInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl border-0">
                    <CardHeader className="flex flex-col items-center pt-6 pb-2 border-b border-slate-100">
                        <Chip color="primary" variant="flat" size="sm" className="mb-2">
                            {sessionInfo.course.code}
                        </Chip>
                        <h1 className="text-xl font-bold text-slate-800 text-center">
                            {sessionInfo.title}
                        </h1>
                        <p className="text-sm text-slate-500">
                            ห้อง {sessionInfo.classroom.name} • {sessionInfo.classroom.building}
                        </p>
                    </CardHeader>
                    <CardBody className="px-6 pb-6">
                        <div className="space-y-4">
                            <Input
                                label="รหัสนักศึกษา"
                                placeholder="เช่น 65010000"
                                value={studentId}
                                onValueChange={setStudentId}
                                variant="bordered"
                                isRequired
                                startContent={<Icon icon="solar:user-id-bold" className="text-slate-400" />}
                            />

                            <Input
                                label="เลขโต๊ะ"
                                placeholder="เช่น 1, 2, 3..."
                                value={deskNumber}
                                onValueChange={setDeskNumber}
                                variant="bordered"
                                isRequired
                                startContent={<Icon icon="solar:chair-bold" className="text-slate-400" />}
                            />

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ประเภทการจอง</label>
                                <RadioGroup
                                    value={bookingType}
                                    onValueChange={(value) => setBookingType(value as "grading" | "help")}
                                    orientation="horizontal"
                                    classNames={{
                                        wrapper: "gap-4",
                                    }}
                                >
                                    <Radio value="grading" classNames={{ label: "text-sm" }}>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:clipboard-check-bold" className="text-emerald-500" />
                                            <span>ตรวจงาน</span>
                                        </div>
                                    </Radio>
                                    <Radio value="help" classNames={{ label: "text-sm" }}>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:hand-shake-bold" className="text-amber-500" />
                                            <span>ขอความช่วยเหลือ</span>
                                        </div>
                                    </Radio>
                                </RadioGroup>
                            </div>

                            <Textarea
                                label="หมายเหตุ (ถ้ามี)"
                                placeholder="รายละเอียดเพิ่มเติม..."
                                value={note}
                                onValueChange={setNote}
                                variant="bordered"
                                minRows={2}
                            />

                            {sessionInfo.require_attendance && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Icon icon="solar:info-circle-bold" />
                                        <span className="text-sm">ต้องเช็คชื่อก่อนจึงจะจองคิวได้</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="flat"
                                    size="lg"
                                    className="flex-1"
                                    onPress={() => setStep("pin")}
                                >
                                    กลับ
                                </Button>
                                <Button
                                    color="primary"
                                    size="lg"
                                    className="flex-1"
                                    onPress={handleCreateBooking}
                                    isLoading={isBooking}
                                >
                                    จองคิว
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Render status step
    if (step === "status" && bookingResult) {
        const status = bookingStatus || bookingResult;
        const statusDisplay = getStatusDisplay(status.status);
        const isCompleted = status.status === "completed";
        const isWaiting = status.status === "waiting";

        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl border-0">
                    <CardBody className="p-8">
                        <div className="text-center">
                            {/* Status Icon */}
                            <div className={`
                                inline-flex items-center justify-center w-24 h-24 rounded-full mb-6
                                ${isCompleted 
                                    ? "bg-emerald-100" 
                                    : isWaiting 
                                    ? "bg-blue-100" 
                                    : "bg-amber-100"
                                }
                            `}>
                                {isWaiting ? (
                                    <Spinner size="lg" color="primary" />
                                ) : (
                                    <Icon 
                                        icon={statusDisplay.icon} 
                                        className={`text-5xl ${
                                            isCompleted 
                                                ? "text-emerald-600" 
                                                : "text-amber-600"
                                        }`} 
                                    />
                                )}
                            </div>

                            {/* Status Chip */}
                            <Chip 
                                size="lg" 
                                color={statusDisplay.color} 
                                variant="flat"
                                className="mb-4"
                            >
                                {statusDisplay.label}
                            </Chip>

                            {/* Queue Number */}
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 mb-1">หมายเลขคิว</p>
                                <p className="text-5xl font-bold text-slate-800">
                                    {status.queue_number}
                                </p>
                            </div>

                            {/* Details */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-left">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">โต๊ะ</span>
                                    <span className="font-semibold text-slate-800">{status.desk_number}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">ประเภท</span>
                                    <Chip 
                                        size="sm" 
                                        color={status.booking_type === "grading" ? "success" : "warning"}
                                        variant="flat"
                                    >
                                        {status.booking_type === "grading" ? "ตรวจงาน" : "ช่วยเหลือ"}
                                    </Chip>
                                </div>
                                {bookingStatus && isWaiting && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">ตำแหน่งในคิว</span>
                                        <span className="font-semibold text-blue-600">
                                            {bookingStatus.position_in_queue} คน ข้างหน้า
                                        </span>
                                    </div>
                                )}
                                {bookingStatus?.assignedWorker && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">ผู้ตรวจ</span>
                                        <span className="font-semibold text-slate-800">
                                            {bookingStatus.assignedWorker.full_name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            {isWaiting && (
                                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                                    <p className="text-blue-700 text-sm">
                                        <Icon icon="solar:info-circle-bold" className="inline mr-1" />
                                        กรุณารออยู่ที่โต๊ะ {status.desk_number} ของคุณ
                                        <br />ระบบจะแจ้งเตือนเมื่อถึงคิว
                                    </p>
                                </div>
                            )}

                            {isCompleted && (
                                <div className="mt-6">
                                    <Button
                                        color="primary"
                                        size="lg"
                                        className="w-full"
                                        onPress={() => {
                                            // Cleanup polling/socket before resetting
                                            cleanupPolling();
                                            currentBookingIdRef.current = null;
                                            
                                            setStep("pin");
                                            setPinCode("");
                                            setStudentId("");
                                            setDeskNumber("");
                                            setNote("");
                                            setBookingResult(null);
                                            setBookingStatus(null);
                                            setSessionInfo(null);
                                        }}
                                    >
                                        จองคิวใหม่
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return null;
}

export default function BookQueuePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" color="primary" />
            </div>
        }>
            <BookQueueContent />
        </Suspense>
    );
}
