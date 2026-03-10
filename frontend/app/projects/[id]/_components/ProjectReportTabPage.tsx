"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sigongcore/ui";
import type { ConstructionReportListItem, ReportType } from "@sigongcore/types";
import { api } from "@/lib/api";

const STATUS_LABELS = {
  draft: "초안",
  submitted: "제출됨",
  approved: "승인",
  rejected: "반려",
} as const;

const STATUS_VARIANTS = {
  draft: "default",
  submitted: "warning",
  approved: "success",
  rejected: "error",
} as const;

const REPORT_TAB_CONFIG: Record<
  ReportType,
  {
    title: string;
    reportLabel: string;
    description: string;
    createLabel: string;
  }
> = {
  start: {
    title: "착공",
    reportLabel: "착공계",
    description: "착공계 작성과 제출 이력을 관리합니다.",
    createLabel: "착공계 작성",
  },
  completion: {
    title: "준공",
    reportLabel: "준공계",
    description: "준공계 작성과 제출 이력을 관리합니다.",
    createLabel: "준공계 작성",
  },
};

export function ProjectReportTabPage({
  projectId,
  reportType,
}: {
  projectId: string;
  reportType: ReportType;
}) {
  const config = REPORT_TAB_CONFIG[reportType];
  const { data: response, isLoading } = useQuery({
    queryKey: ["construction-reports", projectId],
    queryFn: () => api.getConstructionReports(projectId),
  });

  const reports = (
    response?.success ? response.data : []
  ) as ConstructionReportListItem[];
  const filteredReports = reports.filter((report) => report.report_type === reportType);
  const hasApprovedStartReport = reports.some(
    (report) => report.report_type === "start" && report.status === "approved",
  );
  const canCreate = reportType === "start" || hasApprovedStartReport;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{config.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{config.description}</p>
        </div>
        {canCreate && (
          <Button size="sm" asChild>
            <Link href={`/projects/${projectId}/reports/${reportType}`}>
              <Plus className="mr-2 h-4 w-4" />
              {config.createLabel}
            </Link>
          </Button>
        )}
      </div>

      {reportType === "completion" && !hasApprovedStartReport && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            승인된 착공계가 있어야 준공계를 작성할 수 있습니다.
          </CardContent>
        </Card>
      )}

      {filteredReports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            아직 {config.reportLabel}가 없습니다
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {canCreate
              ? `${config.reportLabel}를 작성해 프로젝트 문서를 준비하세요.`
              : "먼저 승인된 착공계를 준비해 주세요."}
          </p>
          {canCreate && (
            <Button className="mt-6" asChild>
              <Link href={`/projects/${projectId}/reports/${reportType}`}>
                <Plus className="mr-2 h-4 w-4" />
                {config.createLabel}
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{config.reportLabel} 이력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredReports.map((report) => (
              <Link
                key={report.id}
                href={`/projects/${projectId}/reports/${reportType}?reportId=${report.id}`}
                className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {report.construction_name || config.reportLabel}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      작성일 {new Date(report.created_at).toLocaleDateString("ko-KR")}
                    </p>
                    {report.submitted_at && (
                      <p className="mt-1 text-xs text-slate-500">
                        제출일{" "}
                        {new Date(report.submitted_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANTS[report.status]}>
                    {STATUS_LABELS[report.status]}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
