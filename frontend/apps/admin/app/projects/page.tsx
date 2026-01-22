"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter, MoreHorizontal, Loader2, X } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { Card, CardContent, Button, StatusBadge, formatDate, Input } from "@yunigreen/ui"
import { useProjects } from "@/hooks"
import { api } from "@/lib/api"
import type { ProjectStatus } from "@yunigreen/types"

export default function ProjectsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  const { data, isLoading, error, refetch } = useProjects({
    status: statusFilter || undefined,
    search: search || undefined,
  })

  const projects = data?.data ?? []
  const total = data?.meta?.total ?? 0

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      setCreating(true)
      const result = await api.createProject({
        name: formData.get("name") as string,
        address: formData.get("address") as string,
        client_name: formData.get("client_name") as string || undefined,
        client_phone: formData.get("client_phone") as string || undefined,
      })
      
      if (result.success && result.data) {
        setShowCreateModal(false)
        refetch()
        router.push(`/projects/${result.data.id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">프로젝트</h1>
            <p className="mt-1 text-slate-500">전체 {total}개 프로젝트</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            새 프로젝트
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="프로젝트명, 주소, 고객명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "")}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              >
                <option value="">모든 상태</option>
                <option value="draft">초안</option>
                <option value="diagnosing">진단중</option>
                <option value="estimating">견적중</option>
                <option value="quoted">견적발송</option>
                <option value="contracted">계약완료</option>
                <option value="in_progress">공사중</option>
                <option value="completed">준공</option>
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
            ) : projects.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                프로젝트가 없어요
              </div>
            ) : (
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
                          <p className="text-slate-900">{project.client_name || "-"}</p>
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
            )}
          </CardContent>
        </Card>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">새 프로젝트</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input name="name" label="프로젝트명 *" placeholder="예: 강남아파트 옥상방수" required />
              <Input name="address" label="주소 *" placeholder="서울시 강남구..." required />
              <Input name="client_name" label="고객명" placeholder="홍길동" />
              <Input name="client_phone" label="고객 연락처" placeholder="010-1234-5678" />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  취소
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "생성"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
