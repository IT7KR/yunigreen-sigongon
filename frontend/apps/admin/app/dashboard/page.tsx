"use client";

import Link from "next/link";
import {
  FolderKanban,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  formatDate,
  CountUp,
  Skeleton,
} from "@sigongon/ui";
import { useDashboardStats } from "@/hooks";
import type { ProjectStatus } from "@sigongon/types";

export default function DashboardPage() {
  const { stats, recentProjects, isLoading, error } = useDashboardStats();

  const statCards = [
    {
      title: "전체 프로젝트",
      value: stats.total.toString(),
      icon: FolderKanban,
    },
    {
      title: "이번 달 신규",
      value: stats.thisMonth.toString(),
      icon: FileText,
    },
    {
      title: "진행 중",
      value: stats.inProgress.toString(),
      icon: Clock,
    },
    {
      title: "완료",
      value: stats.completed.toString(),
      icon: CheckCircle2,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="mt-1 text-slate-500">오늘의 현황을 확인하세요</p>
        </div>

        {isLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="w-full">
                        <p className="text-sm text-slate-500">{stat.title}</p>
                        <Skeleton className="mt-1 h-9 w-16" />
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-point-100">
                        <stat.icon className="h-5 w-5 text-brand-point-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>최근 프로젝트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <p className="mt-4 text-slate-500">
                데이터를 불러오는데 실패했어요
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{stat.title}</p>
                        <CountUp
                          end={parseInt(stat.value) || 0}
                          className="mt-1 text-3xl font-bold text-slate-900"
                        />
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-point-100">
                        <stat.icon className="h-5 w-5 text-brand-point-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>최근 프로젝트</CardTitle>
              </CardHeader>
              <CardContent>
                {recentProjects.length > 0 ? (
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
                              <Link
                                href={`/projects/${project.id}`}
                                className="font-medium text-slate-900 hover:text-brand-point-600"
                              >
                                {project.name}
                              </Link>
                            </td>
                            <td className="py-4">
                              <StatusBadge
                                status={project.status as ProjectStatus}
                              />
                            </td>
                            <td className="py-4 text-slate-600">
                              {project.client_name || "-"}
                            </td>
                            <td className="py-4 text-slate-500">
                              {formatDate(project.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    프로젝트가 없어요
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  주의가 필요한 항목
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.inProgress > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                      <span className="text-sm text-blue-800">
                        {stats.inProgress}개 프로젝트가 진행 중이에요
                      </span>
                      <Link
                        href="/projects?status=in_progress"
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        확인하기
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                    <span className="text-sm text-amber-800">
                      적산 자료 갱신이 필요할 수 있어요
                    </span>
                    <Link
                      href="/pricebooks"
                      className="text-sm font-medium text-amber-700 hover:underline"
                    >
                      확인하기
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
