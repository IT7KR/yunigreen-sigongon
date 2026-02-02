"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { cn, StatusBadge, Button } from "@sigongon/ui";
import { useProject } from "@/hooks";

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

  const tabs = [
    { name: "개요", href: `/projects/${id}`, exact: true },
    { name: "현장방문", href: `/projects/${id}/visits` },
    { name: "견적", href: `/projects/${id}/estimates` },
    { name: "계약", href: `/projects/${id}/contracts` },
    { name: "서류", href: `/projects/${id}/documents` },
    { name: "워크플로우", href: `/projects/${id}/workflow` },
    { name: "시공", href: `/projects/${id}/construction` },
    { name: "자재 발주", href: `/projects/${id}/orders` },
    { name: "준공/정산", href: `/projects/${id}/completion/closeout-report` },
    { name: "하자/보증", href: `/projects/${id}/warranty` },
    { name: "세금계산서", href: `/projects/${id}/tax-invoice` },
    { name: "노무", href: `/projects/${id}/labor` },
    { name: "수도광열비", href: `/projects/${id}/utilities` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            {isLoading ? (
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            ) : project ? (
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {project.name}
                  </h1>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {project.address}
                </p>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">
                프로젝트 상세
              </h1>
            )}
          </div>
        </div>

        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                    isActive
                      ? "border-brand-point-500 text-brand-point-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {children}
      </div>
    </AdminLayout>
  );
}
