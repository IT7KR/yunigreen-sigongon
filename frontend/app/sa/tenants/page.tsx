"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Modal,
  Pagination,
  PrimitiveInput,
  PrimitiveSelect,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
  toast,
} from "@sigongcore/ui";
import {
  Search,
  Building2,
  Users,
  FolderKanban,
  Loader2,
  Eye,
  Plus,
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
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    business_number: "",
    representative: "",
    rep_phone: "",
    rep_email: "",
    plan: "none" as "none" | "trial" | "basic" | "pro",
    subscription_end_date: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const perPage = 10;

  useEffect(() => {
    loadTenants();
  }, [currentPage, searchQuery, filterPlan, filterStatus]);

  async function loadTenants() {
    try {
      setIsLoading(true);
      const response = await api.getTenants({
        page: currentPage,
        search: searchQuery || undefined,
        plan: filterPlan !== "all" ? filterPlan : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      if (response.success && response.data) {
        setTenants(response.data as TenantItem[]);
        if (response.meta) {
          setTotalPages(response.meta.total_pages);
          setTotalItems(response.meta.total);
        }
      }
    } catch (err) {
      console.error("Failed to load tenants:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setCurrentPage(1);
    };
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }

  async function handleCreateTenant() {
    if (!createForm.name.trim()) {
      toast.error("회사명을 입력해 주세요.");
      return;
    }
    setIsCreating(true);
    try {
      const response = await api.createTenant({
        name: createForm.name.trim(),
        business_number: createForm.business_number.trim() || undefined,
        representative: createForm.representative.trim() || undefined,
        rep_phone: createForm.rep_phone.trim() || undefined,
        rep_email: createForm.rep_email.trim() || undefined,
        plan: createForm.plan,
        subscription_end_date: ["basic", "pro"].includes(createForm.plan) && createForm.subscription_end_date
          ? createForm.subscription_end_date
          : undefined,
      });
      if (response.success) {
        toast.success("고객사를 등록했어요.");
        setShowCreateModal(false);
        setCreateForm({ name: "", business_number: "", representative: "", rep_phone: "", rep_email: "", plan: "none", subscription_end_date: "" });
        await loadTenants();
      } else {
        toast.error(response.error?.message || "등록에 실패했어요.");
      }
    } catch (err) {
      console.error("Failed to create tenant:", err);
      toast.error("등록에 실패했어요.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">고객사 관리</h1>
            <p className="mt-1 text-slate-500">전체 {totalItems}개 고객사</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            신규 고객사 등록
          </Button>
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
                  onChange={handleSearchChange}
                  className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
              </div>

              <div className="flex gap-2">
                <PrimitiveSelect
                  value={filterPlan}
                  onChange={handleFilterChange(setFilterPlan)}
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
                  onChange={handleFilterChange(setFilterStatus)}
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
          <>
            {/* 모바일: 스켈레톤 리스트 */}
            <div className="space-y-3 md:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="grid gap-2 pt-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
            {/* 데스크톱: 스켈레톤 테이블 */}
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
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {tenants.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  고객사가 없어요
                </div>
              ) : (
                tenants.map((tenant) => {
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
                      {tenants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            <div className="py-12 text-slate-500">
                              고객사가 없어요
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tenants.map((tenant) => {
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

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="신규 고객사 등록"
        description="새로운 고객사를 플랫폼에 등록합니다."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">회사명 *</label>
            <PrimitiveInput
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="(주)시공코어"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">사업자번호</label>
            <PrimitiveInput
              value={createForm.business_number}
              onChange={(e) => setCreateForm({ ...createForm, business_number: e.target.value })}
              placeholder="000-00-00000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">대표자 성함</label>
            <PrimitiveInput
              value={createForm.representative}
              onChange={(e) => setCreateForm({ ...createForm, representative: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">대표자 연락처</label>
            <PrimitiveInput
              value={createForm.rep_phone}
              onChange={(e) => setCreateForm({ ...createForm, rep_phone: e.target.value })}
              placeholder="010-0000-0000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">대표자 이메일</label>
            <PrimitiveInput
              value={createForm.rep_email}
              onChange={(e) => setCreateForm({ ...createForm, rep_email: e.target.value })}
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">요금제</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["none", "trial", "basic", "pro"] as const).map((plan) => {
                const labels = { none: "미선택", trial: "무료 체험", basic: "Basic", pro: "Pro" };
                return (
                  <Button
                    key={plan}
                    variant={createForm.plan === plan ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setCreateForm({ ...createForm, plan })}
                    className="w-full"
                  >
                    {labels[plan]}
                  </Button>
                );
              })}
            </div>
          </div>
          {["basic", "pro"].includes(createForm.plan) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">구독 만료일</label>
              <PrimitiveInput
                type="date"
                value={createForm.subscription_end_date}
                onChange={(e) => setCreateForm({ ...createForm, subscription_end_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1" disabled={isCreating}>
            취소
          </Button>
          <Button onClick={handleCreateTenant} className="flex-1" disabled={isCreating}>
            {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />등록 중...</> : "등록"}
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
