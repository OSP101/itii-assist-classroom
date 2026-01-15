"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";
import { Slider } from "@heroui/slider";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";
import { courseService } from "@/services/course.service";
import type { Course } from "@/services/course.service";

interface SettingsTabProps {
    course: Course;
    onCourseUpdate: (updatedCourse: Course) => void;
}

export default function SettingsTab({ course, onCourseUpdate }: SettingsTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        code: course.code || "",
        name: course.name || "",
        year: course.year || new Date().getFullYear() + 543,
        semester: course.semester || 1,
        description: course.description || "",
        attention_threshold: course.attention_threshold ?? 60,
        is_active: course.is_active ?? true,
    });

    // Reset form when course changes
    useEffect(() => {
        setFormData({
            code: course.code || "",
            name: course.name || "",
            year: course.year || new Date().getFullYear() + 543,
            semester: course.semester || 1,
            description: course.description || "",
            attention_threshold: course.attention_threshold ?? 60,
            is_active: course.is_active ?? true,
        });
    }, [course]);

    const handleSave = async () => {
        if (!formData.code.trim() || !formData.name.trim()) {
            addToast({
                title: "กรุณากรอกข้อมูล",
                description: "รหัสวิชาและชื่อวิชาจำเป็นต้องกรอก",
                color: "warning",
            });
            return;
        }

        setIsSaving(true);
        try {
            const response = await courseService.updateCourse(course.id, {
                code: formData.code,
                name: formData.name,
                year: formData.year,
                semester: formData.semester,
                description: formData.description || undefined,
                attention_threshold: formData.attention_threshold,
                is_active: formData.is_active,
            });

            if (response.success && response.data) {
                addToast({
                    title: "สำเร็จ",
                    description: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
                    color: "success",
                });
                onCourseUpdate(response.data);
                setIsEditing(false);
            } else {
                const errorMessage = typeof response.error === 'object' && response.error !== null
                    ? (response.error as { message?: string }).message
                    : response.error || response.message || "ไม่สามารถบันทึกได้";
                addToast({
                    title: "เกิดข้อผิดพลาด",
                    description: errorMessage,
                    color: "danger",
                });
            }
        } catch (error: any) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || "ไม่สามารถบันทึกการตั้งค่าได้",
                color: "danger",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            code: course.code || "",
            name: course.name || "",
            year: course.year || new Date().getFullYear() + 543,
            semester: course.semester || 1,
            description: course.description || "",
            attention_threshold: course.attention_threshold ?? 60,
            is_active: course.is_active ?? true,
        });
        setIsEditing(false);
    };

    const getSemesterText = (semester: number) => {
        switch (semester) {
            case 1: return "ภาคเรียนที่ 1";
            case 2: return "ภาคเรียนที่ 2";
            case 3: return "ภาคฤดูร้อน";
            default: return `ภาคเรียนที่ ${semester}`;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg">
                        <Icon icon="solar:settings-bold" className="text-2xl text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่ารายวิชา</h1>
                        <p className="text-slate-500">จัดการข้อมูลและการตั้งค่าของรายวิชา</p>
                    </div>
                </div>
                
                {!isEditing ? (
                    <Button
                        color="primary"
                        startContent={<Icon icon="solar:pen-bold" />}
                        onPress={() => setIsEditing(true)}
                    >
                        แก้ไขข้อมูล
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            variant="flat"
                            onPress={handleCancel}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            color="primary"
                            isLoading={isSaving}
                            startContent={!isSaving && <Icon icon="solar:check-circle-bold" />}
                            onPress={handleSave}
                        >
                            บันทึก
                        </Button>
                    </div>
                )}
            </div>

            {/* Course Info Card */}
            <Card className="shadow-md">
                <CardHeader className="flex gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Icon icon="solar:document-text-bold" className="text-xl text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">ข้อมูลรายวิชา</h3>
                        <p className="text-sm text-slate-500">ข้อมูลพื้นฐานของรายวิชา</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Course Code */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">รหัสวิชา</label>
                            {isEditing ? (
                                <Input
                                    value={formData.code}
                                    onValueChange={(val) => setFormData({ ...formData, code: val })}
                                    placeholder="เช่น 01076001"
                                    variant="bordered"
                                    size="lg"
                                    startContent={
                                        <Icon icon="solar:hashtag-bold" className="text-slate-400" />
                                    }
                                />
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                    <Icon icon="solar:hashtag-bold" className="text-slate-400" />
                                    <span className="text-slate-800 font-medium">{course.code}</span>
                                </div>
                            )}
                        </div>

                        {/* Course Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">ชื่อวิชา</label>
                            {isEditing ? (
                                <Input
                                    value={formData.name}
                                    onValueChange={(val) => setFormData({ ...formData, name: val })}
                                    placeholder="ชื่อรายวิชา"
                                    variant="bordered"
                                    size="lg"
                                    startContent={
                                        <Icon icon="solar:book-bold" className="text-slate-400" />
                                    }
                                />
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                    <Icon icon="solar:book-bold" className="text-slate-400" />
                                    <span className="text-slate-800 font-medium">{course.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Academic Year */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">ปีการศึกษา</label>
                            {isEditing ? (
                                <Input
                                    type="number"
                                    value={String(formData.year)}
                                    onValueChange={(val) => setFormData({ ...formData, year: parseInt(val) || formData.year })}
                                    placeholder="พ.ศ."
                                    variant="bordered"
                                    size="lg"
                                    startContent={
                                        <Icon icon="solar:calendar-bold" className="text-slate-400" />
                                    }
                                />
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                    <Icon icon="solar:calendar-bold" className="text-slate-400" />
                                    <span className="text-slate-800 font-medium">{course.year}</span>
                                </div>
                            )}
                        </div>

                        {/* Semester */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">ภาคเรียน</label>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((sem) => (
                                        <Button
                                            key={sem}
                                            variant={formData.semester === sem ? "solid" : "bordered"}
                                            color={formData.semester === sem ? "primary" : "default"}
                                            onPress={() => setFormData({ ...formData, semester: sem })}
                                            className="flex-1"
                                        >
                                            {sem === 3 ? "ฤดูร้อน" : "ภาคเรียนที่ "+sem}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                    <Icon icon="solar:calendar-date-bold" className="text-slate-400" />
                                    <span className="text-slate-800 font-medium">{getSemesterText(course.semester)}</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">คำอธิบายรายวิชา</label>
                            {isEditing ? (
                                <Textarea
                                    value={formData.description}
                                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                                    placeholder="คำอธิบายเพิ่มเติมของรายวิชา (ไม่บังคับ)"
                                    variant="bordered"
                                    minRows={3}
                                />
                            ) : (
                                <div className="p-3 bg-slate-50 rounded-lg min-h-[80px]">
                                    {course.description ? (
                                        <p className="text-slate-700">{course.description}</p>
                                    ) : (
                                        <p className="text-slate-400 italic">ไม่มีคำอธิบาย</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Warning when changing code/year/semester */}
                        {isEditing && (formData.code !== course.code || formData.year !== course.year || formData.semester !== course.semester) && (
                            <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Icon icon="solar:info-circle-bold" className="text-xl text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800">หมายเหตุ: การเปลี่ยนรหัสวิชา/ปี/ภาคเรียน</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            ระบบจะตรวจสอบว่าไม่มีรายวิชาอื่นที่เปิดใช้งานอยู่ด้วยรหัสวิชา ปีการศึกษา ภาคเรียนเดียวกัน 
                                            หากมีรายวิชาซ้ำจะไม่สามารถบันทึกได้ <span className="underline font-medium">มีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Attention Threshold Card */}
            <Card className="shadow-md">
                <CardHeader className="flex gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Icon icon="solar:bell-bold" className="text-xl text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">การตั้งค่าการแจ้งเตือน</h3>
                        <p className="text-sm text-slate-500">กำหนดเกณฑ์คะแนนสำหรับแจ้งเตือนนักศึกษาที่ต้องดูแลเป็นพิเศษ</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 py-5">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">เกณฑ์ควรให้ความสนใจ</p>
                                <p className="text-sm text-slate-500">นักศึกษาที่คะแนนรวมต่ำกว่าเกณฑ์นี้จะถูกไฮไลท์</p>
                            </div>
                            <Chip 
                                size="lg" 
                                color={formData.attention_threshold < 50 ? "danger" : formData.attention_threshold < 70 ? "warning" : "success"}
                                variant="flat"
                            >
                                {formData.attention_threshold}%
                            </Chip>
                        </div>
                        
                        {isEditing ? (
                            <div className="space-y-3">
                                <Slider
                                    aria-label="Attention Threshold"
                                    step={5}
                                    minValue={0}
                                    maxValue={100}
                                    value={formData.attention_threshold}
                                    onChange={(val) => setFormData({ ...formData, attention_threshold: val as number })}
                                    className="max-w-full"
                                    color={formData.attention_threshold < 50 ? "danger" : formData.attention_threshold < 70 ? "warning" : "success"}
                                    showTooltip
                                    // tooltipProps={{
                                    //     content: `${formData.attention_threshold}%`,
                                    // }}
                                    marks={[
                                        { value: 0, label: "0%" },
                                        { value: 25, label: "25%" },
                                        { value: 50, label: "50%" },
                                        { value: 75, label: "75%" },
                                        { value: 100, label: "100%" },
                                    ]}
                                    showSteps={true}
                                />
                                {/* <div className="flex items-center gap-2 mt-4">
                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                        {[40, 50, 60].map((val) => (
                                            <Button
                                                key={val}
                                                size="sm"
                                                variant={formData.attention_threshold === val ? "solid" : "bordered"}
                                                color={val < 50 ? "danger" : val < 70 ? "warning" : "success"}
                                                onPress={() => setFormData({ ...formData, attention_threshold: val })}
                                            >
                                                {val}%
                                            </Button>
                                        ))}
                                    </div>
                                </div> */}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all ${
                                            formData.attention_threshold < 50 ? "bg-red-500" : 
                                            formData.attention_threshold < 70 ? "bg-amber-500" : "bg-green-500"
                                        }`}
                                        style={{ width: `${formData.attention_threshold}%` }}
                                    />
                                </div>
                                <p className="text-sm text-slate-500 mt-3">
                                    นักศึกษาที่คะแนนรวมต่ำกว่า {formData.attention_threshold}% จะแสดงในรายการ &quot;นักศึกษาที่ควรได้รับการดูแลเพิ่มเติม&quot;
                                </p>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Course Status Card */}
            <Card className="shadow-md">
                <CardHeader className="flex gap-3 px-6 py-4 border-b border-slate-100">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.is_active ? "bg-green-100" : "bg-red-100"
                    }`}>
                        <Icon 
                            icon={formData.is_active ? "solar:check-circle-bold" : "solar:close-circle-bold"} 
                            className={`text-xl ${formData.is_active ? "text-green-600" : "text-red-600"}`}
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">สถานะรายวิชา</h3>
                        <p className="text-sm text-slate-500">เปิด/ปิดการใช้งานรายวิชา</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">
                                {formData.is_active ? "เปิดใช้งานอยู่" : "ปิดใช้งานอยู่"}
                            </p>
                            <p className="text-sm text-slate-500">
                                {formData.is_active 
                                    ? "รายวิชานี้กำลังเปิดใช้งานและสามารถเข้าถึงได้" 
                                    : "รายวิชานี้ถูกปิดใช้งาน นักศึกษาและผู้ช่วยสอนจะไม่สามารถเข้าถึงได้"
                                }
                            </p>
                        </div>
                        {isEditing ? (
                            <Switch
                                isSelected={formData.is_active}
                                onValueChange={(val) => setFormData({ ...formData, is_active: val })}
                                color="success"
                                size="lg"
                            >
                                <span className="sr-only">Toggle course status</span>
                            </Switch>
                        ) : (
                            <Chip 
                                color={formData.is_active ? "success" : "danger"} 
                                variant="flat"
                                startContent={
                                    <Icon icon={formData.is_active ? "solar:check-circle-bold" : "solar:close-circle-bold"} />
                                }
                            >
                                {formData.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                            </Chip>
                        )}
                    </div>

                    {/* Warning when disabling */}
                    {isEditing && !formData.is_active && course.is_active && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Icon icon="solar:danger-triangle-bold" className="text-xl text-red-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800">คำเตือน: การปิดใช้งานรายวิชา</p>
                                    <ul className="text-sm text-red-600 mt-1 space-y-1 list-disc list-inside">
                                        <li>นักศึกษาจะไม่สามารถเห็นรายวิชานี้ในรายการวิชาของตน</li>
                                        <li>ผู้ช่วยสอนจะไม่สามารถเข้าถึงรายวิชานี้ได้</li>
                                        <li>ข้อมูลทั้งหมดจะยังคงอยู่และสามารถเปิดใช้งานได้อีกครั้ง</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Course Statistics (Read-only) */}
            <Card className="shadow-md">
                <CardHeader className="flex gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Icon icon="solar:chart-2-bold" className="text-xl text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">ข้อมูลสถิติ</h3>
                        <p className="text-sm text-slate-500">ภาพรวมของรายวิชา</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 py-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                            <Icon icon="solar:users-group-rounded-bold" className="text-3xl text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-800">
                                {course.sections?.reduce((acc, s) => acc + (s.studentCount || 0), 0) || 0}
                            </p>
                            <p className="text-sm text-blue-600">นักศึกษา</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-xl text-center">
                            <Icon icon="solar:notebook-bold" className="text-3xl text-emerald-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-emerald-800">
                                {course.sections?.length || 0}
                            </p>
                            <p className="text-sm text-emerald-600">กลุ่มเรียน</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl text-center">
                            <Icon icon="solar:user-speak-bold" className="text-3xl text-purple-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-purple-800">
                                {course.instructors?.length || (course.instructor ? 1 : 0)}
                            </p>
                            <p className="text-sm text-purple-600">อาจารย์</p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-xl text-center">
                            <Icon icon="solar:star-bold" className="text-3xl text-amber-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-amber-800">
                                {course.tas?.length || 0}
                            </p>
                            <p className="text-sm text-amber-600">ผู้ช่วยสอน</p>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Course Meta Info */}
            <Card className="shadow-md">
                <CardHeader className="flex gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Icon icon="solar:info-circle-bold" className="text-xl text-slate-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">ข้อมูลระบบ</h3>
                        <p className="text-sm text-slate-500">ข้อมูลเพิ่มเติมของรายวิชาในระบบ</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Icon icon="solar:hashtag-bold" className="text-lg text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">รหัสรายวิชา (ID)</p>
                                <p className="font-medium text-slate-800">{course.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Icon icon="solar:calendar-add-bold" className="text-lg text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">วันที่สร้าง</p>
                                <p className="font-medium text-slate-800">
                                    {course.created_at 
                                        ? new Date(course.created_at).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Icon icon="solar:calendar-mark-bold" className="text-lg text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">แก้ไขล่าสุด</p>
                                <p className="font-medium text-slate-800">
                                    {course.updated_at 
                                        ? new Date(course.updated_at).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Icon icon="solar:user-bold" className="text-lg text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">อาจารย์หลัก</p>
                                <p className="font-medium text-slate-800">
                                    {course.instructors?.find(i => (i as any).CourseInstructor?.is_primary)?.full_name 
                                        || course.instructor?.full_name 
                                        || '-'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
