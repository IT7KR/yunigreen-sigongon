"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button, StatusBadge } from "@sigongon/ui";
import { mockApiClient } from "@/lib/mocks/mockApi";
import {
  MOBILE_MOCK_EXPORT_SAMPLE_FILES,
  buildSampleFileDownloadUrl,
} from "@/lib/sampleFiles";
import { CheckCircle2, FileText, Image, Download, Loader2 } from "lucide-react";
import type { ReportStatus } from "@sigongon/types";

interface CompletionReport {
  id: string;
  report_type: "start" | "completion";
  status: "draft" | "submitted" | "approved" | "rejected";
  construction_name?: string;
  created_at: string;
}

export default function MobileCloseoutReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<CompletionReport[]>([]);

  useEffect(() => {
    loadCompletionReports();
  }, [projectId]);

  const approvedCount = useMemo(
    () => reports.filter((report) => report.status === "approved").length,
    [reports],
  );

  async function loadCompletionReports() {
    try {
      setLoading(true);
      const response = await mockApiClient.getConstructionReports(projectId);
      if (response.success && response.data) {
        setReports(
          response.data.filter((report) => report.report_type === "completion"),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function downloadSample(path: string, fileName: string) {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(path);
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <MobileLayout title="준공/정산" showBack>
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">준공계 승인</p>
                <p className="text-2xl font-bold text-slate-900">
                  {approvedCount}건
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/projects/${projectId}/reports`}>
                <Button variant="secondary" fullWidth>
                  <FileText className="h-4 w-4" />
                  준공계 확인
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/album`}>
                <Button variant="secondary" fullWidth>
                  <Image className="h-4 w-4" />
                  사진첩 확인
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() =>
                downloadSample(
                  MOBILE_MOCK_EXPORT_SAMPLE_FILES.completionReportPdf,
                  "준공계_샘플.pdf",
                )
              }
            >
              <Download className="h-4 w-4" />
              준공계 샘플 다운로드
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() =>
                downloadSample(
                  "sample/3. 관공서 준공서류/2. 준공내역서.xlsx",
                  "준공내역서_샘플.xlsx",
                )
              }
            >
              <Download className="h-4 w-4" />
              준공내역서 샘플 다운로드
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                등록된 준공계가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {reports.slice(0, 3).map((report) => (
                  <Link
                    key={report.id}
                    href={`/projects/${projectId}/reports/${report.id}`}
                    className="block rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {report.construction_name || "준공계"}
                      </p>
                      <StatusBadge status={report.status as ReportStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}

