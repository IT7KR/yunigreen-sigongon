
"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  User,
  Camera,
  FileText,
  ClipboardCheck,
  Plus,
  Loader2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  formatDate,
} from "@yunigreen/ui"
import type { ProjectStatus, VisitType, EstimateStatus } from "@yunigreen/types"
import { api } from "@/lib/api"

interface ProjectDetail {
  id: string
  name: string
  address: string
  status: ProjectStatus
  client_name?: string
  client_phone?: string
  notes?: string
  created_at: string
  site_visits: Array<{
    id: string
    visit_type: VisitType
    visited_at: string
    photo_count: number
  }>
  estimates: Array<{
    id: string
    version: number
    status: EstimateStatus
    total_amount: string
    created_at?: string
  }>
}

const visitTypeLabels: Record<VisitType, string> = {
  initial: "최초 방문",
  progress: "진행 점검",
  completion: "준공 확인",
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingEstimate, setCreatingEstimate] = useState(false)

  useEffect(() => {
    loadProject()
  }, [id])

  async function loadProject() {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getProject(id)
      if (response.success && response.data) {
        setProject(response.data as ProjectDetail)
      }
    } catch (err) {
      setError("프로젝트를 불러오는데 실패했어요")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateEstimate() {
    if (!project) return
    try {
      setCreatingEstimate(true)
      const result = await api.createEstimate(id)
      if (result.success && result.data) {
        router.push(`/estimates/${result.data.id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreatingEstimate(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "프로젝트를 찾을 수 없어요"}</p>
        <Link href="/projects">
          <Button>목록으로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              고객 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">고객명</p>
              <p className="font-medium text-slate-900">{project.client_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">연락처</p>
              <p className="font-medium text-slate-900">{project.client_phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">등록일</p>
              <p className="font-medium text-slate-900">
                {formatDate(project.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">{project.notes || "메모가 없습니다."}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-slate-400" />
              현장 방문
            </CardTitle>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => window.open(`http://localhost:3134/projects/${id}/visits/new`, '_blank')}
            >
              <Plus className="h-4 w-4" />
              방문 추가
            </Button>
          </CardHeader>
          <CardContent>
            {project.site_visits.length === 0 ? (
              <p className="py-8 text-center text-slate-500">
                아직 현장 방문 기록이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {project.site_visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {visitTypeLabels[visit.visit_type]}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(visit.visited_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Camera className="h-4 w-4" />
                      {visit.photo_count}장
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-slate-400" />
              AI 진단
            </CardTitle>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => window.open(`http://localhost:3134/projects/${id}`, '_blank')}
              title="Mobile 앱에서 진단 요청"
            >
              <Plus className="h-4 w-4" />
              진단 요청
            </Button>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-slate-500">
              진단 정보는 현장 방문에서 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            견적서
          </CardTitle>
          <Button size="sm" onClick={handleCreateEstimate} disabled={creatingEstimate}>
            {creatingEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            견적서 생성
          </Button>
        </CardHeader>
        <CardContent>
          {project.estimates.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              아직 견적서가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">버전</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">금액</th>
                    <th className="pb-3 font-medium">생성일</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {project.estimates.map((estimate) => (
                    <tr
                      key={estimate.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4 font-medium text-slate-900">
                        v{estimate.version}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={estimate.status} />
                      </td>
                      <td className="py-4 text-slate-900">
                        {Number(estimate.total_amount).toLocaleString()}원
                      </td>
                      <td className="py-4 text-slate-500">
                        {estimate.created_at ? formatDate(estimate.created_at) : "-"}
                      </td>
                      <td className="py-4">
                        <Link href={`/estimates/${estimate.id}`}>
                          <Button size="sm" variant="secondary">
                            상세보기
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
