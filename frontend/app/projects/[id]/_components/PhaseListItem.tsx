"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@sigongcore/ui";
import { PhaseFormDialog } from "./PhaseFormDialog";
import type { ConstructionPhaseRead } from "@sigongcore/types";

interface Props {
  phase: ConstructionPhaseRead;
  index: number;
  projectId: string;
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 border-green-100" },
  in_progress: { icon: Clock, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
  pending: { icon: Circle, color: "text-slate-400", bg: "bg-white border-slate-100" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function PhaseListItem({ phase, index, projectId }: Props) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const config = statusConfig[phase.status];
  const Icon = config.icon;
  const today = new Date();
  const isActuallyDelayed = phase.is_delayed || (
    phase.status !== "completed" && 
    new Date(phase.planned_end).getTime() < today.setHours(0,0,0,0)
  );

  const toggleMutation = useMutation({
    mutationFn: () => api.toggleConstructionPhase(projectId, phase.id),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["construction-plan", projectId] });
      const prev = queryClient.getQueryData(["construction-plan", projectId]);
      queryClient.setQueryData(["construction-plan", projectId], (old: unknown) => {
        const typedOld = old as { data?: { phases?: ConstructionPhaseRead[] } } | undefined;
        if (!typedOld?.data?.phases) return old;
        return {
          ...typedOld,
          data: {
            ...typedOld.data,
            phases: typedOld.data.phases.map((p) =>
              p.id === phase.id
                ? { ...p, status: p.status === "completed" ? "in_progress" : "completed" }
                : p
            ),
          },
        };
      });
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, context: { prev: unknown } | undefined) => {
      queryClient.setQueryData(["construction-plan", projectId], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteConstructionPhase(projectId, phase.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });
    },
  });

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200",
          phase.status === "completed" 
            ? "bg-slate-50/50 border-slate-100 opacity-60" 
            : cn(config.bg, "shadow-sm hover:shadow-md border-opacity-50")
        )}
      >
        {/* Checkbox / Status Icon */}
        <button
          onClick={() => toggleMutation.mutate(undefined)}
          disabled={toggleMutation.isPending}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
            phase.status === "completed" ? "bg-green-100" : "bg-white shadow-sm ring-1 ring-slate-100"
          )}
          aria-label={phase.status === "completed" ? "완료를 취소할까요?" : "완료로 표시할까요?"}
        >
          <Icon className={cn("h-6 w-6", config.color)} />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-base font-bold text-slate-800",
                phase.status === "completed" && "line-through text-slate-400",
              )}
            >
              {index + 1}. {phase.name}
            </span>
            {phase.is_delayed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-600 ring-1 ring-red-200">
                <AlertCircle className="h-3 w-3" />
                지연 {phase.delay_days}일
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatDate(phase.planned_start)} ~ {formatDate(phase.planned_end)}</span>
          </div>
          {phase.notes && (
            <p className="mt-2 line-clamp-1 text-xs text-slate-400 italic">“{phase.notes}”</p>
          )}
        </div>

        {/* Actions Overlay for Desktop */}
        <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setIsEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-primary-500 hover:ring-primary-200"
            aria-label="공정 수정하기"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-red-500 hover:ring-red-200"
            aria-label="공정 삭제하기"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Status Text - Enlarged for better visibility */}
        <div className="shrink-0 text-xs font-bold tracking-tight sm:text-sm">
          {isActuallyDelayed ? (
            <span className="text-red-500">지연</span>
          ) : (
            <>
              {phase.status === "completed" && <span className="text-green-600">완료</span>}
              {phase.status === "in_progress" && <span className="text-blue-600">진행중</span>}
              {phase.status === "pending" && <span className="text-slate-400">대기</span>}
            </>
          )}
        </div>
      </div>

      <PhaseFormDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        projectId={projectId}
        mode="edit"
        phase={phase}
      />
    </>
  );
}
