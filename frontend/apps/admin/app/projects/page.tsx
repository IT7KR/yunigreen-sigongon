"use client"

import Link from "next/link"
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, formatDate } from "@yunigreen/ui"
import type { ProjectStatus } from "@yunigreen/types"

// 임시 데이터
const projects = [
  {
    id: "1",
    name: "강남역 인근 상가 누수",
    address: "서울시 강남구 테헤란로 123",
    status: "diagnosing" as ProjectStatus,
    client_name: "김철수",
    client_phone: "010-1234-5678",
    created_at: "2026-01-04T10:30:00Z",
    site_visit_count: 2,
    estimate_count: 1,
  },
  {
    id: "2",
    name: "송파구 아파트 지하주차장",
    address: "서울시 송파구 올림픽로 456",
    status: "estimating" as ProjectStatus,
    client_name: "박영희",
    client_phone: "010-5678-1234",
    created_at: "2026-01-03T14:20:00Z",
    site_visit_count: 1,
    estimate_count: 0,
  },
  {
    id: "3",
    name: "서초동 오피스텔 옥상",
    address: "서울시 서초구 반포대로 789",
    status: "contracted" as ProjectStatus,
    client_name: "이민수",
    client_phone: "010-9012-3456",
    created_at: "2026-01-02T09:15:00Z",
    site_visit_count: 3,
    estimate_count: 2,
  },
  {
    id: "4",
    name: "마포구 빌라 외벽",
    address: "서울시 마포구 월드컵로 101",
    status: "in_progress" as ProjectStatus,
    client_name: "정수연",
    client_phone: "010-3456-7890",
    created_at: "2025-12-28T11:00:00Z",
    site_visit_count: 4,
    estimate_count: 1,
  },
]

export default function ProjectsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">프로젝트</h1>
            <p className="mt-1 text-slate-500">전체 {projects.length}개 프로젝트</p>
          </div>
          <Button>
            <Plus className="h-4 w-4" />
            새 프로젝트
          </Button>
        </div>

        {/* 필터 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="프로젝트명, 주소, 고객명으로 검색..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200">
                <option value="">모든 상태</option>
                <option value="draft">초안</option>
                <option value="diagnosing">진단중</option>
                <option value="estimating">견적중</option>
                <option value="quoted">견적발송</option>
                <option value="contracted">계약완료</option>
                <option value="in_progress">공사중</option>
                <option value="completed">준공</option>
              </select>
              <Button variant="secondary">
                <Filter className="h-4 w-4" />
                필터
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 프로젝트 테이블 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                    <th className="px-6 py-4 font-medium">프로젝트</th>
                    <th className="px-6 py-4 font-medium">상태</th>
                    <th className="px-6 py-4 font-medium">고객</th>
                    <th className="px-6 py-4 font-medium">방문</th>
                    <th className="px-6 py-4 font-medium">견적</th>
                    <th className="px-6 py-4 font-medium">등록일</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/projects/${project.id}`} className="block">
                          <p className="font-medium text-slate-900 hover:text-teal-600">
                            {project.name}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {project.address}
                          </p>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900">{project.client_name}</p>
                        <p className="text-sm text-slate-500">{project.client_phone}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {project.site_visit_count}회
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {project.estimate_count}건
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(project.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
