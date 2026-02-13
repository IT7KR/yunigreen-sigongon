"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FolderKanban, Plus, User } from "lucide-react";
import { cn } from "@sigongon/ui";
import { OfflineBanner } from "./camera/OfflineBanner";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
}

const navItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/projects", icon: FolderKanban, label: "프로젝트" },
  { href: "/projects/new", icon: Plus, label: "새 작업" },
  { href: "/profile", icon: User, label: "내 정보" },
];

export function MobileLayout({
  children,
  title,
  showBack,
  rightAction,
}: MobileLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
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

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2",
                  isActive
                    ? "text-brand-point-600"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
