"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Users, Package, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { Button, cn } from "@sigongcore/ui";
import { PhaseListItem } from "./PhaseListItem";
import { SimpleGanttChart } from "./SimpleGanttChart";
import { PhaseFormDialog } from "./PhaseFormDialog";
import { LaborSection } from "./LaborSection";
import { MaterialSection } from "./MaterialSection";
import { OthersSection } from "./OthersSection";
import type { ConstructionPlanDetail } from "@sigongcore/types";

interface Props {
  projectId: string;
}

type PlanTab = "phases" | "labors" | "materials" | "others";

const tabs: { key: PlanTab; label: string; icon: typeof FileText }[] = [
  { key: "phases", label: "공정계획", icon: FileText },
  { key: "labors", label: "인력계획", icon: Users },
  { key: "materials", label: "자재투입", icon: Package },
  { key: "others", label: "기타계획", icon: Settings },
];

export function ConstructionPlanView({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanTab>("phases");

  const { data: response, isLoading } = useQuery({
    queryKey: ["construction-plan", projectId],
    queryFn: () => api.getConstructionPlan(projectId),
  });

  const createPlanMutation = useMutation({
    mutationFn: () => api.createConstructionPlan(projectId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["construction-plan", projectId],
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  const planData = (
    response?.success ? response.data : null
  ) as ConstructionPlanDetail | null;

  if (!planData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-slate-300" />
        <h3 className="mb-1 text-lg font-semibold text-slate-700">
          시공계획서가 없습니다
        </h3>
        <p className="mb-6 text-sm text-slate-500">
          공사 전 전체 공정 흐름을 정의해보세요
        </p>
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

  const { plan, phases, labors = [], materials = [], summary } = planData;

  return (
    <div className="space-y-6">
      {/* Header & Summary Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-600">
                시공계획
              </span>
              {summary.delayed > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 animate-pulse">
                  지연 {summary.delayed}개
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {plan.title || "시공계획서"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              총 {summary.total}개 공정 중 {summary.completed}개를 완료했어요
            </p>
          </div>
          <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-primary-500">
                {summary.progress_percent}%
              </span>
            </div>
            {activeTab === "phases" && (
              <Button
                size="sm"
                className="rounded-full px-5"
                onClick={() => setIsAddingPhase(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                공정 추가하기
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="inline-block rounded-full bg-primary-100 px-2 py-1 text-xs font-semibold uppercase text-primary-600">
                진행 현황
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary-600">
                {summary.progress_percent}%
              </span>
            </div>
          </div>
          <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-slate-100 text-xs">
            <div
              style={{ width: `${summary.progress_percent}%` }}
              className="flex flex-col justify-center whitespace-nowrap bg-primary-500 shadow-none transition-all duration-1000 ease-in-out"
            />
          </div>
        </div>
      </div>

      {/* Unified Gantt Chart */}
      {(phases.length > 0 || labors.length > 0 || materials.length > 0) && (
        <SimpleGanttChart phases={phases} labors={labors} materials={materials} />
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-all",
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "phases" && (
        <div className="space-y-4">
          {/* Phase List Section Header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
              결과 목록
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              드래그하여 순서 변경 (준비중)
            </span>
          </div>

          {/* Phase List */}
          {phases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 py-12 text-center">
              <div className="rounded-full bg-white p-3 shadow-sm mb-3">
                <FileText className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                아직 공정이 없어요.
                <br />첫 번째 공정을 추가해볼까요?
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
        </div>
      )}

      {activeTab === "labors" && (
        <LaborSection projectId={projectId} labors={labors} />
      )}

      {activeTab === "materials" && (
        <MaterialSection projectId={projectId} materials={materials} />
      )}

      {activeTab === "others" && (
        <OthersSection projectId={projectId} plan={plan} />
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
