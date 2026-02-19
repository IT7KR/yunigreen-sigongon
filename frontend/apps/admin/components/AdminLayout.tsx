"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  FileSpreadsheet,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Droplets,
  Shield,
  BarChart3,
  Building2,
  HardHat,
  Calculator,
  UserCheck,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button, PrimitiveButton, cn } from "@sigongon/ui";
import { useAuth } from "@/lib/auth";
import Image from "next/image";

interface AdminLayoutProps {
  children: ReactNode;
}

// 일반 사용자용 메뉴 (company_admin, site_manager)
const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/projects", icon: FolderKanban, label: "프로젝트" },
  { href: "/estimates", icon: FileText, label: "견적서" },
  {
    href: "/labor",
    icon: HardHat,
    label: "노무관리",
    children: [
      { href: "/labor", label: "대시보드", icon: BarChart3 },
      { href: "/labor/payroll", label: "급여/근무 관리", icon: Calculator },
      { href: "/labor/workers", label: "근로자 주소록", icon: UserCheck },
      { href: "/labor/representatives", label: "현장대리인 관리", icon: FileText },
      { href: "/labor/settings", label: "보험요율 설정", icon: Settings },
    ],
  },
  {
    href: "/users",
    icon: Users,
    label: "사용자",
    children: [
      { href: "/users", label: "사용자 목록", icon: Users },
      { href: "/onboarding/invite", label: "초대 발송", icon: UserPlus },
    ],
  },
  { href: "/customers", icon: Building2, label: "발주처" },
  { href: "/partners", icon: Users, label: "협력사" },
  { href: "/billing", icon: FileText, label: "결제/구독" },
  { href: "/settings", icon: Settings, label: "설정" },
];

// 슈퍼어드민 전용 사이드바 메뉴
const saNavItems = [
  { href: "/sa", icon: BarChart3, label: "플랫폼 현황", exact: true },
  { href: "/sa/tenants", icon: Building2, label: "고객사 관리" },
  { href: "/sa/users", icon: Users, label: "전체 사용자" },
  { href: "/sa/seasons", icon: Sparkles, label: "시즌 관리" },
  { href: "/sa/pricebooks", icon: FileSpreadsheet, label: "적산 자료" },
  { href: "/sa/labor", icon: HardHat, label: "노무 관리" },
];

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  children?: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { logout, user } = useAuth();

  const isPathActive = (target: string) =>
    pathname === target || pathname.startsWith(`${target}/`);

  // Auto-expand menu if current path matches
  const autoExpandedMenu = navItems.find(
    (item) =>
      "children" in item &&
      item.children &&
      item.children.some((child) => isPathActive(child.href)),
  );
  const effectiveExpanded = expandedMenu ?? (autoExpandedMenu ? autoExpandedMenu.href : null);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-point-500 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <PrimitiveButton
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
          aria-label="메뉴 열기"
          aria-expanded={sidebarOpen}
          aria-controls="main-sidebar"
        >
          <Menu className="h-6 w-6" />
        </PrimitiveButton>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-point-500 text-white">
            <Droplets className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-900">시공ON</span>
        </Link>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="메뉴 닫기"
          role="button"
          tabIndex={-1}
        />
      )}

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        aria-label="주 메뉴"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-white shadow-lg transition-transform lg:translate-x-0 lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo-sq.png"
              alt="시공ON 로고"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-semibold text-slate-900">시공ON 관리자</span>
          </Link>

          <PrimitiveButton
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </PrimitiveButton>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const hasChildren = "children" in item && item.children && item.children.length > 0;
            const hasActiveChild =
              hasChildren &&
              item.children!.some((child) => isPathActive(child.href));
            const isActive = hasActiveChild || isPathActive(item.href);
            const isExpanded = effectiveExpanded === item.href;

            if (hasChildren) {
              return (
                <div key={item.href}>
                  <PrimitiveButton
                    onClick={() => setExpandedMenu(isExpanded ? null : item.href)}
                    aria-expanded={isExpanded}
                    aria-controls={`submenu-${item.href.replace(/\//g, '-')}`}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-point-50 text-brand-point-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {isExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </PrimitiveButton>
                  {isExpanded && (
                    <div id={`submenu-${item.href.replace(/\//g, '-')}`} className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-3">
                      {item.children!.map((child) => {
                        const isChildActive = isPathActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              isChildActive
                                ? "bg-brand-point-50 font-medium text-brand-point-700"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-point-50 text-brand-point-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {/* Super Admin Menu - only visible to super_admin role */}
          {user?.role === "super_admin" && (
            <>
              <div className="my-4 border-t border-slate-200" />
              <div className="mb-2 flex items-center gap-2 px-3">
                <Shield className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  최고관리자
                </span>
              </div>
              {saNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-purple-50 text-purple-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-4">
          <Link
            href="/mypage"
            onClick={() => setSidebarOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-point-100 text-sm font-bold text-brand-point-700">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user?.role === "super_admin"
                  ? "최고관리자"
                  : user?.role === "company_admin"
                    ? "대표"
                    : user?.role === "site_manager"
                      ? "현장소장"
                      : "작업자"}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            fullWidth
            className="justify-start gap-3"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        <div id="main-content" className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
