"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@sigongon/ui";
import { ConstructionReportForm } from "@/components/ConstructionReportForm";
import { api } from "@/lib/api";

const DEFAULT_WARRANTY_PERIOD_MONTHS = "6";

interface CompletionReportData {
  id?: string;
  construction_name?: string;
  site_address?: string;
  start_date?: string;
  expected_end_date?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  actual_end_date?: string;
  final_amount?: string;
  defect_warranty_period?: string;
  notes?: string;
  status?: string;
}

export default function CompletionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [reportData, setReportData] = useState<CompletionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [reportId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      if (reportId) {
        // Load existing completion report
        const response = await api.getConstructionReport(reportId);
        if (response.success && response.data) {
          setReportData(response.data);
        }
      } else {
        // Load approved start report to pre-fill data
        const reportsResponse = await api.getConstructionReports(id);
        if (reportsResponse.success && reportsResponse.data) {
          const startReport = reportsResponse.data.find(
            (r: any) => r.report_type === "start" && r.status === "approved"
          );

          if (!startReport) {
            setError("승인된 착공계가 없어요");
            return;
          }

          setReportData(startReport);
        }
      }
    } catch (err) {
      console.error(err);
      setError("데이터를 불러오는데 실패했어요");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any, isDraft: boolean) {
    const normalizedData = {
      ...data,
      defect_warranty_period: DEFAULT_WARRANTY_PERIOD_MONTHS,
    };

    try {
      if (reportId) {
        // Update existing report
        await api.updateConstructionReport(reportId, normalizedData);
        if (!isDraft) {
          await api.submitConstructionReport(reportId);
        }
      } else {
        // Create new report
        const response = await api.createCompletionReport(id, normalizedData);
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
    const normalizedData = {
      ...data,
      defect_warranty_period: DEFAULT_WARRANTY_PERIOD_MONTHS,
    };

    try {
      if (reportId) {
        await api.updateConstructionReport(reportId, normalizedData);
      } else {
        await api.createCompletionReport(id, normalizedData);
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

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Link href={`/projects/${id}/reports`}>
          <Button>뒤로 가기</Button>
        </Link>
      </div>
    );
  }

  const isReadOnly = reportData?.status === "submitted" || reportData?.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}/reports`}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {reportId ? "준공계 보기" : "준공계 작성"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>준공계</CardTitle>
        </CardHeader>
        <CardContent>
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
                <div className="md:col-span-2">
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
                  <p className="text-sm text-slate-500">실제 준공일</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.actual_end_date}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">최종 금액</p>
                  <p className="font-medium text-slate-900">
                    {reportData?.final_amount
                      ? `${Number(reportData.final_amount).toLocaleString()}원`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">하자보증기간</p>
                  <p className="font-medium text-slate-900">
                    {DEFAULT_WARRANTY_PERIOD_MONTHS}개월
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
              reportType="completion"
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
