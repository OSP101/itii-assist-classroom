"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { Card, CardBody } from "@heroui/card";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { authService } from "@/services";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("กำลังเข้าสู่ระบบ...");

    useEffect(() => {
        const handleCallback = async () => {
            const accessToken = searchParams.get("accessToken");
            const refreshToken = searchParams.get("refreshToken");
            const error = searchParams.get("error");
            const twoFactor = searchParams.get("twoFactor");
            const linked = searchParams.get("linked"); // OAuth linking action

            // Handle error from backend
            if (error) {
                setStatus("error");
                setMessage(decodeURIComponent(error));
                addToast({
                    title: "เข้าสู่ระบบไม่สำเร็จ",
                    description: decodeURIComponent(error),
                    color: "danger",
                });
                // If it was a link action, go back to profile
                const returnUrl = sessionStorage.getItem("oauth_return_url");
                sessionStorage.removeItem("oauth_return_url");
                setTimeout(() => router.push(returnUrl || "/login"), 3000);
                return;
            }

            // Handle 2FA required
            if (twoFactor) {
                try {
                    const twoFactorData = JSON.parse(decodeURIComponent(twoFactor));
                    sessionStorage.setItem("twoFactorData", JSON.stringify(twoFactorData));
                    router.push("/auth/verify-2fa");
                    return;
                } catch {
                    setStatus("error");
                    setMessage("ข้อมูลการยืนยันตัวตนไม่ถูกต้อง");
                    setTimeout(() => router.push("/login"), 3000);
                    return;
                }
            }

            // Check if tokens are present
            if (!accessToken || !refreshToken) {
                setStatus("error");
                setMessage("ไม่พบข้อมูลการเข้าสู่ระบบ");
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
                    color: "danger",
                });
                setTimeout(() => router.push("/login"), 3000);
                return;
            }

            try {
                // Store tokens
                authService.setTokens(accessToken, refreshToken);

                // Fetch user info
                const userResult = await authService.getMe();

                if (userResult.success && userResult.user) {
                    // Check if this was a link action
                    if (linked) {
                        const providerName = linked === 'github' ? 'GitHub' : linked === 'google' ? 'Google' : linked;
                        setStatus("success");
                        setMessage(`เชื่อมต่อ ${providerName} สำเร็จ`);

                        addToast({
                            title: "เชื่อมต่อสำเร็จ",
                            description: `เชื่อมต่อบัญชี ${providerName} เรียบร้อยแล้ว`,
                            color: "success",
                        });

                        // Get return URL from sessionStorage or default to profile page
                        const returnUrl = sessionStorage.getItem("oauth_return_url");
                        sessionStorage.removeItem("oauth_return_url");
                        
                        setTimeout(() => {
                            if (returnUrl) {
                                // Extract path from URL
                                try {
                                    const url = new URL(returnUrl);
                                    router.push(url.pathname);
                                } catch {
                                    router.push("/admin/profile");
                                }
                            } else {
                                router.push("/admin/profile");
                            }
                        }, 1500);
                        return;
                    }
                    
                    setStatus("success");
                    setMessage(`ยินดีต้อนรับ ${userResult.user.full_name}`);

                    addToast({
                        title: "เข้าสู่ระบบสำเร็จ",
                        description: `ยินดีต้อนรับ ${userResult.user.full_name}`,
                        color: "success",
                    });

                    // Redirect based on role
                    setTimeout(() => {
                        switch (userResult.user?.role) {
                            case "admin":
                                router.push("/admin/dashboard");
                                break;
                            case "instructor":
                            case "ta":
                                router.push("/home");
                                break;
                            default:
                                router.push("/");
                        }
                    }, 1500);
                } else {
                    throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
                }
            } catch (error) {
                setStatus("error");
                setMessage("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
                    color: "danger",
                });
                // Clear any stored tokens
                authService.clearTokens();
                setTimeout(() => router.push("/login"), 3000);
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="flex flex-col items-center gap-6">
            {status === "loading" && (
                <>
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                        <Spinner size="lg" color="primary" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            กำลังเข้าสู่ระบบ
                        </h2>
                        <p className="text-slate-500">
                            กรุณารอสักครู่...
                        </p>
                    </div>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                        <Icon
                            icon="solar:check-circle-bold"
                            className="text-5xl text-green-500"
                        />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            เข้าสู่ระบบสำเร็จ
                        </h2>
                        <p className="text-slate-500">{message}</p>
                        <p className="text-sm text-slate-400 mt-2">
                            กำลังนำคุณไปยังหน้าหลัก...
                        </p>
                    </div>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                        <Icon
                            icon="solar:close-circle-bold"
                            className="text-5xl text-red-500"
                        />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            เข้าสู่ระบบไม่สำเร็จ
                        </h2>
                        <p className="text-slate-500">{message}</p>
                        <p className="text-sm text-slate-400 mt-2">
                            กำลังนำคุณกลับไปหน้าเข้าสู่ระบบ...
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md shadow-2xl border border-blue-100">
                <CardBody className="p-8">
                    <Suspense
                        fallback={
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Spinner size="lg" color="primary" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                                        กำลังโหลด...
                                    </h2>
                                </div>
                            </div>
                        }
                    >
                        <AuthCallbackContent />
                    </Suspense>
                </CardBody>
            </Card>
        </div>
    );
}
