"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
} from "@sigongon/ui";
import { api } from "@/lib/api";

interface DailyReport {
  id: string;
  project_id: string;
  work_date: string;
  weather?: string;
  temperature?: string;
  work_description: string;
  tomorrow_plan?: string;
  photos: string[];
  photo_count: number;
  created_at: string;
}

const weatherEmoji: Record<string, string> = {
  sunny: "☀️",
  cloudy: "⛅",
  rain: "🌧️",
  snow: "❄️",
  wind: "💨",
};

const weatherLabel: Record<string, string> = {
  sunny: "맑음",
  cloudy: "흐림",
  rain: "비",
  snow: "눈",
  wind: "강풍",
};

export default function DailyReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDailyReports();
  }, [projectId]);

  async function loadDailyReports() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDailyReports(projectId);
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err) {
      setError("작업일지 목록을 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={loadDailyReports}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            작업일지 목록
          </CardTitle>
          <Link href={`/projects/${projectId}/construction/daily-reports/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              새 작업일지
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                아직 작업일지가 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                매일의 작업 내용을 기록해 보세요.
              </p>
              <Link
                href={`/projects/${projectId}/construction/daily-reports/new`}
              >
                <Button className="mt-6">
                  <Plus className="h-4 w-4" />
                  작업일지 작성하기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">작업일자</th>
                    <th className="pb-3 font-medium">날씨</th>
                    <th className="pb-3 font-medium">작업내용</th>
                    <th className="pb-3 font-medium text-center">사진</th>
                    <th className="pb-3 font-medium">작성일</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {formatDate(report.work_date)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        {report.weather ? (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {weatherEmoji[report.weather] || "🌤️"}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-700">
                                {weatherLabel[report.weather] || report.weather}
                              </span>
                              {report.temperature && (
                                <span className="text-xs text-slate-500">
                                  {report.temperature}℃
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="max-w-md">
                          <p className="line-clamp-2 text-sm text-slate-700">
                            {report.work_description}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        {report.photo_count > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                              {report.photo_count}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 text-sm text-slate-500">
                        {formatDate(report.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>작업일지 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">총 작업일지</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {reports.length}건
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">총 현장사진</p>
                <p className="mt-2 text-2xl font-bold text-green-600">
                  {reports.reduce((sum, r) => sum + r.photo_count, 0)}장
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">최근 작업일</p>
                <p className="mt-2 text-lg font-bold text-blue-600">
                  {reports.length > 0
                    ? formatDate(reports[0].work_date)
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
