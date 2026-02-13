"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  formatDate,
} from "@sigongon/ui";
import {
  ReceiptText,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { buildSampleFileDownloadUrl } from "@/lib/sampleFiles";

type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

interface CompletionReport {
  id: string;
  report_type: "start" | "completion";
  status: ReportStatus;
  created_at: string;
}

interface TaxInvoice {
  id: string;
  status: "draft" | "issued" | "cancelled" | "failed";
  total_amount: number;
  issue_date: string;
}

export default function PaymentClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [completionReports, setCompletionReports] = useState<CompletionReport[]>([]);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const approvedReports = useMemo(
    () => completionReports.filter((report) => report.status === "approved").length,
    [completionReports],
  );
  const issuedInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === "issued"),
    [invoices],
  );
  const issuedTotal = useMemo(
    () => issuedInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
    [issuedInvoices],
  );

  async function loadData() {
    try {
      setLoading(true);
      const [reportsResponse, invoicesResponse] = await Promise.all([
        api.getConstructionReports(projectId),
        api.getTaxInvoices(projectId),
      ]);

      if (reportsResponse.success && reportsResponse.data) {
        setCompletionReports(
          reportsResponse.data
            .filter((report) => report.report_type === "completion")
            .map((report) => ({
              id: report.id,
              report_type: report.report_type,
              status: report.status as ReportStatus,
              created_at: report.created_at,
            })),
        );
      }

      if (invoicesResponse.success && invoicesResponse.data) {
        setInvoices(
          invoicesResponse.data.map((invoice) => ({
            id: invoice.id,
            status: invoice.status,
            total_amount: invoice.total_amount,
            issue_date: invoice.issue_date,
          })),
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-slate-400" />
              대금청구/정산
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              준공 승인 이후 대금청구서와 세금계산서 발행 상태를 점검합니다.
            </p>
          </div>
          <Badge className="bg-brand-point-50 text-brand-point-700">
            발행 {issuedInvoices.length}건
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricCard title="준공계 승인" value={`${approvedReports}건`} />
          <MetricCard title="세금계산서 발행" value={`${issuedInvoices.length}건`} />
          <MetricCard title="발행 합계" value={`${issuedTotal.toLocaleString()}원`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>정산 액션</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Button className="w-full justify-between" asChild><Link href={`/projects/${projectId}/reports/completion`}>
              준공계 확인
              <ArrowRight className="h-4 w-4" />
            </Link></Button>
          <Button variant="secondary" className="w-full justify-between" asChild><Link href={`/projects/${projectId}/tax-invoice`}>
              세금계산서 관리
              <ArrowRight className="h-4 w-4" />
            </Link></Button>
          <Button
            variant="secondary"
            className="w-full justify-between"
            onClick={() =>
              downloadSample(
                "sample/3. 관공서 준공서류/2. 준공내역서.xlsx",
                "준공내역서_샘플.xlsx",
              )
            }
          >
            <span className="inline-flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              준공내역서 샘플
            </span>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-between"
            onClick={() =>
              downloadSample(
                "sample/3. 관공서 준공서류/3. 준공정산동의서(준공금 변동이 있을 경우에만 작성).pdf",
                "준공정산동의서_샘플.pdf",
              )
            }
          >
            <span className="inline-flex items-center gap-2">
              <ReceiptText className="h-4 w-4" />
              정산동의서 샘플
            </span>
            <Download className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 발행 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-point-500" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              발행된 세금계산서가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{invoice.id}</p>
                    <p className="text-xs text-slate-500">
                      발행일 {formatDate(invoice.issue_date)} ·{" "}
                      {invoice.total_amount.toLocaleString()}원
                    </p>
                  </div>
                  <Badge
                    variant={invoice.status === "issued" ? "success" : "default"}
                  >
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

