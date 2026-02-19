"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Clock3, Circle } from "lucide-react";
import { Button, cn } from "@sigongon/ui";
import type {
  ProjectStatus,
  EstimateStatus,
  ContractStatus,
} from "@sigongon/types";

interface ProjectWorkflowTimelineProps {
  projectId: string;
  visitCount: number;
  diagnosisCount: number;
  hasEstimate: boolean;
  estimateStatus?: EstimateStatus;
  hasContract: boolean;
  contractStatus?: ContractStatus;
  projectStatus: ProjectStatus;
}

interface WorkflowStage {
  id: string;
  label: string;
  href: string;
  description: string;
  count?: number;
  status: "completed" | "in_progress" | "pending" | "not_started";
}

export function ProjectWorkflowTimeline({
  projectId,
  visitCount,
  diagnosisCount,
  hasEstimate,
  estimateStatus,
  hasContract,
  contractStatus,
  projectStatus,
}: ProjectWorkflowTimelineProps) {
  const STATUS_LABELS: Record<WorkflowStage["status"], string> = {
    completed: "완료",
    in_progress: "진행중",
    pending: "대기",
    not_started: "미시작",
  };

  const STATUS_COLORS: Record<WorkflowStage["status"], string> = {
    completed:
      "border-brand-point-200 bg-brand-point-50/60 text-brand-point-900",
    in_progress: "border-blue-300 bg-blue-50 text-blue-900",
    pending: "border-amber-200 bg-amber-50 text-amber-900",
    not_started: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const STATUS_BADGES: Record<WorkflowStage["status"], string> = {
    completed: "bg-brand-point-100 text-brand-point-700",
    in_progress: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    not_started: "bg-slate-100 text-slate-600",
  };

  const getVisitStatus = (): WorkflowStage["status"] => {
    if (visitCount > 0) return "completed";
    return "not_started";
  };

  const getDiagnosisStatus = (): WorkflowStage["status"] => {
    if (diagnosisCount > 0) return "completed";
    if (visitCount > 0) return "pending";
    return "not_started";
  };

  const getEstimateStageStatus = (): WorkflowStage["status"] => {
    if (!hasEstimate) {
      if (diagnosisCount > 0 || visitCount > 0) return "pending";
      return "not_started";
    }
    if (estimateStatus === "issued" || estimateStatus === "accepted")
      return "completed";
    if (estimateStatus === "draft") return "in_progress";
    return "pending";
  };

  const getContractStatus = (): WorkflowStage["status"] => {
    if (!hasContract) {
      if (
        hasEstimate &&
        (estimateStatus === "issued" || estimateStatus === "accepted")
      ) {
        return "pending";
      }
      return "not_started";
    }
    if (contractStatus === "signed" || contractStatus === "active")
      return "completed";
    if (contractStatus === "draft" || contractStatus === "sent")
      return "in_progress";
    return "pending";
  };

  const getConstructionStatus = (): WorkflowStage["status"] => {
    if (
      projectStatus === "in_progress" ||
      projectStatus === "completed" ||
      projectStatus === "warranty"
    ) {
      if (projectStatus === "in_progress") return "in_progress";
      return "completed";
    }
    if (
      hasContract &&
      (contractStatus === "signed" || contractStatus === "active")
    ) {
      return "pending";
    }
    return "not_started";
  };

  const getCompletionStatus = (): WorkflowStage["status"] => {
    if (
      projectStatus === "completed" ||
      projectStatus === "warranty" ||
      projectStatus === "closed"
    ) {
      return "completed";
    }
    if (projectStatus === "in_progress") return "pending";
    return "not_started";
  };

  const stages: WorkflowStage[] = [
    {
      id: "visit",
      label: "방문",
      href: `/projects/${projectId}/visits`,
      description: "초기/재방문 이력을 등록하고 현장 사진을 수집합니다.",
      count: visitCount,
      status: getVisitStatus(),
    },
    {
      id: "diagnosis",
      label: "진단",
      href: `/projects/${projectId}/diagnoses`,
      description: "AI 진단 결과를 확인하고 필요한 자재를 검토합니다.",
      count: diagnosisCount,
      status: getDiagnosisStatus(),
    },
    {
      id: "estimate",
      label: "견적",
      href: `/projects/${projectId}/estimates`,
      description: "견적서를 생성하고 발행 상태를 관리합니다.",
      status: getEstimateStageStatus(),
    },
    {
      id: "contract",
      label: "계약",
      href: `/projects/${projectId}/contracts`,
      description: "계약서를 발행하고 서명/활성 상태를 추적합니다.",
      status: getContractStatus(),
    },
    {
      id: "construction",
      label: "시공",
      href: `/projects/${projectId}/construction`,
      description: "착공/일일보고/노무를 관리하며 진행률을 업데이트합니다.",
      status: getConstructionStatus(),
    },
    {
      id: "completion",
      label: "준공",
      href: `/projects/${projectId}/completion/closeout-report`,
      description: "준공 정리와 정산/세금계산서 발행 준비를 완료합니다.",
      status: getCompletionStatus(),
    },
  ];

  const currentStageId =
    stages.find((stage) => stage.status === "in_progress")?.id ??
    stages.find((stage) => stage.status === "pending")?.id;

  const getStatusIcon = (
    status: WorkflowStage["status"],
    className = "h-5 w-5",
  ) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle2 className={cn(className, "text-brand-point-600")} />
        );
      case "in_progress":
        return (
          <Loader2 className={cn(className, "animate-spin text-blue-600")} />
        );
      case "pending":
        return <Clock3 className={cn(className, "text-amber-500")} />;
      case "not_started":
        return <Circle className={cn(className, "text-slate-300")} />;
    }
  };

  const getStatusHint = (stage: WorkflowStage) => {
    if (stage.count !== undefined && stage.count > 0) {
      return `${stage.count}건 기록됨`;
    }

    switch (stage.status) {
      case "completed":
        return "완료된 단계입니다.";
      case "in_progress":
        return "현재 진행 중인 단계입니다.";
      case "pending":
        return "이전 단계를 완료하면 바로 시작할 수 있어요.";
      case "not_started":
        return "아직 시작 전 단계입니다.";
    }
  };

  const getActionLabel = (status: WorkflowStage["status"]) => {
    switch (status) {
      case "completed":
        return "보기";
      case "in_progress":
        return "계속하기";
      case "pending":
        return "시작하기";
      case "not_started":
        return "이동";
    }
  };

  return (
    <div className="space-y-0" aria-label="프로젝트 진행 단계">
      {stages.map((stage, index) => {
        const isCurrent = currentStageId === stage.id;
        const isCompleted = stage.status === "completed";
        const isLast = index === stages.length - 1;

        return (
          <li key={stage.id} className="relative flex gap-4 pb-0 last:pb-0">
            {/* Timeline Line */}
            {!isLast && (
              <div
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-[32px] h-[calc(100%-8px)] w-0.5",
                  isCompleted ? "bg-brand-point-200" : "bg-slate-100",
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white transition-colors",
                stage.status === "completed" &&
                  "border-brand-point-200 text-brand-point-600",
                stage.status === "in_progress" &&
                  "border-brand-point-500 text-brand-point-600 ring-4 ring-brand-point-50",
                (stage.status === "pending" ||
                  stage.status === "not_started") &&
                  "border-slate-200 text-slate-300",
              )}
            >
              {getStatusIcon(stage.status, "h-4 w-4")}
            </div>

            {/* Content */}
            <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isCurrent ? "text-slate-900" : "text-slate-500",
                    )}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      STATUS_BADGES[stage.status],
                    )}
                  >
                    {STATUS_LABELS[stage.status]}
                  </span>
                </div>
                {/* Action Button for Current Step Only (Mobile optimized) */}
                {isCurrent && (
                  <Button size="sm" className="h-8 px-3 text-xs" asChild>
                    <Link href={stage.href}>
                      {getActionLabel(stage.status)}
                    </Link>
                  </Button>
                )}
              </div>

              {/* Description - Show only for current step */}
              {isCurrent && (
                <div className="mt-2 text-xs text-slate-600">
                  {stage.description}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </div>
  );
}
