import type { ProjectStatus } from "@sigongon/types";

export interface StatusConfig {
  label: string;
  color: string;
  next: ProjectStatus[];
  description?: string;
}

export const PROJECT_STATUSES: Record<ProjectStatus, StatusConfig> = {
  draft: {
    label: "초안",
    color: "gray",
    next: ["diagnosing"],
    description: "프로젝트 생성 초기 단계",
  },
  diagnosing: {
    label: "진단중",
    color: "blue",
    next: ["estimating"],
    description: "AI 현장 진단 진행중",
  },
  estimating: {
    label: "견적작성",
    color: "yellow",
    next: ["quoted"],
    description: "견적서 작성 단계",
  },
  quoted: {
    label: "견적발송",
    color: "orange",
    next: ["estimating", "contracted"],
    description: "견적서 발송 완료, 계약 대기중",
  },
  contracted: {
    label: "계약완료",
    color: "green",
    next: ["in_progress"],
    description: "계약 체결 완료, 착공 대기중",
  },
  in_progress: {
    label: "시공중",
    color: "purple",
    next: ["completed"],
    description: "현장 시공 진행중",
  },
  completed: {
    label: "준공",
    color: "emerald",
    next: ["warranty"],
    description: "시공 완료, 준공 처리",
  },
  warranty: {
    label: "하자보증",
    color: "teal",
    next: ["closed"],
    description: "하자보증 기간 관리중",
  },
  closed: {
    label: "완결",
    color: "gray",
    next: [],
    description: "프로젝트 종료",
  },
};

/**
 * 현재 상태에서 대상 상태로 전이 가능한지 확인
 */
export function canTransition(
  current: ProjectStatus,
  target: ProjectStatus,
): boolean {
  const config = PROJECT_STATUSES[current];
  return config?.next.includes(target) || false;
}

/**
 * 다음 가능한 상태 목록 반환
 */
export function getNextStatuses(current: ProjectStatus): ProjectStatus[] {
  return PROJECT_STATUSES[current]?.next || [];
}

/**
 * StatusBadge에 전달할 props 반환
 */
export function getStatusBadgeProps(status: ProjectStatus) {
  const config = PROJECT_STATUSES[status];
  return {
    status,
    label: config?.label || status,
  };
}

/**
 * 상태에 따른 색상 클래스 반환 (Tailwind)
 */
export function getStatusColorClass(status: ProjectStatus): string {
  const config = PROJECT_STATUSES[status];
  const colorMap: Record<string, string> = {
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    emerald: "bg-emerald-50 text-emerald-700",
    teal: "bg-brand-point-50 text-brand-point-700",
  };
  return colorMap[config?.color || "gray"] || colorMap.gray;
}
