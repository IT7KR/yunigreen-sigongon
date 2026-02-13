"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@sigongon/ui";
import { FileText, Plus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface TaxInvoiceListItem {
  id: string;
  buyer_name: string;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  status: "draft" | "issued" | "cancelled" | "failed";
  issue_date: string;
  created_at: string;
  failure_reason?: string;
}

const statusLabels: Record<string, string> = {
  draft: "초안",
  issued: "발행됨",
  cancelled: "취소됨",
  failed: "실패",
};

const statusVariants: Record<string, "default" | "success" | "error" | "warning"> = {
  draft: "default",
  issued: "success",
  cancelled: "error",
  failed: "error",
};

export default function TaxInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [invoices, setInvoices] = useState<TaxInvoiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    const response = await api.getTaxInvoices(projectId);
    if (response.success && response.data) {
      setInvoices(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleRowClick = (invoiceId: string) => {
    router.push(`/projects/${projectId}/tax-invoice/${invoiceId}`);
  };

  const totalIssued = invoices.filter((inv) => inv.status === "issued").length;
  const totalAmount = invoices
    .filter((inv) => inv.status === "issued")
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          세금계산서 관리
        </h2>
        <Button onClick={() => router.push(`/projects/${projectId}/tax-invoice/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          새 세금계산서 발행
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>발행 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500">총 발행 건수</span>
                <span className="font-medium text-brand-point-600">
                  {totalIssued}건
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">총 발행 금액</span>
                <span className="text-lg font-bold text-brand-point-600">
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>발행 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <th className="pb-3 font-medium">발행일</th>
                  <th className="pb-3 font-medium">공급받는자</th>
                  <th className="pb-3 font-medium">공급가액</th>
                  <th className="pb-3 font-medium">세액</th>
                  <th className="pb-3 font-medium">합계금액</th>
                  <th className="pb-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-sm text-slate-400"
                    >
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center"
                    >
                      <FileText className="mx-auto h-12 w-12 text-slate-300" />
                      <p className="mt-4 text-slate-500">
                        발행 이력이 없습니다.
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        새 세금계산서를 발행해 보세요.
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(invoice.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleRowClick(invoice.id);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-4 text-slate-900">{invoice.issue_date}</td>
                      <td className="py-4 text-slate-900">
                        {invoice.buyer_name}
                      </td>
                      <td className="py-4 text-slate-900">
                        {invoice.supply_amount.toLocaleString()}원
                      </td>
                      <td className="py-4 text-slate-900">
                        {invoice.tax_amount.toLocaleString()}원
                      </td>
                      <td className="py-4 font-medium text-slate-900">
                        {invoice.total_amount.toLocaleString()}원
                      </td>
                      <td className="py-4">
                        <Badge variant={statusVariants[invoice.status]}>
                          {statusLabels[invoice.status]}
                        </Badge>
                        {invoice.status === "failed" && invoice.failure_reason && (
                          <p className="mt-1 text-xs text-red-500">
                            {invoice.failure_reason}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
