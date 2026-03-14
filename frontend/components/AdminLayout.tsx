"use client";

import { createContext, useContext, type ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Shield,
  BarChart3,
  Building2,
  HardHat,
  Calculator,
  UserCheck,
  UserPlus,
  Package,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AppLink,
  Button,
  ContentTransitionBoundary,
  PrimitiveButton,
  cn,
  useNavigationProgress,
  useIsTablet,
} from "@sigongcore/ui";
import { useAuth } from "@/lib/auth";
import Image from "next/image";
import { AdminContentLoadingOverlay } from "./AdminContentLoadingOverlay";
import { AdminBottomNav } from "./AdminBottomNav";
import { useUnreadCount } from "@/hooks/useNotifications";
import { NavBadge } from "./NavBadge";
import { NotificationDropdown } from "./NotificationDropdown";
import { WithdrawalBanner } from "./WithdrawalBanner";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminShellContext = createContext(false);

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
      { href: "/labor/workers", label: "근로자 관리", icon: UserCheck },
      { href: "/labor/contracts", label: "근로계약", icon: FileText },
      { href: "/labor/payroll", label: "급여/근무 관리", icon: Calculator },
      { href: "/labor/settings", label: "보험요율 설정", icon: Settings },
    ],
  },
  {
    href: "/organization/field-representatives",
    icon: FileText,
    label: "현장대리인",
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
  { href: "/sa/billing-policy", icon: CreditCard, label: "체험/결제 정책" },
  { href: "/sa/users", icon: Users, label: "전체 사용자" },
  { href: "/sa/notifications", icon: Bell, label: "공지/알림" },
  {
    href: "/sa/estimation-governance",
    icon: FileSpreadsheet,
    label: "적산 운영",
  },
  { href: "/sa/material-masters", icon: Package, label: "자재 마스터" },
  { href: "/sa/labor", icon: HardHat, label: "노무 모니터링" },
];

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  children?: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
};

function AdminLayoutFrame({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const { start } = useNavigationProgress();
  const isTablet = useIsTablet();
  const unreadCount = useUnreadCount();
  const router = useRouter();

  // Workers should never see AdminLayout — redirect them immediately
  useEffect(() => {
    if (user?.role === "worker") {
      router.replace("/worker/home");
    }
  }, [user?.role, router]);

  const isPathActive = (target: string) =>
    pathname === target || pathname.startsWith(`${target}/`);

  // Auto-expand menu if current path matches
  const autoExpandedMenu = navItems.find(
    (item) =>
      "children" in item &&
      item.children &&
      item.children.some((child) => isPathActive(child.href)),
  );
  const effectiveExpanded =
    expandedMenu ?? (autoExpandedMenu ? autoExpandedMenu.href : null);
  const visibleNavItems =
    user?.role === "super_admin"
      ? navItems.filter((item) => item.href !== "/labor")
      : navItems;

  return (
    <div className="isolate min-h-screen bg-slate-50">
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-point-500 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>

      {/* Swipe Overlay - Mobile Only */}
      <div 
        className="fixed inset-y-0 right-0 z-[55] w-6 lg:hidden"
        style={{ pointerEvents: sidebarOpen ? 'none' : 'auto' }}
        onPointerDown={(e) => {
          // This invisible edge area captures the initial swipe to open
          // But it shouldn't block content when sidebar is open
        }}
      />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="메뉴 닫기"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        id="main-sidebar"
        aria-label="주 메뉴"
        initial={false}
        animate={{ 
          x: isTablet ? (sidebarOpen ? 0 : "100%") : 0,
        }}
        transition={{ 
          type: "spring", 
          damping: 25, 
          stiffness: 200,
          mass: 0.8
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.1 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80) {
            setSidebarOpen(false);
          }
        }}
        className={cn(
          "fixed inset-y-0 right-0 z-[60] flex w-64 flex-col bg-white shadow-lg lg:left-0 lg:right-auto lg:!transform-none lg:shadow-none",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <AppLink href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo-sq.png"
              alt="시공코어 로고"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-semibold text-slate-900">시공코어</span>
          </AppLink>

          <div className="flex items-center gap-1">
            {/* 벨 아이콘 - 데스크톱에서만 표시 (모바일은 X 버튼과 겹침) */}
            <NotificationDropdown
              notificationsHref={user?.role === "super_admin" ? "/sa/notifications" : "/notifications"}
              align="left"
              className="hidden lg:flex"
            />

            <PrimitiveButton
              onClick={() => setSidebarOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </PrimitiveButton>
          </div>
        </div>

        {/* User Profile Card - Mobile Only */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-5 lg:hidden">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-slate-900">
                {user?.name}
              </p>
              <p className="text-sm font-medium text-brand-point-600">
                {user?.role === "super_admin"
                  ? "최고관리자"
                  : user?.role === "company_admin"
                    ? "대표"
                    : user?.role === "site_manager"
                      ? "현장소장"
                      : "작업자"}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <AppLink
              href="/mypage"
              onClick={() => setSidebarOpen(false)}
              className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 active:scale-[0.98] transition-transform"
            >
              내 정보
            </AppLink>
            <button
              onClick={() => {
                setSidebarOpen(false);
                logout();
              }}
              className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-red-600 active:scale-[0.98] transition-transform"
            >
              로그아웃
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {visibleNavItems.map((item) => {
            const hasChildren =
              "children" in item && item.children && item.children.length > 0;
            const hasActiveChild =
              hasChildren &&
              item.children!.some((child) => isPathActive(child.href));
            const isActive = hasActiveChild || isPathActive(item.href);
            const isExpanded = effectiveExpanded === item.href;

            if (hasChildren) {
              return (
                <div key={item.href}>
                  <PrimitiveButton
                    onClick={() =>
                      setExpandedMenu(isExpanded ? null : item.href)
                    }
                    aria-expanded={isExpanded}
                    aria-controls={`submenu-${item.href.replace(/\//g, "-")}`}
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
                    <div
                      id={`submenu-${item.href.replace(/\//g, "-")}`}
                      className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-3"
                    >
                      {item.children!.map((child) => {
                        const isChildActive = isPathActive(child.href);
                        return (
                          <AppLink
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
                          </AppLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <AppLink
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-point-50 text-brand-point-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/notifications" && <NavBadge count={unreadCount} />}
                </span>
                {item.label}
              </AppLink>
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
                  <AppLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-purple-50 text-purple-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span className="relative">
                      <item.icon className="h-5 w-5" />
                      {item.href === "/sa/notifications" && <NavBadge count={unreadCount} />}
                    </span>
                    {item.label}
                  </AppLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="mt-auto hidden shrink-0 border-t border-slate-200 p-4 lg:block">
          <AppLink
            href="/mypage"
            onClick={() => setSidebarOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-point-100 text-sm font-bold text-brand-point-700">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">
                {user?.name}
              </p>
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
          </AppLink>
          <Button
            variant="ghost"
            fullWidth
            className="justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              start();
              logout();
            }}
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </Button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="lg:ml-64 pb-nav-safe lg:pb-0">
        <WithdrawalBanner />
        {/* 모바일 상단 헤더 */}
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <AppLink href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo-sq.png"
              alt="시공코어 로고"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-semibold text-slate-900">시공코어</span>
          </AppLink>
          <div className="flex items-center gap-1">
            <NotificationDropdown
              notificationsHref={user?.role === "super_admin" ? "/sa/notifications" : "/notifications"}
            />
            <PrimitiveButton
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </PrimitiveButton>
          </div>
        </div>
        <ContentTransitionBoundary
          className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:p-8"
          loadingOverlay={<AdminContentLoadingOverlay />}
        >
          <div id="main-content">{children}</div>
        </ContentTransitionBoundary>
      </main>
      <AdminBottomNav />
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const isInPersistentShell = useContext(AdminShellContext);

  if (isInPersistentShell) {
    return <>{children}</>;
  }

  return <AdminLayoutFrame>{children}</AdminLayoutFrame>;
}

export function AdminAppShell({ children }: AdminLayoutProps) {
  return (
    <AdminShellContext.Provider value={true}>
      <AdminLayoutFrame>{children}</AdminLayoutFrame>
    </AdminShellContext.Provider>
  );
}
