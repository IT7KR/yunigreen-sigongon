"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Button, cn } from "@sigongcore/ui";
import { PhaseListItem } from "./PhaseListItem";
import { SimpleGanttChart } from "./SimpleGanttChart";
import { PhaseFormDialog } from "./PhaseFormDialog";
import type { ConstructionPlanDetail } from "@sigongcore/types";

interface Props {
  projectId: string;
}

export function ConstructionPlanView({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [isAddingPhase, setIsAddingPhase] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ["construction-plan", projectId],
    queryFn: () => api.getConstructionPlan(projectId),
  });

  const createPlanMutation = useMutation({
    mutationFn: () => api.createConstructionPlan(projectId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const planData = (response?.success ? response.data : null) as ConstructionPlanDetail | null;

  if (!planData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-slate-300" />
        <h3 className="mb-1 text-lg font-semibold text-slate-700">시공계획서가 없습니다</h3>
        <p className="mb-6 text-sm text-slate-500">공사 전 전체 공정 흐름을 정의해보세요</p>
        <Button
          onClick={() => createPlanMutation.mutate()}
          disabled={createPlanMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          계획서 만들기
        </Button>
      </div>
    );
  }

  const { plan, phases, summary } = planData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {plan.title || "시공계획서"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {summary.completed}/{summary.total} 완료 ({summary.progress_percent}%)
            {summary.delayed > 0 && (
              <span className="ml-2 font-semibold text-red-500">
                지연 {summary.delayed}개
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddingPhase(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          공정 추가
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-point-500 transition-all duration-500"
            style={{ width: `${summary.progress_percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>진행률</span>
          <span>{summary.progress_percent}%</span>
        </div>
      </div>

      {/* Phase List */}
      {phases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
          공정을 추가해보세요
        </div>
      ) : (
        <div className="space-y-2">
          {phases.map((phase, index) => (
            <PhaseListItem
              key={phase.id}
              phase={phase}
              index={index}
              projectId={projectId}
            />
          ))}
        </div>
      )}

      {/* Gantt Chart - desktop only */}
      {phases.length > 0 && (
        <div className="hidden md:block">
          <SimpleGanttChart phases={phases} />
        </div>
      )}

      {/* Add Phase Dialog */}
      <PhaseFormDialog
        open={isAddingPhase}
        onOpenChange={setIsAddingPhase}
        projectId={projectId}
        mode="add"
      />
    </div>
  );
}
