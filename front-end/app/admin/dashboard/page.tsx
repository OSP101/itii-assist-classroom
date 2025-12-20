"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { authService, apiService, User } from "@/services";
import { API_ENDPOINTS } from "@/config/api";

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Check role
    const storedUser = authService.getStoredUser();
    if (!storedUser || storedUser.role !== 'admin') {
      addToast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        color: "danger",
      });
      router.push('/login');
      return;
    }

    setUser(storedUser);
    setIsLoading(false);
    fetchMetrics();

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [router]);

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

  const handleLogout = async () => {
    await authService.logout();
    addToast({
      title: "ออกจากระบบสำเร็จ",
      description: "กำลังนำท่านไปยังหน้าเข้าสู่ระบบ",
      color: "success",
    });
    router.push('/login');
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-300/50">
                <Icon icon="solar:graduation-cap-bold" className="text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ITII Assist classroom</h1>
                <p className="text-xs text-slate-500">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{user?.display_name}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={handleLogout}
                startContent={<Icon icon="solar:logout-2-linear" />}
              >
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            สวัสดี, {user?.display_name} 👋
          </h2>
          <p className="text-slate-500 mt-1">
            ยินดีต้อนรับสู่ระบบจัดการ ITII Assist classroom
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-blue-100">
            <CardBody className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon icon="solar:users-group-rounded-bold" className="text-2xl text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-sm text-slate-500">ผู้ใช้ทั้งหมด</p>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-blue-100">
            <CardBody className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon icon="solar:user-check-rounded-bold" className="text-2xl text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-sm text-slate-500">นักศึกษา</p>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-blue-100">
            <CardBody className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon icon="solar:book-bookmark-bold" className="text-2xl text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-sm text-slate-500">รายวิชา</p>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-blue-100">
            <CardBody className="flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Icon icon="solar:clipboard-check-bold" className="text-2xl text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-sm text-slate-500">การเช็คชื่อวันนี้</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server Info */}
          <Card className="border border-blue-100">
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon icon="solar:server-bold" className="text-xl text-blue-500" />
                <h3 className="text-lg font-semibold text-slate-800">ข้อมูลเซิร์ฟเวอร์</h3>
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
            </CardHeader>
            <Divider />
            <CardBody>
              {metrics ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hostname</span>
                    <span className="font-medium text-slate-800">{metrics.system?.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Platform</span>
                    <span className="font-medium text-slate-800">{metrics.system?.platform} ({metrics.system?.arch})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Node.js</span>
                    <span className="font-medium text-slate-800">{metrics.system?.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uptime</span>
                    <span className="font-medium text-slate-800">{formatUptime(metrics.system?.uptime || 0)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Resource Usage */}
          <Card className="border border-blue-100">
            <CardHeader className="flex items-center gap-2">
              <Icon icon="solar:chart-2-bold" className="text-xl text-blue-500" />
              <h3 className="text-lg font-semibold text-slate-800">การใช้ทรัพยากร</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {metrics ? (
                <div className="space-y-6">
                  {/* CPU */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Icon icon="solar:cpu-bolt-linear" className="text-lg" />
                        CPU
                      </span>
                      <span className="font-medium text-slate-800">{metrics.cpu?.usage?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${metrics.cpu?.usage || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{metrics.cpu?.info?.cores} cores @ {metrics.cpu?.info?.speed} MHz</p>
                  </div>

                  {/* Memory */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Icon icon="solar:ram-linear" className="text-lg" />
                        Memory
                      </span>
                      <span className="font-medium text-slate-800">{metrics.memory?.usagePercent?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (metrics.memory?.usagePercent || 0) > 80
                            ? 'bg-gradient-to-r from-red-400 to-red-500'
                            : 'bg-gradient-to-r from-green-400 to-green-500'
                        }`}
                        style={{ width: `${metrics.memory?.usagePercent || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {metrics.memory?.usedGB?.toFixed(2)} GB / {metrics.memory?.totalGB?.toFixed(2)} GB
                    </p>
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

        {/* Quick Actions */}
        <Card className="mt-6 border border-blue-100">
          <CardHeader className="flex items-center gap-2">
            <Icon icon="solar:widget-5-bold" className="text-xl text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-800">เมนูลัด</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="flat"
                className="h-auto py-4 flex-col gap-2"
                onPress={() => router.push('/admin/users')}
              >
                <Icon icon="solar:users-group-rounded-linear" className="text-2xl text-blue-500" />
                <span className="text-sm">จัดการผู้ใช้</span>
              </Button>
              <Button
                variant="flat"
                className="h-auto py-4 flex-col gap-2"
                onPress={() => router.push('/admin/students')}
              >
                <Icon icon="solar:user-plus-linear" className="text-2xl text-green-500" />
                <span className="text-sm">จัดการนักศึกษา</span>
              </Button>
              <Button
                variant="flat"
                className="h-auto py-4 flex-col gap-2"
                onPress={() => router.push('/admin/logs')}
              >
                <Icon icon="solar:document-text-linear" className="text-2xl text-purple-500" />
                <span className="text-sm">ดู Logs</span>
              </Button>
              <Button
                variant="flat"
                className="h-auto py-4 flex-col gap-2"
                onPress={() => router.push('/admin/settings')}
              >
                <Icon icon="solar:settings-linear" className="text-2xl text-orange-500" />
                <span className="text-sm">ตั้งค่าระบบ</span>
              </Button>
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
