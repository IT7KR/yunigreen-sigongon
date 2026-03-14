"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button, cn, toast } from "@sigongcore/ui";
import type { LaborPlanRead } from "@sigongcore/types";

interface Props {
  projectId: string;
  labors: LaborPlanRead[];
}

interface LaborFormData {
  job_title: string;
  headcount: number;
  start_date: string;
  end_date: string;
}

const emptyForm: LaborFormData = {
  job_title: "",
  headcount: 1,
  start_date: "",
  end_date: "",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function LaborSection({ projectId, labors }: Props) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<LaborFormData>(emptyForm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });

  const addMutation = useMutation({
    mutationFn: (data: LaborFormData) => api.addLaborPlan(projectId, data),
    onSuccess: () => { invalidate(); setEditingId(null); setForm(emptyForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LaborFormData> }) =>
      api.updateLaborPlan(projectId, id, data),
    onSuccess: () => { invalidate(); setEditingId(null); setForm(emptyForm); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLaborPlan(projectId, id),
    onSuccess: () => { invalidate(); toast.success("인력계획이 삭제되었습니다."); },
  });

  const startAdd = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const startEdit = (labor: LaborPlanRead) => {
    setEditingId(labor.id);
    setForm({
      job_title: labor.job_title,
      headcount: labor.headcount,
      start_date: labor.start_date,
      end_date: labor.end_date,
    });
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = () => {
    if (!form.job_title.trim() || !form.start_date || !form.end_date) return;
    if (form.start_date && form.end_date && form.start_date >= form.end_date) {
      toast.error("시작일은 종료일보다 이전이어야 합니다.");
      return;
    }
    if (editingId === "new") {
      addMutation.mutate({ ...form, job_title: form.job_title.trim() });
    } else if (editingId !== null) {
      updateMutation.mutate({ id: String(editingId), data: { ...form, job_title: form.job_title.trim() } });
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  const renderEditRow = (key: string | number) => (
    <tr key={key} className="bg-blue-50/30">
      <td className="px-4 py-2">
        <input
          value={form.job_title}
          onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
          placeholder="직종명"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
          autoFocus
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={1}
          value={form.headcount}
          onChange={(e) => setForm((f) => ({ ...f, headcount: Math.max(1, Number(e.target.value)) }))}
          className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm text-center focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          value={form.start_date}
          onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          value={form.end_date}
          onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={cancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Mobile card for editing
  const renderMobileEditCard = (key: string | number) => (
    <div key={key} className="rounded-xl border border-primary-200 bg-primary-50/30 p-4 space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600">직종</label>
        <input
          value={form.job_title}
          onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
          placeholder="직종명"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600">인원</label>
        <input
          type="number"
          min={1}
          value={form.headcount}
          onChange={(e) => setForm((f) => ({ ...f, headcount: Math.max(1, Number(e.target.value)) }))}
          className="w-24 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-600">시작일</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-600">종료일</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={save} disabled={isPending} className="flex-1">
          {isPending ? "저장 중..." : "저장"}
        </Button>
        <Button size="sm" variant="outline" onClick={cancel} className="flex-1">
          취소
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">직종</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-20">인원</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">시작일</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">종료일</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {labors.map((labor) =>
                editingId === labor.id ? (
                  renderEditRow(labor.id)
                ) : (
                  <tr key={labor.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{labor.job_title}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600">
                        {labor.headcount}명
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(labor.start_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(labor.end_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(labor)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-primary-500 hover:ring-primary-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(String(labor.id))}
                          disabled={deleteMutation.isPending}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-red-500 hover:ring-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {editingId === "new" && renderEditRow("new")}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {labors.map((labor) =>
          editingId === labor.id ? (
            renderMobileEditCard(labor.id)
          ) : (
            <div
              key={labor.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{labor.job_title}</span>
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600">
                      {labor.headcount}명
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(labor.start_date)} ~ {formatDate(labor.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(labor)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-primary-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(String(labor.id))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        )}
        {editingId === "new" && renderMobileEditCard("new")}
      </div>

      {/* Add Button */}
      {editingId === null && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={startAdd}
            className="rounded-full px-6"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            인력 추가
          </Button>
        </div>
      )}
    </div>
  );
}
