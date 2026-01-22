"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Download, MoreHorizontal, FileText, Loader2 } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { Card, CardContent, Button, Badge, formatCurrency, formatDate } from "@yunigreen/ui"
import { useEstimates } from "@/hooks"
import type { EstimateStatus } from "@yunigreen/types"

const statusConfig: Record<EstimateStatus, { label: string; variant: "default" | "info" | "success" | "warning" | "error" }> = {
  draft: { label: "초안", variant: "default" },
  issued: { label: "발행됨", variant: "info" },
  accepted: { label: "수락됨", variant: "success" },
  rejected: { label: "거절됨", variant: "error" },
  void: { label: "무효", variant: "warning" },
}

export default function EstimatesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "">("")

  const { data: estimates = [], isLoading, error } = useEstimates()

  const filteredEstimates = estimates.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      if (!e.project_name.toLowerCase().includes(searchLower) && 
          !(e.client_name?.toLowerCase().includes(searchLower))) {
        return false
      }
    }
    return true
  })

  const totalAmount = filteredEstimates.reduce((sum, e) => sum + parseInt(e.total_amount), 0)
  const issuedCount = filteredEstimates.filter((e) => e.status === "issued").length
  const acceptedCount = filteredEstimates.filter((e) => e.status === "accepted").length

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">견적서</h1>
            <p className="mt-1 text-slate-500">전체 {filteredEstimates.length}건</p>
          </div>
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            내보내기
          </Button>
        </div>

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
              <p className="text-sm text-slate-500">발행됨</p>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="프로젝트명, 고객명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EstimateStatus | "")}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              >
                <option value="">모든 상태</option>
                <option value="draft">초안</option>
                <option value="issued">발행됨</option>
                <option value="accepted">수락됨</option>
                <option value="rejected">거절됨</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : error ? (
              <div className="py-12 text-center text-slate-500">
                데이터를 불러오는데 실패했어요
              </div>
            ) : filteredEstimates.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                견적서가 없어요
              </div>
            ) : (
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
                    {filteredEstimates.map((estimate) => {
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
                            <Link 
                              href={`/projects/${estimate.project_id}`}
                              className="text-slate-900 hover:text-teal-600"
                            >
                              {estimate.project_name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {estimate.client_name || "-"}
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
