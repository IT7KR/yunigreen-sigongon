"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AppNotification } from "@sigongcore/types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    const res = await (api as any).getNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    await (api as any).markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await (api as any).markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return {
    notifications,
    isLoading,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    (api as any).getNotifications().then((res: any) => {
      if (res.success && res.data) {
        setCount(res.data.filter((n: any) => !n.read).length);
      }
    });
  }, []);

  return count;
}
