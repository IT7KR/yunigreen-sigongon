"use client"

import { useState, useEffect, useRef } from "react"
import {
  Upload,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Trash2,
  Download,
  Loader2,
  Play,
  Archive,
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
import { api } from "@/lib/api"
import { PdfUploadModal } from "@/components/PdfUploadModal"

type RevisionStatus = "active" | "draft" | "deprecated"

interface Revision {
  id: string
  version_label: string
  effective_from: string
  status: RevisionStatus
  item_count: number
  created_at: string
  activated_at?: string
}

interface StagingItem {
  id: string
  item_name: string
  specification?: string
  unit: string
  unit_price_extracted: string
  confidence_score: number
  status: string
  created_at: string
}

const statusConfig: Record<RevisionStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  active: { label: "사용중", icon: CheckCircle, color: "text-green-600 bg-green-100" },
  draft: { label: "검토중", icon: Clock, color: "text-amber-600 bg-amber-100" },
  deprecated: { label: "보관", icon: FileSpreadsheet, color: "text-slate-500 bg-slate-100" },
}

export default function PricebooksPage() {
  const [activeTab, setActiveTab] = useState<"revisions" | "staging">("revisions")
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [stagingItems, setStagingItems] = useState<StagingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    loadRevisions()
  }, [])

  useEffect(() => {
    if (activeTab === "staging" && selectedRevisionId) {
      loadStagingItems(selectedRevisionId)
    }
  }, [activeTab, selectedRevisionId])

  async function loadRevisions() {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getRevisions()
      if (response.success && response.data) {
        const items = response.data as Revision[]
        setRevisions(items)
        if (items.length > 0 && !selectedRevisionId) {
          setSelectedRevisionId(items[0].id)
        }
      }
    } catch (err) {
      setError("적산 자료 버전을 불러오는데 실패했어요")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadStagingItems(revisionId: string) {
    try {
      setLoading(true)
      const response = await api.getStagingItems(revisionId, { status: "pending" })
      if (response.success && response.data) {
        setStagingItems(response.data as StagingItem[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(stagingId: string) {
    try {
      await api.reviewStagingItem(stagingId, { action: "approved" })
      setStagingItems(stagingItems.filter(item => item.id !== stagingId))
    } catch (err) {
      alert("승인에 실패했어요")
      console.error(err)
    }
  }

  async function handleBulkApprove() {
    if (!selectedRevisionId || stagingItems.length === 0) return
    
    try {
      await api.bulkReviewStaging(selectedRevisionId, {
        staging_ids: stagingItems.map(item => item.id),
        action: "approved",
      })
      setStagingItems([])
    } catch (err) {
      alert("일괄 승인에 실패했어요")
      console.error(err)
    }
  }

  async function handleBulkReject() {
    if (!selectedRevisionId || stagingItems.length === 0) return
    
    if (!confirm("전체 항목을 거부하시겠어요?")) return
    
    try {
      await api.bulkReviewStaging(selectedRevisionId, {
        staging_ids: stagingItems.map(item => item.id),
        action: "rejected",
      })
      setStagingItems([])
    } catch (err) {
      alert("일괄 거부에 실패했어요")
      console.error(err)
    }
  }

  async function handleReject(stagingId: string) {
    try {
      await api.reviewStagingItem(stagingId, { action: "rejected" })
      setStagingItems(stagingItems.filter(item => item.id !== stagingId))
    } catch (err) {
      alert("거부에 실패했어요")
      console.error(err)
    }
  }

  async function handleActivate(revisionId: string) {
    try {
      const result = await api.activateRevision(revisionId)
      if (result.success) {
        alert(result.data?.message || "활성화했어요")
        loadRevisions()
      }
    } catch (err) {
      alert("활성화에 실패했어요")
      console.error(err)
    } finally {
      setOpenMenuId(null)
    }
  }

  async function handlePromote(revisionId: string) {
    try {
      const result = await api.promoteApprovedStaging(revisionId)
      if (result.success) {
        alert(result.data?.message || "정식 DB로 이동했어요")
        loadRevisions()
      }
    } catch (err) {
      alert("이동에 실패했어요")
      console.error(err)
    } finally {
      setOpenMenuId(null)
    }
  }

  async function handleAutoApprove(revisionId: string) {
    try {
      const result = await api.autoApproveStaging(revisionId)
      if (result.success) {
        alert(result.data?.message || "자동 승인 완료")
        if (selectedRevisionId === revisionId) {
          loadStagingItems(revisionId)
        }
      }
    } catch (err) {
      alert("자동 승인에 실패했어요")
      console.error(err)
    } finally {
      setOpenMenuId(null)
    }
  }

  if (loading && revisions.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={loadRevisions}>다시 시도</Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">적산 자료</h1>
            <p className="mt-1 text-slate-500">
              PDF 업로드 및 가격 정보 관리
            </p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
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
            버전 관리
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
            {stagingItems.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                {stagingItems.length}
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
                      <th className="px-6 py-4 font-medium">적용일</th>
                      <th className="px-6 py-4 font-medium">활성화일</th>
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((revision) => {
                      const status = statusConfig[revision.status] || statusConfig.draft
                      const StatusIcon = status.icon
                      
                      return (
                        <tr
                          key={revision.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">
                              {revision.version_label}
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
                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(revision.effective_from)}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {revision.activated_at ? formatDate(revision.activated_at) : "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              <button 
                                onClick={() => {
                                  setSelectedRevisionId(revision.id)
                                  setActiveTab("staging")
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                                title="검토 대기 보기"
                              >
                                <Eye className="h-4 w-4 text-slate-400" />
                              </button>
                              <button 
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                                title="다운로드"
                              >
                                <Download className="h-4 w-4 text-slate-400" />
                              </button>
                              <div className="relative" ref={openMenuId === revision.id ? menuRef : undefined}>
                                <button 
                                  onClick={() => setOpenMenuId(openMenuId === revision.id ? null : revision.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </button>
                                {openMenuId === revision.id && (
                                  <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                    {revision.status === "draft" && (
                                      <>
                                        <button
                                          onClick={() => handleAutoApprove(revision.id)}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                          고신뢰도 자동 승인
                                        </button>
                                        <button
                                          onClick={() => handlePromote(revision.id)}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <Archive className="h-4 w-4" />
                                          정식 DB로 이동
                                        </button>
                                        <button
                                          onClick={() => handleActivate(revision.id)}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-600 hover:bg-slate-50"
                                        >
                                          <Play className="h-4 w-4" />
                                          활성화
                                        </button>
                                      </>
                                    )}
                                    {revision.status === "active" && (
                                      <p className="px-4 py-2 text-sm text-slate-500">
                                        현재 사용 중인 버전이에요
                                      </p>
                                    )}
                                    {revision.status === "deprecated" && (
                                      <button
                                        onClick={() => handleActivate(revision.id)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                      >
                                        <Play className="h-4 w-4" />
                                        다시 활성화
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
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

            {stagingItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  검토 대기 중인 품목이 없어요
                </CardContent>
              </Card>
            ) : (
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
                          <th className="px-6 py-4 font-medium">신뢰도</th>
                          <th className="px-6 py-4 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagingItems.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {item.item_name}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {item.specification || "-"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.unit}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                              {Number(item.unit_price_extracted).toLocaleString()}원
                            </td>
                            <td className="px-6 py-4">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                item.confidence_score >= 0.9 
                                  ? "bg-green-100 text-green-700"
                                  : item.confidence_score >= 0.7
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {Math.round(item.confidence_score * 100)}%
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleReject(item.id)}>
                                  거부
                                </Button>
                                <Button size="sm" onClick={() => handleApprove(item.id)}>
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
            )}

            {stagingItems.length > 0 && (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleBulkReject}>전체 거부</Button>
                <Button onClick={handleBulkApprove}>전체 승인</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <PdfUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => loadRevisions()}
      />
    </AdminLayout>
  )
}
