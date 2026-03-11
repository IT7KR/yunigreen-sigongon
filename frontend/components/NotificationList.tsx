"use client";

import { useState } from "react";
import { Bell, CreditCard, FileText } from "lucide-react";
import { Button, Card, CardContent, Skeleton } from "@sigongcore/ui";
import { cn } from "@sigongcore/ui";
import type { AppNotification } from "@sigongcore/types";

interface NotificationListProps {
  notifications: AppNotification[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  unreadCount: number;
}

const typeConfig = {
  contract: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  paystub: { icon: CreditCard, color: "text-green-600", bg: "bg-green-50" },
  notice: { icon: Bell, color: "text-amber-600", bg: "bg-amber-50" },
};

export function NotificationList({
  notifications,
  isLoading,
  onMarkRead,
  onMarkAllRead,
  unreadCount,
}: NotificationListProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 + 모두 읽음 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filter === "all"
                ? "bg-brand-point-500 text-white"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            전체
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filter === "unread"
                ? "bg-brand-point-500 text-white"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            읽지 않음 {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            모두 읽음
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">
              {filter === "unread" ? "읽지 않은 알림이 없습니다." : "알림이 없습니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;
            return (
              <Card
                key={notification.id}
                className={cn(
                  "cursor-pointer transition-colors hover:border-slate-300",
                  !notification.read && "border-blue-100 bg-blue-50/30",
                )}
                onClick={() => {
                  if (!notification.read) onMarkRead(notification.id);
                }}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                      config.bg,
                    )}
                  >
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm text-slate-900",
                          !notification.read && "font-semibold",
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {notification.time}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
