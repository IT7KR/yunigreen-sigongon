"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Camera } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, MotionNumber, Skeleton, EmptyState, InteractiveCard, PageTransition, StaggerGrid } from "@sigongon/ui";
import { useProjects } from "@/hooks";

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading } = useProjects({ per_page: 5 });

  const recentProjects = data?.data || [];
  const inProgressCount = recentProjects.filter(
    (p) =>
      p.status === "diagnosing" ||
      p.status === "estimating" ||
      p.status === "in_progress",
  ).length;

  return (
    <MobileLayout>
      <PageTransition>
        <div className="space-y-6 p-4">
        {/* 환영 메시지 */}
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-slate-900">안녕하세요!</h1>
          <p className="mt-1 text-slate-500">오늘도 화이팅이에요</p>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/projects/new">
            <InteractiveCard className="h-full hover:border-brand-point-200">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-point-100">
                  <FolderKanban className="h-6 w-6 text-brand-point-600" />
                </div>
                <span className="font-medium text-slate-900">새 프로젝트</span>
              </CardContent>
            </InteractiveCard>
          </Link>

          <Link href="/projects">
            <InteractiveCard className="h-full hover:border-brand-primary-200">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                <span className="font-medium text-slate-900">현장방문</span>
              </CardContent>
            </InteractiveCard>
          </Link>
        </div>

        {/* 오늘의 요약 */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-slate-900">오늘의 현황</h2>
            {isLoading ? (
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <Skeleton className="mx-auto h-8 w-12" />
                    <Skeleton className="mx-auto mt-1 h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <MotionNumber
                    value={inProgressCount}
                    className="text-2xl font-bold text-brand-point-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">진행 중</p>
                </div>
                <div>
                  <MotionNumber
                    value={0}
                    className="text-2xl font-bold text-amber-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">오늘 방문</p>
                </div>
                <div>
                  <MotionNumber
                    value={0}
                    className="text-2xl font-bold text-blue-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">AI 진단</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 프로젝트 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">최근 프로젝트</h2>
            <Link href="/projects" className="text-sm text-brand-point-600">
              전체보기
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <StaggerGrid
              items={recentProjects.slice(0, 3)}
              className="space-y-2"
              keyExtractor={(project) => project.id}
              renderItem={(project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <InteractiveCard className="hover:border-brand-point-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {project.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {project.address}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <p>방문 {project.site_visit_count}회</p>
                        </div>
                      </div>
                    </CardContent>
                  </InteractiveCard>
                </Link>
              )}
            />
          ) : (
            <Card>
              <CardContent>
                <EmptyState
                  icon={FolderKanban}
                  title="아직 프로젝트가 없어요"
                  description="새 프로젝트를 만들어 시작하세요"
                  action={{
                    label: "새 프로젝트 만들기",
                    onClick: () => router.push("/projects/new"),
                  }}
                  size="sm"
                />
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </PageTransition>
    </MobileLayout>
  );
}
