"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Icon } from "@iconify/react";
import { courseService, CreateCourseDto } from "@/services/course.service";
import { authService } from "@/services/auth.service";
import { addToast } from "@heroui/toast";
import Link from "next/link";

export default function CreateCoursePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form data
    const [formData, setFormData] = useState<CreateCourseDto>({
        code: "",
        name: "",
        year: new Date().getFullYear() + 543, // พ.ศ.
        semester: 1,
        description: "",
    });

    // Check if user is instructor
    useEffect(() => {
        const checkRole = async () => {
            const user = await authService.getCurrentUser();
            if (user?.role !== "instructor") {
                router.push("/home");
            }
        };
        checkRole();
    }, [router]);

    const handleInputChange = (field: keyof CreateCourseDto, value: string | number | null) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.code?.trim()) {
            newErrors.code = "กรุณากรอกรหัสวิชา";
        } else if (formData.code.length > 20) {
            newErrors.code = "รหัสวิชาต้องไม่เกิน 20 ตัวอักษร";
        }

        if (!formData.name?.trim()) {
            newErrors.name = "กรุณากรอกชื่อวิชา";
        } else if (formData.name.length > 200) {
            newErrors.name = "ชื่อวิชาต้องไม่เกิน 200 ตัวอักษร";
        }

        if (!formData.year || formData.year < 2500 || formData.year > 2600) {
            newErrors.year = "กรุณาเลือกปีการศึกษาที่ถูกต้อง";
        }

        if (!formData.semester || ![1, 2, 3].includes(formData.semester)) {
            newErrors.semester = "กรุณาเลือกภาคเรียน";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Get current user as instructor
            const user = await authService.getCurrentUser();
            
            const response = await courseService.createCourse({
                ...formData,
                instructor_id: user?.id,
            });

            if (response.success) {
                addToast({
                    title: "สำเร็จ",
                    description: "สร้างรายวิชาเรียบร้อยแล้ว",
                    color: "success",
                });
                router.push("/home");
            } else {
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: response.message || "ไม่สามารถสร้างรายวิชาได้",
                    color: "danger",
                });
            }
        } catch (error: any) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถสร้างรายวิชาได้",
                color: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Generate year options (current year ± 2)
    const currentYear = new Date().getFullYear() + 543;
    const yearOptions = Array.from({ length: 5 }, (_, i) => ({
        value: (currentYear - 2 + i).toString(),
        label: `${currentYear - 2 + i}`,
    }));

    const semesterOptions = [
        { value: "1", label: "ภาคเรียนที่ 1" },
        { value: "2", label: "ภาคเรียนที่ 2" },
        { value: "3", label: "ภาคฤดูร้อน" },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Link href="/home" className="hover:text-slate-700 transition-colors">
                    รายวิชาของฉัน
                </Link>
                <Icon icon="solar:alt-arrow-right-linear" />
                <span className="text-slate-900">สร้างรายวิชาใหม่</span>
            </div>

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Icon icon="solar:book-2-bold" className="text-xl text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">สร้างรายวิชาใหม่</h1>
                            <p className="text-sm text-slate-500">กรอกข้อมูลรายวิชาเพื่อสร้างใหม่</p>
                        </div>
                    </div>
                </CardHeader>

                <CardBody className="p-6 space-y-6">
                    {/* Course Code */}
                    <div>
                        <Input
                            label="รหัสวิชา"
                            placeholder="เช่น CS101, MATH201"
                            value={formData.code}
                            onValueChange={(value) => handleInputChange("code", value)}
                            isInvalid={!!errors.code}
                            errorMessage={errors.code}
                            isRequired
                            startContent={
                                <Icon icon="solar:hashtag-linear" className="text-slate-400" />
                            }
                        />
                    </div>

                    {/* Course Name */}
                    <div>
                        <Input
                            label="ชื่อวิชา"
                            placeholder="เช่น Introduction to Computer Science"
                            value={formData.name}
                            onValueChange={(value) => handleInputChange("name", value)}
                            isInvalid={!!errors.name}
                            errorMessage={errors.name}
                            isRequired
                            startContent={
                                <Icon icon="solar:document-text-linear" className="text-slate-400" />
                            }
                        />
                    </div>

                    {/* Year and Semester */}
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="ปีการศึกษา"
                            placeholder="เลือกปีการศึกษา"
                            selectedKeys={formData.year ? [formData.year.toString()] : []}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                handleInputChange("year", value ? parseInt(value) : null);
                            }}
                            isInvalid={!!errors.year}
                            errorMessage={errors.year}
                            isRequired
                        >
                            {yearOptions.map((option) => (
                                <SelectItem key={option.value}>{option.label}</SelectItem>
                            ))}
                        </Select>

                        <Select
                            label="ภาคเรียน"
                            placeholder="เลือกภาคเรียน"
                            selectedKeys={formData.semester ? [formData.semester.toString()] : []}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                handleInputChange("semester", value ? parseInt(value) : null);
                            }}
                            isInvalid={!!errors.semester}
                            errorMessage={errors.semester}
                            isRequired
                        >
                            {semesterOptions.map((option) => (
                                <SelectItem key={option.value}>{option.label}</SelectItem>
                            ))}
                        </Select>
                    </div>

                    {/* Description */}
                    <div>
                        <Textarea
                            label="คำอธิบายรายวิชา (ถ้ามี)"
                            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับรายวิชา..."
                            value={formData.description || ""}
                            onValueChange={(value) => handleInputChange("description", value)}
                            minRows={3}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            variant="flat"
                            color="default"
                            onPress={() => router.push("/home")}
                            isDisabled={isLoading}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            onPress={handleSubmit}
                            isLoading={isLoading}
                            startContent={!isLoading && <Icon icon="solar:add-circle-bold" className="text-lg" />}
                        >
                            สร้างรายวิชา
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
