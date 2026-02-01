"use client";

import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent } from "@sigongon/ui";
import { Bell, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: "contract" | "paystub" | "notice";
      title: string;
      message: string;
      time: string;
      read: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  return (
    <MobileLayout title="알림" showBack>
      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-slate-400">
            불러오는 중...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-400">
            알림이 없습니다.
          </div>
        ) : (
          notifications.map((noti) => (
            <button
              key={noti.id}
              type="button"
              onClick={() => handleRead(noti.id)}
              className={`flex w-full gap-4 p-4 text-left ${noti.read ? "bg-white" : "bg-brand-point-50/30"}`}
            >
              <div
                className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  noti.type === "contract"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-brand-point-100 text-brand-point-600"
                }`}
              >
                {noti.type === "contract" ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p
                    className={`font-medium ${noti.read ? "text-slate-900" : "text-brand-point-900"}`}
                  >
                    {noti.title}
                  </p>
                  <span className="text-xs text-slate-400">{noti.time}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{noti.message}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
