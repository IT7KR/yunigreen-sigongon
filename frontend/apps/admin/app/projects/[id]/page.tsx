"use client"

import { use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Calendar,
  Camera,
  FileText,
  ClipboardCheck,
  Wrench,
  MoreHorizontal,
  Plus,
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
import type { ProjectStatus, VisitType, EstimateStatus } from "@yunigreen/types"

const mockProject = {
  id: "1",
  name: "강남역 인근 상가 누수",
  address: "서울시 강남구 테헤란로 123, 4층",
  status: "diagnosing" as ProjectStatus,
  client_name: "김철수",
  client_phone: "010-1234-5678",
  notes: "지하 주차장 천장에서 누수 발생. 비가 올 때 심해짐.",
  created_at: "2026-01-04T10:30:00Z",
  site_visits: [
    {
      id: "v1",
      visit_type: "initial" as VisitType,
      visited_at: "2026-01-04T14:00:00Z",
      photo_count: 12,
      technician: "이기술",
    },
    {
      id: "v2",
      visit_type: "progress" as VisitType,
      visited_at: "2026-01-05T10:00:00Z",
      photo_count: 8,
      technician: "이기술",
    },
  ],
  estimates: [
    {
      id: "e1",
      version: 1,
      status: "draft" as EstimateStatus,
      total_amount: "3500000",
      created_at: "2026-01-04T16:00:00Z",
    },
  ],
  diagnoses: [
    {
      id: "d1",
      status: "completed",
      confidence_score: 0.87,
      created_at: "2026-01-04T15:30:00Z",
      summary: "옥상 방수층 노후화로 인한 누수. 우레탄 방수 재시공 권장.",
    },
  ],
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
  const project = mockProject

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-slate-500">
              <MapPin className="h-4 w-4" />
              {project.address}
            </p>
          </div>
          <Button variant="secondary">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

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
                <p className="font-medium text-slate-900">{project.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">연락처</p>
                <p className="font-medium text-slate-900">{project.client_phone}</p>
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
              <Button size="sm" variant="secondary">
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
                          {formatDate(visit.visited_at)} · {visit.technician}
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
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" />
                진단 요청
              </Button>
            </CardHeader>
            <CardContent>
              {project.diagnoses.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  아직 진단 기록이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {project.diagnoses.map((diagnosis) => (
                    <Link
                      key={diagnosis.id}
                      href={`/diagnoses/${diagnosis.id}`}
                      className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">
                          신뢰도 {Math.round(diagnosis.confidence_score * 100)}%
                        </p>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          완료
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {diagnosis.summary}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(diagnosis.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              견적서
            </CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4" />
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
                          {formatDate(estimate.created_at)}
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
    </AdminLayout>
  )
}
