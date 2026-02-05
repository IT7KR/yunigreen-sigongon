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
  Users,
  DollarSign,
  Receipt,
  ClipboardList,
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

// Mock data for extended dashboard - will be replaced with API calls
const mockExtendedStats = {
  monthlyRevenue: 45000000,
  monthlyCollection: 38000000,
  receivables: 7000000,
  monthlyWorkers: 24,
  recentLogs: [
    { id: "1", project: "강남 삼성빌딩 방수공사", date: "2026-02-05", summary: "옥상 방수 1차 도포 완료" },
    { id: "2", project: "서초 현대아파트 외벽공사", date: "2026-02-05", summary: "외벽 균열 보수 70% 완료" },
    { id: "3", project: "송파 롯데타워 지하방수", date: "2026-02-04", summary: "지하 2층 방수 시공 시작" },
  ],
};

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

  const financeCards = [
    {
      title: "금월 매출",
      value: mockExtendedStats.monthlyRevenue,
      icon: DollarSign,
      color: "green",
    },
    {
      title: "금월 수금",
      value: mockExtendedStats.monthlyCollection,
      icon: Receipt,
      color: "blue",
    },
    {
      title: "미수금",
      value: mockExtendedStats.receivables,
      icon: AlertCircle,
      color: "amber",
    },
    {
      title: "금월 투입 인원",
      value: mockExtendedStats.monthlyWorkers,
      icon: Users,
      color: "purple",
      suffix: "명",
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

            {/* Finance Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {financeCards.map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{card.title}</p>
                        <div className="mt-1 text-2xl font-bold text-slate-900">
                          {card.suffix ? (
                            <>
                              <CountUp end={card.value} />
                              {card.suffix}
                            </>
                          ) : (
                            <>{(card.value / 10000).toLocaleString()}만원</>
                          )}
                        </div>
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          card.color === "green"
                            ? "bg-green-100"
                            : card.color === "blue"
                              ? "bg-blue-100"
                              : card.color === "amber"
                                ? "bg-amber-100"
                                : "bg-purple-100"
                        }`}
                      >
                        <card.icon
                          className={`h-5 w-5 ${
                            card.color === "green"
                              ? "text-green-600"
                              : card.color === "blue"
                                ? "text-blue-600"
                                : card.color === "amber"
                                  ? "text-amber-600"
                                  : "text-purple-600"
                          }`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Work Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-brand-point-600" />
                  최근 작업일지
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mockExtendedStats.recentLogs.length > 0 ? (
                  <div className="space-y-3">
                    {mockExtendedStats.recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between rounded-lg border border-slate-100 p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {log.project}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-600">
                            {log.summary}
                          </p>
                        </div>
                        <span className="text-sm text-slate-500">{log.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    최근 작업일지가 없어요
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
                  {mockExtendedStats.receivables > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                      <span className="text-sm text-red-800">
                        미수금 {(mockExtendedStats.receivables / 10000).toLocaleString()}만원
                      </span>
                      <Link
                        href="/billing"
                        className="text-sm font-medium text-red-700 hover:underline"
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
