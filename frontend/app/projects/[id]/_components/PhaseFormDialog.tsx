"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@sigongcore/ui";
import type { ConstructionPhaseRead } from "@sigongcore/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  mode: "add" | "edit";
  phase?: ConstructionPhaseRead;
}

export function PhaseFormDialog({ open, onOpenChange, projectId, mode, phase }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ name?: string; plannedStart?: string; plannedEnd?: string }>({});

  useEffect(() => {
    if (open) {
      setName(phase?.name ?? "");
      setPlannedStart(phase?.planned_start ?? "");
      setPlannedEnd(phase?.planned_end ?? "");
      setNotes(phase?.notes ?? "");
      setErrors({});
    }
  }, [open, phase]);

  const mutation = useMutation({
    mutationFn: (data: { name: string; planned_start: string; planned_end: string; notes?: string }) => {
      if (mode === "edit" && phase) {
        return api.updateConstructionPhase(projectId, phase.id, data);
      }
      return api.addConstructionPhase(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });
      onOpenChange(false);
    },
  });

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "공정명을 입력하세요";
    if (!plannedStart) newErrors.plannedStart = "시작일을 선택하세요";
    if (!plannedEnd) newErrors.plannedEnd = "종료일을 선택하세요";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: name.trim(),
      planned_start: plannedStart,
      planned_end: plannedEnd,
      notes: notes.trim() || undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          {mode === "add" ? "공정 추가" : "공정 수정"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              공정명 <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 철거공사"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-point-400 focus:ring-2 focus:ring-brand-point-100"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-point-400 focus:ring-2 focus:ring-brand-point-100"
              />
              {errors.plannedStart && (
                <p className="mt-1 text-xs text-red-500">{errors.plannedStart}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-point-400 focus:ring-2 focus:ring-brand-point-100"
              />
              {errors.plannedEnd && (
                <p className="mt-1 text-xs text-red-500">{errors.plannedEnd}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="지연사유, 특이사항 등"
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-point-400 focus:ring-2 focus:ring-brand-point-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending}
            >
              {mode === "add" ? "추가" : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
