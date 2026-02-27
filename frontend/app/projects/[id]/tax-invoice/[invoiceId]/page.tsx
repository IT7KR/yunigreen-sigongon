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
  LoadingOverlay,
  useConfirmDialog,
} from "@sigongon/ui";
import { Loader2, ArrowLeft, FileText, X, RefreshCw, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { TaxInvoiceForm } from "@/components/TaxInvoiceForm";
import { TaxInvoicePreview } from "@/components/TaxInvoicePreview";

interface TaxInvoiceDetail {
  id: string;
  buyer_corp_num: string;
  buyer_name: string;
  buyer_ceo: string;
  buyer_address: string;
  buyer_email: string;
  supplier_corp_num: string;
  supplier_name: string;
  supplier_ceo: string;
  supplier_address: string;
  supplier_email: string;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  description: string;
  remark?: string;
  issue_date: string;
  status: "draft" | "issued" | "cancelled" | "failed";
  created_at: string;
  issued_at?: string;
  cancelled_at?: string;
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

export default function TaxInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id: projectId, invoiceId } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<TaxInvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  const fetchInvoice = async () => {
    setIsLoading(true);
    const response = await api.getTaxInvoiceDetail(invoiceId);
    if (response.success && response.data) {
      setInvoice(response.data as TaxInvoiceDetail);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handleUpdate = async (data: Partial<TaxInvoiceDetail>) => {
    try {
      setActionLoading(true);
      setError(null);
      const result = await api.updateTaxInvoice(invoiceId, data);
      if (result.success) {
        await fetchInvoice();
        setIsEditing(false);
      }
    } catch (err) {
      setError("수정에 실패했어요");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssue = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const result = await api.issueTaxInvoice(invoiceId);
      if (result.success) {
        await fetchInvoice();
      }
    } catch (err) {
      setError("발행에 실패했어요");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: "정말 이 세금계산서를 취소하시겠어요?",
      description: "취소 후에는 다시 발행해야 합니다.",
      confirmLabel: "취소하기",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const result = await api.cancelTaxInvoice(invoiceId);
      if (result.success) {
        await fetchInvoice();
      }
    } catch (err) {
      setError("취소에 실패했어요");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const result = await api.retryTaxInvoice(invoiceId);
      if (result.success) {
        await fetchInvoice();
      }
    } catch (err) {
      setError("재시도에 실패했어요");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewInPopbill = () => {
    // 팝빌 외부 링크로 이동
    window.open(`https://www.popbill.com/taxinvoice/${invoiceId}`, "_blank");
  };

  const canEdit = invoice?.status === "draft";
  const canIssue = invoice?.status === "draft";
  const canCancel = invoice?.status === "issued";
  const canRetry = invoice?.status === "failed";

  if (isLoading) {
    return (
      <LoadingOverlay variant="inline" text="세금계산서를 불러오는 중..." />
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">세금계산서를 찾을 수 없어요</p>
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              세금계산서 상세
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              발행일: {invoice.issue_date}
            </p>
          </div>
        </div>
        <Badge variant={statusVariants[invoice.status]}>
          {statusLabels[invoice.status]}
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {invoice.status === "failed" && invoice.failure_reason && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">발행 실패</p>
          <p className="mt-1 text-sm text-red-600">{invoice.failure_reason}</p>
        </div>
      )}

      <div className="flex gap-2">
        {canEdit && !isEditing && (
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            수정
          </Button>
        )}
        {canEdit && isEditing && (
          <Button variant="secondary" onClick={() => setIsEditing(false)}>
            취소
          </Button>
        )}
        {canIssue && (
          <Button onClick={handleIssue} disabled={actionLoading}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            발행
          </Button>
        )}
        {canCancel && (
          <Button variant="secondary" onClick={handleCancel} disabled={actionLoading}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            취소
          </Button>
        )}
        {canRetry && (
          <Button onClick={handleRetry} disabled={actionLoading}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            재시도
          </Button>
        )}
        {invoice.status === "issued" && (
          <Button variant="secondary" onClick={handleViewInPopbill}>
            <ExternalLink className="h-4 w-4" />
            팝빌에서 보기
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>세금계산서 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <TaxInvoiceForm
              mode="edit"
              initialData={{
                buyer_corp_num: invoice.buyer_corp_num,
                buyer_name: invoice.buyer_name,
                buyer_ceo: invoice.buyer_ceo,
                buyer_address: invoice.buyer_address,
                buyer_email: invoice.buyer_email,
                supply_amount: invoice.supply_amount,
                tax_amount: invoice.tax_amount,
                description: invoice.description,
                remark: invoice.remark,
                issue_date: invoice.issue_date,
              }}
              onSave={handleUpdate}
              loading={actionLoading}
            />
          ) : (
            <TaxInvoicePreview invoice={invoice} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
