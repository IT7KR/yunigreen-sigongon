"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, FileText, Home, User, LogOut } from "lucide-react";
import { AppLink, cn, useAppNavigation } from "@sigongcore/ui";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { NavBadge } from "./NavBadge";
import Image from "next/image";

interface WorkerLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
}

const workerNavItems = [
  { href: "/worker/home", icon: Home, label: "홈" },
  { href: "/worker/contracts", icon: FileText, label: "계약" },
  { href: "/worker/paystubs", icon: CreditCard, label: "명세서" },
  { href: "/worker/profile", icon: User, label: "내 정보" },
];

const workerMobileNavItems = [
  { href: "/worker/home", icon: Home, label: "홈" },
  { href: "/worker/contracts", icon: FileText, label: "계약" },
  { href: "/worker/paystubs", icon: CreditCard, label: "명세서" },
  { href: "/worker/notifications", icon: Bell, label: "알림", isNotif: true },
  { href: "/worker/profile", icon: User, label: "내 정보" },
];

export function WorkerLayout({
  children,
  title,
  showBack,
  rightAction,
}: WorkerLayoutProps) {
  const pathname = usePathname();
  const navigation = useAppNavigation();
  const { user, logout } = useAuth();
  const unreadCount = useUnreadCount();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigation.back();
      return;
    }
    navigation.push("/worker/home");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-point-500 focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 건너뛰기
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-4">
          <AppLink href="/worker/home" className="flex items-center gap-2">
            <Image
              src="/logo-sq.png"
              alt="시공코어 로고"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-semibold text-slate-900">시공코어</span>
          </AppLink>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {workerNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isNotif = item.href === "/worker/notifications";
            return (
              <AppLink
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-point-50 text-brand-point-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {isNotif && <NavBadge count={unreadCount} />}
                </span>
                {item.label}
              </AppLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-4">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-point-100 text-sm font-bold text-brand-point-700">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">근로자</p>
            </div>
          </div>
          <AppLink
            href="/worker/notifications"
            className={cn(
              "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/worker/notifications" || pathname.startsWith("/worker/notifications/")
                ? "bg-brand-point-50 text-brand-point-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <span className="relative">
              <Bell className="h-5 w-5" />
              <NavBadge count={unreadCount} />
            </span>
            알림
          </AppLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {title && (
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showBack && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
                    aria-label="뒤로 가기"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              </div>
              {rightAction && <div>{rightAction}</div>}
            </div>
          </header>
        )}

        <main id="main-content" className="flex-1 pb-nav-safe lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-safe lg:hidden">
        <div className="flex h-16 items-center justify-around">
          {workerMobileNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isNotif = item.href === "/worker/notifications";

            return (
              <AppLink
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-4 py-2 transition-transform duration-150 active:scale-95",
                  isActive
                    ? "text-brand-point-600"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <span
                  className={cn(
                    "absolute -top-px h-0.5 w-8 rounded-full bg-brand-point-500 transition-opacity duration-150",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="relative">
                  <item.icon className="h-6 w-6" />
                  {isNotif && <NavBadge count={unreadCount} />}
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </AppLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
