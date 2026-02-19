"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { StartReportActionsCard } from "@sigongon/features";
import {
  Card,
  CardContent,
  StatusBadge,
  formatDate,
} from "@sigongon/ui";
import { MobileLayout } from "@/components/MobileLayout";
import { mockApiClient } from "@/lib/mocks/mockApi";
import { MOBILE_MOCK_EXPORT_SAMPLE_FILES } from "@/lib/sampleFiles";
import type { ReportStatus } from "@sigongon/types";
import { FileCheck2, ChevronRight, Loader2 } from "lucide-react";

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

  const latestStartReport = reports[0];
  const canEditExistingStartReport =
    latestStartReport?.status === "draft" || latestStartReport?.status === "rejected";

  return (
    <MobileLayout title="착공계" showBack>
      <div className="space-y-4 p-4">
        <StartReportActionsCard
          title="착공계"
          description="모바일에서 착공계 작성, 임시저장, 제출까지 진행할 수 있습니다."
          projectId={projectId}
          reportListPath="/projects/{projectId}/reports"
          samplePath={MOBILE_MOCK_EXPORT_SAMPLE_FILES.startReportPdf}
          createReportPath={
            canEditExistingStartReport && latestStartReport
              ? `/projects/${projectId}/reports/start?reportId=${latestStartReport.id}`
              : "/projects/{projectId}/reports/start"
          }
          listLabel="전체 보고서"
          sampleLabel="샘플"
        />

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
              href={
                report.status === "draft" || report.status === "rejected"
                  ? `/projects/${projectId}/reports/start?reportId=${report.id}`
                  : `/projects/${projectId}/reports/${report.id}`
              }
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
