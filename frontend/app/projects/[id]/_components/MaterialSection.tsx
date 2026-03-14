"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button, cn, toast } from "@sigongcore/ui";
import type { MaterialPlanRead } from "@sigongcore/types";

interface Props {
  projectId: string;
  materials: MaterialPlanRead[];
}

interface MaterialFormData {
  material_name: string;
  quantity: string;
  start_date: string;
  end_date: string;
}

const emptyForm: MaterialFormData = {
  material_name: "",
  quantity: "",
  start_date: "",
  end_date: "",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function MaterialSection({ projectId, materials }: Props) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<MaterialFormData>(emptyForm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });

  const addMutation = useMutation({
    mutationFn: (data: MaterialFormData) => api.addMaterialPlan(projectId, data),
    onSuccess: () => { invalidate(); setEditingId(null); setForm(emptyForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaterialFormData> }) =>
      api.updateMaterialPlan(projectId, id, data),
    onSuccess: () => { invalidate(); setEditingId(null); setForm(emptyForm); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMaterialPlan(projectId, id),
    onSuccess: () => { invalidate(); toast.success("자재투입계획이 삭제되었습니다."); },
  });

  const startAdd = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const startEdit = (material: MaterialPlanRead) => {
    setEditingId(material.id);
    setForm({
      material_name: material.material_name,
      quantity: material.quantity,
      start_date: material.start_date,
      end_date: material.end_date,
    });
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = () => {
    if (!form.material_name.trim() || !form.quantity.trim() || !form.start_date || !form.end_date) return;
    if (form.start_date && form.end_date && form.start_date >= form.end_date) {
      toast.error("시작일은 종료일보다 이전이어야 합니다.");
      return;
    }
    if (editingId === "new") {
      addMutation.mutate({ ...form, material_name: form.material_name.trim(), quantity: form.quantity.trim() });
    } else if (editingId !== null) {
      updateMutation.mutate({ id: String(editingId), data: { ...form, material_name: form.material_name.trim(), quantity: form.quantity.trim() } });
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  const renderEditRow = (key: string | number) => (
    <tr key={key} className="bg-green-50/30">
      <td className="px-4 py-2">
        <input
          value={form.material_name}
          onChange={(e) => setForm((f) => ({ ...f, material_name: e.target.value }))}
          placeholder="자재명"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
          autoFocus
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          placeholder="예: 20kg, 50장"
          className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
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

  const renderMobileEditCard = (key: string | number) => (
    <div key={key} className="rounded-xl border border-primary-200 bg-primary-50/30 p-4 space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600">자재명</label>
        <input
          value={form.material_name}
          onChange={(e) => setForm((f) => ({ ...f, material_name: e.target.value }))}
          placeholder="자재명"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-600">수량</label>
        <input
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          placeholder="예: 20kg, 50장"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
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
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">자재명</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-32">수량</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">시작일</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">종료일</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {materials.map((material) =>
                editingId === material.id ? (
                  renderEditRow(material.id)
                ) : (
                  <tr key={material.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{material.material_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600">
                        {material.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(material.start_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(material.end_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(material)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:text-primary-500 hover:ring-primary-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(String(material.id))}
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
        {materials.map((material) =>
          editingId === material.id ? (
            renderMobileEditCard(material.id)
          ) : (
            <div
              key={material.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{material.material_name}</span>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600">
                      {material.quantity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(material.start_date)} ~ {formatDate(material.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(material)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-primary-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(String(material.id))}
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
            자재 추가
          </Button>
        </div>
      )}
    </div>
  );
}
