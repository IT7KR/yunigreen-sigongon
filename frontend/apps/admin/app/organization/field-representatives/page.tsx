"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  LoadingOverlay,
  Modal,
  Textarea,
  toast,
  useConfirmDialog,
} from "@sigongon/ui";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/lib/auth";
import type { FieldRepresentative } from "@/lib/fieldRepresentatives";
import {
  deleteFieldRepresentative,
  getCareerCertificateRemainingDays,
  getFieldRepresentatives,
  upsertFieldRepresentative,
} from "@/lib/fieldRepresentatives";

interface RepresentativeFormState {
  id?: number;
  name: string;
  phone: string;
  grade: string;
  notes: string;
  bookletFileName: string;
  careerFileName: string;
  initialCareerFileName: string;
  careerCertUploadedAt?: string;
  employmentFileName: string;
}

const EMPTY_FORM: RepresentativeFormState = {
  name: "",
  phone: "",
  grade: "",
  notes: "",
  bookletFileName: "",
  careerFileName: "",
  initialCareerFileName: "",
  careerCertUploadedAt: undefined,
  employmentFileName: "",
};

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

export default function OrganizationFieldRepresentativesPage() {
  const { user } = useAuth();
  const canManageRegistry = user?.role === "company_admin";
  const [representatives, setRepresentatives] = useState<FieldRepresentative[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<RepresentativeFormState>(EMPTY_FORM);
  const { confirm } = useConfirmDialog();

  const refreshRepresentatives = useCallback(async () => {
    try {
      const reps = await getFieldRepresentatives();
      setRepresentatives(reps);
    } catch (error) {
      console.error(error);
      toast.error("현장대리인 명단을 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await refreshRepresentatives();
      setLoading(false);
    }
    init();
  }, [refreshRepresentatives]);

  function openCreateModal() {
    setFormState(EMPTY_FORM);
    setIsFormOpen(true);
  }

  function openEditModal(item: FieldRepresentative) {
    setFormState({
      id: item.id,
      name: item.name,
      phone: item.phone,
      grade: item.grade || "",
      notes: item.notes || "",
      bookletFileName: item.booklet_filename || "",
      careerFileName: item.career_cert_filename || "",
      initialCareerFileName: item.career_cert_filename || "",
      careerCertUploadedAt: item.career_cert_uploaded_at,
      employmentFileName: item.employment_cert_filename || "",
    });
    setIsFormOpen(true);
  }

  async function handleSaveRepresentative() {
    if (!canManageRegistry) {
      toast.error("현장대리인 명단 수정 권한이 없어요.");
      return;
    }

    if (!formState.name.trim()) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    if (!/^010-\d{4}-\d{4}$/.test(formState.phone)) {
      toast.error("전화번호는 010-0000-0000 형식으로 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const careerFileChanged =
        formState.careerFileName !== formState.initialCareerFileName;
      const careerCertUploadedAt = formState.careerFileName
        ? formState.id
          ? careerFileChanged
            ? nowIso
            : formState.careerCertUploadedAt || nowIso
          : nowIso
        : undefined;

      await upsertFieldRepresentative({
        id: formState.id,
        name: formState.name.trim(),
        phone: formState.phone,
        grade: formState.grade.trim() || undefined,
        notes: formState.notes.trim() || undefined,
        booklet_filename: formState.bookletFileName || undefined,
        career_cert_filename: formState.careerFileName || undefined,
        career_cert_uploaded_at: careerCertUploadedAt,
        employment_cert_filename: formState.employmentFileName || undefined,
      });

      await refreshRepresentatives();
      setIsFormOpen(false);
      toast.success("현장대리인 정보를 저장했어요.");
    } catch (error) {
      console.error(error);
      toast.error("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRepresentative(item: FieldRepresentative) {
    if (!canManageRegistry) {
      toast.error("현장대리인 명단 수정 권한이 없어요.");
      return;
    }

    const confirmed = await confirm({
      title: `${item.name}님을 삭제할까요?`,
      description: "삭제 후에는 복구할 수 없습니다.",
      confirmLabel: "삭제",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteFieldRepresentative(item.id);
      await refreshRepresentatives();
      toast.success("현장대리인을 삭제했어요.");
    } catch (error) {
      console.error(error);
      toast.error("삭제에 실패했어요.");
    }
  }

  function getCareerBadge(item: FieldRepresentative) {
    const remainingDays = getCareerCertificateRemainingDays(item);
    if (remainingDays === null) {
      return <Badge variant="default">미등록</Badge>;
    }
    if (remainingDays < 0) {
      return <Badge variant="error">만료</Badge>;
    }
    if (remainingDays <= 14) {
      return <Badge variant="warning">{remainingDays}일 남음</Badge>;
    }
    return <Badge variant="success">{remainingDays}일 남음</Badge>;
  }

  if (loading) {
    return (
      <AdminLayout>
        <LoadingOverlay
          variant="inline"
          text="현장대리인 명단을 불러오는 중..."
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              현장대리인 명단
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              회사 공통 현장대리인 인력풀과 자격서류를 관리합니다.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              프로젝트 배정은 각 프로젝트의 현장대리인 배정 화면에서 진행합니다.
            </p>
          </div>
          <Button onClick={openCreateModal} disabled={!canManageRegistry}>
            <Plus className="h-4 w-4" />
            현장대리인 등록
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>회사 현장대리인 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {representatives.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                등록된 현장대리인이 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                      <th className="pb-3 font-medium">이름</th>
                      <th className="pb-3 font-medium">연락처</th>
                      <th className="pb-3 font-medium">기술수첩</th>
                      <th className="pb-3 font-medium">경력증명서(90일)</th>
                      <th className="pb-3 font-medium">재직증명서</th>
                      <th className="pb-3 font-medium">배정 건수</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {representatives.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-3">
                          <div className="font-medium text-slate-900">
                            {item.name}
                          </div>
                          {item.grade && (
                            <p className="text-xs text-slate-500">{item.grade}</p>
                          )}
                        </td>
                        <td className="py-3 text-slate-700">{item.phone}</td>
                        <td className="py-3">
                          {item.booklet_filename ? (
                            <Badge variant="success">{item.booklet_filename}</Badge>
                          ) : (
                            <Badge variant="default">미등록</Badge>
                          )}
                        </td>
                        <td className="py-3">{getCareerBadge(item)}</td>
                        <td className="py-3">
                          {item.employment_cert_filename ? (
                            <Badge variant="success">
                              {item.employment_cert_filename}
                            </Badge>
                          ) : (
                            <Badge variant="default">미등록</Badge>
                          )}
                        </td>
                        <td className="py-3 text-sm text-slate-600">
                          {item.assigned_project_ids?.length ?? 0}건
                        </td>
                        <td className="py-3">
                          {canManageRegistry ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRepresentative(item)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">조회 전용</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formState.id ? "현장대리인 수정" : "현장대리인 등록"}
      >
        <div className="space-y-3">
          <Input
            label="이름"
            value={formState.name}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <Input
            label="연락처"
            placeholder="010-0000-0000"
            value={formState.phone}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                phone: formatPhone(event.target.value),
              }))
            }
          />
          <Input
            label="등급/직책"
            value={formState.grade}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, grade: event.target.value }))
            }
          />
          <Input
            label="기술수첩 사본 파일명"
            value={formState.bookletFileName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                bookletFileName: event.target.value,
              }))
            }
          />
          <Input
            label="현장경력증명서 파일명"
            value={formState.careerFileName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                careerFileName: event.target.value,
              }))
            }
          />
          <Input
            label="재직증명서 파일명"
            value={formState.employmentFileName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                employmentFileName: event.target.value,
              }))
            }
          />
          <Textarea
            label="메모"
            rows={3}
            value={formState.notes}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, notes: event.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRepresentative} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
