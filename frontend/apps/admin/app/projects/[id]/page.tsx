"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Hammer,
  HardHat,
  MapPin,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusBadge,
  cn,
  formatDate,
} from "@sigongon/ui";
import type { ProjectDetail, ProjectStatus } from "@sigongon/types";
import { PROJECT_CATEGORIES } from "@sigongon/types";
import { useProject } from "@/hooks";
import { ProjectWorkflowTimeline } from "@/components/ProjectWorkflowTimeline";
import {
  getRepresentativeAssignmentByProjectId,
  getRepresentativeById,
} from "@/lib/fieldRepresentatives";

interface RepresentativeInfo {
  name: string;
  phone: string;
  effectiveDate: string;
}

interface OverviewAction {
  label: string;
  href: string;
  icon: ReactNode;
  primary?: boolean;
}

const PROJECT_PHASE_LABELS: Record<ProjectStatus, string> = {
  draft: "현장 준비",
  diagnosing: "진단 진행",
  estimating: "견적 작성",
  quoted: "견적 협의",
  contracted: "착공 준비",
  in_progress: "시공 진행",
  completed: "준공 완료",
  warranty: "하자보증",
  closed: "완결",
};

function buildOverviewActions(
  projectId: string,
  projectStatus: ProjectStatus,
  visitCount: number,
  diagnosisCount: number,
  hasEstimate: boolean,
  hasContract: boolean,
): OverviewAction[] {
  // Define all possible actions with icons
  const actions: OverviewAction[] = [
    {
      label: "현장방문",
      href: `/projects/${projectId}/visits/new`,
      icon: <MapPin className="h-5 w-5" />,
    },
    {
      label: "AI 진단",
      href: `/projects/${projectId}/diagnoses`,
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      label: "견적작성",
      href: `/projects/${projectId}/estimates`,
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "계약관리",
      href: `/projects/${projectId}/contracts`,
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "작업일지",
      href: `/projects/${projectId}/construction/daily-reports/new`,
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      label: "시공현황",
      href: `/projects/${projectId}/construction`,
      icon: <Hammer className="h-5 w-5" />,
    },
    {
      label: "준공정산",
      href: `/projects/${projectId}/completion/closeout-report`,
      icon: <Zap className="h-5 w-5" />,
    },
  ];

  // Determine Primary Action based on status
  let primaryIndex = 5; // Default: 시공현황

  if (visitCount === 0)
    primaryIndex = 0; // 현장방문
  else if (diagnosisCount === 0)
    primaryIndex = 1; // AI 진단
  else if (!hasEstimate)
    primaryIndex = 2; // 견적작성
  else if (!hasContract)
    primaryIndex = 3; // 계약관리
  else if (projectStatus === "contracted")
    primaryIndex = 4; // 작업일지 (착공 후)
  else if (projectStatus === "in_progress")
    primaryIndex = 4; // 작업일지
  else if (["completed", "warranty", "closed"].includes(projectStatus))
    primaryIndex = 6; // 준공정산

  // Set primary flag
  actions[primaryIndex].primary = true;

  return actions;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: response, isLoading, isError, refetch } = useProject(id);
  const project = response?.success ? (response.data as ProjectDetail) : null;

  const [representativeInfo, setRepresentativeInfo] =
    useState<RepresentativeInfo | null>(null);
  const [representativeLoading, setRepresentativeLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function loadRepresentative() {
      try {
        setRepresentativeLoading(true);
        const assignment = await getRepresentativeAssignmentByProjectId(id);
        if (!assignment) {
          if (!isCancelled) setRepresentativeInfo(null);
          return;
        }
        const representative = await getRepresentativeById(
          assignment.representativeId,
        );
        if (!isCancelled && representative) {
          setRepresentativeInfo({
            name: representative.name,
            phone: representative.phone,
            effectiveDate: assignment.effectiveDate,
          });
        } else if (!isCancelled) {
          setRepresentativeInfo(null);
        }
      } catch {
        if (!isCancelled) setRepresentativeInfo(null);
      } finally {
        if (!isCancelled) setRepresentativeLoading(false);
      }
    }
    loadRepresentative();
    return () => {
      isCancelled = true;
    };
  }, [id]);

  if (isLoading) return <OverviewLoadingState />;

  if (isError || !project) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">
              프로젝트를 불러오지 못했어요
            </p>
            <Button size="md" onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const actions = buildOverviewActions(
    id,
    project.status,
    project.site_visits?.length ?? 0,
    project.diagnoses_count ?? 0,
    (project.estimates?.length ?? 0) > 0,
    (project.contracts?.length ?? 0) > 0,
  );
  const latestEstimate = [...(project.estimates || [])].sort(
    (a, b) => b.version - a.version,
  )[0];
  const latestContract = [...(project.contracts || [])][0];

  const primaryAction = actions.find((a) => a.primary) || actions[0];
  const quickActions = actions.filter((a) => a !== primaryAction).slice(0, 5); // Limit quick actions

  const categoryLabel = project.category
    ? (PROJECT_CATEGORIES.find((category) => category.id === project.category)
        ?.label ?? project.category)
    : "-";

  return (
    <div className="space-y-4">
      {/* 1. Action-First Hero Section (V2) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:text-left">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <StatusBadge status={project.status} className="scale-110" />
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {PROJECT_PHASE_LABELS[project.status]}
              </h2>
            </div>
          </div>
          <Button
            size="lg"
            className="w-full text-lg shadow-md sm:w-auto sm:px-8 sm:h-14"
            asChild
          >
            <Link
              href={primaryAction.href}
              className="flex items-center justify-center gap-2"
            >
              {primaryAction.icon}
              {primaryAction.label} 바로가기
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Minimal Quick Actions (V2: Max 4 items, flat style) */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.slice(0, 4).map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center justify-center gap-2 p-2 transition-opacity hover:opacity-70"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              {action.icon}
            </div>
            <span className="text-xs font-medium text-slate-600 text-center leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* 3. Collapsible Info Sections */}
      <div className="space-y-3">
        <CollapsibleCard
          title="기본 및 고객 정보"
          icon={<User className="h-5 w-5 text-slate-400" />}
          summary={project.client_name ? `${project.client_name}` : undefined}
        >
          <div className="grid gap-6 py-2 sm:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-slate-400">
                프로젝트 정보
              </h4>
              <InfoRow label="공사 유형" value={categoryLabel} />
              <InfoRow label="등록일" value={formatDate(project.created_at)} />
              <InfoRow label="주소" value={project.address || "-"} />
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-slate-400">
                고객 정보
              </h4>
              <InfoRow label="고객명" value={project.client_name || "-"} />
              <InfoRow label="연락처" value={project.client_phone || "-"} />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="현장대리인"
          icon={<HardHat className="h-5 w-5 text-slate-400" />}
          summary={representativeInfo ? `${representativeInfo.name}` : "미배정"}
        >
          <div className="py-2">
            {representativeLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            ) : representativeInfo ? (
              <div className="space-y-3">
                <InfoRow label="이름" value={representativeInfo.name} />
                <InfoRow label="연락처" value={representativeInfo.phone} />
                <InfoRow
                  label="배정일"
                  value={formatDate(representativeInfo.effectiveDate)}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                배정된 현장대리인이 없습니다.
              </p>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="진행 타임라인"
          icon={<CalendarDays className="h-5 w-5 text-slate-400" />}
          summary={`현재: ${PROJECT_PHASE_LABELS[project.status]}`}
        >
          <div className="py-2">
            <ProjectWorkflowTimeline
              projectId={id}
              visitCount={project.site_visits?.length ?? 0}
              diagnosisCount={project.diagnoses_count ?? 0}
              hasEstimate={(project.estimates?.length ?? 0) > 0}
              estimateStatus={latestEstimate?.status}
              hasContract={(project.contracts?.length ?? 0) > 0}
              contractStatus={latestContract?.status}
              projectStatus={project.status}
            />
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}

function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen = false,
  summary,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  summary?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 focus:outline-none"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          {icon}
          <span>{title}</span>
          {summary && !isOpen && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({summary})
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="animate-in slide-in-from-top-1 fade-in-0 border-t border-slate-100 px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}

function OverviewLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
