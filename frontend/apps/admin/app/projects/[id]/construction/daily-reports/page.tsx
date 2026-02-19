"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Calendar,
  Image as ImageIcon,
  FileDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
  toast,
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

const weatherLabel: Record<string, string> = {
  sunny: "맑음",
  cloudy: "흐림",
  rain: "비",
  snow: "눈",
  wind: "강풍",
};

function getWeatherText(weather?: string) {
  if (!weather) return "-";
  return weatherLabel[weather] || weather;
}

function getPhotoPreviewSrc(photos: string[]) {
  const firstPhoto = photos.find((photo) => photo?.trim());
  if (!firstPhoto) return null;

  const src = firstPhoto.trim();
  const isRenderableSrc =
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/") ||
    src.startsWith("data:image/");

  return isRenderableSrc ? src : null;
}

export default function DailyReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(
    null,
  );

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

  async function handleDownloadHwpx(report: DailyReport) {
    try {
      setDownloadingReportId(report.id);
      const blob = await api.downloadDailyReportHwpx(projectId, report.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `공사일지_${report.work_date}.hwpx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Failed to download daily report hwpx:", downloadError);
      toast.error("작업일지 HWPX 다운로드에 실패했어요.");
    } finally {
      setDownloadingReportId(null);
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
          <Button asChild>
            <Link
              href={`/projects/${projectId}/construction/daily-reports/new`}
            >
              <Plus className="h-4 w-4" />새 작업일지
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">아직 작업일지가 없습니다.</p>
              <p className="mt-1 text-sm text-slate-400">
                매일의 작업 내용을 기록해 보세요.
              </p>
              <Button className="mt-6" asChild>
                <Link
                  href={`/projects/${projectId}/construction/daily-reports/new`}
                >
                  <Plus className="h-4 w-4" />
                  작업일지 작성하기
                </Link>
              </Button>
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
                    <th className="pb-3 font-medium text-right">문서</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const previewSrc = getPhotoPreviewSrc(report.photos);

                    return (
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
                          <span className="text-sm text-slate-700">
                            {getWeatherText(report.weather)}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="max-w-md">
                            <p className="line-clamp-2 text-sm text-slate-700">
                              {report.work_description}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50">
                              {previewSrc ? (
                                <div
                                  role="img"
                                  aria-label={`${formatDate(report.work_date)} 작업사진`}
                                  className="h-full w-full bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url("${previewSrc}")`,
                                  }}
                                />
                              ) : (
                                <ImageIcon
                                  className="h-4 w-4 text-slate-400"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <span className="text-sm text-slate-700">
                              {report.photo_count}장
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-slate-500">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadHwpx(report)}
                            disabled={downloadingReportId === report.id}
                          >
                            {downloadingReportId === report.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="mr-1 h-3 w-3" />
                            )}
                            다운로드
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
                  {reports.length > 0 ? formatDate(reports[0].work_date) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
