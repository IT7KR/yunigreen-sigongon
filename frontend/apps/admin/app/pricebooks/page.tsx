"use client"

import { useState } from "react"
import {
  Upload,
  Search,
  Filter,
  FileSpreadsheet,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Trash2,
  Download,
} from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
} from "@yunigreen/ui"

type RevisionStatus = "active" | "pending_review" | "archived"

const mockRevisions = [
  {
    id: "r1",
    version: "2026-01",
    name: "2026년 1월 단가표",
    source_file: "2026-01_pricebook.pdf",
    status: "active" as RevisionStatus,
    item_count: 1250,
    uploaded_by: "관리자",
    uploaded_at: "2026-01-02T09:00:00Z",
    approved_at: "2026-01-02T10:30:00Z",
  },
  {
    id: "r2",
    version: "2025-12",
    name: "2025년 12월 단가표",
    source_file: "2025-12_pricebook.pdf",
    status: "archived" as RevisionStatus,
    item_count: 1180,
    uploaded_by: "관리자",
    uploaded_at: "2025-12-01T09:00:00Z",
    approved_at: "2025-12-01T11:00:00Z",
  },
]

const mockStagingItems = [
  {
    id: "s1",
    name: "우레탄 방수재 (신규)",
    specification: "1액형, KS F 4911",
    unit: "kg",
    unit_price: "16500",
    source_file: "2026-02_update.pdf",
    status: "pending",
    created_at: "2026-01-04T14:00:00Z",
  },
  {
    id: "s2",
    name: "방수용 프라이머",
    specification: "우레탄계 (가격 변경)",
    unit: "kg",
    unit_price: "13000",
    previous_price: "12000",
    source_file: "2026-02_update.pdf",
    status: "pending",
    created_at: "2026-01-04T14:00:00Z",
  },
]

const statusConfig: Record<RevisionStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  active: { label: "사용중", icon: CheckCircle, color: "text-green-600 bg-green-100" },
  pending_review: { label: "검토중", icon: Clock, color: "text-amber-600 bg-amber-100" },
  archived: { label: "보관", icon: FileSpreadsheet, color: "text-slate-500 bg-slate-100" },
}

export default function PricebooksPage() {
  const [activeTab, setActiveTab] = useState<"revisions" | "staging">("revisions")

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">단가표 관리</h1>
            <p className="mt-1 text-slate-500">
              PDF 단가표 업로드 및 품목 관리
            </p>
          </div>
          <Button>
            <Upload className="h-4 w-4" />
            PDF 업로드
          </Button>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("revisions")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "revisions"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            단가표 버전
          </button>
          <button
            onClick={() => setActiveTab("staging")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "staging"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            검토 대기
            {mockStagingItems.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                {mockStagingItems.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "revisions" && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                      <th className="px-6 py-4 font-medium">버전</th>
                      <th className="px-6 py-4 font-medium">상태</th>
                      <th className="px-6 py-4 font-medium">품목 수</th>
                      <th className="px-6 py-4 font-medium">업로드</th>
                      <th className="px-6 py-4 font-medium">승인일</th>
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRevisions.map((revision) => {
                      const status = statusConfig[revision.status]
                      const StatusIcon = status.icon
                      
                      return (
                        <tr
                          key={revision.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">
                              {revision.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {revision.source_file}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900">
                            {revision.item_count.toLocaleString()}개
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-900">{revision.uploaded_by}</p>
                            <p className="text-sm text-slate-500">
                              {formatDate(revision.uploaded_at)}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {revision.approved_at ? formatDate(revision.approved_at) : "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                                <Eye className="h-4 w-4 text-slate-400" />
                              </button>
                              <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                                <Download className="h-4 w-4 text-slate-400" />
                              </button>
                              <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "staging" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  검토가 필요한 품목
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  AI가 PDF에서 추출한 품목입니다. 확인 후 승인하거나 수정해 주세요.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                        <th className="px-6 py-4 font-medium">품목명</th>
                        <th className="px-6 py-4 font-medium">규격</th>
                        <th className="px-6 py-4 font-medium">단위</th>
                        <th className="px-6 py-4 font-medium text-right">단가</th>
                        <th className="px-6 py-4 font-medium">출처</th>
                        <th className="px-6 py-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockStagingItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.specification}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{item.unit}</td>
                          <td className="px-6 py-4 text-right">
                            <p className="font-medium text-slate-900">
                              {Number(item.unit_price).toLocaleString()}원
                            </p>
                            {item.previous_price && (
                              <p className="text-sm text-slate-500 line-through">
                                {Number(item.previous_price).toLocaleString()}원
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {item.source_file}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary">
                                수정
                              </Button>
                              <Button size="sm">
                                승인
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {mockStagingItems.length > 0 && (
              <div className="flex justify-end gap-2">
                <Button variant="secondary">전체 거부</Button>
                <Button>전체 승인</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
