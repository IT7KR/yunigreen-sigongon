"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { cn, StatusBadge, Button, formatDate } from "@sigongon/ui";
import { PROJECT_CATEGORIES } from "@sigongon/types";
import { useProject } from "@/hooks";

interface ProjectTab {
  name: string;
  href: string;
  exact?: boolean;
  priority: "primary" | "secondary";
}

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const { data: response, isLoading } = useProject(id);
  const project = response?.success ? response.data : null;

  const tabs: ProjectTab[] = [
    { name: "개요", href: `/projects/${id}`, exact: true, priority: "primary" },
    { name: "현장방문", href: `/projects/${id}/visits`, priority: "primary" },
    { name: "AI진단", href: `/projects/${id}/diagnoses`, priority: "primary" },
    { name: "견적", href: `/projects/${id}/estimates`, priority: "primary" },
    { name: "계약", href: `/projects/${id}/contracts`, priority: "primary" },
    { name: "시공", href: `/projects/${id}/construction`, priority: "primary" },
    { name: "자재발주", href: `/projects/${id}/orders`, priority: "secondary" },
    {
      name: "준공정산",
      href: `/projects/${id}/completion/closeout-report`,
      priority: "secondary",
    },
    { name: "하자보증", href: `/projects/${id}/warranty`, priority: "secondary" },
    { name: "세금계산서", href: `/projects/${id}/tax-invoice`, priority: "secondary" },
    { name: "관련노무", href: `/projects/${id}/labor`, priority: "secondary" },
    { name: "수도광열비", href: `/projects/${id}/utilities`, priority: "secondary" },
    { name: "문서함", href: `/projects/${id}/documents`, priority: "secondary" },
  ];

  const primaryTabs = tabs.filter((tab) => tab.priority === "primary");
  const secondaryTabs = tabs.filter((tab) => tab.priority === "secondary");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <Link
            href="/projects"
            aria-label="프로젝트 목록으로 이동"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-64 animate-pulse rounded bg-slate-100" />
              </div>
            ) : project ? (
              <>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                  <StatusBadge status={project.status} />
                  {project.category && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {PROJECT_CATEGORIES.find((category) => category.id === project.category)
                        ?.label || project.category}
                    </span>
                  )}
                </div>

                <p className="mt-1 flex items-center gap-1 text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{project.address || "주소 정보 없음"}</span>
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    등록일 {formatDate(project.created_at)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    프로젝트 ID {project.id}
                  </span>
                </div>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">프로젝트 상세</h1>
            )}
          </div>

          <Button size="md" variant="secondary" className="h-11 w-full sm:w-auto" asChild>
            <Link href={`/projects/${id}/access`}>접근권한</Link>
          </Button>
        </div>

        <div>
          <div className="relative border-b border-slate-200">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent"
            />

            <nav
              aria-label="프로젝트 상세 탭"
              className="-mb-px flex items-center gap-0.5 overflow-x-auto scroll-smooth px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {primaryTabs.map((tab) => {
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);

                return (
                  <ProjectTabButton
                    key={tab.name}
                    href={tab.href}
                    active={isActive}
                    label={tab.name}
                  />
                );
              })}

              <div aria-hidden className="mx-1 h-5 w-px bg-slate-200" />

              {secondaryTabs.map((tab) => {
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);

                return (
                  <ProjectTabButton
                    key={tab.name}
                    href={tab.href}
                    active={isActive}
                    label={tab.name}
                  />
                );
              })}
            </nav>
          </div>

          <p className="mt-2 text-xs text-slate-500 md:hidden">
            탭이 많으면 좌우로 밀어서 볼 수 있어요.
          </p>
        </div>

        {children}
      </div>
    </AdminLayout>
  );
}

function ProjectTabButton({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-point-500 focus-visible:ring-offset-2",
        active
          ? "border-brand-point-500 text-brand-point-700"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
      )}
    >
      {label}
    </Link>
  );
}
