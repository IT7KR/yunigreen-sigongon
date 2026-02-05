"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@sigongon/ui";
import {
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  Camera,
  ReceiptText,
  Loader2,
  ArrowRight,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

type CompletionReportStatus = "draft" | "submitted" | "approved" | "rejected";

interface CompletionReportItem {
  id: string;
  report_type: "start" | "completion";
  status: CompletionReportStatus;
}

const completionSampleDownloads = [
  {
    label: "준공계 샘플 PDF",
    samplePath:
      "sample/3. 관공서 준공서류/준공서류_대경중학교 본관동 균열보수공사.pdf",
    fileName: "준공계_샘플.pdf",
  },
  {
    label: "준공내역서 샘플 Excel",
    samplePath: "sample/3. 관공서 준공서류/2. 준공내역서.xlsx",
    fileName: "준공내역서_샘플.xlsx",
  },
];

export default function CloseoutReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<CompletionReportItem[]>([]);

  useEffect(() => {
    loadReports();
  }, [projectId]);

  const completionReports = useMemo(
    () => reports.filter((report) => report.report_type === "completion"),
    [reports],
  );
  const approvedCount = useMemo(
    () => completionReports.filter((report) => report.status === "approved").length,
    [completionReports],
  );

  async function loadReports() {
    try {
      setLoading(true);
      const response = await api.getConstructionReports(projectId);
      if (response.success && response.data) {
        setReports(
          response.data.map((report) => ({
            id: report.id,
            report_type: report.report_type,
            status: report.status as CompletionReportStatus,
          })),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function downloadSample(samplePath: string, fileName: string) {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(samplePath);
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-slate-400" />
              준공/정산 현황
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              준공계, 사진첩, 정산/세금계산서 발행까지 한 화면에서 관리합니다.
            </p>
          </div>
          <Badge className="bg-brand-point-50 text-brand-point-700">
            준공계 승인 {approvedCount}건
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ActionCard
                icon={<FileCheck2 className="h-5 w-5 text-blue-600" />}
                title="준공계 관리"
                description={`${completionReports.length}건 작성됨`}
                href={`/projects/${projectId}/reports/completion`}
              />
              <ActionCard
                icon={<Camera className="h-5 w-5 text-purple-600" />}
                title="준공사진첩"
                description="사진 선택/정렬 후 PDF 내보내기"
                href={`/projects/${projectId}/album`}
              />
              <ActionCard
                icon={<ReceiptText className="h-5 w-5 text-emerald-600" />}
                title="세금계산서"
                description="발행 상태 추적 및 재시도"
                href={`/projects/${projectId}/tax-invoice`}
              />
              <ActionCard
                icon={<FileSpreadsheet className="h-5 w-5 text-amber-600" />}
                title="노무 신고"
                description="근로복지공단/국세청 양식 다운로드"
                href={`/labor/payroll`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>샘플 문서 다운로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completionSampleDownloads.map((sample) => (
            <Button
              key={sample.label}
              variant="secondary"
              className="w-full justify-between"
              onClick={() => downloadSample(sample.samplePath, sample.fileName)}
            >
              <span>{sample.label}</span>
              <Download className="h-4 w-4" />
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="h-full rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-point-200 hover:bg-brand-point-50/40">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
        <p className="mt-3 inline-flex items-center text-sm font-medium text-brand-point-600">
          이동
          <ArrowRight className="ml-1 h-4 w-4" />
        </p>
      </div>
    </Link>
  );
}
