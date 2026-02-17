"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Spinner } from "@heroui/spinner";
import { Icon } from "@iconify/react";
import { twoFactorService, TwoFactorStatus } from "@/services/twoFactor.service";
import TwoFactorSetupModal from "./TwoFactorSetupModal";
import TwoFactorDisableModal from "./TwoFactorDisableModal";

interface AuthenticationSectionProps {
  onOpenPasswordModal: () => void;
  userEmail?: string | null;
}

function AuthenticationSection({ onOpenPasswordModal, userEmail }: AuthenticationSectionProps) {
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [isLoading2FA, setIsLoading2FA] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  // Load 2FA status
  const load2FAStatus = useCallback(async () => {
    setIsLoading2FA(true);
    try {
      const result = await twoFactorService.getStatus();
      if (result.success && result.data) {
        setTwoFactorStatus(result.data);
      }
    } catch (error) {
      console.error("Failed to load 2FA status:", error);
    } finally {
      setIsLoading2FA(false);
    }
  }, []);

  useEffect(() => {
    load2FAStatus();
  }, [load2FAStatus]);

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case "totp":
        return "Authenticator App";
      case "email":
        return "Email";
      default:
        return "ไม่ระบุ";
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Card */}
      <Card className="border border-default-200 shadow-sm">
        <CardBody className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2.5 bg-primary-100 rounded-lg">
                <Icon icon="solar:lock-password-bold" className="text-xl text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-default-900">รหัสผ่าน</h3>
                <p className="text-sm text-default-500 mt-1">
                  คุณสามารถเปลี่ยนรหัสผ่านได้ตลอดเวลา การเปลี่ยนรหัสผ่านจะไม่กระทบการตั้งค่า Two-Factor Authentication
                </p>
              </div>
            </div>
            <Button 
              color="primary" 
              className="bg-gradient-to-br from-blue-400 to-indigo-500"
              size="sm"
              onPress={onOpenPasswordModal}
              startContent={<Icon icon="solar:key-linear" />}
            >
              เปลี่ยนรหัสผ่าน
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="border border-default-200 shadow-sm">
        <CardBody className="p-6">
          {isLoading2FA ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : twoFactorStatus?.enabled ? (
            // 2FA Enabled State
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2.5 bg-success-100 rounded-lg">
                    <Icon icon="solar:shield-check-bold" className="text-xl text-success-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-default-900">Two-Factor Authentication</h3>
                      <Chip size="sm" color="success" variant="flat">เปิดใช้งาน</Chip>
                    </div>
                    <p className="text-sm text-default-500 mt-1">
                      บัญชีของคุณได้รับการปกป้องด้วยการยืนยันตัวตนสองขั้นตอน
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-default-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon 
                      icon={twoFactorStatus.method === "totp" ? "solar:smartphone-bold" : "solar:letter-bold"} 
                      className="text-xl text-default-600" 
                    />
                    <div>
                      <p className="text-sm font-medium text-default-700">วิธีการยืนยัน</p>
                      <p className="text-sm text-default-500">{getMethodLabel(twoFactorStatus.method)}</p>
                    </div>
                  </div>
                  <Button 
                    color="danger" 
                    variant="flat" 
                    size="sm"
                    onPress={() => setShowDisableModal(true)}
                  >
                    ปิดการใช้งาน
                  </Button>
                </div>
              </div>

              {/* Info about backup codes */}
              <div className="flex items-start gap-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <Icon icon="solar:info-circle-bold" className="text-lg text-warning-600 mt-0.5" />
                <div>
                  <p className="text-sm text-warning-800">
                    หากสูญเสียการเข้าถึงอุปกรณ์ยืนยันตัวตน คุณสามารถใช้รหัสสำรองเข้าสู่ระบบได้
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // 2FA Disabled State
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2.5 bg-warning-100 rounded-lg">
                  <Icon icon="solar:shield-warning-bold" className="text-xl text-warning-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-default-900">Two-Factor Authentication</h3>
                    <Chip size="sm" color="warning" variant="flat">ปิดอยู่</Chip>
                  </div>
                  <p className="text-sm text-default-500 mt-1">
                    เพิ่มความปลอดภัยให้บัญชีของคุณด้วยการยืนยันตัวตนสองขั้นตอน แนะนำให้เปิดใช้งานเพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
                  </p>
                </div>
              </div>
              <Button 
                color="primary" 
                size="sm" 
                className="bg-gradient-to-br from-blue-400 to-indigo-500"
                onPress={() => setShowSetupModal(true)}
              >
                ตั้งค่า
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Login Providers */}
      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <Icon icon="solar:link-bold" className="text-lg text-primary" />
            <h3 className="font-semibold">เชื่อมต่อบัญชี</h3>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {/* Google */}
          <div className="flex items-center justify-between px-6 py-4 hover:bg-default-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-default-100 rounded-lg">
                <Icon icon="logos:google-icon" className="text-xl" />
              </div>
              <div>
                <p className="font-medium text-default-900">Google</p>
                <p className="text-xs text-default-500">เข้าสู่ระบบด้วย Google Account</p>
              </div>
            </div>
            <Button size="sm" color="primary" variant="flat" isDisabled className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
              เชื่อมต่อ
            </Button>
          </div>
          
          <Divider />
          
          {/* GitHub */}
          <div className="flex items-center justify-between px-6 py-4 hover:bg-default-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-default-100 rounded-lg">
                <Icon icon="mingcute:github-fill" className="text-xl" />
              </div>
              <div>
                <p className="font-medium text-default-900">GitHub</p>
                <p className="text-xs text-default-500">เข้าสู่ระบบด้วย GitHub Account</p>
              </div>
            </div>
            <Button size="sm" color="primary" variant="flat" isDisabled className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
              เชื่อมต่อ
            </Button>
          </div>
          
          <Divider />
          
          {/* Apple */}
          <div className="flex items-center justify-between px-6 py-4 hover:bg-default-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-default-100 rounded-lg">
                <Icon icon="ic:baseline-apple" className="text-xl" />
              </div>
              <div>
                <p className="font-medium text-default-900">Apple ID</p>
                <p className="text-xs text-default-500">เข้าสู่ระบบด้วย Apple ID</p>
              </div>
            </div>
            <Button size="sm" color="primary" variant="flat" isDisabled className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
              เชื่อมต่อ
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={load2FAStatus}
        hasEmail={!!userEmail}
      />

      {/* 2FA Disable Modal */}
      <TwoFactorDisableModal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        onSuccess={load2FAStatus}
        method={twoFactorStatus?.method || null}
      />
    </div>
  );
}

export default memo(AuthenticationSection);
