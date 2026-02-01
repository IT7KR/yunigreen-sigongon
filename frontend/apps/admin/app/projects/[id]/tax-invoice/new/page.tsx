"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@sigongon/ui";
import { Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { TaxInvoiceForm } from "@/components/TaxInvoiceForm";

interface TaxInvoiceFormData {
  buyer_corp_num: string;
  buyer_name: string;
  buyer_ceo: string;
  buyer_address: string;
  buyer_email: string;
  supply_amount: number;
  tax_amount: number;
  description: string;
  remark?: string;
  issue_date: string;
}

export default function NewTaxInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: TaxInvoiceFormData) => {
    try {
      setSaving(true);
      setError(null);
      const result = await api.createTaxInvoice(projectId, {
        ...data,
        status: "draft",
      });
      if (result.success && result.data) {
        router.push(`/projects/${projectId}/tax-invoice/${result.data.id}`);
      }
    } catch (err) {
      setError("저장에 실패했어요");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async (data: TaxInvoiceFormData) => {
    try {
      setSaving(true);
      setError(null);
      const createResult = await api.createTaxInvoice(projectId, {
        ...data,
        status: "draft",
      });
      if (createResult.success && createResult.data) {
        const issueResult = await api.issueTaxInvoice(createResult.data.id);
        if (issueResult.success) {
          router.push(`/projects/${projectId}/tax-invoice/${createResult.data.id}`);
        }
      }
    } catch (err) {
      setError("발행에 실패했어요");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-slate-900">
          새 세금계산서 발행
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>세금계산서 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <TaxInvoiceForm
            mode="create"
            onSave={handleSave}
            onIssue={handleIssue}
            loading={saving}
          />
          {error && (
            <p className="mt-4 text-sm text-red-500">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
