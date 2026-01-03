"use client"

import {
  FolderKanban,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@yunigreen/ui"

// 임시 통계 데이터
const stats = [
  {
    title: "전체 프로젝트",
    value: "128",
    change: "+12%",
    changeType: "positive" as const,
    icon: FolderKanban,
  },
  {
    title: "이번 달 견적",
    value: "24",
    change: "+8%",
    changeType: "positive" as const,
    icon: FileText,
  },
  {
    title: "진행 중",
    value: "15",
    change: "-3%",
    changeType: "negative" as const,
    icon: Clock,
  },
  {
    title: "완료",
    value: "89",
    change: "+15%",
    changeType: "positive" as const,
    icon: CheckCircle2,
  },
]

const recentProjects = [
  {
    id: "1",
    name: "강남역 인근 상가 누수",
    status: "diagnosing",
    client: "김철수",
    date: "2026-01-04",
  },
  {
    id: "2",
    name: "송파구 아파트 지하주차장",
    status: "estimating",
    client: "박영희",
    date: "2026-01-03",
  },
  {
    id: "3",
    name: "서초동 오피스텔 옥상",
    status: "contracted",
    client: "이민수",
    date: "2026-01-02",
  },
]

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 제목 */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="mt-1 text-slate-500">오늘의 현황을 확인하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <stat.icon className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  <TrendingUp
                    className={`h-4 w-4 ${
                      stat.changeType === "positive"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-slate-500">지난 달 대비</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 최근 프로젝트 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 프로젝트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">프로젝트명</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">고객</th>
                    <th className="pb-3 font-medium">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4">
                        <span className="font-medium text-slate-900">
                          {project.name}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            project.status === "diagnosing"
                              ? "bg-blue-50 text-blue-700"
                              : project.status === "estimating"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-teal-50 text-teal-700"
                          }`}
                        >
                          {project.status === "diagnosing"
                            ? "진단중"
                            : project.status === "estimating"
                            ? "견적중"
                            : "계약완료"}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">{project.client}</td>
                      <td className="py-4 text-slate-500">{project.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 알림 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              주의가 필요한 항목
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                <span className="text-sm text-amber-800">
                  3개 프로젝트의 견적서가 7일 이상 응답 대기 중이에요
                </span>
                <button className="text-sm font-medium text-amber-700 hover:underline">
                  확인하기
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                <span className="text-sm text-blue-800">
                  단가표 &quot;2026년 1월&quot;이 다음 주에 만료돼요
                </span>
                <button className="text-sm font-medium text-blue-700 hover:underline">
                  갱신하기
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
