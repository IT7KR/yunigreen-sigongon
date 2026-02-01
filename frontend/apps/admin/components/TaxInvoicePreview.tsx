"use client";

import { Printer } from "lucide-react";
import { Button } from "@sigongon/ui";

interface TaxInvoiceData {
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
  status: string;
}

interface TaxInvoicePreviewProps {
  invoice: TaxInvoiceData;
}

export function TaxInvoicePreview({ invoice }: TaxInvoicePreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <Button variant="secondary" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
      </div>

      <div className="rounded-lg border border-slate-300 bg-white p-8 print:border-0">
        {/* 제목 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">세금계산서</h1>
          <p className="mt-2 text-sm text-slate-500">
            (공급받는자 보관용)
          </p>
        </div>

        {/* 승인번호 및 발행일 */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs text-slate-500">승인번호:</span>
            <span className="ml-2 font-mono text-sm text-slate-700">
              {invoice.id}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500">발행일:</span>
            <span className="ml-2 text-sm font-medium text-slate-900">
              {invoice.issue_date}
            </span>
          </div>
        </div>

        {/* 공급자/공급받는자 정보 */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          {/* 공급자 */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              공급자
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="w-24 text-slate-500">사업자번호</span>
                <span className="font-medium text-slate-900">
                  {invoice.supplier_corp_num}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">상호</span>
                <span className="font-medium text-slate-900">
                  {invoice.supplier_name}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">대표자</span>
                <span className="text-slate-900">{invoice.supplier_ceo}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">주소</span>
                <span className="text-slate-900">{invoice.supplier_address}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">이메일</span>
                <span className="text-slate-900">{invoice.supplier_email}</span>
              </div>
            </div>
          </div>

          {/* 공급받는자 */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              공급받는자
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="w-24 text-slate-500">사업자번호</span>
                <span className="font-medium text-slate-900">
                  {invoice.buyer_corp_num}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">상호</span>
                <span className="font-medium text-slate-900">
                  {invoice.buyer_name}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">대표자</span>
                <span className="text-slate-900">{invoice.buyer_ceo}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">주소</span>
                <span className="text-slate-900">{invoice.buyer_address}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">이메일</span>
                <span className="text-slate-900">{invoice.buyer_email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 금액 정보 */}
        <div className="mb-6">
          <table className="w-full border border-slate-300">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                  품목
                </th>
                <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                  공급가액
                </th>
                <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                  세액
                </th>
                <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                  합계금액
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-4 py-3 text-sm text-slate-900">
                  {invoice.description}
                </td>
                <td className="border border-slate-300 px-4 py-3 text-right text-sm font-medium text-slate-900">
                  {invoice.supply_amount.toLocaleString()}원
                </td>
                <td className="border border-slate-300 px-4 py-3 text-right text-sm text-slate-900">
                  {invoice.tax_amount.toLocaleString()}원
                </td>
                <td className="border border-slate-300 px-4 py-3 text-right text-sm font-bold text-slate-900">
                  {invoice.total_amount.toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 합계 금액 (강조) */}
        <div className="mb-6 rounded-lg bg-brand-point-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-brand-point-700">
              총 합계금액
            </span>
            <span className="text-2xl font-bold text-brand-point-700">
              {invoice.total_amount.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 비고 */}
        {invoice.remark && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">비고</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-600">
              {invoice.remark}
            </p>
          </div>
        )}

        {/* 발행 안내 */}
        <div className="border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-500">
            본 세금계산서는 팝빌을 통해 전자 발행되었습니다.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            국세청 전자세금계산서 시스템에서 확인 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
