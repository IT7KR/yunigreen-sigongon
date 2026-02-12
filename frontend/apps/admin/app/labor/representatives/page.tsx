"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal, PrimitiveInput, PrimitiveSelect, toast } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { Plus, Edit2, Trash2, UserCheck, Calendar, FileText } from "lucide-react";
import { api } from "@/lib/api";
import type { ProjectListItem } from "@sigongon/types";
import {
  FieldRepresentative,
  assignRepresentativeToProject,
  deleteFieldRepresentative,
  getAssignmentByProjectId,
  getCareerCertificateRemainingDays,
  getFieldRepresentatives,
  getRepresentativeAssignments,
  upsertFieldRepresentative,
} from "@/lib/fieldRepresentatives";

interface RepresentativeFormState {
  id?: string;
  name: string;
  phone: string;
  grade: string;
  notes: string;
  bookletFileName: string;
  careerFileName: string;
  employmentFileName: string;
}

const EMPTY_FORM: RepresentativeFormState = {
  name: "",
  phone: "",
  grade: "",
  notes: "",
  bookletFileName: "",
  careerFileName: "",
  employmentFileName: "",
};

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

export default function LaborRepresentativesPage() {
  const [representatives, setRepresentatives] = useState<FieldRepresentative[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<RepresentativeFormState>(EMPTY_FORM);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignRepresentative, setAssignRepresentative] = useState<FieldRepresentative | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const assignments = useMemo(() => getRepresentativeAssignments(), [representatives]);

  useEffect(() => {
    setRepresentatives(getFieldRepresentatives());
    void loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const response = await api.getProjects({ per_page: 100 });
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("프로젝트 목록을 불러오지 못했어요.");
    }
  }

  function refreshRepresentatives() {
    setRepresentatives(getFieldRepresentatives());
  }

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
      bookletFileName: item.booklet?.fileName || "",
      careerFileName: item.careerCertificate?.fileName || "",
      employmentFileName: item.employmentCertificate?.fileName || "",
    });
    setIsFormOpen(true);
  }

  function handleSaveRepresentative() {
    if (!formState.name.trim()) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    if (!/^010-\d{4}-\d{4}$/.test(formState.phone)) {
      toast.error("전화번호는 010-0000-0000 형식으로 입력해 주세요.");
      return;
    }

    const nowIso = new Date().toISOString();
    upsertFieldRepresentative({
      id: formState.id,
      name: formState.name.trim(),
      phone: formState.phone,
      grade: formState.grade.trim() || undefined,
      notes: formState.notes.trim() || undefined,
      booklet: formState.bookletFileName
        ? { fileName: formState.bookletFileName, uploadedAt: nowIso }
        : undefined,
      careerCertificate: formState.careerFileName
        ? { fileName: formState.careerFileName, uploadedAt: nowIso }
        : undefined,
      employmentCertificate: formState.employmentFileName
        ? { fileName: formState.employmentFileName, uploadedAt: nowIso }
        : undefined,
    });

    refreshRepresentatives();
    setIsFormOpen(false);
    toast.success("현장대리인 정보를 저장했어요.");
  }

  function handleDeleteRepresentative(item: FieldRepresentative) {
    if (!confirm(`${item.name}님을 삭제할까요?`)) return;
    deleteFieldRepresentative(item.id);
    refreshRepresentatives();
    toast.success("현장대리인을 삭제했어요.");
  }

  function openAssignModal(item: FieldRepresentative) {
    setAssignRepresentative(item);
    setSelectedProjectId("");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setIsAssignOpen(true);
  }

  function handleAssignRepresentative() {
    if (!assignRepresentative) return;
    if (!selectedProjectId) {
      toast.error("배정할 프로젝트를 선택해 주세요.");
      return;
    }

    assignRepresentativeToProject(
      selectedProjectId,
      assignRepresentative.id,
      effectiveDate,
    );
    refreshRepresentatives();
    setIsAssignOpen(false);
    toast.success("프로젝트에 현장대리인을 배정했어요.");
  }

  function getAssignedProjectsCount(representativeId: string) {
    return assignments.filter((item) => item.representativeId === representativeId).length;
  }

  function getAssignmentLabels(representativeId: string) {
    return assignments
      .filter((item) => item.representativeId === representativeId)
      .map((item) => {
        const projectName =
          projects.find((project) => project.id === item.projectId)?.name || item.projectId;
        return `${projectName} (${item.effectiveDate})`;
      });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">현장대리인 관리</h1>
            <p className="mt-1 text-sm text-slate-500">
              기술수첩/경력증명/재직증명 서류를 관리하고 프로젝트별로 배정합니다.
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            현장대리인 등록
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>현장대리인 목록</CardTitle>
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
                      <th className="pb-3 font-medium">배정 프로젝트</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {representatives.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          {item.grade && (
                            <p className="text-xs text-slate-500">{item.grade}</p>
                          )}
                        </td>
                        <td className="py-3 text-slate-700">{item.phone}</td>
                        <td className="py-3">
                          {item.booklet ? (
                            <Badge variant="success">{item.booklet.fileName}</Badge>
                          ) : (
                            <Badge variant="default">미등록</Badge>
                          )}
                        </td>
                        <td className="py-3">{getCareerBadge(item)}</td>
                        <td className="py-3">
                          {item.employmentCertificate ? (
                            <Badge variant="success">{item.employmentCertificate.fileName}</Badge>
                          ) : (
                            <Badge variant="default">미등록</Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700">
                              {getAssignedProjectsCount(item.id)}건 배정
                            </p>
                            {getAssignmentLabels(item.id).slice(0, 2).map((label) => (
                              <p key={label} className="text-xs text-slate-500">
                                {label}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="secondary" size="sm" onClick={() => openAssignModal(item)}>
                              <UserCheck className="h-4 w-4" />
                              배정
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteRepresentative(item)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
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
              setFormState((prev) => ({ ...prev, bookletFileName: event.target.value }))
            }
          />
          <Input
            label="현장경력증명서 파일명"
            value={formState.careerFileName}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, careerFileName: event.target.value }))
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">메모</label>
            <textarea
              rows={3}
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRepresentative}>저장</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="프로젝트 배정"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              {assignRepresentative?.name || "-"}
            </p>
            <p>{assignRepresentative?.phone}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">프로젝트</label>
            <PrimitiveSelect
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            >
              <option value="">프로젝트 선택</option>
              {projects.map((project) => {
                const currentAssignment = getAssignmentByProjectId(project.id);
                const assignedName = currentAssignment
                  ? representatives.find(
                      (item) => item.id === currentAssignment.representativeId,
                    )?.name
                  : null;
                return (
                  <option key={project.id} value={project.id}>
                    {assignedName
                      ? `${project.name} (현재: ${assignedName})`
                      : project.name}
                  </option>
                );
              })}
            </PrimitiveSelect>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              적용 기준일
            </label>
            <PrimitiveInput
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            프로젝트에는 기준일 기준으로 현장대리인 1명만 배정됩니다.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAssignRepresentative}>
              <Calendar className="h-4 w-4" />
              배정 저장
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
