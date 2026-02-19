"use client";
import {
  FolderKanban,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  AppLink,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  formatDate,
  Skeleton,
  StatCard,
  PageHeader,
  EmptyState,
  AlertBox,
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
        <PageHeader title="대시보드" description="오늘의 현황을 확인하세요" />

        {isLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={0}
                  icon={stat.icon}
                  color="brand"
                  loading
                />
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
            <CardContent>
              <EmptyState
                icon={AlertCircle}
                title="데이터를 불러오는데 실패했어요"
                description="잠시 후 다시 시도해주세요"
                size="lg"
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={parseInt(stat.value) || 0}
                  icon={stat.icon}
                  color="brand"
                />
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
                              <AppLink
                                href={`/projects/${project.id}`}
                                className="font-medium text-slate-900 hover:text-brand-point-600"
                              >
                                {project.name}
                              </AppLink>
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
                  <EmptyState
                    icon={FolderKanban}
                    title="프로젝트가 없어요"
                    description="새 프로젝트를 만들어 시작하세요"
                    size="sm"
                  />
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
                    <AlertBox variant="info" action={{ label: "확인하기", href: "/projects?status=in_progress" }}>
                      {stats.inProgress}개 프로젝트가 진행 중이에요
                    </AlertBox>
                  )}
                  <AlertBox variant="warning" action={{ label: "확인하기", href: "/pricebooks" }}>
                    적산 자료 갱신이 필요할 수 있어요
                  </AlertBox>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
