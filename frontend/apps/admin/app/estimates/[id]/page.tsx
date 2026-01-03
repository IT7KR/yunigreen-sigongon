"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  formatDate,
} from "@yunigreen/ui"
import type { EstimateStatus, EstimateLineSource } from "@yunigreen/types"

const mockEstimate = {
  id: "e1",
  version: 1,
  status: "draft" as EstimateStatus,
  project: {
    id: "1",
    name: "강남역 인근 상가 누수",
    address: "서울시 강남구 테헤란로 123, 4층",
    client_name: "김철수",
    client_phone: "010-1234-5678",
  },
  lines: [
    {
      id: "l1",
      sort_order: 1,
      description: "우레탄계 도막방수재",
      specification: "1액형, KS F 4911",
      unit: "kg",
      quantity: "100",
      unit_price_snapshot: "15000",
      amount: "1500000",
      source: "ai" as EstimateLineSource,
    },
    {
      id: "l2",
      sort_order: 2,
      description: "방수용 프라이머",
      specification: "우레탄계",
      unit: "kg",
      quantity: "20",
      unit_price_snapshot: "12000",
      amount: "240000",
      source: "ai" as EstimateLineSource,
    },
    {
      id: "l3",
      sort_order: 3,
      description: "드레인 실링재",
      specification: "폴리우레탄계",
      unit: "EA",
      quantity: "2",
      unit_price_snapshot: "25000",
      amount: "50000",
      source: "ai" as EstimateLineSource,
    },
    {
      id: "l4",
      sort_order: 4,
      description: "방수 시공 인건비",
      specification: "숙련공 기준",
      unit: "인",
      quantity: "3",
      unit_price_snapshot: "250000",
      amount: "750000",
      source: "manual" as EstimateLineSource,
    },
  ],
  subtotal: "2540000",
  vat_amount: "254000",
  total_amount: "2794000",
  created_at: "2026-01-04T16:00:00Z",
  issued_at: null,
}

const sourceLabels: Record<EstimateLineSource, { label: string; color: string }> = {
  ai: { label: "AI", color: "bg-purple-100 text-purple-700" },
  manual: { label: "수동", color: "bg-slate-100 text-slate-700" },
  template: { label: "템플릿", color: "bg-blue-100 text-blue-700" },
}

export default function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const estimate = mockEstimate
  const [editingLineId, setEditingLineId] = useState<string | null>(null)

  const formatCurrency = (amount: string) => {
    return Number(amount).toLocaleString() + "원"
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
            <Link
              href={`/projects/${estimate.project.id}`}
              className="mt-1 text-slate-500 hover:text-teal-600"
            >
              {estimate.project.name}
            </Link>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">
              <Printer className="h-4 w-4" />
              인쇄
            </Button>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              다운로드
            </Button>
            {estimate.status === "draft" && (
              <Button>
                <Send className="h-4 w-4" />
                발송
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">현장</p>
                <p className="font-medium text-slate-900">{estimate.project.name}</p>
                <p className="text-sm text-slate-600">{estimate.project.address}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">고객</p>
                <p className="font-medium text-slate-900">
                  {estimate.project.client_name}
                </p>
                <p className="text-sm text-slate-600">
                  {estimate.project.client_phone}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
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
                <div className="rounded-lg bg-teal-50 p-4">
                  <p className="text-sm text-teal-600">합계</p>
                  <p className="mt-1 text-xl font-bold text-teal-700">
                    {formatCurrency(estimate.total_amount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>견적 항목</CardTitle>
            <Button size="sm" variant="secondary">
              <Plus className="h-4 w-4" />
              항목 추가
            </Button>
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
                            onClick={() => setEditingLineId(line.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                          >
                            <Edit2 className="h-4 w-4 text-slate-400" />
                          </button>
                          <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={5} className="px-6 py-4 text-right font-medium text-slate-700">
                      공급가액
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(estimate.subtotal)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-6 py-4 text-right font-medium text-slate-700">
                      부가세 (10%)
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(estimate.vat_amount)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr className="bg-teal-50">
                    <td colSpan={5} className="px-6 py-4 text-right font-bold text-teal-700">
                      합계
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-teal-700">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100">
                  <Plus className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">견적서 생성</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(estimate.created_at)} · AI 진단 기반
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
