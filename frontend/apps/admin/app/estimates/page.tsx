"use client"

import Link from "next/link"
import { Search, Filter, Download, MoreHorizontal, FileText } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { Card, CardContent, Button, Badge, formatCurrency, formatDate } from "@yunigreen/ui"
import type { EstimateStatus } from "@yunigreen/types"

const statusConfig: Record<EstimateStatus, { label: string; variant: "default" | "info" | "success" | "warning" | "error" }> = {
  draft: { label: "초안", variant: "default" },
  issued: { label: "발행됨", variant: "info" },
  accepted: { label: "수락됨", variant: "success" },
  rejected: { label: "거절됨", variant: "error" },
  void: { label: "무효", variant: "warning" },
}

// 임시 데이터
const estimates = [
  {
    id: "1",
    project_name: "강남역 인근 상가 누수",
    client_name: "김철수",
    version: 2,
    status: "issued" as EstimateStatus,
    total_amount: "15500000",
    created_at: "2026-01-04T14:30:00Z",
    issued_at: "2026-01-04T15:00:00Z",
  },
  {
    id: "2",
    project_name: "송파구 아파트 지하주차장",
    client_name: "박영희",
    version: 1,
    status: "draft" as EstimateStatus,
    total_amount: "8200000",
    created_at: "2026-01-03T10:20:00Z",
    issued_at: null,
  },
  {
    id: "3",
    project_name: "서초동 오피스텔 옥상",
    client_name: "이민수",
    version: 3,
    status: "accepted" as EstimateStatus,
    total_amount: "22800000",
    created_at: "2026-01-02T09:15:00Z",
    issued_at: "2026-01-02T11:00:00Z",
  },
  {
    id: "4",
    project_name: "마포구 빌라 외벽",
    client_name: "정수연",
    version: 1,
    status: "rejected" as EstimateStatus,
    total_amount: "5600000",
    created_at: "2025-12-30T16:45:00Z",
    issued_at: "2025-12-31T09:00:00Z",
  },
]

export default function EstimatesPage() {
  const totalAmount = estimates.reduce((sum, e) => sum + parseInt(e.total_amount), 0)
  const issuedCount = estimates.filter((e) => e.status === "issued").length
  const acceptedCount = estimates.filter((e) => e.status === "accepted").length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">견적서</h1>
            <p className="mt-1 text-slate-500">전체 {estimates.length}건</p>
          </div>
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            내보내기
          </Button>
        </div>

        {/* 통계 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">총 견적 금액</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totalAmount.toString())}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">발행 대기</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{issuedCount}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">수락됨</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{acceptedCount}건</p>
            </CardContent>
          </Card>
        </div>

        {/* 필터 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="프로젝트명, 고객명으로 검색..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200">
                <option value="">모든 상태</option>
                <option value="draft">초안</option>
                <option value="issued">발행됨</option>
                <option value="accepted">수락됨</option>
                <option value="rejected">거절됨</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 견적서 테이블 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                    <th className="px-6 py-4 font-medium">견적서</th>
                    <th className="px-6 py-4 font-medium">프로젝트</th>
                    <th className="px-6 py-4 font-medium">고객</th>
                    <th className="px-6 py-4 font-medium">상태</th>
                    <th className="px-6 py-4 font-medium text-right">금액</th>
                    <th className="px-6 py-4 font-medium">생성일</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((estimate) => {
                    const config = statusConfig[estimate.status]
                    return (
                      <tr
                        key={estimate.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/estimates/${estimate.id}`}
                            className="flex items-center gap-2 text-slate-900 hover:text-teal-600"
                          >
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">v{estimate.version}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900">{estimate.project_name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {estimate.client_name}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">
                          {formatCurrency(estimate.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(estimate.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
