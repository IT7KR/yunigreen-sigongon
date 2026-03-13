"use client";

import { WorkerLayout } from "@/components/WorkerLayout";
import { NotificationList } from "@/components/NotificationList";
import { useNotifications } from "@/hooks/useNotifications";

export default function WorkerNotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead, unreadCount } =
    useNotifications();

  return (
    <WorkerLayout title="알림">
      <div className="p-4">
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          unreadCount={unreadCount}
        />
      </div>
    </WorkerLayout>
  );
}
