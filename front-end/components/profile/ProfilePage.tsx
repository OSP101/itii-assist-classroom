"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Tabs, Tab } from "@heroui/tabs";
import { Spinner } from "@heroui/spinner";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { authService, User } from "@/services";

interface ProfilePageProps {
  variant?: "admin" | "user";
  onBack?: () => void;
}

export default function ProfilePage({ variant = "admin", onBack }: ProfilePageProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setFullName(currentUser.full_name || "");
          setEmail(currentUser.email || "");
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, [router]);

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const result = await authService.updateProfile({
        full_name: fullName,
        email: email || undefined,
      });
      
      if (result.success && result.user) {
        setUser(result.user);
        addToast({
          title: "สำเร็จ",
          description: "อัปเดตโปรไฟล์เรียบร้อยแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.error || "ไม่สามารถอัปเดตโปรไฟล์ได้",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Update profile error:", error);
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตโปรไฟล์ได้",
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        color: "warning",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      addToast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน",
        color: "danger",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      addToast({
        title: "รหัสผ่านสั้นเกินไป",
        description: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
        color: "warning",
      });
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const result = await authService.changePassword(currentPassword, newPassword, confirmPassword);
      
      if (result.success) {
        addToast({
          title: "สำเร็จ",
          description: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่",
          color: "success",
        });
        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Logout after password change
        setTimeout(() => {
          authService.logout();
          router.push("/login");
        }, 2000);
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Change password error:", error);
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
        color: "danger",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { color: "primary" | "secondary" | "success" | "warning" | "danger"; label: string }> = {
      admin: { color: "danger", label: "ผู้ดูแลระบบ" },
      instructor: { color: "primary", label: "อาจารย์" },
      ta: { color: "success", label: "ผู้ช่วยสอน (TA)" },
    };
    return config[role] || { color: "secondary" as const, label: role };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const roleInfo = getRoleBadge(user.role);

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button isIconOnly variant="light" onPress={onBack}>
            <Icon icon="solar:arrow-left-linear" className="text-xl" />
          </Button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-default-900">โปรไฟล์ของฉัน</h1>
          <p className="text-sm text-default-500">จัดการข้อมูลส่วนตัวและความปลอดภัย</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border border-default-200 shadow-sm">
        <CardBody className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <Avatar
              name={user.full_name || user.username}
              className="w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
            />
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-default-900">
                {user.full_name || user.username}
              </h2>
              <p className="text-sm text-default-500">@{user.username}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                <Chip color={roleInfo.color} variant="flat" size="sm">
                  {roleInfo.label}
                </Chip>
                <Chip 
                  color={user.is_active ? "success" : "danger"} 
                  variant="flat" 
                  size="sm"
                >
                  {user.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                </Chip>
              </div>
            </div>
            <div className="hidden sm:block text-right text-xs text-default-400">
              <p>สร้างเมื่อ: {new Date(user.created_at).toLocaleDateString('th-TH')}</p>
              <p>อัปเดตล่าสุด: {new Date(user.updated_at).toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs 
        aria-label="Profile tabs"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-4 sm:gap-6",
          cursor: "w-full",
          tab: "px-0 h-10",
        }}
      >
        {/* Profile Info Tab */}
        <Tab
          key="profile"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="solar:user-linear" className="text-lg" />
              <span className="hidden sm:inline">ข้อมูลส่วนตัว</span>
              <span className="sm:hidden">ข้อมูล</span>
            </div>
          }
        >
          <Card className="border border-default-200 shadow-sm">
            <CardHeader className="px-4 sm:px-6 py-4 border-b border-default-100">
              <div className="flex items-center gap-2">
                <Icon icon="solar:pen-new-square-linear" className="text-lg text-primary" />
                <h3 className="font-semibold">แก้ไขข้อมูลส่วนตัว</h3>
              </div>
            </CardHeader>
            <CardBody className="p-4 sm:p-6 space-y-4">
              <Input
                label="Username"
                value={user.username}
                isReadOnly
                isDisabled
                variant="flat"
                description="ไม่สามารถแก้ไข Username ได้"
                classNames={{
                  input: "text-default-500",
                }}
              />
              
              <Input
                label="ชื่อ-นามสกุล"
                placeholder="กรอกชื่อ-นามสกุล"
                value={fullName}
                onValueChange={setFullName}
                variant="bordered"
                startContent={
                  <Icon icon="solar:user-linear" className="text-default-400" />
                }
              />
              
              <Input
                label="อีเมล"
                type="email"
                placeholder="example@email.com"
                value={email}
                onValueChange={setEmail}
                variant="bordered"
                startContent={
                  <Icon icon="solar:letter-linear" className="text-default-400" />
                }
              />

              <Divider className="my-2" />

              <div className="flex justify-end">
                <Button
                  color="primary"
                  onPress={handleUpdateProfile}
                  isLoading={isSaving}
                  startContent={!isSaving && <Icon icon="solar:check-circle-linear" />}
                >
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </CardBody>
          </Card>
        </Tab>

        {/* Security Tab */}
        <Tab
          key="security"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="solar:shield-keyhole-linear" className="text-lg" />
              <span className="hidden sm:inline">ความปลอดภัย</span>
              <span className="sm:hidden">รหัสผ่าน</span>
            </div>
          }
        >
          <Card className="border border-default-200 shadow-sm">
            <CardHeader className="px-4 sm:px-6 py-4 border-b border-default-100">
              <div className="flex items-center gap-2">
                <Icon icon="solar:lock-password-linear" className="text-lg text-warning" />
                <h3 className="font-semibold">เปลี่ยนรหัสผ่าน</h3>
              </div>
            </CardHeader>
            <CardBody className="p-4 sm:p-6 space-y-4">
              <Input
                label="รหัสผ่านปัจจุบัน"
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onValueChange={setCurrentPassword}
                variant="bordered"
                startContent={
                  <Icon icon="solar:lock-linear" className="text-default-400" />
                }
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="focus:outline-none"
                  >
                    <Icon
                      icon={showCurrentPassword ? "solar:eye-closed-linear" : "solar:eye-linear"}
                      className="text-default-400 text-lg"
                    />
                  </button>
                }
              />
              
              <Input
                label="รหัสผ่านใหม่"
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onValueChange={setNewPassword}
                variant="bordered"
                startContent={
                  <Icon icon="solar:lock-password-linear" className="text-default-400" />
                }
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="focus:outline-none"
                  >
                    <Icon
                      icon={showNewPassword ? "solar:eye-closed-linear" : "solar:eye-linear"}
                      className="text-default-400 text-lg"
                    />
                  </button>
                }
              />
              
              <Input
                label="ยืนยันรหัสผ่านใหม่"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                variant="bordered"
                isInvalid={confirmPassword !== "" && confirmPassword !== newPassword}
                errorMessage={confirmPassword !== "" && confirmPassword !== newPassword ? "รหัสผ่านไม่ตรงกัน" : ""}
                startContent={
                  <Icon icon="solar:lock-password-linear" className="text-default-400" />
                }
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="focus:outline-none"
                  >
                    <Icon
                      icon={showConfirmPassword ? "solar:eye-closed-linear" : "solar:eye-linear"}
                      className="text-default-400 text-lg"
                    />
                  </button>
                }
              />

              <div className="p-3 bg-warning-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon icon="solar:info-circle-linear" className="text-warning text-lg mt-0.5" />
                  <div className="text-sm text-warning-700">
                    <p className="font-medium">หมายเหตุ</p>
                    <p>หลังจากเปลี่ยนรหัสผ่านแล้ว คุณจะต้องเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่</p>
                  </div>
                </div>
              </div>

              <Divider className="my-2" />

              <div className="flex justify-end">
                <Button
                  color="warning"
                  onPress={handleChangePassword}
                  isLoading={isChangingPassword}
                  isDisabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  startContent={!isChangingPassword && <Icon icon="solar:key-linear" />}
                >
                  เปลี่ยนรหัสผ่าน
                </Button>
              </div>
            </CardBody>
          </Card>
        </Tab>

        {/* Account Info Tab */}
        <Tab
          key="account"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="solar:info-circle-linear" className="text-lg" />
              <span className="hidden sm:inline">ข้อมูลบัญชี</span>
              <span className="sm:hidden">บัญชี</span>
            </div>
          }
        >
          <Card className="border border-default-200 shadow-sm">
            <CardHeader className="px-4 sm:px-6 py-4 border-b border-default-100">
              <div className="flex items-center gap-2">
                <Icon icon="solar:document-text-linear" className="text-lg text-secondary" />
                <h3 className="font-semibold">รายละเอียดบัญชี</h3>
              </div>
            </CardHeader>
            <CardBody className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 sm:p-4 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">User ID</p>
                    <p className="font-medium text-default-900">{user.id}</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">Username</p>
                    <p className="font-medium text-default-900">{user.username}</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">บทบาท</p>
                    <Chip color={roleInfo.color} variant="flat" size="sm">
                      {roleInfo.label}
                    </Chip>
                  </div>
                  <div className="p-3 sm:p-4 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">สถานะ</p>
                    <Chip 
                      color={user.is_active ? "success" : "danger"} 
                      variant="flat" 
                      size="sm"
                    >
                      {user.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                    </Chip>
                  </div>
                  <div className="p-3 sm:p-4 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">วันที่สร้างบัญชี</p>
                    <p className="font-medium text-default-900">
                      {new Date(user.created_at).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-default-50 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">อัปเดตล่าสุด</p>
                    <p className="font-medium text-default-900">
                      {new Date(user.updated_at).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}
