"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Avatar } from "@heroui/avatar";
import { Tooltip } from "@heroui/tooltip";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Icon } from "@iconify/react";
import { IoSchool } from "react-icons/io5";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  href: string;
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
    href: "/admin/users",
  },
  {
    key: "students",
    label: "นักศึกษา",
    icon: "solar:square-academic-cap-bold",
    href: "/admin/students",
  },
  {
    key: "courses",
    label: "รายวิชา",
    icon: "solar:book-bookmark-bold",
    href: "/admin/courses",
  },
  {
    key: "logs",
    label: "System Logs",
    icon: "solar:document-text-bold",
    href: "/admin/logs",
  },
  {
    key: "settings",
    label: "ตั้งค่า",
    icon: "solar:settings-bold",
    href: "/admin/settings",
  },
];

// Page titles mapping
const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/admin/dashboard': { title: 'ภาพรวมระบบ', subtitle: 'Admin Dashboard' },
  '/admin/users': { title: 'จัดการผู้ใช้งาน', subtitle: 'User Management' },
  '/admin/students': { title: 'จัดการนักศึกษา', subtitle: 'Student Management' },
  '/admin/courses': { title: 'จัดการรายวิชา', subtitle: 'Course Management' },
  '/admin/logs': { title: 'System Logs', subtitle: 'Activity Logs' },
  '/admin/settings': { title: 'ตั้งค่าระบบ', subtitle: 'System Settings' },
};

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    user,
    isLoading,
    sidebarCollapsed,
    setSidebarCollapsed,
    handleLogout,
  } = useAdmin();

  const pageInfo = pageTitles[pathname] || { title: 'Admin Panel' };

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
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
              <IoSchool />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-slate-800 text-sm">ITII Assist Classroom</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {menuItems.map((item) => (
            <Tooltip key={item.key} content={item.label} placement="right" isDisabled={!sidebarCollapsed}>
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
              <h1 className="text-lg font-semibold text-slate-800">{pageInfo.title}</h1>
              {pageInfo.subtitle && <p className="text-xs text-slate-500">{pageInfo.subtitle}</p>}
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
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
