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
          "flex items-center gap-3 rounded-xl border p-3 transition-all",
          config.bg,
          phase.status === "completed" && "opacity-70",
        )}
      >
        {/* Checkbox */}
        <button
          onClick={() => toggleMutation.mutate(undefined)}
          disabled={toggleMutation.isPending}
          className="shrink-0 transition-transform active:scale-90"
          aria-label={phase.status === "completed" ? "완료 취소" : "완료 표시"}
        >
          <Icon className={cn("h-6 w-6", config.color)} />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold text-slate-800",
                phase.status === "completed" && "line-through text-slate-400",
              )}
            >
              {index + 1}. {phase.name}
            </span>
            {phase.is_delayed && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                <AlertCircle className="h-3 w-3" />
                +{phase.delay_days}일
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDate(phase.planned_start)} ~ {formatDate(phase.planned_end)}{" "}
            <span className="text-slate-400">({phase.planned_days}일)</span>
          </p>
          {phase.notes && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{phase.notes}</p>
          )}
        </div>

        {/* Status badge */}
        <div className="shrink-0 text-xs font-medium text-slate-400">
          {phase.status === "completed" && <span className="text-green-600">완료</span>}
          {phase.status === "in_progress" && <span className="text-blue-600">진행중</span>}
          {phase.status === "pending" && !phase.is_delayed && <span>대기</span>}
          {phase.is_delayed && phase.status !== "completed" && (
            <span className="text-red-600">지연</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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
