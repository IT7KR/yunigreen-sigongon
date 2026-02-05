"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  StatusBadge,
  formatDate,
} from "@sigongon/ui";
import { MobileLayout } from "@/components/MobileLayout";
import { mockApiClient } from "@/lib/mocks/mockApi";
import {
  MOBILE_MOCK_EXPORT_SAMPLE_FILES,
  buildSampleFileDownloadUrl,
} from "@/lib/sampleFiles";
import type { ReportStatus } from "@sigongon/types";
import { FileCheck2, Download, ChevronRight, Loader2 } from "lucide-react";

interface StartReportItem {
  id: string;
  report_type: "start" | "completion";
  report_number?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  construction_name?: string;
  start_date?: string;
  created_at: string;
}

export default function MobileStartReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<StartReportItem[]>([]);

  useEffect(() => {
    loadStartReports();
  }, [projectId]);

  async function loadStartReports() {
    try {
      setLoading(true);
      const response = await mockApiClient.getConstructionReports(projectId);
      if (response.success && response.data) {
        setReports(
          response.data.filter((report) => report.report_type === "start"),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function downloadSample() {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(
      MOBILE_MOCK_EXPORT_SAMPLE_FILES.startReportPdf,
    );
    anchor.download = "착공서류_샘플.pdf";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <MobileLayout title="착공계" showBack>
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-slate-600">
              모바일에서는 착공계 확인과 샘플 다운로드를 지원합니다.
            </p>
            <div className="flex gap-2">
              <Link href={`/projects/${projectId}/reports`} className="flex-1">
                <Button variant="secondary" fullWidth>
                  전체 보고서
                </Button>
              </Link>
              <Button variant="secondary" onClick={downloadSample}>
                <Download className="h-4 w-4" />
                샘플
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-brand-point-500" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileCheck2 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                등록된 착공계가 없습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Link
              key={report.id}
              href={`/projects/${projectId}/reports/${report.id}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {report.construction_name || "착공계"}
                      </p>
                      {report.report_number && (
                        <p className="text-xs text-slate-500">
                          {report.report_number}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={report.status as ReportStatus} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {report.start_date
                        ? `착공일 ${report.start_date}`
                        : formatDate(report.created_at)}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </MobileLayout>
  );
}

