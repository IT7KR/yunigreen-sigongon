"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  HardHat,
  Menu,
  BarChart3,
  Building2,
  FileText,
  CreditCard,
  User,
  Home,
  Bell,
} from "lucide-react";
import { AppLink, cn } from "@sigongcore/ui";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { NavBadge } from "./NavBadge";

interface AdminBottomNavProps {
  onOpenSidebar: () => void;
}

export function AdminBottomNav({ onOpenSidebar }: AdminBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadCount = useUnreadCount();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  // 역할별 탭 구성
  const tabsByRole = () => {
    if (user?.role === "worker") {
      return [
        { href: "/worker/home", icon: Home, label: "홈" },
        { href: "/worker/contracts", icon: FileText, label: "계약" },
        { href: "/worker/paystubs", icon: CreditCard, label: "명세서" },
        { href: "/worker/notifications", icon: Bell, label: "알림", isNotif: true },
        { href: "/worker/profile", icon: User, label: "내 정보" },
      ];
    }
    if (user?.role === "super_admin") {
      return [
        { href: "/sa", icon: BarChart3, label: "플랫폼현황", exact: true },
        { href: "/sa/tenants", icon: Building2, label: "고객사" },
        { href: "/sa/labor", icon: HardHat, label: "노무" },
        { href: "/sa/notifications", icon: Bell, label: "알림", isNotif: true },
      ];
    }
    if (user?.role === "site_manager") {
      return [
        { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
        { href: "/projects", icon: FolderKanban, label: "프로젝트" },
        { href: "/notifications", icon: Bell, label: "알림", isNotif: true },
      ];
    }
    // company_admin (기본)
    return [
      { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
      { href: "/projects", icon: FolderKanban, label: "프로젝트" },
      { href: "/labor", icon: HardHat, label: "노무관리" },
      { href: "/notifications", icon: Bell, label: "알림", isNotif: true },
    ];
  };

  const tabs = tabsByRole();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-safe lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href, (tab as any).exact);
          const showBadge = (tab as any).isNotif;
          return (
            <AppLink
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center gap-1 flex-1 py-2 transition-transform duration-150 active:scale-95",
                active ? "text-brand-point-600" : "text-slate-500",
              )}
            >
              <span
                className={cn(
                  "absolute -top-px h-0.5 w-8 rounded-full bg-brand-point-500 transition-opacity duration-150",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="relative">
                <tab.icon className="h-6 w-6" />
                {showBadge && <NavBadge count={unreadCount} />}
              </span>
              <span className="text-xs font-medium">{tab.label}</span>
            </AppLink>
          );
        })}

        {/* 더보기 탭 - worker 역할 제외 */}
        {user?.role !== "worker" && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="relative flex flex-col items-center gap-1 flex-1 py-2 text-slate-500 active:scale-95 transition-transform duration-150"
            aria-label="메뉴 열기"
          >
            <Menu className="h-6 w-6" />
            <span className="text-xs font-medium">더보기</span>
          </button>
        )}
      </div>
    </nav>
  );
}
