"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, FileText, Home, FolderKanban, Plus, User } from "lucide-react";
import {
  AppLink,
  cn,
  useAppNavigation,
  useNavigationProgress,
} from "@sigongon/ui";
import { OfflineBanner } from "./camera/OfflineBanner";
import { useAuth } from "@/lib/auth";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
}

const managerNavItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/projects", icon: FolderKanban, label: "프로젝트" },
  { href: "/projects/new", icon: Plus, label: "새 작업" },
  { href: "/notifications", icon: Bell, label: "알림" },
  { href: "/profile", icon: User, label: "내 정보" },
];

const workerNavItems = [
  { href: "/worker/home", icon: Home, label: "홈" },
  { href: "/worker/contracts", icon: FileText, label: "계약" },
  { href: "/worker/paystubs", icon: CreditCard, label: "명세서" },
  { href: "/notifications", icon: Bell, label: "알림" },
  { href: "/worker/profile", icon: User, label: "내 정보" },
];

export function MobileLayout({
  children,
  title,
  showBack,
  rightAction,
}: MobileLayoutProps) {
  const pathname = usePathname();
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const { isNavigating } = useNavigationProgress();
  const navItems = user?.role === "worker" ? workerNavItems : managerNavItems;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigation.back();
      return;
    }
    navigation.push("/");
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50 transition-opacity duration-150 data-[navigating=true]:opacity-[0.99]"
      data-navigating={isNavigating ? "true" : "false"}
    >
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-point-500 focus:px-4 focus:py-2 focus:text-white"
      >
        본문으로 건너뛰기
      </a>
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

      <OfflineBanner />

      <main id="main-content" className="flex-1 pb-nav-safe">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-safe">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

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
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </AppLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
