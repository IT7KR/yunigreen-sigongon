"use client";

import { AdminLayout } from "@/components/AdminLayout";
import { NotificationList } from "@/components/NotificationList";
import { useNotifications } from "@/hooks/useNotifications";

export default function SANotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead, unreadCount } =
    useNotifications();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">알림</h1>
          <p className="mt-1 text-sm text-slate-500">
            새로운 알림을 확인하세요
          </p>
        </div>
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          unreadCount={unreadCount}
        />
      </div>
    </AdminLayout>
  );
}
