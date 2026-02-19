"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, PrimitiveInput } from "@sigongon/ui";
import { ConstructionReportForm } from "@/components/ConstructionReportForm";
import { api } from "@/lib/api";
import {
  getRepresentativeAssignmentByProjectId,
  getRepresentativeById,
} from "@/lib/fieldRepresentatives";
import { getSamplePathForDocument } from "@/lib/sampleFiles";
import { upsertProjectDocumentOverride } from "@/lib/projectDocumentState";

interface StartReportData {
  id?: string;
  construction_name?: string;
  site_address?: string;
  start_date?: string;
  expected_end_date?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  notes?: string;
  status?: string;
}

export default function StartReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [reportData, setReportData] = useState<StartReportData | null>(null);
  const [loading, setLoading] = useState(!!reportId);
  const [autoLinkRepresentativeDocs, setAutoLinkRepresentativeDocs] = useState(true);
  const [assignedRepresentative, setAssignedRepresentative] = useState<{
    name: string;
    phone: string;
    effectiveDate: string;
  } | null>(null);

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  useEffect(() => {
    async function loadRepresentative() {
      const assignment = await getRepresentativeAssignmentByProjectId(id);
      if (!assignment) {
        setAssignedRepresentative(null);
        return;
      }
      const representative = await getRepresentativeById(assignment.representativeId);
      if (!representative) {
        setAssignedRepresentative(null);
        return;
      }
      setAssignedRepresentative({
        name: representative.name,
        phone: representative.phone,
        effectiveDate: assignment.effectiveDate,
      });
    }
    loadRepresentative();
  }, [id]);

  function syncRepresentativeDocument() {
    if (!autoLinkRepresentativeDocs || !assignedRepresentative) return;
    upsertProjectDocumentOverride(id, "m3", {
      status: "uploaded",
      file_path: getSamplePathForDocument("m3"),
      file_size: 102400,
      generated_at: new Date().toISOString(),
    });
  }

  async function loadReport() {
    if (!reportId) return;

    try {
      setLoading(true);
      const response = await api.getConstructionReport(reportId);
      if (response.success && response.data) {
        setReportData(response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function buildPayloadWithRepresentative(data: any): any {
    if (!autoLinkRepresentativeDocs || !assignedRepresentative) return data;
    return {
      ...data,
      ...(data.supervisor_name ? {} : { supervisor_name: assignedRepresentative.name }),
      ...(data.supervisor_phone ? {} : { supervisor_phone: assignedRepresentative.phone }),
    };
  }

  async function handleSubmit(data: any, isDraft: boolean) {
    try {
      syncRepresentativeDocument();
      const payload = buildPayloadWithRepresentative(data);
      if (reportId) {
        // Update existing report
        await api.updateConstructionReport(reportId, payload);
        if (!isDraft) {
          await api.submitConstructionReport(reportId);
        }
      } else {
        // Create new report
        const response = await api.createStartReport(id, payload);
        if (response.success && response.data && !isDraft) {
          await api.submitConstructionReport(response.data.id);
        }
      }
      router.push(`/projects/${id}/reports`);
    } catch (err) {
      console.error(err);
      alert("오류가 발생했어요");
    }
  }

  async function handleSave(data: any) {
    try {
      syncRepresentativeDocument();
      const payload = buildPayloadWithRepresentative(data);
      if (reportId) {
        await api.updateConstructionReport(reportId, payload);
      } else {
        await api.createStartReport(id, payload);
      }
      alert("저장했어요");
      router.push(`/projects/${id}/reports`);
    } catch (err) {
      console.error(err);
      alert("오류가 발생했어요");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  const isReadOnly = reportData?.status === "submitted" || reportData?.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" asChild><Link href={`/projects/${id}/reports`}>
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Link></Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {reportId ? "착공계 보기" : "착공계 작성"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>착공계</CardTitle>
        </CardHeader>
        <CardContent>
          {!isReadOnly && assignedRepresentative && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                배정된 현장대리인: {assignedRepresentative.name} ({assignedRepresentative.phone})
              </p>
              <p className="mt-1 text-xs text-amber-800">
                적용 기준일: {assignedRepresentative.effectiveDate}
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm text-amber-900">
                <PrimitiveInput
                  type="checkbox"
                  checked={autoLinkRepresentativeDocs}
                  onChange={(event) =>
                    setAutoLinkRepresentativeDocs(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-amber-300 text-brand-point-600 focus:ring-brand-point-500"
                />
                현장대리인 서류를 착공계에 자동 연동
              </label>
            </div>
          )}

          {isReadOnly ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  {reportData?.status === "submitted"
                    ? "이미 제출된 보고서예요. 수정할 수 없어요."
                    : "승인된 보고서예요. 수정할 수 없어요."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">공사명</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.construction_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">공사 장소</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.site_address}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">착공일</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.start_date}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">준공예정일</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.expected_end_date}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">감독자명</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.supervisor_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">감독자 연락처</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.supervisor_phone}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500">비고</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.notes || "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ConstructionReportForm
              reportType="start"
              initialData={reportData || undefined}
              onSubmit={handleSubmit}
              onSave={reportId ? undefined : handleSave}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
