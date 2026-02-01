"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@sigongon/ui";
import { api } from "@/lib/api";

type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

interface ConstructionReport {
  id: string;
  project_id: string;
  report_type: "start" | "completion";
  status: ReportStatus;
  construction_name?: string;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

const statusLabels: Record<ReportStatus, string> = {
  draft: "초안",
  submitted: "제출됨",
  approved: "승인",
  rejected: "반려",
};

const statusVariants: Record<ReportStatus, "default" | "success" | "warning" | "error"> = {
  draft: "default",
  submitted: "warning",
  approved: "success",
  rejected: "error",
};

export default function ConstructionReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [reports, setReports] = useState<ConstructionReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [id]);

  async function loadReports() {
    try {
      setLoading(true);
      const response = await api.getConstructionReports(id);
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const startReports = reports.filter((r) => r.report_type === "start");
  const completionReports = reports.filter((r) => r.report_type === "completion");
  const hasApprovedStartReport = startReports.some((r) => r.status === "approved");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 착공계 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            착공계
          </CardTitle>
          {startReports.length === 0 && (
            <Link href={`/projects/${id}/reports/start`}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                착공계 작성
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {startReports.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              아직 착공계가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {startReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/projects/${id}/reports/start?reportId=${report.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-900">
                        {report.construction_name || "착공계"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleDateString("ko-KR")}
                      </p>
                      {report.rejection_reason && (
                        <p className="text-sm text-red-600 mt-1">
                          반려 사유: {report.rejection_reason}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusVariants[report.status]}>
                      {statusLabels[report.status]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 준공계 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            준공계
          </CardTitle>
          {hasApprovedStartReport && completionReports.length === 0 && (
            <Link href={`/projects/${id}/reports/completion`}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                준공계 작성
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!hasApprovedStartReport ? (
            <p className="py-8 text-center text-slate-500">
              착공계가 승인되면 준공계를 작성할 수 있어요.
            </p>
          ) : completionReports.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              아직 준공계가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {completionReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/projects/${id}/reports/completion?reportId=${report.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-900">
                        {report.construction_name || "준공계"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleDateString("ko-KR")}
                      </p>
                      {report.rejection_reason && (
                        <p className="text-sm text-red-600 mt-1">
                          반려 사유: {report.rejection_reason}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusVariants[report.status]}>
                      {statusLabels[report.status]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
