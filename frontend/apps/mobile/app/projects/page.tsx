"use client";

import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Button, Card, CardContent, PrimitiveButton, PrimitiveInput, StatusBadge } from "@sigongon/ui";
import { formatRelativeTime } from "@sigongon/ui";
import { useProjects } from "@/hooks";
import type { ProjectStatus } from "@sigongon/types";

export default function ProjectsPage() {
  const { data, isLoading, error } = useProjects();

  return (
    <MobileLayout title="프로젝트">
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-500">
          현장에서 작업할 프로젝트만 표시됩니다.
        </p>
        {/* 검색 및 필터 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <PrimitiveInput
              type="search"
              placeholder="프로젝트 검색..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>
          <PrimitiveButton className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
            <Filter className="h-4 w-4 text-slate-600" />
          </PrimitiveButton>
        </div>

        {/* 프로젝트 목록 */}
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-slate-500">
                프로젝트를 불러오는 데 실패했어요
              </p>
              <Button variant="ghost" size="sm" className="mt-2">
                다시 시도
              </Button>
            </CardContent>
          </Card>
        ) : data?.data && data.data.length > 0 ? (
          <div className="space-y-3">
            {data.data.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-brand-point-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-slate-900">
                          {project.name}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {project.address}
                        </p>
                      </div>
                      <StatusBadge status={project.status as ProjectStatus} />
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                      {project.client_name && (
                        <span>{project.client_name}</span>
                      )}
                      <span>•</span>
                      <span>{formatRelativeTime(project.created_at)}</span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-slate-400">
                      <span>현장방문 {project.site_visit_count}회</span>
                      <span>견적서 {project.estimate_count}건</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mt-4 font-medium text-slate-900">
                아직 프로젝트가 없어요
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                새 프로젝트를 만들어보세요
              </p>
              <Button className="mt-4" asChild><Link href="/projects/new">새 프로젝트 만들기</Link></Button>
            </CardContent>
          </Card>
        )}

        {/* FAB */}
        <Link
          href="/projects/new"
          className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-point-500 text-white shadow-lg hover:bg-brand-point-600"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </MobileLayout>
  );
}
