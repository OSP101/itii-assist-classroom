"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Icon } from "@iconify/react";
import { apiService } from "@/services";
import { API_ENDPOINTS } from "@/config/api";
import { useAdmin } from "@/contexts/AdminContext";

interface SystemMetrics {
  cpu: {
    usage: number;
    free: number;
    info: {
      model: string;
      cores: number;
      speed: number;
    };
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
    totalGB: number;
    freeGB: number;
    usedGB: number;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    uptime: number;
    nodeVersion: string;
  };
  process: {
    pid: number;
    uptime: number;
  };
  timestamp: string;
}

export default function AdminDashboardPage() {
  const { user } = useAdmin();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const response = await apiService.get<{ data: SystemMetrics }>(API_ENDPOINTS.SYSTEM_METRICS);
      if (response.success && response.data) {
        setMetrics(response.data as unknown as SystemMetrics);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">สวัสดี, {user?.display_name} 👋</h2>
            <p className="text-blue-100">ยินดีต้อนรับสู่ระบบจัดการ ITII Assist classroom</p>
          </div>
          <div className="hidden md:block">
            <Icon icon="solar:chart-2-bold-duotone" className="text-6xl text-white/30" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "ผู้ใช้ทั้งหมด", value: "12", icon: "solar:users-group-rounded-bold", color: "blue", change: "+2 เดือนนี้" },
          { label: "นักศึกษา", value: "248", icon: "solar:square-academic-cap-bold", color: "green", change: "+15 เดือนนี้" },
          { label: "รายวิชา", value: "8", icon: "solar:book-bookmark-bold", color: "purple", change: "Active" },
          { label: "เช็คชื่อวันนี้", value: "156", icon: "solar:clipboard-check-bold", color: "orange", change: "62.9%" },
        ].map((stat, index) => (
          <Card key={index} className="border border-slate-200 shadow-sm">
            <CardBody className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <Icon icon={stat.icon} className={`text-xl text-${stat.color}-500`} />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:history-bold" className="text-lg text-blue-500" />
                  <h3 className="font-semibold text-slate-800">กิจกรรมล่าสุด</h3>
                </div>
                <Button size="sm" variant="light" color="primary">
                  ดูทั้งหมด
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {[
                  { action: "เพิ่มผู้ใช้ใหม่", user: "อาจารย์สมชาย", time: "5 นาทีที่แล้ว", icon: "solar:user-plus-linear", color: "green" },
                  { action: "นำเข้านักศึกษา 50 คน", user: "Admin", time: "1 ชั่วโมงที่แล้ว", icon: "solar:upload-linear", color: "blue" },
                  { action: "สร้างรายวิชาใหม่", user: "Admin", time: "2 ชั่วโมงที่แล้ว", icon: "solar:book-linear", color: "purple" },
                  { action: "แก้ไขข้อมูล Section", user: "Admin", time: "3 ชั่วโมงที่แล้ว", icon: "solar:pen-linear", color: "orange" },
                  { action: "ลบนักศึกษาออก", user: "Admin", time: "5 ชั่วโมงที่แล้ว", icon: "solar:trash-bin-trash-linear", color: "red" },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${activity.color}-100`}>
                      <Icon icon={activity.icon} className={`text-sm text-${activity.color}-500`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{activity.action}</p>
                      <p className="text-xs text-slate-500">โดย {activity.user}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Server Status */}
        <div>
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:server-bold" className="text-lg text-blue-500" />
                  <h3 className="font-semibold text-slate-800">สถานะเซิร์ฟเวอร์</h3>
                </div>
                <Button 
                  isIconOnly 
                  size="sm" 
                  variant="light"
                  onPress={fetchMetrics}
                  isLoading={metricsLoading}
                >
                  <Icon icon="solar:refresh-linear" className="text-lg" />
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-4">
              {metrics ? (
                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700">ระบบทำงานปกติ</span>
                  </div>

                  {/* CPU */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600">CPU</span>
                      <span className="font-medium text-slate-800">{metrics.cpu?.usage?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${metrics.cpu?.usage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600">Memory</span>
                      <span className="font-medium text-slate-800">{metrics.memory?.usagePercent?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (metrics.memory?.usagePercent || 0) > 80 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${metrics.memory?.usagePercent || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {metrics.memory?.usedGB?.toFixed(1)} / {metrics.memory?.totalGB?.toFixed(1)} GB
                    </p>
                  </div>

                  {/* Info */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Hostname</span>
                      <span className="text-slate-700 font-medium">{metrics.system?.hostname}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Uptime</span>
                      <span className="text-slate-700 font-medium">{formatUptime(metrics.system?.uptime || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Platform</span>
                      <span className="text-slate-700 font-medium">{metrics.system?.platform}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6 border border-slate-200 shadow-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icon icon="solar:widget-5-bold" className="text-lg text-blue-500" />
            <h3 className="font-semibold text-slate-800">เมนูด่วน</h3>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "เพิ่มผู้ใช้", icon: "solar:user-plus-linear", color: "blue", href: "/admin/users/add" },
              { label: "นำเข้านักศึกษา", icon: "solar:upload-linear", color: "green", href: "/admin/students/import" },
              { label: "สร้างรายวิชา", icon: "solar:book-2-linear", color: "purple", href: "/admin/courses/add" },
              { label: "จัดการ Section", icon: "solar:layers-linear", color: "orange", href: "/admin/sections" },
              { label: "ดู Logs", icon: "solar:document-text-linear", color: "slate", href: "/admin/logs" },
              { label: "ตั้งค่าระบบ", icon: "solar:settings-linear", color: "red", href: "/admin/settings" },
            ].map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2 h-auto py-4 rounded-xl bg-default-100 hover:bg-default-200 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${action.color}-100`}>
                  <Icon icon={action.icon} className={`text-xl text-${action.color}-500`} />
                </div>
                <span className="text-xs text-slate-600">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
