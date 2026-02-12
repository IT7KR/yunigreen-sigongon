"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, PrimitiveInput } from "@sigongon/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Save } from "lucide-react";

interface NotificationPrefs {
  email_notifications: boolean;
  project_status_change: boolean;
  estimate_contract_alerts: boolean;
  daily_report_alerts: boolean;
  platform_announcements: boolean;
}

interface NotificationItem {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
  roles: "all" | "tenant";
}

const items: NotificationItem[] = [
  {
    key: "email_notifications",
    label: "이메일 알림 수신",
    description: "중요 알림을 이메일로 받습니다",
    roles: "all",
  },
  {
    key: "project_status_change",
    label: "프로젝트 상태 변경 알림",
    description: "프로젝트 상태가 변경되면 알림을 받습니다",
    roles: "tenant",
  },
  {
    key: "estimate_contract_alerts",
    label: "견적서/계약서 알림",
    description: "견적서 발행, 계약서 체결 시 알림을 받습니다",
    roles: "tenant",
  },
  {
    key: "daily_report_alerts",
    label: "일일작업보고서 알림",
    description: "일일작업보고서가 등록되면 알림을 받습니다",
    roles: "tenant",
  },
  {
    key: "platform_announcements",
    label: "플랫폼 공지사항 알림",
    description: "시공ON 플랫폼 공지사항을 받습니다",
    roles: "all",
  },
];

export function NotificationPrefsSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_notifications: false,
    project_status_change: false,
    estimate_contract_alerts: false,
    daily_report_alerts: false,
    platform_announcements: false,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const response = await api.getMyNotificationPrefs();
        if (response.success && response.data) {
          const { user_id, ...prefsData } = response.data as any;
          setPrefs(prefsData);
        }
        setLoaded(true);
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
        setLoaded(true);
      }
    };

    loadPrefs();
  }, []);

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateMyNotificationPrefs(prefs);
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const shouldShowItem = (item: NotificationItem) => {
    if (item.roles === "all") {
      return true;
    }
    // Show tenant items only for company_admin and site_manager
    return (
      user?.role === "company_admin" || user?.role === "site_manager"
    );
  };

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>알림 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.filter(shouldShowItem).map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <PrimitiveInput
                type="checkbox"
                checked={prefs[item.key]}
                onChange={() => handleToggle(item.key)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-point-500 peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        ))}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
