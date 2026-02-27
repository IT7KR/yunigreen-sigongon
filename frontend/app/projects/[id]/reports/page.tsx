"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  toast,
} from "@sigongcore/ui";
import type { ProjectStatus } from "@sigongcore/types";
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

const statusVariants: Record<
  ReportStatus,
  "default" | "success" | "warning" | "error"
> = {
  draft: "default",
  submitted: "warning",
  approved: "success",
  rejected: "error",
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  draft: "초안",
  diagnosing: "진단중",
  estimating: "견적작성",
  quoted: "견적발송",
  contracted: "계약완료",
  in_progress: "시공중",
  completed: "준공",
  warranty: "하자보증",
  closed: "완결",
};

export default function ConstructionReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [reports, setReports] = useState<ConstructionReport[]>([]);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<ProjectStatus | null>(
    null,
  );

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [reportsResponse, projectResponse] = await Promise.all([
        api.getConstructionReports(id),
        api.getProject(id),
      ]);

      if (reportsResponse.success && reportsResponse.data) {
        setReports(reportsResponse.data);
      } else {
        setReports([]);
      }

      if (projectResponse.success && projectResponse.data) {
        setProjectStatus(projectResponse.data.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateProjectStatus(targetStatus: ProjectStatus) {
    try {
      setUpdatingStatus(targetStatus);
      const response = await api.updateProjectStatus(id, targetStatus);
      if (!response.success || !response.data) {
        toast.error("프로젝트 상태를 변경하지 못했어요");
        return;
      }
      setProjectStatus(response.data.status);
      toast.success("프로젝트 상태를 변경했어요");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("오류가 발생했어요");
    } finally {
      setUpdatingStatus(null);
    }
  }

  const startReports = reports.filter((r) => r.report_type === "start");
  const completionReports = reports.filter(
    (r) => r.report_type === "completion",
  );
  const hasApprovedStartReport = startReports.some(
    (r) => r.status === "approved",
  );
  const hasApprovedCompletionReport = completionReports.some(
    (r) => r.status === "approved",
  );

  const needsInProgressAction =
    hasApprovedStartReport &&
    !!projectStatus &&
    !["in_progress", "completed", "warranty", "closed"].includes(projectStatus);

  const needsCompletedAction =
    hasApprovedCompletionReport &&
    !!projectStatus &&
    projectStatus === "in_progress";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로젝트 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700">
            현재 상태:{" "}
            <span className="font-semibold text-slate-900">
              {projectStatus ? projectStatusLabels[projectStatus] : "-"}
            </span>
          </p>

          {(needsInProgressAction || needsCompletedAction) && (
            <div className="flex flex-wrap gap-2">
              {needsInProgressAction && (
                <Button
                  size="sm"
                  onClick={() => updateProjectStatus("in_progress")}
                  disabled={!!updatingStatus}
                >
                  {updatingStatus === "in_progress" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  시공중으로 변경
                </Button>
              )}
              {needsCompletedAction && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateProjectStatus("completed")}
                  disabled={!!updatingStatus}
                >
                  {updatingStatus === "completed" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  준공으로 변경
                </Button>
              )}
            </div>
          )}

          {!needsInProgressAction && !needsCompletedAction && (
            <p className="text-xs text-slate-500">
              착공계/준공계 승인 시 자동으로 프로젝트 상태가 변경됩니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            착공계
          </CardTitle>
          {startReports.length === 0 && (
            <Button size="sm" asChild>
              <Link href={`/projects/${id}/reports/start`}>
                <Plus className="h-4 w-4" />
                착공계 작성
              </Link>
            </Button>
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
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">
                        {report.construction_name || "착공계"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleDateString(
                          "ko-KR",
                        )}
                      </p>
                      {report.rejection_reason && (
                        <p className="mt-1 text-sm text-red-600">
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

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            준공계
          </CardTitle>
          {hasApprovedStartReport && completionReports.length === 0 && (
            <Button size="sm" asChild>
              <Link href={`/projects/${id}/reports/completion`}>
                <Plus className="h-4 w-4" />
                준공계 작성
              </Link>
            </Button>
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
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">
                        {report.construction_name || "준공계"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleDateString(
                          "ko-KR",
                        )}
                      </p>
                      {report.rejection_reason && (
                        <p className="mt-1 text-sm text-red-600">
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
