"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Phone,
  User,
  Calendar,
  Camera,
  Image,
  FileText,
  Sparkles,
  Plus,
  ChevronRight,
  ClipboardList,
  FileCheck,
  CheckCircle2,
  Package,
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  cn,
  formatDate,
  toast,
} from "@sigongon/ui";
import { SiteVisitCard, EstimateCard } from "@/components/features";
import {
  useProject,
  useSiteVisits,
  useConstructionReports,
  useRequestDiagnosis,
  useCreateEstimate,
} from "@/hooks";
import { useAuth } from "@/lib/auth";
import type {
  ProjectStatus,
  VisitType,
  EstimateStatus,
  ReportStatus,
} from "@sigongon/types";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const { data: projectData, isLoading: projectLoading } = useProject(id);
  const { data: visitsData, isLoading: visitsLoading } = useSiteVisits(id);
  const { data: reportsData } = useConstructionReports(id);
  const requestDiagnosis = useRequestDiagnosis();
  const createEstimate = useCreateEstimate(id);

  const project = projectData?.data;
  const visits = visitsData?.data || [];
  const reports = reportsData?.data || [];
  const startReports = reports.filter((report) => report.report_type === "start");
  const latestStartReport = [...startReports].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  const startReportStatus = latestStartReport?.status as ReportStatus | undefined;
  const latestVisit = visits[0];

  const handleRequestDiagnosis = async () => {
    if (!latestVisit) return;

    try {
      const result = await requestDiagnosis.mutateAsync({
        visitId: latestVisit.id,
      });
      if (result.success && result.data) {
        router.push(`/diagnoses/${result.data.diagnosis_id}`);
      }
    } catch (error) {
      console.error("진단 요청 실패:", error);
    }
  };

  const handleCreateEstimate = async () => {
    try {
      if (visits.length === 0) {
        toast.warning("현장방문 기록이 있어야 견적서를 생성할 수 있어요.");
        return;
      }
      const hasArea = visits.some((visit) => Boolean(visit.estimated_area_m2));
      if (!hasArea) {
        toast.warning("면적 산출값을 먼저 입력해 주세요.");
        return;
      }
      const result = await createEstimate.mutateAsync(undefined);
      if (result.success && result.data) {
        router.push(`/estimates/${result.data.id}`);
      }
    } catch (error) {
      console.error("견적서 생성 실패:", error);
    }
  };

  if (projectLoading) {
    return (
      <MobileLayout title="프로젝트" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!project) {
    return (
      <MobileLayout title="프로젝트" showBack>
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <p className="text-slate-500">프로젝트를 찾을 수 없어요</p>
          <Button variant="secondary" asChild><Link href="/projects">목록으로 돌아가기</Link></Button>
        </div>
      </MobileLayout>
    );
  }

  // 상태 기반 빠른 액션 우선순위
  const hasVisits = visits.length > 0;
  const hasDiagnosis = (project.diagnoses_count ?? 0) > 0;
  const hasEstimate = (project.estimates?.length ?? 0) > 0;
  const hasContract = (project.contracts?.length ?? 0) > 0;
  const projectStatus = project.status as ProjectStatus;

  type ActionKey =
    | "visit"
    | "photo"
    | "diagnosis"
    | "estimate"
    | "orders"
    | "reports"
    | "daily"
    | "closeout"
    | "album";
  const isSiteManager = user?.role === "site_manager";

  const roleActionSet = isSiteManager
    ? new Set<ActionKey>([
        "visit",
        "photo",
        "diagnosis",
        "orders",
        "reports",
        "daily",
        "closeout",
        "album",
      ])
    : new Set<ActionKey>([
        "visit",
        "photo",
        "diagnosis",
        "estimate",
        "orders",
        "reports",
        "daily",
        "closeout",
        "album",
      ]);

  const getPriorityOrder = (): ActionKey[] => {
    const filterByRole = (actions: ActionKey[]) =>
      actions.filter((action) => roleActionSet.has(action));

    if (!hasVisits)
      return filterByRole([
        "visit",
        "photo",
        "diagnosis",
        "estimate",
        "orders",
        "reports",
        "daily",
        "closeout",
        "album",
      ]);
    if (!hasDiagnosis)
      return filterByRole([
        "diagnosis",
        "visit",
        "estimate",
        "orders",
        "photo",
        "reports",
        "daily",
        "closeout",
        "album",
      ]);
    if (!hasEstimate)
      return filterByRole([
        "estimate",
        "diagnosis",
        "visit",
        "orders",
        "photo",
        "reports",
        "daily",
        "closeout",
        "album",
      ]);
    if (!hasContract)
      return filterByRole([
        "estimate",
        "orders",
        "reports",
        "daily",
        "visit",
        "diagnosis",
        "photo",
        "closeout",
        "album",
      ]);
    if (projectStatus === "contracted")
      return filterByRole([
        "reports",
        "daily",
        "photo",
        "estimate",
        "orders",
        "visit",
        "diagnosis",
        "closeout",
        "album",
      ]);
    if (projectStatus === "in_progress")
      return filterByRole([
        "daily",
        "reports",
        "photo",
        "estimate",
        "orders",
        "visit",
        "diagnosis",
        "closeout",
        "album",
      ]);
    if (["completed", "warranty", "closed"].includes(projectStatus))
      return filterByRole([
        "closeout",
        "album",
        "reports",
        "daily",
        "orders",
        "estimate",
        "visit",
        "diagnosis",
        "photo",
      ]);
    return filterByRole([
      "visit",
      "photo",
      "diagnosis",
      "estimate",
      "orders",
      "reports",
      "daily",
      "closeout",
      "album",
    ]);
  };

  const priorityOrder = getPriorityOrder();

  const actionNodes: Record<ActionKey, React.ReactNode> = {
    visit: (
      <Button key="visit" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/visits/new`}>
          <Camera className="h-5 w-5" />
          <span className="text-xs">현장방문</span>
        </Link>
      </Button>
    ),
    photo: (
      <Button key="photo" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/photos`}>
          <Camera className="h-5 w-5" />
          <span className="text-xs">사진촬영</span>
        </Link>
      </Button>
    ),
    diagnosis: (
      <Button
        key="diagnosis"
        variant="secondary"
        fullWidth
        className="flex-col gap-1 py-3"
        onClick={handleRequestDiagnosis}
        disabled={!latestVisit || requestDiagnosis.isPending}
        loading={requestDiagnosis.isPending}
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-xs">AI 진단</span>
      </Button>
    ),
    estimate: (
      <Button
        key="estimate"
        variant="secondary"
        fullWidth
        className="flex-col gap-1 py-3"
        onClick={handleCreateEstimate}
        disabled={createEstimate.isPending}
        loading={createEstimate.isPending}
      >
        <FileText className="h-5 w-5" />
        <span className="text-xs">견적서</span>
      </Button>
    ),
    orders: (
      <Button key="orders" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/orders`}>
          <Package className="h-5 w-5" />
          <span className="text-xs">자재발주</span>
        </Link>
      </Button>
    ),
    reports: (
      <Button key="reports" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/reports`}>
          <FileCheck className="h-5 w-5" />
          <span className="text-xs">보고서</span>
        </Link>
      </Button>
    ),
    daily: (
      <Button key="daily" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/construction/daily-reports`}>
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs">작업일지</span>
        </Link>
      </Button>
    ),
    closeout: (
      <Button key="closeout" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/completion/closeout-report`}>
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs">준공/정산</span>
        </Link>
      </Button>
    ),
    album: (
      <Button key="album" variant="secondary" fullWidth className="flex-col gap-1 py-3" asChild>
        <Link href={`/projects/${id}/completion/photo-album`}>
          <Image className="h-5 w-5" />
          <span className="text-xs">준공사진첩</span>
        </Link>
      </Button>
    ),
  };

  // 진행 단계 상태 계산
  const progressSteps: { key: string; label: string; state: "done" | "active" | "pending" }[] = [
    { key: "visit", label: "현장방문", state: hasVisits ? "done" : "active" },
    { key: "diagnosis", label: "AI진단", state: hasDiagnosis ? "done" : hasVisits ? "active" : "pending" },
    { key: "estimate", label: "견적", state: hasEstimate ? "done" : hasDiagnosis ? "active" : "pending" },
    { key: "contract", label: "계약", state: hasContract ? "done" : hasEstimate ? "active" : "pending" },
    {
      key: "start_report",
      label: "착공계",
      state:
        startReportStatus === "approved" ||
        ["completed", "warranty", "closed"].includes(projectStatus)
          ? "done"
          : startReportStatus === "submitted" ||
              startReportStatus === "draft" ||
              startReportStatus === "rejected" ||
              hasContract
            ? "active"
            : "pending",
    },
    {
      key: "construction",
      label: "시공",
      state:
        ["completed", "warranty", "closed"].includes(projectStatus)
          ? "done"
          : projectStatus === "in_progress" || startReportStatus === "approved"
            ? "active"
            : "pending",
    },
    { key: "closeout", label: "준공", state: ["completed", "warranty", "closed"].includes(projectStatus) ? "done" : projectStatus === "in_progress" ? "active" : "pending" },
  ];

  return (
    <MobileLayout
      title={project.name}
      showBack
      rightAction={<StatusBadge status={project.status as ProjectStatus} />}
    >
      <div className="space-y-4 p-4">
        {/* 프로젝트 정보 */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="text-sm text-slate-700">{project.address}</span>
            </div>

            {project.client_name && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <span className="text-sm text-slate-700">
                  {project.client_name}
                </span>
              </div>
            )}

            {project.client_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <a
                  href={`tel:${project.client_phone}`}
                  className="text-sm text-brand-point-600 hover:underline"
                >
                  {project.client_phone}
                </a>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="text-sm text-slate-500">
                {formatDate(project.created_at)} 등록
              </span>
            </div>

            {project.notes && (
              <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {project.notes}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 수평 진행 표시기 */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start">
            {progressSteps.map((step, index) => (
              <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                      step.state === "done" ? "bg-brand-point-500" : step.state === "active" ? "bg-brand-point-300 ring-2 ring-brand-point-100" : "bg-slate-200",
                    )}
                  />
                  {index < progressSteps.length - 1 && (
                    <div className={cn("h-0.5 flex-1", step.state === "done" ? "bg-brand-point-400" : "bg-slate-200")} />
                  )}
                </div>
                <span className={cn(
                  "text-center text-[9px] leading-tight",
                  step.state === "done" ? "font-medium text-brand-point-600" : step.state === "active" ? "font-medium text-brand-point-400" : "text-slate-400",
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 액션 (상태 기반 우선순위) */}
        <div className="grid grid-cols-3 gap-2">
          {priorityOrder.map((key) => actionNodes[key])}
        </div>

        {isSiteManager && (
          <Card>
            <CardContent className="p-4 text-sm text-slate-600">
              일당 확정과 지급명세서 발급은 대표자 권한이며 관리자 웹에서 진행됩니다.
            </CardContent>
          </Card>
        )}

        {/* 현장방문 기록 */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">현장방문 기록</CardTitle>
            <Link
              href={`/projects/${id}/visits/new`}
              className="flex items-center gap-1 text-sm text-brand-point-600 hover:text-brand-point-700"
            >
              <Plus className="h-4 w-4" />
              추가
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {visitsLoading ? (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
              </div>
            ) : visits.length > 0 ? (
              visits.map((visit) => (
                <SiteVisitCard
                  key={visit.id}
                  visit={{
                    ...visit,
                    visit_type: visit.visit_type as VisitType,
                  }}
                  projectId={id}
                />
              ))
            ) : (
              <div className="py-6 text-center">
                <Camera className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  아직 현장방문 기록이 없어요
                </p>
                <Button variant="ghost" size="sm" className="mt-2" asChild><Link href={`/projects/${id}/visits/new`}>
                    첫 방문 기록하기
                  </Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 견적서 목록 */}
        {!isSiteManager && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">견적서</CardTitle>
              {project.estimates && project.estimates.length > 0 && (
                <Link
                  href={`/projects/${id}/estimates`}
                  className="flex items-center gap-1 text-sm text-brand-point-600 hover:text-brand-point-700"
                >
                  전체보기
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {project.estimates && project.estimates.length > 0 ? (
                project.estimates.slice(0, 3).map((estimate) => (
                  <EstimateCard
                    key={estimate.id}
                    estimate={{
                      ...estimate,
                      status: estimate.status as EstimateStatus,
                    }}
                  />
                ))
              ) : (
                <div className="py-6 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    아직 견적서가 없어요
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={handleCreateEstimate}
                    disabled={createEstimate.isPending}
                  >
                    견적서 만들기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
