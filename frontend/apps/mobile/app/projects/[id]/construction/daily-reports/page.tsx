"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button, formatDate, toast } from "@sigongon/ui";
import { api } from "@/lib/api";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  FileDown,
  Loader2,
  Plus,
} from "lucide-react";

interface DailyReportItem {
  id: string;
  project_id: string;
  work_date: string;
  weather?: string;
  temperature?: string;
  work_description: string;
  tomorrow_plan?: string;
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

export default function DailyReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReportItem[]>([]);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [projectId]);

  async function loadReports() {
    try {
      setLoading(true);
      const response = await api.getDailyReports(projectId);
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadHwpx(report: DailyReportItem) {
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

  return (
    <MobileLayout
      title="작업일지"
      showBack
      rightAction={
        <Button size="sm" variant="secondary" asChild><Link href={`/projects/${projectId}/construction/daily-reports/new`}>
            <Plus className="h-4 w-4" />
            작성
          </Link></Button>
      }
    >
      <div className="space-y-3 p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-brand-point-500" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                아직 작업일지가 없습니다.
              </p>
              <Button className="mt-4" asChild><Link href={`/projects/${projectId}/construction/daily-reports/new`}>
                  <Plus className="h-4 w-4" />
                  첫 작업일지 작성
                </Link></Button>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{report.work_date}</p>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(report.created_at)} 작성</span>
                  {report.weather && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {weatherLabel[report.weather] || report.weather}
                    </span>
                  )}
                  {report.temperature && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {report.temperature}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                  {report.work_description}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  사진 {report.photo_count}장
                </p>
                <div className="mt-3 flex justify-end">
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
                    HWPX
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
