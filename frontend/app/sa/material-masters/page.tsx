"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Pencil, Plus, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  PrimitiveInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@sigongcore/ui";
import type { MaterialMaster } from "@sigongcore/types";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";

type MaterialMasterFormState = {
  name: string;
  unit: string;
  unit_price: string;
  is_active: boolean;
};

const EMPTY_FORM: MaterialMasterFormState = {
  name: "",
  unit: "",
  unit_price: "",
  is_active: true,
};

function normalizeFormState(
  materialMaster?: MaterialMaster | null,
): MaterialMasterFormState {
  if (!materialMaster) return EMPTY_FORM;
  return {
    name: materialMaster.name,
    unit: materialMaster.unit,
    unit_price: String(materialMaster.unit_price),
    is_active: materialMaster.is_active,
  };
}

export default function MaterialMastersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterialMaster, setEditingMaterialMaster] =
    useState<MaterialMaster | null>(null);
  const [form, setForm] = useState<MaterialMasterFormState>(EMPTY_FORM);

  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-material-masters"],
    queryFn: () => api.getAdminMaterialMasters(),
  });

  const materialMasters = (
    response?.success ? response.data : []
  ) as MaterialMaster[];

  const filteredMaterialMasters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return materialMasters;
    return materialMasters.filter((materialMaster) => {
      return (
        materialMaster.name.toLowerCase().includes(query) ||
        materialMaster.unit.toLowerCase().includes(query)
      );
    });
  }, [materialMasters, searchQuery]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        unit_price: Number(form.unit_price),
        is_active: form.is_active,
      };

      if (editingMaterialMaster) {
        return api.updateMaterialMaster(editingMaterialMaster.id, payload);
      }
      return api.createMaterialMaster(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-material-masters"],
      });
      queryClient.invalidateQueries({
        queryKey: ["material-masters"],
      });
      toast.success(
        editingMaterialMaster
          ? "자재 마스터를 수정했습니다."
          : "자재 마스터를 등록했습니다.",
      );
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "자재 마스터 저장에 실패했습니다.";
      toast.error(message);
    },
  });

  const activeCount = materialMasters.filter((item) => item.is_active).length;

  const canSubmit =
    form.name.trim().length > 0 &&
    form.unit.trim().length > 0 &&
    Number(form.unit_price) > 0;

  function handleOpenCreate() {
    setEditingMaterialMaster(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function handleOpenEdit(materialMaster: MaterialMaster) {
    setEditingMaterialMaster(materialMaster);
    setForm(normalizeFormState(materialMaster));
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingMaterialMaster(null);
    setForm(EMPTY_FORM);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              자재 마스터 관리
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              최고 관리자가 발주용 자재 품목, 단위, 단가를 관리합니다.
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            자재 등록
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs text-slate-500">전체 품목</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {materialMasters.length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">사용 중</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {activeCount}
            </p>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <PrimitiveInput
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="품목명 또는 단위로 검색"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
          </div>
        ) : filteredMaterialMasters.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              표시할 자재 마스터가 없습니다
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              새 자재를 등록하거나 검색 조건을 변경해 주세요.
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredMaterialMasters.map((materialMaster) => (
                <Card key={materialMaster.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-slate-900">
                          {materialMaster.name}
                        </h2>
                        <Badge
                          className={
                            materialMaster.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }
                        >
                          {materialMaster.is_active ? "사용 중" : "비활성"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {materialMaster.unit} /{" "}
                        {materialMaster.unit_price.toLocaleString()}원
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(materialMaster)}
                    >
                      <Pencil className="h-4 w-4" />
                      수정
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>품목명</TableHead>
                    <TableHead>단위</TableHead>
                    <TableHead>단가</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>수정</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterialMasters.map((materialMaster) => (
                    <TableRow key={materialMaster.id}>
                      <TableCell className="font-medium">
                        {materialMaster.name}
                      </TableCell>
                      <TableCell>{materialMaster.unit}</TableCell>
                      <TableCell>
                        {materialMaster.unit_price.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            materialMaster.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }
                        >
                          {materialMaster.is_active ? "사용 중" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(materialMaster)}
                        >
                          <Pencil className="h-4 w-4" />
                          수정
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingMaterialMaster ? "자재 수정" : "자재 등록"}
        >
          <div className="space-y-4">
            <Input
              label="품목명"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="예: 방수 시트"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="단위"
                value={form.unit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, unit: event.target.value }))
                }
                placeholder="예: 롤"
              />
              <Input
                label="단가"
                type="number"
                min="0"
                value={form.unit_price}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    unit_price: event.target.value,
                  }))
                }
                placeholder="예: 45000"
              />
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: event.target.checked,
                  }))
                }
              />
              발주 선택에 노출할 활성 품목으로 사용
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={handleCloseModal}>
                취소
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSubmit || saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "저장 중..."
                  : editingMaterialMaster
                    ? "수정 저장"
                    : "자재 등록"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
