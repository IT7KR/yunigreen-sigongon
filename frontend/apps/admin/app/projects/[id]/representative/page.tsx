"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Trash2, UserCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingOverlay,
  PrimitiveInput,
  Select,
  toast,
  useConfirmDialog,
} from "@sigongon/ui";
import { useProject } from "@/hooks";
import {
  assignRepresentativeToProject,
  getCareerCertificateRemainingDays,
  getFieldRepresentatives,
  getRepresentativeAssignmentByProjectId,
  removeRepresentativeFromProject,
  type FieldRepresentative,
} from "@/lib/fieldRepresentatives";
import { useAuth } from "@/lib/auth";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProjectRepresentativePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const canManageAssignment =
    user?.role === "company_admin" || user?.role === "super_admin";
  const { data: projectResponse } = useProject(id);
  const project = projectResponse?.success ? projectResponse.data : null;

  const [representatives, setRepresentatives] = useState<FieldRepresentative[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayDate());
  const [assignment, setAssignment] = useState<{
    representativeId: number;
    effectiveDate: string;
    assignedAt?: string;
  } | null>(null);
  const { confirm } = useConfirmDialog();

  const assignedRepresentative = useMemo(
    () =>
      representatives.find(
        (item) => item.id === assignment?.representativeId,
      ) ?? null,
    [representatives, assignment],
  );

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [nextRepresentatives, nextAssignment] = await Promise.all([
        getFieldRepresentatives(),
        getRepresentativeAssignmentByProjectId(id),
      ]);

      setRepresentatives(nextRepresentatives);
      setAssignment(nextAssignment);

      if (nextAssignment) {
        setSelectedRepresentativeId(String(nextAssignment.representativeId));
        setEffectiveDate(nextAssignment.effectiveDate);
      } else {
        setSelectedRepresentativeId("");
        setEffectiveDate(todayDate());
      }
    } catch (error) {
      console.error(error);
      toast.error("현장대리인 배정 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  async function handleAssignSave() {
    if (!canManageAssignment) {
      toast.error("현장대리인 배정 수정 권한이 없어요.");
      return;
    }

    if (!selectedRepresentativeId) {
      toast.error("배정할 현장대리인을 선택해 주세요.");
      return;
    }
    if (!effectiveDate) {
      toast.error("기준일을 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await assignRepresentativeToProject(
        id,
        Number(selectedRepresentativeId),
        effectiveDate,
      );
      await refreshData();
      toast.success("현장대리인 배정을 저장했어요.");
    } catch (error) {
      console.error(error);
      toast.error("배정 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAssignment() {
    if (!canManageAssignment) {
      toast.error("현장대리인 배정 수정 권한이 없어요.");
      return;
    }

    if (!assignment) return;
    const confirmed = await confirm({
      title: "배정을 해제할까요?",
      description: "이 프로젝트의 현장대리인 연결이 해제됩니다.",
      confirmLabel: "해제",
      variant: "destructive",
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await removeRepresentativeFromProject(id);
      await refreshData();
      toast.success("현장대리인 배정을 해제했어요.");
    } catch (error) {
      console.error(error);
      toast.error("배정 해제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  const representativeOptions = representatives.map((item) => ({
    value: String(item.id),
    label: `${item.name} (${item.phone})`,
  }));

  if (loading) {
    return <LoadingOverlay variant="inline" text="배정 정보를 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            프로젝트 개요
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">현장대리인 배정</h1>
          <p className="mt-1 text-sm text-slate-500">
            {project?.name || "이 프로젝트"}에 착공 기준 담당 현장대리인을 연결합니다.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>현재 배정 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignment && assignedRepresentative ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                {assignedRepresentative.name} ({assignedRepresentative.phone})
              </p>
              <p className="mt-1 text-xs text-amber-800">
                적용 기준일: {assignment.effectiveDate}
              </p>
              <div className="mt-2">
                {(() => {
                  const remaining = getCareerCertificateRemainingDays(
                    assignedRepresentative,
                  );
                  if (remaining === null) {
                    return <Badge variant="default">경력증명서 미등록</Badge>;
                  }
                  if (remaining < 0) {
                    return <Badge variant="error">경력증명서 만료</Badge>;
                  }
                  if (remaining <= 14) {
                    return (
                      <Badge variant="warning">
                        경력증명서 {remaining}일 남음
                      </Badge>
                    );
                  }
                  return (
                    <Badge variant="success">
                      경력증명서 {remaining}일 남음
                    </Badge>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              배정된 현장대리인이 없습니다. 착공 전까지 1명을 배정해 주세요.
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
            명단/서류 등록은{" "}
            <Link
              href="/organization/field-representatives"
              className="font-medium text-brand-point-600 hover:underline"
            >
              현장대리인 명단
            </Link>
            에서 관리합니다.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>배정 변경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {representatives.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              등록된 현장대리인이 없습니다. 먼저 회사 명단을 등록해 주세요.
            </div>
          ) : (
            <>
              <Select
                label="현장대리인"
                placeholder="배정할 현장대리인을 선택해 주세요"
                options={representativeOptions}
                value={selectedRepresentativeId}
                onChange={(value) => setSelectedRepresentativeId(value)}
              />
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

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <p>프로젝트에는 기준일 기준으로 현장대리인 1명만 배정됩니다.</p>
                <p className="mt-1">
                  착공계 작성 시{" "}
                  <span className="font-medium">현장대리인 서류 자동 연동</span>을
                  선택하면 배정 정보가 반영됩니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleAssignSave}
                  disabled={saving || !canManageAssignment}
                >
                  <UserCheck className="h-4 w-4" />
                  {saving ? "저장 중..." : "배정 저장"}
                </Button>
                {assignment && canManageAssignment && (
                  <Button
                    variant="secondary"
                    onClick={handleRemoveAssignment}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    배정 해제
                  </Button>
                )}
                <Button variant="secondary" asChild>
                  <Link href={`/projects/${id}/reports/start`}>
                    <Calendar className="h-4 w-4" />
                    착공계 작성으로 이동
                  </Link>
                </Button>
              </div>
              {!canManageAssignment && (
                <p className="text-xs text-slate-500">
                  현재 계정은 배정 수정이 제한되어 있어 조회만 가능합니다.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
