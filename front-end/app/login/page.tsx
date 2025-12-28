"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Link } from "@heroui/link";
import { Icon } from "@iconify/react";
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { addToast } from "@heroui/toast";
import { authService } from "@/services";

export default function LoginPage() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [canSubmit, setCanSubmit] = useState(true);
    const refTurnstile = useRef<TurnstileInstance>(null);


    const toggleVisibility = () => setIsVisible(!isVisible);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
                color: "warning",
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await authService.login({
                username: formData.username,
                password: formData.password,
            });

            if (result.success && result.user) {
                addToast({
                    title: "เข้าสู่ระบบสำเร็จ",
                    description: `ยินดีต้อนรับ ${formData.username}`,
                    color: "success",
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
                });
                refTurnstile.current?.reset();
            }
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
                color: "danger",
            });
            refTurnstile.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // TODO: Implement Google OAuth
        window.location.href = "http://localhost:3001/api/auth/google";
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 p-3 sm:p-4">
            <Card className="w-full max-w-[1024px] overflow-hidden shadow-2xl border border-blue-100">
                <CardBody className="p-0">
                    <div className="flex flex-col md:flex-row">
                        {/* Left Side - Image & Branding */}
                        <div className="relative hidden w-full md:flex md:w-1/2 min-h-[600px]">
                            <div
                                className="absolute inset-0 w-full h-full bg-center bg-cover bg-no-repeat"
                                style={{
                                    backgroundImage: `url("/images/cp-image-login.jpg")`,
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                            </div>
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

                        {/* Right Side - Login Form */}
                        <div className="w-full md:w-1/2 p-5 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white">
                            

                            {/* Header */}
                            <div className="flex flex-col gap-1 sm:gap-2 mb-6 sm:mb-8">
                                <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-slate-800">
                                    ยินดีต้อนรับ
                                </h1>
                                <p className="text-slate-500 text-sm sm:text-base">
                                    ITII Assist classroom website.
                                </p>
                            </div>

                            {/* Login Form */}
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
                                    <Link href="#" size="sm" className="text-blue-400 hover:text-blue-500">
                                        ลืมรหัสผ่าน?
                                    </Link>
                                </div>

                                <Turnstile
                                    id='turnstile-1'
                                    ref={refTurnstile}
                                    siteKey={process.env.NEXT_PUBLIC_CLOUD || ''}
                                    onSuccess={() => setCanSubmit(false)}
                                    options={{
                                        theme: 'auto'
                                    }}
                                />

                                <Button
                                    type="submit"
                                    size="md"
                                    className="w-full font-bold mt-2 h-11 sm:h-12 bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-300/50 hover:shadow-blue-400/60"
                                    isLoading={isLoading}
                                >
                                    เข้าสู่ระบบ
                                </Button>
                            </form>

                            {/* Divider */}
                            <div className="relative flex py-4 sm:py-6 items-center">
                                <div className="flex-grow border-t border-blue-100"></div>
                                <span className="flex-shrink-0 mx-3 sm:mx-4 text-slate-400 text-xs sm:text-sm">
                                    หรือเข้าสู่ระบบด้วย
                                </span>
                                <div className="flex-grow border-t border-blue-100"></div>
                            </div>

                            {/* Google Login */}
                            <Button
                                variant="bordered"
                                size="md"
                                className="w-full h-11 sm:h-12 font-medium border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 text-sm sm:text-base"
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

                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Footer */}
            <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 text-center text-slate-400 text-[10px] sm:text-xs px-4">
                © 2025 ITII Assist classroom - Course & Lab Management System
            </div>
        </div>
    );
}
