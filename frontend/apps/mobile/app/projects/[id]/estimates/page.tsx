"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Card,
  CardContent,
  Button,
  StatusBadge,
  formatCurrency,
} from "@sigongon/ui";
import { useProject, useCreateEstimate } from "@/hooks";
import { FileText, Plus, ChevronRight, Loader2 } from "lucide-react";
import type { EstimateStatus } from "@sigongon/types";
import { toast } from "@sigongon/ui";

interface ProjectEstimateListPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectEstimateListPage({
  params,
}: ProjectEstimateListPageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { data, isLoading } = useProject(projectId);
  const createEstimate = useCreateEstimate(projectId);

  const estimates =
    data?.success && data.data
      ? [...data.data.estimates].sort((a, b) => b.version - a.version)
      : [];

  async function handleCreateEstimate() {
    try {
      const project = data?.success ? data.data : null;
      const visits = project?.site_visits || [];
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
  }

  if (isLoading) {
    return (
      <MobileLayout title="견적서 목록" showBack>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="견적서 목록"
      showBack
      rightAction={
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCreateEstimate}
          loading={createEstimate.isPending}
          disabled={createEstimate.isPending}
        >
          <Plus className="h-4 w-4" />
          생성
        </Button>
      }
    >
      <div className="space-y-3 p-4">
        {estimates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                아직 견적서가 없습니다.
              </p>
              <Button
                className="mt-4"
                onClick={handleCreateEstimate}
                loading={createEstimate.isPending}
                disabled={createEstimate.isPending}
              >
                <Plus className="h-4 w-4" />첫 견적서 생성
              </Button>
            </CardContent>
          </Card>
        ) : (
          estimates.map((estimate) => (
            <Link key={estimate.id} href={`/estimates/${estimate.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        견적서 v{estimate.version}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">
                        {formatCurrency(Number(estimate.total_amount))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={estimate.status as EstimateStatus} />
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
