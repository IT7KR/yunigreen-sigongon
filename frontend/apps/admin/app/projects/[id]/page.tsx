"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  HardHat,
  Sparkles,
  User,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusBadge,
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
  description: string;
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
): { primaryAction: OverviewAction; secondaryActions: OverviewAction[] } {
  const actionCatalog = {
    createVisit: {
      label: "현장방문 등록",
      href: `/projects/${projectId}/visits/new`,
      description: "현장 사진과 방문 내용을 등록해 다음 단계를 시작합니다.",
    },
    reviewDiagnosis: {
      label: "AI 진단 확인",
      href: `/projects/${projectId}/diagnoses`,
      description: "진단 결과와 추천 자재를 검토합니다.",
    },
    createEstimate: {
      label: "견적서 작성",
      href: `/projects/${projectId}/estimates`,
      description: "최신 단가 기준으로 견적을 생성하고 발행 준비를 합니다.",
    },
    manageContract: {
      label: "계약 진행",
      href: `/projects/${projectId}/contracts`,
      description: "계약서 발행 및 서명 상태를 관리합니다.",
    },
    openStartReport: {
      label: "착공계 준비",
      href: `/projects/${projectId}/construction/start-report`,
      description: "착공 서류를 준비하고 시공 단계로 전환합니다.",
    },
    writeDailyReport: {
      label: "작업일지 작성",
      href: `/projects/${projectId}/construction/daily-reports/new`,
      description: "당일 작업과 인력, 사진을 기록합니다.",
    },
    reviewConstruction: {
      label: "시공 현황 보기",
      href: `/projects/${projectId}/construction`,
      description: "시공 진행률과 일일보고/노무 현황을 확인합니다.",
    },
    openCompletion: {
      label: "준공정산 확인",
      href: `/projects/${projectId}/completion/closeout-report`,
      description: "준공 서류와 정산/후속 절차를 정리합니다.",
    },
    openTaxInvoice: {
      label: "세금계산서 관리",
      href: `/projects/${projectId}/tax-invoice`,
      description: "발행 이력 확인 및 신규 발행을 진행합니다.",
    },
    openDocuments: {
      label: "문서함 열기",
      href: `/projects/${projectId}/documents`,
      description: "프로젝트 단계별 문서를 한 곳에서 관리합니다.",
    },
  } as const;

  let primaryAction: OverviewAction = actionCatalog.reviewConstruction;

  if (visitCount === 0) {
    primaryAction = actionCatalog.createVisit;
  } else if (diagnosisCount === 0) {
    primaryAction = actionCatalog.reviewDiagnosis;
  } else if (!hasEstimate) {
    primaryAction = actionCatalog.createEstimate;
  } else if (!hasContract) {
    primaryAction = actionCatalog.manageContract;
  } else if (projectStatus === "contracted") {
    primaryAction = actionCatalog.openStartReport;
  } else if (projectStatus === "in_progress") {
    primaryAction = actionCatalog.writeDailyReport;
  } else if (
    projectStatus === "completed" ||
    projectStatus === "warranty" ||
    projectStatus === "closed"
  ) {
    primaryAction = actionCatalog.openCompletion;
  }

  const secondaryPool: OverviewAction[] = [
    actionCatalog.createVisit,
    actionCatalog.reviewDiagnosis,
    actionCatalog.createEstimate,
    actionCatalog.manageContract,
    actionCatalog.reviewConstruction,
    actionCatalog.openCompletion,
    actionCatalog.openTaxInvoice,
    actionCatalog.openDocuments,
  ];

  if (projectStatus === "in_progress") {
    secondaryPool.unshift(actionCatalog.writeDailyReport);
  }

  if (projectStatus === "contracted") {
    secondaryPool.unshift(actionCatalog.openStartReport);
  }

  const seen = new Set<string>();
  const secondaryActions = secondaryPool
    .filter((action) => {
      if (action.href === primaryAction.href) return false;
      if (seen.has(action.href)) return false;
      seen.add(action.href);
      return true;
    })
    .slice(0, 3);

  return { primaryAction, secondaryActions };
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useProject(id);
  const project = response?.success ? (response.data as ProjectDetail) : null;

  const [representativeInfo, setRepresentativeInfo] =
    useState<RepresentativeInfo | null>(null);
  const [representativeLoading, setRepresentativeLoading] = useState(true);
  const [representativeError, setRepresentativeError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadRepresentative() {
      try {
        setRepresentativeLoading(true);
        setRepresentativeError(null);

        const assignment = await getRepresentativeAssignmentByProjectId(id);
        if (!assignment) {
          if (!isCancelled) setRepresentativeInfo(null);
          return;
        }

        const representative = await getRepresentativeById(
          assignment.representativeId,
        );

        if (!isCancelled) {
          if (!representative) {
            setRepresentativeInfo(null);
          } else {
            setRepresentativeInfo({
              name: representative.name,
              phone: representative.phone,
              effectiveDate: assignment.effectiveDate,
            });
          }
        }
      } catch {
        if (!isCancelled) {
          setRepresentativeError("현장대리인 정보를 불러오지 못했습니다.");
          setRepresentativeInfo(null);
        }
      } finally {
        if (!isCancelled) setRepresentativeLoading(false);
      }
    }

    loadRepresentative();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <OverviewLoadingState />;
  }

  if (isError || !project) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">
              프로젝트를 불러오지 못했어요
            </p>
            <p className="text-sm text-slate-500">
              네트워크 상태를 확인한 뒤 다시 시도해 주세요.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="md" className="h-11" onClick={() => refetch()}>
              다시 시도
            </Button>
            <Button size="md" variant="secondary" className="h-11" asChild>
              <Link href="/projects">목록으로 돌아가기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visitCount = project.site_visits?.length ?? 0;
  const diagnosisCount = project.diagnoses_count ?? 0;
  const estimateCount = project.estimates?.length ?? 0;
  const contractCount = project.contracts?.length ?? 0;
  const latestEstimate =
    project.estimates.length > 0
      ? project.estimates.reduce((latest, current) => {
          if (current.version > latest.version) return current;
          return latest;
        }, project.estimates[0])
      : undefined;
  const latestContract =
    project.contracts && project.contracts.length > 0
      ? project.contracts[project.contracts.length - 1]
      : undefined;

  const { primaryAction, secondaryActions } = buildOverviewActions(
    id,
    project.status,
    visitCount,
    diagnosisCount,
    estimateCount > 0,
    contractCount > 0,
  );

  const categoryLabel = project.category
    ? PROJECT_CATEGORIES.find((category) => category.id === project.category)
        ?.label ?? project.category
    : "-";

  return (
    <div className="space-y-6">
      <Card className="border-brand-point-200 bg-gradient-to-r from-brand-point-50/80 via-white to-white">
        <CardContent className="p-5">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <p className="text-sm font-medium text-slate-600">현재 단계</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {PROJECT_PHASE_LABELS[project.status]}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                다음 추천 액션: {primaryAction.label}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">견적</span>
                {latestEstimate ? (
                  <StatusBadge status={latestEstimate.status} />
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    없음
                  </span>
                )}
                <span className="text-xs font-medium text-slate-500">계약</span>
                {latestContract ? (
                  <StatusBadge status={latestContract.status} />
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    없음
                  </span>
                )}
              </div>
            </div>

            <SummaryMetric
              icon={<ClipboardList className="h-5 w-5 text-brand-point-600" />}
              label="현장방문"
              value={`${visitCount}건`}
              href={`/projects/${id}/visits`}
            />
            <SummaryMetric
              icon={<Sparkles className="h-5 w-5 text-blue-600" />}
              label="AI 진단"
              value={`${diagnosisCount}건`}
              href={`/projects/${id}/diagnoses`}
            />
            <SummaryMetric
              icon={<ClipboardCheck className="h-5 w-5 text-amber-600" />}
              label="견적/계약"
              value={`${estimateCount}/${contractCount}`}
              description="견적건수/계약건수"
              href={`/projects/${id}/contracts`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <p className="text-sm text-slate-500">
            지금 진행할 업무를 바로 시작할 수 있도록 단계별 액션을 추천합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-xl border border-brand-point-200 bg-brand-point-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-point-700">
              추천 액션
            </p>
            <p className="mt-1 text-lg font-semibold text-brand-point-900">
              {primaryAction.label}
            </p>
            <p className="mt-1 text-sm text-brand-point-800">
              {primaryAction.description}
            </p>
            <Button className="mt-3 h-11" asChild>
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {secondaryActions.map((action) => (
              <div
                key={action.href}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                <Button
                  variant="secondary"
                  className="mt-3 h-11 w-full"
                  asChild
                >
                  <Link href={action.href}>이동하기</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-point-500" />
            프로젝트 진행 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ProjectWorkflowTimeline
            projectId={id}
            visitCount={visitCount}
            diagnosisCount={diagnosisCount}
            hasEstimate={estimateCount > 0}
            estimateStatus={latestEstimate?.status}
            hasContract={contractCount > 0}
            contractStatus={latestContract?.status}
            projectStatus={project.status}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <InfoRow label="공사 유형" value={categoryLabel} />
            <InfoRow label="등록일" value={formatDate(project.created_at)} />
            <InfoRow label="프로젝트 ID" value={project.id} mono />
            <InfoRow label="주소" value={project.address || "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              고객 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <InfoRow label="고객명" value={project.client_name || "-"} />
            <InfoRow label="연락처" value={project.client_phone || "-"} />
            <InfoRow
              label="추천 다음 단계"
              value={primaryAction.label}
              emphasize
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-slate-400" />
              현장대리인
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {representativeLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
              </div>
            ) : representativeError ? (
              <p className="text-sm text-red-600">{representativeError}</p>
            ) : representativeInfo ? (
              <>
                <InfoRow label="이름" value={representativeInfo.name} />
                <InfoRow label="연락처" value={representativeInfo.phone} />
                <InfoRow
                  label="적용 기준일"
                  value={formatDate(representativeInfo.effectiveDate)}
                />
              </>
            ) : (
              <p className="text-sm text-slate-500">
                배정된 현장대리인이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-slate-400" />
              메모
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-line text-sm text-slate-600">
              {project.notes || "메모가 없습니다."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  href,
  description,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-point-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-point-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </span>
      </div>
    </Link>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  emphasize = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={[
          "mt-0.5 break-all text-slate-900",
          mono ? "font-mono text-sm" : "font-medium",
          emphasize ? "text-brand-point-700" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function OverviewLoadingState() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <Card>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Skeleton className="h-36" />
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    </div>
  );
}
