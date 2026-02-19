import { cn } from "../lib/utils";
import type {
  ProjectStatus,
  EstimateStatus,
  ReportStatus,
  ContractStatus,
  LaborContractStatus,
  DiagnosisStatus,
  PhotoAlbumStatus,
} from "@sigongon/types";

type StatusType =
  | ProjectStatus
  | EstimateStatus
  | ReportStatus
  | ContractStatus
  | LaborContractStatus
  | DiagnosisStatus
  | PhotoAlbumStatus;

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: {
    label: "초안",
    className: "bg-slate-100 text-slate-700 before:bg-slate-400",
  },
  diagnosing: {
    label: "진단중",
    className: "bg-blue-50 text-blue-700 before:bg-blue-500",
  },
  estimating: {
    label: "견적중",
    className: "bg-amber-50 text-amber-700 before:bg-amber-500",
  },
  quoted: {
    label: "견적발송",
    className: "bg-purple-50 text-purple-700 before:bg-purple-500",
  },
  contracted: {
    label: "계약완료",
    className: "bg-brand-point-50 text-brand-point-700 before:bg-brand-point-500",
  },
  in_progress: {
    label: "공사중",
    className: "bg-orange-50 text-orange-700 before:bg-orange-500",
  },
  completed: {
    label: "준공",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
  warranty: {
    label: "하자보증",
    className: "bg-brand-point-50 text-brand-point-700 before:bg-brand-point-500",
  },
  closed: {
    label: "완결",
    className: "bg-slate-100 text-slate-700 before:bg-slate-400",
  },
  issued: {
    label: "발행됨",
    className: "bg-purple-50 text-purple-700 before:bg-purple-500",
  },
  accepted: {
    label: "수락됨",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
  rejected: {
    label: "거절됨",
    className: "bg-red-50 text-red-700 before:bg-red-500",
  },
  void: {
    label: "무효",
    className: "bg-slate-100 text-slate-500 before:bg-slate-400",
  },
  submitted: {
    label: "제출됨",
    className: "bg-blue-50 text-blue-700 before:bg-blue-500",
  },
  approved: {
    label: "승인됨",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
  pending: {
    label: "대기중",
    className: "bg-slate-100 text-slate-700 before:bg-slate-400",
  },
  processing: {
    label: "처리중",
    className: "bg-blue-50 text-blue-700 before:bg-blue-500",
  },
  failed: {
    label: "실패",
    className: "bg-red-50 text-red-700 before:bg-red-500",
  },
  sent: {
    label: "발송됨",
    className: "bg-blue-50 text-blue-700 before:bg-blue-500",
  },
  signed: {
    label: "서명완료",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
  active: {
    label: "활성",
    className: "bg-brand-point-50 text-brand-point-700 before:bg-brand-point-500",
  },
  cancelled: {
    label: "취소됨",
    className: "bg-red-50 text-red-700 before:bg-red-500",
  },
  paid: {
    label: "지급완료",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
  published: {
    label: "발행",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        "before:h-1.5 before:w-1.5 before:rounded-full",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
