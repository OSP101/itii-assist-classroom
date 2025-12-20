"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Tooltip } from "@heroui/tooltip";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Icon } from "@iconify/react";
import { addToast } from "@heroui/toast";
import { authService, apiService, User } from "@/services";
import { API_ENDPOINTS } from "@/config/api";
import { IoSchool } from "react-icons/io5";

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

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    key: "overview",
    label: "ภาพรวม",
    icon: "solar:home-2-bold",
    href: "/admin/dashboard",
  },
  {
    key: "users",
    label: "ผู้ใช้งาน",
    icon: "solar:users-group-rounded-bold",
    children: [
      { key: "users-list", label: "รายชื่อผู้ใช้", icon: "solar:user-linear", href: "/admin/users" },
      { key: "users-add", label: "เพิ่มผู้ใช้", icon: "solar:user-plus-linear", href: "/admin/users/add" },
    ],
  },
  {
    key: "students",
    label: "นักศึกษา",
    icon: "solar:square-academic-cap-bold",
    children: [
      { key: "students-list", label: "รายชื่อนักศึกษา", icon: "solar:users-group-two-rounded-linear", href: "/admin/students" },
      { key: "students-import", label: "นำเข้าข้อมูล", icon: "solar:upload-linear", href: "/admin/students/import" },
    ],
  },
  {
    key: "courses",
    label: "รายวิชา",
    icon: "solar:book-bookmark-bold",
    children: [
      { key: "courses-list", label: "รายวิชาทั้งหมด", icon: "solar:book-linear", href: "/admin/courses" },
      { key: "courses-add", label: "เพิ่มรายวิชา", icon: "solar:add-square-linear", href: "/admin/courses/add" },
      { key: "sections", label: "จัดการ Section", icon: "solar:layers-linear", href: "/admin/sections" },
    ],
  },
  {
    key: "analytics",
    label: "วิเคราะห์ & Logs",
    icon: "solar:chart-2-bold",
    children: [
      { key: "logs", label: "System Logs", icon: "solar:document-text-linear", href: "/admin/logs" },
      { key: "analytics", label: "สถิติการใช้งาน", icon: "solar:graph-up-linear", href: "/admin/analytics" },
    ],
  },
  {
    key: "settings",
    label: "ตั้งค่า",
    icon: "solar:settings-bold",
    href: "/admin/settings",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["overview"]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

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

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const isMenuActive = (item: MenuItem): boolean => {
    if (item.href === pathname) return true;
    if (item.children) {
      return item.children.some(child => child.href === pathname);
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
              
              <IoSchool />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-slate-800 text-sm">ITII Assist Classroom</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {menuItems.map((item) => (
            <div key={item.key}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isMenuActive(item)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon={item.icon} className="text-lg" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <Icon 
                        icon="solar:alt-arrow-down-linear" 
                        className={`text-sm transition-transform ${
                          expandedMenus.includes(item.key) ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>
                  {!sidebarCollapsed && expandedMenus.includes(item.key) && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.key}
                          href={child.href || '#'}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === child.href
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <Icon icon={child.icon} className="text-base" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Tooltip content={item.label} placement="right" isDisabled={!sidebarCollapsed}>
                  <Link
                    href={item.href || '#'}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon icon={item.icon} className="text-lg" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                </Tooltip>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 bg-white">
          <Tooltip content={sidebarCollapsed ? "ขยาย" : "ย่อ"} placement="right">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Icon 
                icon={sidebarCollapsed ? "solar:alt-arrow-right-linear" : "solar:alt-arrow-left-linear"} 
                className="text-lg" 
              />
              {!sidebarCollapsed && <span className="text-sm">ย่อเมนู</span>}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">ภาพรวมระบบ</h1>
              <p className="text-xs text-slate-500">Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Tooltip content="การแจ้งเตือน">
                <Button isIconOnly variant="light" size="sm">
                  <Icon icon="solar:bell-linear" className="text-xl text-slate-600" />
                </Button>
              </Tooltip>

              {/* User Menu */}
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <button className="flex items-center gap-3 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
                    <Avatar
                      name={user?.display_name}
                      size="sm"
                      className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                    />
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-slate-800">{user?.display_name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <Icon icon="solar:alt-arrow-down-linear" className="text-slate-400" />
                  </button>
                </DropdownTrigger>
                <DropdownMenu aria-label="User menu">
                  <DropdownItem key="profile" startContent={<Icon icon="solar:user-linear" />}>
                    โปรไฟล์
                  </DropdownItem>
                  <DropdownItem key="settings" startContent={<Icon icon="solar:settings-linear" />}>
                    ตั้งค่า
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
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
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
        </main>
      </div>
    </div>
  );
}
