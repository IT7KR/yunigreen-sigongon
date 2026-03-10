"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Pagination,
  PrimitiveInput,
  PrimitiveSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
} from "@sigongcore/ui";
import {
  Search,
  Building2,
  Users,
  FolderKanban,
  Loader2,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { MobileListCard } from "@/components/MobileListCard";

interface TenantItem {
  id: string;
  name: string;
  plan: string;
  users_count: number;
  projects_count: number;
  created_at: string;
  billing_amount?: number;
  status?: "active" | "inactive";
}

function getPlanPresentation(plan: string) {
  switch (plan) {
    case "trial":
      return { label: "무료 체험", color: "bg-slate-100 text-slate-700" };
    case "basic":
      return { label: "Basic", color: "bg-blue-100 text-blue-700" };
    case "pro":
      return { label: "Pro", color: "bg-purple-100 text-purple-700" };
    default:
      return { label: "미선택", color: "bg-amber-100 text-amber-700" };
  }
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<TenantItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const perPage = 10;

  useEffect(() => {
    loadTenants();
  }, [currentPage]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterPlan, filterStatus, tenants]);

  async function loadTenants() {
    try {
      setIsLoading(true);
      const response = await api.getTenants({ page: currentPage });
      if (response.success && response.data) {
        setTenants(response.data as TenantItem[]);
        if (response.meta) {
          setTotalPages(response.meta.total_pages);
        }
      }
    } catch (err) {
      console.error("Failed to load tenants:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...tenants];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (filterPlan !== "all") {
      filtered = filtered.filter((t) => t.plan === filterPlan);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    setFilteredTenants(filtered);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">고객사 관리</h1>
          <p className="mt-1 text-slate-500">전체 {tenants.length}개 고객사</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <PrimitiveInput
                  type="search"
                  placeholder="고객사명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
              </div>

              <div className="flex gap-2">
                <PrimitiveSelect
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="all">모든 요금제</option>
                  <option value="none">미선택</option>
                  <option value="trial">무료 체험</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </PrimitiveSelect>

                <PrimitiveSelect
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                >
                  <option value="all">모든 상태</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </PrimitiveSelect>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {filteredTenants.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  고객사가 없어요
                </div>
              ) : (
                filteredTenants.map((tenant) => {
                  const plan = getPlanPresentation(tenant.plan);
                  return (
                    <MobileListCard
                      key={tenant.id}
                      title={tenant.name}
                      badge={
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${plan.color}`}
                        >
                          {plan.label}
                        </span>
                      }
                      metadata={[
                        { label: "사용자수", value: tenant.users_count },
                        { label: "프로젝트수", value: tenant.projects_count },
                        {
                          label: "요금",
                          value: tenant.billing_amount
                            ? `${tenant.billing_amount.toLocaleString()}원`
                            : "무료",
                        },
                        {
                          label: "가입일",
                          value: formatDate(tenant.created_at),
                        },
                      ]}
                      onClick={() => {
                        window.location.href = `/sa/tenants/${tenant.id}`;
                      }}
                      actions={
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/sa/tenants/${tenant.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            상세보기
                          </Link>
                        </Button>
                      }
                    />
                  );
                })
              )}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>회사명</TableHead>
                        <TableHead>요금제</TableHead>
                        <TableHead>요금 금액</TableHead>
                        <TableHead>사용자 수</TableHead>
                        <TableHead>프로젝트 수</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            <div className="py-12 text-slate-500">
                              고객사가 없어요
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTenants.map((tenant) => {
                          const plan = getPlanPresentation(tenant.plan);

                          return (
                            <TableRow key={tenant.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                    <Building2 className="h-5 w-5 text-slate-600" />
                                  </div>
                                  <span className="font-medium text-slate-900">
                                    {tenant.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${plan.color}`}
                                >
                                  {plan.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {tenant.billing_amount
                                  ? `${tenant.billing_amount.toLocaleString()}원`
                                  : "무료"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <Users className="h-4 w-4" />
                                  {tenant.users_count}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <FolderKanban className="h-4 w-4" />
                                  {tenant.projects_count}
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-500">
                                {formatDate(tenant.created_at)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    tenant.status === "active"
                                      ? "success"
                                      : "default"
                                  }
                                >
                                  {tenant.status === "active"
                                    ? "활성"
                                    : "비활성"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/sa/tenants/${tenant.id}`}>
                                    <Eye className="h-3.5 w-3.5" />
                                    상세보기
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
