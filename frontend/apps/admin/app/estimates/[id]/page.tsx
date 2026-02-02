"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { EstimateLineModal } from "@/components/EstimateLineModal";
import { RAGSearchPanel } from "@/components/RAGSearchPanel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  formatDate,
} from "@sigongon/ui";
import type { EstimateStatus, EstimateLineSource } from "@sigongon/types";
import { api } from "@/lib/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface EstimateDetail {
  id: string;
  version: number;
  status: EstimateStatus;
  subtotal: string;
  vat_amount: string;
  total_amount: string;
  created_at: string;
  issued_at?: string;
  lines: Array<{
    id: string;
    sort_order: number;
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
    amount: string;
    source: EstimateLineSource;
  }>;
}

const sourceLabels: Record<
  EstimateLineSource,
  { label: string; color: string }
> = {
  ai: { label: "AI", color: "bg-purple-100 text-purple-700" },
  manual: { label: "수동", color: "bg-slate-100 text-slate-700" },
  template: { label: "템플릿", color: "bg-blue-100 text-blue-700" },
};

export default function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<
    EstimateDetail["lines"][0] | null
  >(null);
  const [ragPanelOpen, setRagPanelOpen] = useState(false);

  useEffect(() => {
    loadEstimate();
  }, [id]);

  async function loadEstimate() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getEstimate(id);
      if (response.success && response.data) {
        setEstimate(response.data as EstimateDetail);
      }
    } catch (err) {
      setError("견적서를 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleIssue() {
    try {
      await api.issueEstimate(id);
      await loadEstimate();
    } catch (err) {
      alert("발송에 실패했어요");
      console.error(err);
    }
  }

  async function handleDeleteLine(lineId: string) {
    if (!confirm("이 항목을 삭제할까요?")) return;

    try {
      await api.deleteEstimateLine(id, lineId);
      await loadEstimate();
    } catch (err) {
      alert("삭제에 실패했어요");
      console.error(err);
    }
  }

  async function handleSaveLine(data: {
    id?: string;
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
  }) {
    if (editingLine) {
      await api.updateEstimateLine(id, editingLine.id, {
        description: data.description,
        quantity: data.quantity,
        unit_price_snapshot: data.unit_price_snapshot,
      });
    } else {
      await api.addEstimateLine(id, {
        description: data.description,
        specification: data.specification,
        unit: data.unit,
        quantity: data.quantity,
        unit_price_snapshot: data.unit_price_snapshot,
      });
    }
    await loadEstimate();
  }

  async function handleAddRAGItem(item: {
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
  }) {
    try {
      await api.addEstimateLine(id, item);
      await loadEstimate();
      setRagPanelOpen(false);
    } catch (err) {
      alert("항목 추가에 실패했어요");
      console.error(err);
    }
  }

  const formatCurrency = (amount: string) => {
    return Number(amount).toLocaleString() + "원";
  };

  async function generateEstimateExcel(estimate: EstimateDetail) {
    // Prepare data rows
    const dataRows = estimate.lines.map((line, index) => ({
      No: index + 1,
      품목: line.description,
      규격: line.specification || "",
      단위: line.unit,
      수량: Number(line.quantity),
      단가: Number(line.unit_price_snapshot),
      금액: Number(line.amount),
      출처: sourceLabels[line.source].label,
    }));

    // Add footer rows
    const footerRows = [
      {
        No: "",
        품목: "",
        규격: "",
        단위: "",
        수량: "",
        단가: "공급가액",
        금액: Number(estimate.subtotal),
        출처: "",
      },
      {
        No: "",
        품목: "",
        규격: "",
        단위: "",
        수량: "",
        단가: "부가세 (10%)",
        금액: Number(estimate.vat_amount),
        출처: "",
      },
      {
        No: "",
        품목: "",
        규격: "",
        단위: "",
        수량: "",
        단가: "합계",
        금액: Number(estimate.total_amount),
        출처: "",
      },
    ];

    // Combine all rows
    const allRows = [...dataRows, ...footerRows];

    // Create workbook with exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("견적서");

    // Add headers
    const headers = Object.keys(allRows[0]);
    worksheet.addRow(headers);

    // Add data rows
    for (const row of allRows) {
      worksheet.addRow(Object.values(row));
    }

    // Auto-fit column widths
    worksheet.columns.forEach((col) => {
      col.width = 15;
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `견적서_v${estimate.version}.xlsx`);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !estimate) {
    return (
      <AdminLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-red-500">{error || "견적서를 찾을 수 없어요"}</p>
          <Link href="/estimates">
            <Button>목록으로 돌아가기</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/estimates"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                견적서 v{estimate.version}
              </h1>
              <StatusBadge status={estimate.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              인쇄
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const url = `/api/v1/estimates/${id}/pdf`;
                window.open(url, "_blank");
              }}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateEstimateExcel(estimate)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            {estimate.status === "draft" && (
              <Button onClick={handleIssue}>
                <Send className="h-4 w-4" />
                발송
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>견적 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">공급가액</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatCurrency(estimate.subtotal)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">부가세 (10%)</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatCurrency(estimate.vat_amount)}
                </p>
              </div>
              <div className="rounded-lg bg-brand-point-50 p-4">
                <p className="text-sm text-brand-point-600">합계</p>
                <p className="mt-1 text-xl font-bold text-brand-point-700">
                  {formatCurrency(estimate.total_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>견적 항목</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRagPanelOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                적산 검색
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditingLine(null);
                  setLineModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                항목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                    <th className="px-6 py-4 font-medium">No</th>
                    <th className="px-6 py-4 font-medium">품목</th>
                    <th className="px-6 py-4 font-medium">규격</th>
                    <th className="px-6 py-4 font-medium text-right">수량</th>
                    <th className="px-6 py-4 font-medium text-right">단가</th>
                    <th className="px-6 py-4 font-medium text-right">금액</th>
                    <th className="px-6 py-4 font-medium">출처</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lines.map((line, index) => (
                    <tr
                      key={line.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {line.description}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {line.specification || "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900">
                        {line.quantity} {line.unit}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900">
                        {formatCurrency(line.unit_price_snapshot)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(line.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sourceLabels[line.source].color}`}
                        >
                          {sourceLabels[line.source].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingLine(line);
                              setLineModalOpen(true);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                          >
                            <Edit2 className="h-4 w-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteLine(line.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-right font-medium text-slate-700"
                    >
                      공급가액
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(estimate.subtotal)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-right font-medium text-slate-700"
                    >
                      부가세 (10%)
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(estimate.vat_amount)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr className="bg-brand-point-50">
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-right font-bold text-brand-point-700"
                    >
                      합계
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-brand-point-700">
                      {formatCurrency(estimate.total_amount)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-point-100">
                  <Plus className="h-4 w-4 text-brand-point-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">견적서 생성</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(estimate.created_at)}
                  </p>
                </div>
              </div>
              {estimate.issued_at && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <Send className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">견적서 발송</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(estimate.issued_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <EstimateLineModal
        isOpen={lineModalOpen}
        onClose={() => setLineModalOpen(false)}
        onSave={handleSaveLine}
        line={editingLine}
      />

      <RAGSearchPanel
        isOpen={ragPanelOpen}
        onClose={() => setRagPanelOpen(false)}
        onAddItem={handleAddRAGItem}
      />
    </AdminLayout>
  );
}
