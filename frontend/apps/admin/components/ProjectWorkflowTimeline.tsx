"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Clock, Circle } from "lucide-react";
import { cn } from "@sigongon/ui";
import type { ProjectStatus, EstimateStatus, ContractStatus } from "@sigongon/types";

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
  // Determine status for each stage
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
    if (estimateStatus === "issued" || estimateStatus === "accepted") return "completed";
    if (estimateStatus === "draft") return "in_progress";
    return "pending";
  };

  const getContractStatus = (): WorkflowStage["status"] => {
    if (!hasContract) {
      if (hasEstimate && (estimateStatus === "issued" || estimateStatus === "accepted")) {
        return "pending";
      }
      return "not_started";
    }
    if (contractStatus === "signed" || contractStatus === "active") return "completed";
    if (contractStatus === "draft" || contractStatus === "sent") return "in_progress";
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
    if (hasContract && (contractStatus === "signed" || contractStatus === "active")) {
      return "pending";
    }
    return "not_started";
  };

  const getCompletionStatus = (): WorkflowStage["status"] => {
    if (projectStatus === "completed" || projectStatus === "warranty" || projectStatus === "closed") {
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
      count: visitCount,
      status: getVisitStatus(),
    },
    {
      id: "diagnosis",
      label: "진단",
      href: `/projects/${projectId}/diagnoses`,
      count: diagnosisCount,
      status: getDiagnosisStatus(),
    },
    {
      id: "estimate",
      label: "견적",
      href: `/projects/${projectId}/estimates`,
      status: getEstimateStageStatus(),
    },
    {
      id: "contract",
      label: "계약",
      href: `/projects/${projectId}/contracts`,
      status: getContractStatus(),
    },
    {
      id: "construction",
      label: "시공",
      href: `/projects/${projectId}/construction`,
      status: getConstructionStatus(),
    },
    {
      id: "completion",
      label: "준공",
      href: `/projects/${projectId}/completion/closeout-report`,
      status: getCompletionStatus(),
    },
  ];

  const getStatusIcon = (status: WorkflowStage["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-teal-600" />;
      case "in_progress":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "not_started":
        return <Circle className="h-5 w-5 text-slate-300" />;
    }
  };

  const getStatusLabel = (status: WorkflowStage["status"]) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      case "pending":
        return "⏳";
      case "not_started":
        return "-";
    }
  };

  const getStageColor = (status: WorkflowStage["status"]) => {
    switch (status) {
      case "completed":
        return "bg-teal-50 border-teal-200 text-teal-900";
      case "in_progress":
        return "bg-blue-50 border-blue-300 text-blue-900";
      case "pending":
        return "bg-amber-50 border-amber-200 text-amber-900";
      case "not_started":
        return "bg-slate-50 border-slate-200 text-slate-400";
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 md:gap-3 min-w-max px-1 py-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            {/* Stage Card */}
            <Link
              href={stage.href}
              className={cn(
                "group flex flex-col items-center rounded-lg border-2 px-4 py-3 transition-all hover:shadow-md min-w-[100px] md:min-w-[120px]",
                getStageColor(stage.status),
                stage.status === "in_progress" && "ring-2 ring-blue-300 ring-offset-2",
              )}
            >
              {/* Status Icon */}
              <div className="mb-2">{getStatusIcon(stage.status)}</div>

              {/* Stage Label */}
              <div className="mb-1 text-center font-semibold text-sm md:text-base">
                {stage.label}
              </div>

              {/* Count Badge */}
              {stage.count !== undefined && stage.count > 0 && (
                <div
                  className={cn(
                    "text-xs font-medium",
                    stage.status === "completed" && "text-teal-700",
                    stage.status === "in_progress" && "text-blue-700",
                    stage.status === "pending" && "text-amber-700",
                    stage.status === "not_started" && "text-slate-500",
                  )}
                >
                  {stage.count}건
                </div>
              )}

              {/* Status Label */}
              {stage.count === undefined && (
                <div className="text-xs font-medium opacity-70">
                  {getStatusLabel(stage.status)}
                </div>
              )}

              {/* Quick Action on Hover */}
              <div
                className={cn(
                  "mt-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity",
                  stage.status === "not_started" && "hidden",
                )}
              >
                {stage.status === "completed" && "보기 →"}
                {stage.status === "in_progress" && "진행중 →"}
                {stage.status === "pending" && "시작하기 →"}
              </div>
            </Link>

            {/* Arrow Connector */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "mx-1 md:mx-2 h-0.5 w-4 md:w-8",
                  stage.status === "completed" ? "bg-teal-300" : "bg-slate-200",
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
