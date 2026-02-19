"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Menu as MenuIcon,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { cn, StatusBadge, Button, formatDate } from "@sigongon/ui";
import { PROJECT_CATEGORIES } from "@sigongon/types";
import { useProject } from "@/hooks";

interface ProjectTab {
  name: string;
  href: string;
  exact?: boolean;
  category: "overview" | "field" | "admin" | "finance" | "closeout";
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
    {
      name: "개요",
      href: `/projects/${id}`,
      exact: true,
      category: "overview",
    },
    { name: "현장방문", href: `/projects/${id}/visits`, category: "field" },
    {
      name: "작업일지",
      href: `/projects/${id}/construction/daily-reports`,
      category: "field",
    },
    {
      name: "시공현황",
      href: `/projects/${id}/construction`,
      category: "field",
    },
    { name: "문서함", href: `/projects/${id}/documents`, category: "admin" }, // Increased priority for mobile access
    { name: "AI진단", href: `/projects/${id}/diagnoses`, category: "field" },
    { name: "견적", href: `/projects/${id}/estimates`, category: "admin" },
    { name: "계약", href: `/projects/${id}/contracts`, category: "admin" },
    { name: "자재발주", href: `/projects/${id}/orders`, category: "finance" },
    {
      name: "세금계산서",
      href: `/projects/${id}/tax-invoice`,
      category: "finance",
    },
    { name: "관련노무", href: `/projects/${id}/labor`, category: "finance" },
    {
      name: "수도광열비",
      href: `/projects/${id}/utilities`,
      category: "finance",
    },
    {
      name: "준공정산",
      href: `/projects/${id}/completion/closeout-report`,
      category: "closeout",
    },
    {
      name: "하자보증",
      href: `/projects/${id}/warranty`,
      category: "closeout",
    },
  ];

  // Mobile: Top 3 + More
  const mobilePrimaryTabs = tabs.slice(0, 3);
  const mobileMenuTabs = tabs.slice(3);

  // Desktop: All in one line (scrollable if needed)

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href="/projects"
            aria-label="프로젝트 목록으로 이동"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 sm:h-11 sm:w-11"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>

          <div className="min-w-0 flex-1 py-0.5">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-40 animate-pulse rounded bg-slate-200 sm:h-8 sm:w-48" />
                <div className="hidden sm:block h-4 w-48 animate-pulse rounded bg-slate-100 sm:h-5 sm:w-64" />
              </div>
            ) : project ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                    {project.name}
                  </h1>
                  <StatusBadge
                    status={project.status}
                    className="hidden sm:inline-flex"
                  />
                </div>

                <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate max-w-xs">
                      {project.address || "주소 정보 없음"}
                    </span>
                  </span>
                  {project.category && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {PROJECT_CATEGORIES.find((c) => c.id === project.category)
                        ?.label || project.category}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                프로젝트 상세
              </h1>
            )}
          </div>

          <Button
            size="sm"
            variant="secondary"
            className="hidden sm:flex h-10"
            asChild
          >
            <Link href={`/projects/${id}/access`}>접근권한</Link>
          </Button>
        </div>

        {/* Navigation */}
        <div className="relative">
          {/* Desktop Nav (Horizontal Scroll) */}
          <div className="hidden border-b border-slate-200 md:block">
            <nav
              className="-mb-px flex gap-6 overflow-x-auto"
              aria-label="Tabs"
            >
              {tabs.map((tab) => {
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={cn(
                      "whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors",
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

          {/* Mobile Nav (Key Tabs + More) */}
          <div className="flex flex-col md:hidden">
            <div className="flex items-center justify-between border-b border-slate-200">
              {mobilePrimaryTabs.map((tab) => {
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={cn(
                      "flex-1 border-b-2 py-3 text-center text-sm font-medium transition-colors",
                      isActive
                        ? "border-brand-point-500 text-brand-point-600"
                        : "border-transparent text-slate-500",
                    )}
                  >
                    {tab.name}
                  </Link>
                );
              })}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 border-b-2 py-3 text-center text-sm font-medium transition-colors",
                  isMobileMenuOpen
                    ? "border-slate-800 text-slate-900"
                    : "border-transparent text-slate-500",
                )}
              >
                <span className="font-medium">더보기</span>
                {isMobileMenuOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Mobile Menu Dropdown (Full Width Overlay) */}
            {isMobileMenuOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 border-t border-slate-200 bg-white shadow-xl sm:hidden">
                <div className="max-h-[60vh] overflow-y-auto p-4">
                  {["field", "admin", "finance", "closeout"].map((category) => {
                    const categoryLabel = {
                      field: "현장 관리",
                      admin: "행정/계약",
                      finance: "정산/비용",
                      closeout: "준공/하자",
                    }[category];

                    const categoryTabs = mobileMenuTabs.filter(
                      (t) => t.category === category,
                    );
                    if (categoryTabs.length === 0) return null;

                    return (
                      <div key={category} className="mb-6 last:mb-0">
                        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                          <span className="h-px flex-1 bg-slate-100" />
                          {categoryLabel}
                          <span className="h-px flex-1 bg-slate-100" />
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {categoryTabs.map((tab) => {
                            const isActive = tab.exact
                              ? pathname === tab.href
                              : pathname.startsWith(tab.href);
                            return (
                              <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                  "flex items-center justify-center rounded-lg border py-3 text-sm font-medium transition-colors",
                                  isActive
                                    ? "border-brand-point-200 bg-brand-point-50 text-brand-point-700"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                )}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {tab.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Close overlay mask */}
                <div
                  className="fixed inset-0 top-[inherit] -z-10 bg-black/20 backdrop-blur-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              </div>
            )}
          </div>
        </div>

        {children}
      </div>
    </AdminLayout>
  );
}
