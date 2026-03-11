"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, cn } from "@sigongcore/ui";
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
        <h2 className="mb-6 text-xl font-bold text-slate-900 tracking-tight">
          {mode === "add" ? "새로운 공정을 만들까요?" : "공정 정보를 수정할까요?"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">
              공정명 <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 철거공사, 우레탄 방수 등"
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-sm transition-all focus:ring-4 focus:ring-primary-50",
                errors.name ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-primary-400"
              )}
            />
            {errors.name && (
              <p className="px-1 text-xs font-medium text-red-500">지정된 이름을 확인해 주세요</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">
                시작 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-sm focus:ring-4 focus:ring-primary-50",
                  errors.plannedStart ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-primary-400"
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">
                종료 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-sm focus:ring-4 focus:ring-primary-50",
                  errors.plannedEnd ? "border-red-300 bg-red-50" : "border-slate-200 focus:border-primary-400"
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">메모 (선택)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="현장 상황이나 참고할 내용을 적어주세요"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-12 text-slate-500 hover:bg-slate-50"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl h-12 shadow-lg shadow-primary-100"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "저장 중..." : mode === "add" ? "추가하기" : "저장하기"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
