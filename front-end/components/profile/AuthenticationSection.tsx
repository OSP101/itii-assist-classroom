"use client";

import { memo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Icon } from "@iconify/react";

interface AuthenticationSectionProps {
  onOpenPasswordModal: () => void;
}

function AuthenticationSection({ onOpenPasswordModal }: AuthenticationSectionProps) {
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2.5 bg-warning-100 rounded-lg">
                <Icon icon="solar:shield-check-bold" className="text-xl text-warning-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-default-900">Two-Factor Authentication</h3>
                  <Chip size="sm" color="warning" variant="flat">ปิดอยู่</Chip>
                </div>
                <p className="text-sm text-default-500 mt-1">
                  เพิ่มความปลอดภัยให้บัญชีของคุณด้วยการยืนยันตัวตนสองขั้นตอน
                </p>
              </div>
            </div>
            <Button color="primary" size="sm" isDisabled className="bg-gradient-to-br from-blue-400 to-indigo-500">
              ตั้งค่า
            </Button>
          </div>
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
    </div>
  );
}

export default memo(AuthenticationSection);
