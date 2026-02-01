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
  FileText,
  Sparkles,
  Plus,
  ChevronRight,
  ClipboardList,
  FileCheck,
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  formatDate,
} from "@sigongon/ui";
import { SiteVisitCard, EstimateCard } from "@/components/features";
import {
  useProject,
  useSiteVisits,
  useRequestDiagnosis,
  useCreateEstimate,
} from "@/hooks";
import type { ProjectStatus, VisitType, EstimateStatus } from "@sigongon/types";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: projectData, isLoading: projectLoading } = useProject(id);
  const { data: visitsData, isLoading: visitsLoading } = useSiteVisits(id);
  const requestDiagnosis = useRequestDiagnosis();
  const createEstimate = useCreateEstimate(id);

  const project = projectData?.data;
  const visits = visitsData?.data || [];
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
          <Link href="/projects">
            <Button variant="secondary">목록으로 돌아가기</Button>
          </Link>
        </div>
      </MobileLayout>
    );
  }

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

        {/* 빠른 액션 */}
        <div className="grid grid-cols-3 gap-2">
          <Link href={`/projects/${id}/visits/new`}>
            <Button
              variant="secondary"
              fullWidth
              className="flex-col gap-1 py-3"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs">현장방문</span>
            </Button>
          </Link>

          <Link href={`/projects/${id}/photos`}>
            <Button
              variant="secondary"
              fullWidth
              className="flex-col gap-1 py-3"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs">사진촬영</span>
            </Button>
          </Link>

          <Button
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

          <Button
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

          <Link href={`/projects/${id}/construction/start-report`}>
            <Button
              variant="secondary"
              fullWidth
              className="flex-col gap-1 py-3"
            >
              <FileCheck className="h-5 w-5" />
              <span className="text-xs">착공계</span>
            </Button>
          </Link>

          <Link href={`/projects/${id}/construction/daily-reports`}>
            <Button
              variant="secondary"
              fullWidth
              className="flex-col gap-1 py-3"
            >
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs">작업일지</span>
            </Button>
          </Link>
        </div>

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
                <Link href={`/projects/${id}/visits/new`}>
                  <Button variant="ghost" size="sm" className="mt-2">
                    첫 방문 기록하기
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 견적서 목록 */}
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
      </div>
    </MobileLayout>
  );
}
