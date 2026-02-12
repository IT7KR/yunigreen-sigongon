"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
} from "@sigongon/ui";
import type { ProjectStatus, VisitType, EstimateStatus, ContractStatus } from "@sigongon/types";
import { api } from "@/lib/api";
import { ProjectWorkflowTimeline } from "@/components/ProjectWorkflowTimeline";
import {
  getAssignmentByProjectId,
  getRepresentativeById,
} from "@/lib/fieldRepresentatives";

interface ProjectDetail {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  client_name?: string;
  client_phone?: string;
  notes?: string;
  created_at: string;
  site_visits: Array<{
    id: string;
    visit_type: VisitType;
    visited_at: string;
    photo_count: number;
  }>;
  estimates: Array<{
    id: string;
    version: number;
    status: EstimateStatus;
    total_amount: string;
    created_at?: string;
  }>;
  contracts?: Array<{
    id: string;
    status: ContractStatus;
  }>;
  diagnoses_count?: number;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [representativeInfo, setRepresentativeInfo] = useState<{
    name: string;
    phone: string;
    effectiveDate: string;
  } | null>(null);

  useEffect(() => {
    loadProject();
  }, [id]);

  useEffect(() => {
    const assignment = getAssignmentByProjectId(id);
    if (!assignment) {
      setRepresentativeInfo(null);
      return;
    }
    const representative = getRepresentativeById(assignment.representativeId);
    if (!representative) {
      setRepresentativeInfo(null);
      return;
    }
    setRepresentativeInfo({
      name: representative.name,
      phone: representative.phone,
      effectiveDate: assignment.effectiveDate,
    });
  }, [id]);

  async function loadProject() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getProject(id);
      if (response.success && response.data) {
        setProject(response.data as ProjectDetail);
      }
    } catch (err) {
      setError("프로젝트를 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "프로젝트를 찾을 수 없어요"}</p>
        <Link href="/projects">
          <Button>목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  // Calculate workflow stats
  const visitCount = project.site_visits?.length || 0;
  const diagnosisCount = project.diagnoses_count || 0;
  const hasEstimate = project.estimates?.length > 0;
  const latestEstimate = project.estimates?.[0];
  const hasContract = (project.contracts?.length || 0) > 0;
  const latestContract = project.contracts?.[0];

  return (
    <div className="space-y-6">
      {/* Workflow Timeline */}
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
            hasEstimate={hasEstimate}
            estimateStatus={latestEstimate?.status}
            hasContract={hasContract}
            contractStatus={latestContract?.status}
            projectStatus={project.status}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              고객 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">고객명</p>
              <p className="font-medium text-slate-900">
                {project.client_name || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">연락처</p>
              <p className="font-medium text-slate-900">
                {project.client_phone || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">등록일</p>
              <p className="font-medium text-slate-900">
                {formatDate(project.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>현장대리인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {representativeInfo ? (
              <>
                <div>
                  <p className="text-sm text-slate-500">이름</p>
                  <p className="font-medium text-slate-900">
                    {representativeInfo.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">연락처</p>
                  <p className="font-medium text-slate-900">
                    {representativeInfo.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">적용 기준일</p>
                  <p className="font-medium text-slate-900">
                    {representativeInfo.effectiveDate}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                배정된 현장대리인이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              {project.notes || "메모가 없습니다."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
