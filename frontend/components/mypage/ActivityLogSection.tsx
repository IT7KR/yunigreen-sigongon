"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@sigongon/ui";
import { api } from "@/lib/api";
import { ChevronRight } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  ip_address: string;
  device_info: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  login: "bg-slate-400",
  logout: "bg-slate-400",
  profile_update: "bg-blue-400",
  password_change: "bg-blue-400",
  project_create: "bg-brand-point-400",
  project_update: "bg-brand-point-400",
  estimate_create: "bg-amber-400",
  contract_sign: "bg-green-400",
  settings_change: "bg-purple-400",
};

export function ActivityLogSection() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityLogs();
  }, [page]);

  const loadActivityLogs = async () => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API when available
      const response = await api.getMyActivityLog(page, 20);

      if (response?.success && response?.data) {
        if (page === 1) {
          setLogs(response.data);
        } else {
          setLogs((prev) => [...prev, ...response.data]);
        }
        setTotalPages(response.meta?.total_pages || 1);
      } else {
        // Fallback to mock data
        const mockLogs = generateMockLogs(page);
        if (page === 1) {
          setLogs(mockLogs);
        } else {
          setLogs((prev) => [...prev, ...mockLogs]);
        }
        setTotalPages(3);
      }
    } catch (error) {
      // Fallback to mock data on error
      const mockLogs = generateMockLogs(page);
      if (page === 1) {
        setLogs(mockLogs);
      } else {
        setLogs((prev) => [...prev, ...mockLogs]);
      }
      setTotalPages(3);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}.${day} ${hours}:${minutes}`;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || "bg-slate-300";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>활동 내역</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && page === 1 ? (
            <div className="py-8 text-center text-slate-500">
              로딩 중...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              활동 내역이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getActionColor(log.action)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-900">{log.description}</p>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {log.ip_address} · {log.device_info}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && page < totalPages && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                더 보기
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mock data generator for development
function generateMockLogs(page: number): ActivityLog[] {
  const now = new Date();
  const baseIndex = (page - 1) * 20;

  const mockActions = [
    { action: "login", description: "로그인했습니다" },
    { action: "profile_update", description: "프로필을 수정했습니다" },
    { action: "project_create", description: "새 프로젝트를 생성했습니다" },
    { action: "estimate_create", description: "견적서를 생성했습니다" },
    { action: "contract_sign", description: "계약서에 서명했습니다" },
    { action: "logout", description: "로그아웃했습니다" },
  ];

  return Array.from({ length: 20 }, (_, i) => {
    const actionData = mockActions[i % mockActions.length];
    const timestamp = new Date(now.getTime() - (baseIndex + i) * 3600000);

    return {
      id: `log_${page}_${i}`,
      action: actionData.action,
      description: actionData.description,
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      device_info: i % 3 === 0 ? "Chrome (Windows)" : i % 3 === 1 ? "Safari (macOS)" : "Chrome (Android)",
      created_at: timestamp.toISOString(),
    };
  });
}
