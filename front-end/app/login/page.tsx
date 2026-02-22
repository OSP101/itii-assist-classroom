"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Link } from "@heroui/link";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Icon } from "@iconify/react";
import { IoSchool } from "react-icons/io5";
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { addToast } from "@heroui/toast";
import { authService } from "@/services";

// Dynamic import Turnstile - completely skip SSR
const Turnstile = dynamic(
    () => import('@marsidev/react-turnstile').then(mod => mod.Turnstile),
    { ssr: false }
);

export default function LoginPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [canSubmit, setCanSubmit] = useState(true);
    const [turnstileKey, setTurnstileKey] = useState<string | null>(null);
    const [turnstileReady, setTurnstileReady] = useState(false);
    const refTurnstile = useRef<TurnstileInstance>(null);

    // Force change password modal state
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [pendingUser, setPendingUser] = useState<{ username: string; role: string } | null>(null);

    // Forgot password modal state
    const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);

    // Password validation helpers - memoized
    const passwordValidation = useMemo(() => ({
        minLength: newPassword.length >= 8,
        hasLowercase: /[a-z]/.test(newPassword),
        hasUppercase: /[A-Z]/.test(newPassword),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    }), [newPassword]);
    
    const isPasswordValid = useMemo(() => 
        passwordValidation.minLength && 
        passwordValidation.hasLowercase && 
        passwordValidation.hasUppercase && 
        passwordValidation.hasSpecialChar
    , [passwordValidation]);

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const result = await authService.getMe();
                if (result.success && result.user) {
                    // User is already logged in, redirect based on role
                    switch (result.user.role) {
                        case 'admin':
                            router.replace('/admin/dashboard');
                            break;
                        case 'instructor':
                        case 'ta':
                            router.replace('/home');
                            break;
                        default:
                            router.replace('/');
                    }
                    return; // Don't set isCheckingAuth to false, we're redirecting
                }
            } catch (error) {
                // Not logged in, stay on login page
            }
            setIsCheckingAuth(false);
        };
        checkAuth();
    }, [router]);

    // Get Turnstile key only on client side to avoid hydration mismatch
    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_CLOUD;
        if (key) {
            setTurnstileKey(key);
        } else {
            // No Turnstile key, allow submit
            setTurnstileReady(true);
        }
    }, []);


    const toggleVisibility = () => setIsVisible(!isVisible);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
                color: "warning",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await authService.login({
                username: formData.username,
                password: formData.password,
            });

            if (result.success) {
                // Check if 2FA is required - redirect to verification page
                if (result.requiresTwoFactor && result.twoFactorData) {
                    // Store 2FA data in sessionStorage and redirect
                    sessionStorage.setItem("twoFactorData", JSON.stringify(result.twoFactorData));
                    router.push("/auth/verify-2fa");
                    setIsLoading(false);
                    return;
                }

                if (result.user) {
                    // Check if user must change password
                    if (result.mustChangePassword) {
                        setPendingUser({ username: result.user.username, role: result.user.role });
                        setIsChangePasswordModalOpen(true);
                        setIsLoading(false);
                        return;
                    }

                    addToast({
                        title: "เข้าสู่ระบบสำเร็จ",
                        description: `ยินดีต้อนรับ ${formData.username}`,
                        color: "success",
                        timeout: 3000,
                shouldShowTimeoutProgress: true,
                    });

                    // Redirect based on role
                    switch (result.user.role) {
                        case 'admin':
                            router.push('/admin/dashboard');
                            break;
                        case 'instructor':
                            router.push('/home');
                            break;
                        case 'ta':
                            router.push('/home');
                            break;
                        default:
                            router.push('/');
                    }
                }
            } else {
                // Handle error - might be string or object
                let errorMessage = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
                if (typeof result.error === 'string') {
                    errorMessage = result.error;
                } else if (result.error && typeof result.error === 'object') {
                    errorMessage = (result.error as { message?: string }).message || errorMessage;
                }

                addToast({
                    title: "เข้าสู่ระบบไม่สำเร็จ",
                    description: errorMessage,
                    color: "danger",
                    timeout: 3000,
                shouldShowTimeoutProgress: true,
                });
                refTurnstile.current?.reset();
            }
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
                color: "danger",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            refTurnstile.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };

    const handleForceChangePassword = async () => {
        if (!isPasswordValid) {
            addToast({
                title: "รหัสผ่านไม่ผ่านเงื่อนไข",
                description: "กรุณาตรวจสอบเงื่อนไขรหัสผ่าน",
                color: "warning",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast({
                title: "รหัสผ่านไม่ตรงกัน",
                description: "กรุณากรอกรหัสผ่านให้ตรงกันทั้ง 2 ช่อง",
                color: "warning",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        setIsChangingPassword(true);
        try {
            const result = await authService.forceChangePassword(newPassword);
            if (result.success) {
                addToast({
                    title: "เปลี่ยนรหัสผ่านสำเร็จ",
                    description: "กรุณาเข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่",
                    color: "success",
                    timeout: 3000,
                shouldShowTimeoutProgress: true,
                });
                setIsChangePasswordModalOpen(false);
                setNewPassword("");
                setConfirmPassword("");
                setPendingUser(null);
                setFormData({ username: formData.username, password: "" });
            } else {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: result.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้",
                    color: "danger",
                    timeout: 3000,
                shouldShowTimeoutProgress: true,
                });
            }
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
                color: "danger",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleGoogleLogin = () => {
        // Redirect to Google OAuth
        window.location.href = authService.getGoogleAuthUrl();
    };

    const handleGitHubLogin = () => {
        // Redirect to GitHub OAuth
        window.location.href = authService.getGitHubAuthUrl();
    };

    const handleForgotPassword = async () => {
        if (!forgotPasswordEmail) {
            addToast({
                title: "กรุณากรอกอีเมล",
                description: "กรุณากรอกอีเมลของคุณ",
                color: "warning",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forgotPasswordEmail)) {
            addToast({
                title: "รูปแบบอีเมลไม่ถูกต้อง",
                description: "กรุณากรอกอีเมลให้ถูกต้อง",
                color: "warning",
                timeout: 3000,
                shouldShowTimeoutProgress: true,
            });
            return;
        }

        setIsSendingResetEmail(true);
        try {
            const result = await authService.forgotPassword(forgotPasswordEmail);
            // Always show success (for security - don't reveal if email exists)
            setResetEmailSent(true);
        } catch (error) {
            // Still show success for security
            setResetEmailSent(true);
        } finally {
            setIsSendingResetEmail(false);
        }
    };

    const closeForgotPasswordModal = () => {
        setIsForgotPasswordModalOpen(false);
        setForgotPasswordEmail("");
        setResetEmailSent(false);
    };

    // Show loading while checking auth
    if (isCheckingAuth) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-15 h-15 bg-gradient-to-br from-blue-400 to-indigo-500 rounded flex items-center justify-center text-white text-4xl">
                        <IoSchool />
                    </div>
                    <Spinner size="lg" color="primary" />
                    {/* <p className="text-slate-500 text-sm">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p> */}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 p-3 sm:p-4">
            <div className="flex-1 flex items-center justify-center">
                <Card className="w-full max-w-[1024px] overflow-hidden shadow-2xl border border-blue-100">
                    <CardBody className="p-0">
                        <div className="flex flex-col md:flex-row">
                            <div className="relative hidden w-full md:flex md:w-1/2 min-h-[600px]">
                                <div
                                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                    style={{ backgroundImage: `url('/images/cp-image-login.jpg')` }}
                                    aria-hidden="true"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-8 text-white z-10">
                                    <p className="text-3xl font-bold leading-tight mb-2 tracking-tight">
                                        ITII Assist classroom.
                                    </p>
                                    <p className="text-white/90 text-sm font-light max-w-sm">
                                        ระบบจัดการรายวิชา เช็คชื่อ เก็บคะแนน และจองคิวตรวจงาน
                                        สำหรับอาจารย์ TA และนักศึกษา
                                    </p>
                                </div>
                            </div>

                            <div className="w-full md:w-1/2 p-5 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white">

                                <div className="flex flex-col gap-1 sm:gap-2 mb-6 sm:mb-8">
                                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-slate-800">
                                        ยินดีต้อนรับ
                                    </h1>
                                    <p className="text-slate-500 text-sm sm:text-base">
                                        ITII Assist classroom website.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
                                    <Input
                                        label="ชื่อผู้ใช้"
                                        labelPlacement="outside"
                                        placeholder="กรอกชื่อผู้ใช้"
                                        type="text"
                                        variant="bordered"
                                        size="md"
                                        value={formData.username}
                                        onChange={(e) =>
                                            setFormData({ ...formData, username: e.target.value })
                                        }
                                        startContent={
                                            <Icon
                                                icon="solar:user-linear"
                                                className="text-blue-400 text-lg sm:text-xl"
                                            />
                                        }
                                        classNames={{
                                            inputWrapper: "h-11 sm:h-12 border-blue-200 hover:border-blue-300 focus-within:!border-blue-400",
                                            label: "text-slate-600 text-sm",
                                        }}
                                    />

                                    <Input
                                        label="รหัสผ่าน"
                                        labelPlacement="outside"
                                        placeholder="กรอกรหัสผ่าน"
                                        variant="bordered"
                                        size="md"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        startContent={
                                            <Icon
                                                icon="solar:lock-password-linear"
                                                className="text-blue-400 text-lg sm:text-xl"
                                            />
                                        }
                                        endContent={
                                            <button
                                                className="focus:outline-none"
                                                type="button"
                                                onClick={toggleVisibility}
                                            >
                                                <Icon
                                                    icon={isVisible ? "solar:eye-linear" : "solar:eye-closed-linear"}
                                                    className="text-blue-400 text-lg sm:text-xl hover:text-blue-500 transition-colors"
                                                />
                                            </button>
                                        }
                                        type={isVisible ? "text" : "password"}
                                        classNames={{
                                            inputWrapper: "h-11 sm:h-12 border-blue-200 hover:border-blue-300 focus-within:!border-blue-400",
                                            label: "text-slate-600 text-sm",
                                        }}
                                    />

                                    <div className="flex justify-end">
                                        <button 
                                            type="button"
                                            onClick={() => setIsForgotPasswordModalOpen(true)}
                                            className="text-blue-400 hover:text-blue-500 text-sm hover:underline transition-colors cursor-pointer"
                                        >
                                            ลืมรหัสผ่าน?
                                        </button>
                                    </div>

                                    {/* Turnstile - Only render on client after key is loaded */}
                                    <div className="w-full mt-2" suppressHydrationWarning>
                                    {turnstileKey ? (
                                        <Turnstile
                                            id='turnstile-1'
                                            ref={refTurnstile}
                                            siteKey={turnstileKey}
                                            onSuccess={() => {
                                                setCanSubmit(false);
                                                setTurnstileReady(true);
                                            }}
                                            onError={() => {
                                                setCanSubmit(true);
                                                setTurnstileReady(true);
                                            }}
                                            onExpire={() => {
                                                setCanSubmit(true);
                                            }}
                                            onWidgetLoad={() => {
                                                setTurnstileReady(true);
                                            }}
                                            options={{
                                                theme: 'auto',
                                                size: 'flexible',
                                            }}
                                        />
                                    ) : !turnstileReady ? (
                                        <Skeleton className="w-full h-[65px] rounded-lg" />
                                    ) : null}
                                </div>

                                    <Button
                                        type="submit"
                                        size="md"
                                        className="w-full font-medium mt-2 h-11 sm:h-12 bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-300/50 hover:shadow-blue-400/60"
                                        isLoading={isLoading}
                                        // isDisabled={canSubmit || !turnstileReady || isLoading}
                                    >
                                        เข้าสู่ระบบ
                                    </Button>
                                </form>

                                {/* Divider */}
                                <div className="relative flex py-4 sm:py-6 items-center">
                                    <div className="flex-grow border-t border-blue-100"></div>
                                </div>

                                {/* Google Login */}
                                <Button
                                    variant="bordered"
                                    size="md"
                                    className="w-full h-11 sm:h-12 font-medium border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 text-sm"
                                    onPress={handleGoogleLogin}
                                    startContent={
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                    }
                                >
                                    เข้าสู่ระบบด้วย Google
                                </Button>

                                {/* GitHub Login */}
                                <Button
                                    variant="bordered"
                                    size="md"
                                    className="w-full h-11 sm:h-12 font-medium border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 text-sm mt-3"
                                    onPress={handleGitHubLogin}
                                    startContent={
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                    }
                                >
                                    เข้าสู่ระบบด้วย GitHub
                                </Button>

                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <div className="mt-2 pb-2 text-center text-slate-400 text-xs sm:text-sm px-4 font-light">
                © 2025 ITII Assist classroom. All Rights Reserved. made with by <Link href="https://github.com/OSP101" target="_blank" className="text-xs sm:text-sm text-slate-400">OSP101</Link>
            </div>

            {/* Force Change Password Modal */}
            <Modal
                isOpen={isChangePasswordModalOpen}
                onClose={() => { }}
                isDismissable={false}
                isKeyboardDismissDisabled={true}
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-amber-500/30">
                                <Icon icon="solar:key-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <div className="space-y-4">
                            {/* Info Box */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Icon icon="solar:info-circle-bold" className="text-blue-500 text-xl mt-0.5" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-semibold">ยินดีต้อนรับ {pendingUser?.username}!</p>
                                        <p className="mt-1">นี่คือการเข้าสู่ระบบครั้งแรกของคุณ กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* New Password */}
                                <Input
                                    label="รหัสผ่านใหม่"
                                    labelPlacement="outside"
                                    placeholder="กรอกรหัสผ่านใหม่"
                                    variant="bordered"
                                    size="md"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onValueChange={setNewPassword}
                                    startContent={<Icon icon="solar:lock-password-linear" className="text-blue-400 text-xl" />}
                                    endContent={
                                        <button
                                            className="focus:outline-none"
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            <Icon
                                                icon={showNewPassword ? "solar:eye-linear" : "solar:eye-closed-linear"}
                                                className="text-blue-400 text-xl hover:text-blue-500 transition-colors"
                                            />
                                        </button>
                                    }
                                    classNames={{
                                        inputWrapper: "border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                        label: "text-slate-600 font-medium text-sm",
                                    }}
                                />

                                {/* Confirm Password */}
                                <Input
                                    label="ยืนยันรหัสผ่าน"
                                    labelPlacement="outside"
                                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                    variant="bordered"
                                    size="md"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onValueChange={setConfirmPassword}
                                    startContent={<Icon icon="solar:lock-password-linear" className="text-blue-400 text-xl" />}
                                    endContent={
                                        <button
                                            className="focus:outline-none"
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            <Icon
                                                icon={showConfirmPassword ? "solar:eye-linear" : "solar:eye-closed-linear"}
                                                className="text-blue-400 text-xl hover:text-blue-500 transition-colors"
                                            />
                                        </button>
                                    }
                                    classNames={{
                                        inputWrapper: "border-slate-200 hover:border-blue-300 focus-within:!border-blue-400",
                                        label: "text-slate-600 font-medium text-sm",
                                    }}
                                    isInvalid={confirmPassword !== "" && newPassword !== confirmPassword}
                                    errorMessage={confirmPassword !== "" && newPassword !== confirmPassword ? "รหัสผ่านไม่ตรงกัน" : ""}
                                />
                            </div>

                            {/* Password Requirements */}
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-medium text-slate-600 mb-2">ข้อกำหนดรหัสผ่าน:</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Icon 
                                            icon={passwordValidation.minLength ? "solar:check-circle-bold" : "solar:close-circle-linear"} 
                                            className={passwordValidation.minLength ? "text-green-500" : "text-slate-400"} 
                                        />
                                        <span className={`text-xs ${passwordValidation.minLength ? "text-green-600" : "text-slate-500"}`}>
                                            อย่างน้อย 8 ตัวอักษร
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon 
                                            icon={passwordValidation.hasLowercase ? "solar:check-circle-bold" : "solar:close-circle-linear"} 
                                            className={passwordValidation.hasLowercase ? "text-green-500" : "text-slate-400"} 
                                        />
                                        <span className={`text-xs ${passwordValidation.hasLowercase ? "text-green-600" : "text-slate-500"}`}>
                                            มีตัวอักษรพิมพ์เล็ก (a-z)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon 
                                            icon={passwordValidation.hasUppercase ? "solar:check-circle-bold" : "solar:close-circle-linear"} 
                                            className={passwordValidation.hasUppercase ? "text-green-500" : "text-slate-400"} 
                                        />
                                        <span className={`text-xs ${passwordValidation.hasUppercase ? "text-green-600" : "text-slate-500"}`}>
                                            มีตัวอักษรพิมพ์ใหญ่ (A-Z)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon 
                                            icon={passwordValidation.hasSpecialChar ? "solar:check-circle-bold" : "solar:close-circle-linear"} 
                                            className={passwordValidation.hasSpecialChar ? "text-green-500" : "text-slate-400"} 
                                        />
                                        <span className={`text-xs ${passwordValidation.hasSpecialChar ? "text-green-600" : "text-slate-500"}`}>
                                            มีอักขระพิเศษ (!@#$%^&* ฯลฯ)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="px-6 py-4 border-t border-slate-100">
                        <Button
                            color="primary"
                            onPress={handleForceChangePassword}
                            isLoading={isChangingPassword}
                            isDisabled={!isPasswordValid || newPassword !== confirmPassword}
                            className="w-full font-medium bg-gradient-to-r from-blue-400 to-indigo-500"
                            startContent={!isChangingPassword && <Icon icon="solar:key-bold" className="text-lg" />}
                        >
                            เปลี่ยนรหัสผ่าน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Forgot Password Modal */}
            <Modal
                isOpen={isForgotPasswordModalOpen}
                onClose={closeForgotPasswordModal}
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                                <Icon icon="solar:key-bold" className="text-2xl text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">ลืมรหัสผ่าน</h3>
                                <p className="text-sm text-slate-500 font-normal mt-1">
                                    {resetEmailSent ? "ตรวจสอบอีเมลของคุณ" : "กรอกอีเมลเพื่อรีเซ็ตรหัสผ่าน"}
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        {resetEmailSent ? (
                            <div className="space-y-4">
                                {/* Success Message */}
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 rounded-full">
                                            <Icon icon="solar:check-circle-bold" className="text-green-600 text-xl" />
                                        </div>
                                        <div className="text-sm text-green-700">
                                            <p className="font-semibold">ส่งอีเมลแล้ว!</p>
                                            <p className="mt-1">
                                                เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมลและทำตามขั้นตอนเพื่อรีเซ็ตรหัสผ่านของคุณ
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <Icon icon="solar:info-circle-bold" className="text-blue-500 text-xl mt-0.5" />
                                        <div className="text-sm text-blue-700">
                                            <p className="font-semibold">ขั้นตอนต่อไป:</p>
                                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                                <li>ตรวจสอบกล่องจดหมายของคุณ</li>
                                                <li>ตรวจสอบโฟลเดอร์สแปมด้วย</li>
                                                <li>ลิงก์จะหมดอายุใน 1 ชั่วโมง</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Info */}
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <Icon icon="solar:info-circle-bold" className="text-amber-500 text-xl mt-0.5" />
                                        <div className="text-sm text-amber-700">
                                            <p>กรอกอีเมลที่ลงทะเบียนไว้ในระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Input */}
                                <Input
                                    label="อีเมล"
                                    labelPlacement="outside"
                                    placeholder="กรอกอีเมลของคุณ"
                                    type="email"
                                    variant="bordered"
                                    size="md"
                                    value={forgotPasswordEmail}
                                    onValueChange={setForgotPasswordEmail}
                                    startContent={<Icon icon="solar:letter-linear" className="text-amber-400 text-xl" />}
                                    classNames={{
                                        inputWrapper: "border-slate-200 hover:border-amber-300 focus-within:!border-amber-400",
                                        label: "text-slate-600 font-medium text-sm",
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !isSendingResetEmail) {
                                            handleForgotPassword();
                                        }
                                    }}
                                    className="pt-4"
                                />
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="px-6 py-4">
                        {resetEmailSent ? (
                            <Button
                                color="primary"
                                onPress={closeForgotPasswordModal}
                                className="w-full font-medium bg-gradient-to-r from-blue-400 to-indigo-500"
                            >
                                กลับไปหน้าเข้าสู่ระบบ
                            </Button>
                        ) : (
                            <div className="flex gap-3">
                                <Button
                                    variant="bordered"
                                    onPress={closeForgotPasswordModal}
                                    className="flex-1"
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    color="warning"
                                    onPress={handleForgotPassword}
                                    isLoading={isSendingResetEmail}
                                    isDisabled={!forgotPasswordEmail}
                                    className="flex-1 font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                    startContent={!isSendingResetEmail && <Icon icon="solar:letter-bold" className="text-lg" />}
                                >
                                    ส่งลิงก์รีเซ็ต
                                </Button>
                            </div>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
