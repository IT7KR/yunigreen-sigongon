"use client";

import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { Badge, formatCurrency } from "@sigongon/ui";
import type { EstimateStatus } from "@sigongon/types";

const statusConfig: Record<
  EstimateStatus,
  {
    label: string;
    variant: "default" | "info" | "success" | "warning" | "error";
  }
> = {
  draft: { label: "초안", variant: "default" },
  issued: { label: "발행됨", variant: "info" },
  accepted: { label: "수락됨", variant: "success" },
  rejected: { label: "거절됨", variant: "error" },
  void: { label: "무효", variant: "warning" },
};

interface EstimateCardProps {
  estimate: {
    id: string;
    version: number;
    status: EstimateStatus;
    total_amount: string;
  };
}

export function EstimateCard({ estimate }: EstimateCardProps) {
  const config = statusConfig[estimate.status] || {
    label: estimate.status,
    variant: "default" as const,
  };

  return (
    <Link
      href={`/estimates/${estimate.id}`}
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-brand-point-200 hover:bg-slate-100"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
          <FileText className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">
              견적서 v{estimate.version}
            </span>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-brand-point-600">
            {formatCurrency(estimate.total_amount)}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
