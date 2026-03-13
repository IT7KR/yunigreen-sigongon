"use client";
import {
  FolderKanban,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { MobileListCard } from "@/components/MobileListCard";
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
} from "@sigongcore/ui";
import { useDashboardStats } from "@/hooks";
import type { ProjectStatus } from "@sigongcore/types";

const DashboardSkeleton = ({ statCards }: { statCards: any[] }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

    <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
      <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
        <CardTitle>최근 프로젝트</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
        {/* Mobile Skeleton */}
        <div className="space-y-3 md:hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th className="pb-3 font-medium"><Skeleton className="h-4 w-20" /></th>
                <th className="pb-3 font-medium"><Skeleton className="h-4 w-16" /></th>
                <th className="pb-3 font-medium"><Skeleton className="h-4 w-16" /></th>
                <th className="pb-3 font-medium"><Skeleton className="h-4 w-24" /></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                  <td className="py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-4"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
      <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          주의가 필요한 항목
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
        <div className="space-y-3">
          <Skeleton className="h-[60px] w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
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
          <DashboardSkeleton statCards={statCards} />
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

            <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
              <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
                <CardTitle>최근 프로젝트</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
                {recentProjects.length > 0 ? (
                  <>
                    {/* Mobile card list */}
                    <div className="space-y-3 md:hidden">
                      {recentProjects.map((project) => (
                        <MobileListCard
                          key={project.id}
                          title={project.name}
                          badge={
                            <StatusBadge
                              status={project.status as ProjectStatus}
                            />
                          }
                          metadata={[
                            {
                              label: "고객",
                              value: project.client_name || "-",
                            },
                            {
                              label: "등록일",
                              value: formatDate(project.created_at),
                            },
                          ]}
                          onClick={() => router.push(`/projects/${project.id}`)}
                        />
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
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
                  </>
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

            <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
              <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  주의가 필요한 항목
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
                <div className="space-y-3">
                  {stats.inProgress > 0 && (
                    <AlertBox
                      variant="info"
                      action={{
                        label: "확인하기",
                        href: "/projects?status=in_progress",
                      }}
                    >
                      {stats.inProgress}개 프로젝트가 진행 중이에요
                    </AlertBox>
                  )}
                  <AlertBox
                    variant="warning"
                    action={{ label: "확인하기", href: "/pricebooks" }}
                  >
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
