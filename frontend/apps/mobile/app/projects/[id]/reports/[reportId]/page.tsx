"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  FileX,
  Calendar,
  MapPin,
  User,
  Phone,
  DollarSign,
  FileDown,
  Shield,
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  formatDate,
} from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";
import type { ReportStatus } from "@sigongon/types";

interface Report {
  id: string;
  project_id: string;
  report_type: "start" | "completion";
  report_number?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  construction_name?: string;
  site_address?: string;
  start_date?: string;
  expected_end_date?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  actual_end_date?: string;
  final_amount?: string;
  defect_warranty_period?: number;
  notes?: string;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
}

interface ReportDetailPageProps {
  params: Promise<{ id: string; reportId: string }>;
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id: projectId, reportId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await mockApiClient.getConstructionReport(reportId);
        if (response.success && response.data) {
          setReport(response.data);
        }
      } catch (error) {
        console.error("보고서 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // TODO: 실제 PDF 내보내기 구현
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("PDF 내보내기 기능은 준비 중이에요");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout title="보고서 상세" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!report) {
    return (
      <MobileLayout title="보고서 상세" showBack>
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <p className="text-slate-500">보고서를 찾을 수 없어요</p>
          <Button
            variant="secondary"
            onClick={() => router.push(`/projects/${projectId}/reports`)}
          >
            목록으로 돌아가기
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const isStartReport = report.report_type === "start";
  const reportTypeLabel = isStartReport ? "착공계" : "준공계";
  const ReportIcon = isStartReport ? FileCheck : FileX;

  return (
    <MobileLayout
      title={reportTypeLabel}
      showBack
      rightAction={<StatusBadge status={report.status as ReportStatus} />}
    >
      <div className="space-y-4 p-4">
        {/* 보고서 헤더 */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-lg bg-brand-point-50 p-2">
                <ReportIcon className="h-5 w-5 text-brand-point-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-slate-900">
                  {report.construction_name || reportTypeLabel}
                </h1>
                {report.report_number && (
                  <p className="mt-1 text-sm text-slate-500">
                    {report.report_number}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>생성일: {formatDate(report.created_at)}</span>
              </div>
              {report.submitted_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>제출일: {formatDate(report.submitted_at)}</span>
                </div>
              )}
              {report.approved_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>승인일: {formatDate(report.approved_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 공사 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">공사 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {report.site_address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">현장 주소</p>
                  <p className="text-sm text-slate-700">{report.site_address}</p>
                </div>
              </div>
            )}

            {report.start_date && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">착공일</p>
                  <p className="text-sm text-slate-700">{report.start_date}</p>
                </div>
              </div>
            )}

            {report.expected_end_date && !isStartReport && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">준공 예정일</p>
                  <p className="text-sm text-slate-700">
                    {report.expected_end_date}
                  </p>
                </div>
              </div>
            )}

            {report.actual_end_date && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">실제 준공일</p>
                  <p className="text-sm text-slate-700">
                    {report.actual_end_date}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 책임자 정보 */}
        {(report.supervisor_name || report.supervisor_phone) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">책임자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {report.supervisor_name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">현장 책임자</p>
                    <p className="text-sm text-slate-700">
                      {report.supervisor_name}
                    </p>
                  </div>
                </div>
              )}

              {report.supervisor_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">연락처</p>
                    <a
                      href={`tel:${report.supervisor_phone}`}
                      className="text-sm text-brand-point-600 hover:underline"
                    >
                      {report.supervisor_phone}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 준공계 전용 정보 */}
        {!isStartReport && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">준공 상세</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {report.final_amount && (
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">최종 공사 금액</p>
                    <p className="text-sm font-medium text-slate-900">
                      {Number(report.final_amount).toLocaleString()}원
                    </p>
                  </div>
                </div>
              )}

              {report.defect_warranty_period && (
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">하자보증 기간</p>
                    <p className="text-sm text-slate-700">
                      {report.defect_warranty_period}개월
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 메모 */}
        {report.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">메모</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {report.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 액션 버튼 */}
        <div className="sticky bottom-0 bg-white pb-4 pt-2">
          <Button
            fullWidth
            onClick={handleExportPDF}
            loading={exporting}
            disabled={exporting}
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF로 내보내기
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
