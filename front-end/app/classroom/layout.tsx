"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Chip } from "@heroui/chip";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Icon } from "@iconify/react";
import { authService } from "@/services/auth.service";
import { courseService } from "@/services/course.service";
import Link from "next/link";
import { IoSchool } from "react-icons/io5";


interface User {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
}

interface CourseInfo {
    id: string;
    code: string;
    name: string;
    year: number;
    semester: number;
}

export default function ClassroomLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);

    // Extract course ID from pathname
    const courseId = pathname.split("/classroom/")[1]?.split("/")[0] || null;

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // First check if authenticated
                if (!authService.isAuthenticated()) {
                    router.push("/login");
                    return;
                }

                // Get current user from API
                const user = await authService.getCurrentUser();
                if (user) {
                    // Allow admin, instructor, and ta roles
                    const allowedRoles = ["admin", "instructor", "ta"];
                    if (allowedRoles.includes(user.role)) {
                        setUser(user);
                    } else {
                        router.push("/login");
                    }
                } else {
                    router.push("/login");
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                router.push("/login");
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    // Fetch course info for breadcrumb
    useEffect(() => {
        const fetchCourseInfo = async () => {
            if (courseId) {
                try {
                    const response = await courseService.getCourseById(courseId);
                    if (response.success && response.data) {
                        setCourseInfo({
                            id: response.data.id,
                            code: response.data.code,
                            name: response.data.name,
                            year: response.data.year,
                            semester: response.data.semester,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch course info:", error);
                }
            }
        };
        fetchCourseInfo();
    }, [courseId]);

    const handleLogout = async () => {
        try {
            await authService.logout();
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "admin":
                return "ผู้ดูแลระบบ";
            case "instructor":
                return "อาจารย์";
            case "ta":
                return "ผู้ช่วยสอน";
            default:
                return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
                return "danger";
            case "instructor":
                return "primary";
            case "ta":
                return "success";
            default:
                return "default";
        }
    };

    const getBackPath = () => {
        switch (user?.role) {
            case "admin":
                return "/admin/courses";
            case "instructor":
                return "/instructor/courses";
            case "ta":
                return "/ta/courses";
            default:
                return "/";
        }
    };

    const getSemesterText = (semester: number) => {
        return semester === 3 ? "ฤดูร้อน" : `เทอม ${semester}`;
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Navigation Bar - Breadcrumb Style */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between h-12 px-4">
                    {/* Left: Breadcrumb Navigation */}
                    <div className="flex items-center gap-1 text-sm overflow-x-auto">
                        {/* Home Icon */}
                        <Link 
                            href={getBackPath()}
                            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
                        >
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white text-xs">
                                <IoSchool />
                            </div>
                        </Link>

                        {/* Separator */}
                        <Icon icon="solar:alt-arrow-right-linear" className="text-slate-400 text-lg flex-shrink-0" />

                        {/* User/Organization */}
                        <Dropdown>
                            <DropdownTrigger>
                                <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors text-slate-700">
                                    <Avatar
                                        name={user?.full_name}
                                        size="sm"
                                        className="w-5 h-5 text-[10px] bg-gradient-to-br from-blue-500 to-indigo-600"
                                    />
                                    <span className="font-medium max-w-[150px] truncate">{user?.full_name}</span>
                                    <Chip size="sm" variant="flat" className="bg-emerald-50 text-emerald-600 h-5 text-[10px]">
                                        {getRoleLabel(user?.role || "")}
                                    </Chip>
                                    <Icon icon="solar:alt-arrow-down-linear" className="text-slate-400 text-sm" />
                                </button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="User actions">
                                <DropdownItem
                                    key="back"
                                    startContent={<Icon icon="solar:arrow-left-linear" />}
                                    onPress={() => router.push(getBackPath())}
                                >
                                    กลับไปหน้ารายวิชา
                                </DropdownItem>
                                <DropdownItem
                                    key="logout"
                                    color="danger"
                                    startContent={<Icon icon="solar:logout-2-linear" />}
                                    onPress={handleLogout}
                                >
                                    ออกจากระบบ
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>

                        {/* Course Info */}
                        {courseInfo && (
                            <>
                                {/* Separator */}
                                <Icon icon="solar:alt-arrow-right-linear" className="text-slate-400 text-lg flex-shrink-0" />
                                
                                {/* Course Name */}
                                <div className="flex items-center gap-1.5 px-2 py-1 text-slate-700">
                                    <span className="font-medium">{courseInfo.code}</span>
                                    <span className="max-w-[200px] truncate">{courseInfo.name}</span>
                                    <Chip size="sm" variant="flat" className="bg-blue-50 text-blue-600 h-5 text-[10px]">
                                        {courseInfo.year}/{courseInfo.semester}
                                    </Chip>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Feedback Button */}
                        <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
                            <span>Feedback</span>
                        </button>

                        {/* Help */}
                        <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                            <Icon icon="solar:question-circle-linear" className="text-lg" />
                        </button>

                        {/* Notifications */}
                        <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                            <Icon icon="solar:bell-linear" className="text-lg" />
                        </button>

                        {/* User Avatar */}
                        <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                                <button className="p-0.5 rounded-full hover:ring-2 hover:ring-blue-200 transition-all">
                                    <Avatar
                                        name={user?.full_name}
                                        size="sm"
                                        className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600"
                                    />
                                </button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="User menu">
                                <DropdownItem
                                    key="profile"
                                    className="h-14 gap-2"
                                    textValue="Profile"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar
                                            name={user?.full_name}
                                            size="sm"
                                            className="bg-gradient-to-br from-blue-500 to-indigo-600"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800">{user?.full_name}</p>
                                            <p className="text-xs text-slate-500">{user?.email}</p>
                                        </div>
                                    </div>
                                </DropdownItem>
                                <DropdownItem
                                    key="back"
                                    startContent={<Icon icon="solar:arrow-left-linear" className="text-lg" />}
                                    onPress={() => router.push(getBackPath())}
                                >
                                    กลับไปหน้าหลัก
                                </DropdownItem>
                                <DropdownItem
                                    key="logout"
                                    color="danger"
                                    startContent={<Icon icon="solar:logout-2-linear" className="text-lg" />}
                                    onPress={handleLogout}
                                >
                                    ออกจากระบบ
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {children}
            </main>
        </div>
    );
}
