"use client";

import { useRef, useState, useEffect } from "react";
import { Bell, FileText, CreditCard } from "lucide-react";
import { cn } from "@sigongcore/ui";
import { AppLink } from "@sigongcore/ui";
import { useNotifications } from "@/hooks/useNotifications";
import { NavBadge } from "./NavBadge";

const typeConfig = {
  contract: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  paystub: { icon: CreditCard, color: "text-green-600", bg: "bg-green-50" },
  notice: { icon: Bell, color: "text-amber-600", bg: "bg-amber-50" },
};

import { motion, AnimatePresence } from "framer-motion";

interface NotificationDropdownProps {
  notificationsHref: string;
  position?: "bottom" | "top";
  align?: "left" | "right";
  className?: string;
}

export function NotificationDropdown({
  notificationsHref,
  position = "bottom",
  align = "right",
  className,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, isLoading, markRead, markAllRead, unreadCount } =
    useNotifications();

  const recent = notifications.slice(0, 7);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"
        aria-label="알림"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <NavBadge count={unreadCount} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={cn(
              "absolute z-[70] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden",
              align === "right" ? "right-0" : "left-0",
              position === "top" ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <span className="text-sm font-bold text-slate-900">알림</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    void markAllRead();
                  }}
                  className="text-xs font-bold text-brand-point-600 hover:text-brand-point-700 active:scale-95 transition-transform"
                >
                  모두 읽음
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[min(480px,70vh)] overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
                    <span>불러오는 중...</span>
                  </div>
                </div>
              ) : recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                    <Bell className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">알림이 없습니다.</p>
                  <p className="mt-1 text-xs text-slate-400">새로운 알림이 오면 여기에 표시됩니다.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100/50">
                  {recent.map((notification) => {
                    const config = typeConfig[notification.type] || typeConfig.notice;
                    const Icon = config.icon;
                    return (
                      <li
                        key={notification.id}
                        onClick={() => {
                          if (!notification.read) void markRead(notification.id);
                        }}
                        className={cn(
                          "flex cursor-pointer items-start gap-3.5 px-4 py-4 transition-colors hover:bg-slate-50/80 active:bg-slate-100/50",
                          !notification.read && "bg-blue-50/20",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                            config.bg,
                          )}
                        >
                          <Icon className={cn("h-4.5 w-4.5", config.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "truncate text-sm text-slate-900",
                                !notification.read ? "font-bold" : "font-medium",
                              )}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-point-500 shadow-[0_0_8px_rgba(var(--brand-point-rgb),0.4)]" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                            {notification.message}
                          </p>
                          <p className="mt-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                            {notification.time}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/30 p-2.5">
              <AppLink
                href={notificationsHref}
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-bold text-brand-point-600 hover:bg-brand-point-50 active:scale-[0.98] transition-all"
              >
                전체 보기
              </AppLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
