"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingOverlay,
  Modal,
  PrimitiveInput,
  Textarea,
  formatDate,
  toast,
  useConfirmDialog,
} from "@sigongcore/ui";
import {
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  FolderKanban,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { MobileListCard } from "@/components/MobileListCard";

interface TenantDetail {
  id: string;
  name: string;
  business_number: string;
  representative: string;
  rep_phone: string;
  rep_email: string;
  contact_name?: string;
  contact_phone?: string;
  contact_position?: string;
  plan: string;
  users_count: number;
  projects_count: number;
  created_at: string;
  subscription_start_date: string;
  subscription_end_date: string;
  is_custom_trial: boolean;
  billing_amount: number;
  days_remaining: number;
  payment_history: Array<{
    id: string;
    date: string;
    amount: number;
    status: "paid" | "failed";
  }>;
  users: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    role: string;
    last_login_at?: string;
  }>;
  project_stats: {
    draft: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  is_active: boolean;
  trial_override_enabled?: boolean | null;
  trial_override_months?: number | null;
  trial_override_reason?: string | null;
  effective_trial_enabled?: boolean;
  effective_trial_months?: number;
  trial_source?: string | null;
}

const roleLabels: Record<string, string> = {
  super_admin: "슈퍼관리자",
  company_admin: "대표",
  site_manager: "현장소장",
  worker: "근로자",
  admin: "관리자",
  manager: "매니저",
};

function getPlanPresentation(plan: string) {
  switch (plan) {
    case "basic":
      return {
        label: "Basic",
        badgeClass: "bg-blue-100 text-blue-700",
        yearlyPrice: 588000,
      };
    case "pro":
      return {
        label: "Pro",
        badgeClass: "bg-purple-100 text-purple-700",
        yearlyPrice: 1188000,
      };
    case "trial":
      return {
        label: "무료 체험",
        badgeClass: "bg-amber-100 text-amber-700",
        yearlyPrice: 0,
      };
    default:
      return {
        label: "미선택",
        badgeClass: "bg-slate-100 text-slate-700",
        yearlyPrice: 0,
      };
  }
}

function getTrialSourceLabel(source?: string | null) {
  switch (source) {
    case "override":
      return "개별 정책";
    case "default":
      return "기본 정책";
    default:
      return "미적용";
  }
}

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrialPolicyModal, setShowTrialPolicyModal] = useState(false);
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialMonths, setTrialMonths] = useState(1);
  const [trialReason, setTrialReason] = useState("");
  const [isSavingTrialPolicy, setIsSavingTrialPolicy] = useState(false);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    void loadTenantDetail();
  }, [tenantId]);

  async function loadTenantDetail() {
    try {
      setIsLoading(true);
      const response = await api.getTenant(tenantId);

      if (response.success && response.data) {
        const tenantData = response.data as unknown as TenantDetail;
        const tenantAny = tenantData as unknown as Record<string, unknown>;
        const endDateValue = tenantData.subscription_end_date || "";
        const now = new Date();
        const endDate = endDateValue ? new Date(endDateValue) : null;
        const daysRemaining = endDate
          ? Math.max(
              0,
              Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            )
          : 0;

        const mappedDetail: TenantDetail = {
          id: tenantData.id,
          name: tenantData.name,
          plan: tenantData.plan,
          users_count: tenantData.users_count,
          projects_count: tenantData.projects_count,
          created_at: tenantData.created_at,
          subscription_start_date: tenantData.subscription_start_date,
          subscription_end_date: tenantData.subscription_end_date,
          is_custom_trial: tenantData.is_custom_trial,
          billing_amount: tenantData.billing_amount || 0,
          days_remaining: daysRemaining,
          business_number:
            (tenantAny.business_number as string | undefined) ||
            (tenantAny.businessNumber as string | undefined) ||
            "-",
          representative:
            (tenantAny.representative as string | undefined) || "미등록",
          rep_phone: (tenantAny.rep_phone as string | undefined) || "-",
          rep_email: (tenantAny.rep_email as string | undefined) || "-",
          contact_name: tenantAny.contact_name as string | undefined,
          contact_phone: tenantAny.contact_phone as string | undefined,
          contact_position: tenantAny.contact_position as string | undefined,
          payment_history:
            (tenantData.billing_amount || 0) > 0
              ? [
                  {
                    id: "p1",
                    date:
                      tenantData.subscription_start_date?.slice(0, 10) || "-",
                    amount: tenantData.billing_amount || 0,
                    status: "paid",
                  },
                ]
              : [],
          users: [],
          project_stats: {
            draft: 0,
            in_progress: 0,
            completed: tenantData.projects_count,
            total: tenantData.projects_count,
          },
          is_active: (tenantAny.is_active as boolean | undefined) ?? true,
          trial_override_enabled: tenantData.trial_override_enabled,
          trial_override_months: tenantData.trial_override_months,
          trial_override_reason: tenantData.trial_override_reason,
          effective_trial_enabled: tenantData.effective_trial_enabled,
          effective_trial_months: tenantData.effective_trial_months,
          trial_source: tenantData.trial_source,
        };

        setTenant(mappedDetail);
        setTrialEnabled(
          tenantData.trial_override_enabled ??
            tenantData.effective_trial_enabled ??
            false,
        );
        setTrialMonths(
          tenantData.trial_override_months ??
            tenantData.effective_trial_months ??
            1,
        );
        setTrialReason(tenantData.trial_override_reason || "");
      }
    } catch (err) {
      console.error("Failed to load tenant detail:", err);
      toast.error("고객사 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveTrialPolicy() {
    if (trialEnabled && trialMonths < 1) {
      toast.error("무료 체험 개월 수를 1 이상으로 입력해 주세요.");
      return;
    }

    setIsSavingTrialPolicy(true);
    try {
      const response = await api.setTenantTrialPolicy(tenantId, {
        trial_enabled: trialEnabled,
        trial_months: trialEnabled ? trialMonths : 0,
        reason: trialReason.trim() || undefined,
      });

      if (response.success) {
        toast.success("고객사 무료 체험 정책을 저장했어요.");
        setShowTrialPolicyModal(false);
        await loadTenantDetail();
      } else {
        toast.error(response.error?.message || "정책 저장에 실패했어요.");
      }
    } catch (err) {
      console.error("Failed to save tenant trial policy:", err);
      toast.error("정책 저장에 실패했어요.");
    } finally {
      setIsSavingTrialPolicy(false);
    }
  }

  async function toggleActiveStatus() {
    if (!tenant) return;

    const confirmed = await confirm({
      title: `정말 이 계정을 ${tenant.is_active ? "비활성화" : "활성화"}할까요?`,
      confirmLabel: tenant.is_active ? "비활성화" : "활성화",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    setTenant({ ...tenant, is_active: !tenant.is_active });
    toast.success(`계정을 ${tenant.is_active ? "비활성화" : "활성화"}했어요.`);
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <LoadingOverlay variant="inline" text="고객사 정보를 불러오는 중..." />
      </AdminLayout>
    );
  }

  if (!tenant) {
    return (
      <AdminLayout>
        <div className="py-12 text-center text-slate-500">
          고객사를 찾을 수 없어요
        </div>
      </AdminLayout>
    );
  }

  const plan = getPlanPresentation(tenant.plan);
  const trialSourceLabel = getTrialSourceLabel(tenant.trial_source);
  const trialOverrideSummary =
    tenant.trial_override_enabled == null
      ? "없음"
      : tenant.trial_override_enabled
        ? `${tenant.trial_override_months || 0}개월 제공`
        : "미제공";
  const remainingLabel =
    tenant.plan === "none"
      ? "요금제 미선택"
      : tenant.days_remaining > 0
        ? `${tenant.days_remaining}일`
        : "만료됨";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="mt-1 text-slate-500">고객사 상세 정보</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={tenant.is_active ? "destructive" : "primary"}
              onClick={toggleActiveStatus}
            >
              {tenant.is_active ? (
                <>
                  <ToggleLeft className="h-4 w-4" />
                  계정 비활성화
                </>
              ) : (
                <>
                  <ToggleRight className="h-4 w-4" />
                  계정 활성화
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">회사명</span>
                <span className="font-medium text-slate-900">{tenant.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">사업자번호</span>
                <span className="font-medium text-slate-900">
                  {tenant.business_number}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">가입일</span>
                <span className="font-medium text-slate-900">
                  {formatDate(tenant.created_at)}
                </span>
              </div>

              <div className="pt-2">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  대표자 정보
                </h4>
                <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">성함</span>
                    <span className="font-medium text-slate-900">
                      {tenant.representative}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">연락처</span>
                    <span className="font-medium text-slate-900">
                      {tenant.rep_phone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">이메일</span>
                    <span className="font-medium text-slate-900">
                      {tenant.rep_email}
                    </span>
                  </div>
                </div>
              </div>

              {tenant.contact_name && (
                <div className="pt-2">
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">
                    실무자 정보
                  </h4>
                  <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">성함</span>
                      <span className="font-medium text-slate-900">
                        {tenant.contact_name}
                      </span>
                    </div>
                    {tenant.contact_phone && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm text-slate-500">연락처</span>
                        <span className="font-medium text-slate-900">
                          {tenant.contact_phone}
                        </span>
                      </div>
                    )}
                    {tenant.contact_position && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm text-slate-500">직위</span>
                        <span className="font-medium text-slate-900">
                          {tenant.contact_position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>구독 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">요금제</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${plan.badgeClass}`}
                  >
                    {plan.label}
                  </span>
                  {tenant.is_custom_trial && (
                    <Badge variant="warning">개별 무료 체험</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">연간 요금</span>
                <span className="font-medium text-slate-900">
                  {tenant.plan === "none"
                    ? "미결제"
                    : plan.yearlyPrice === 0
                      ? "무료"
                      : `${plan.yearlyPrice.toLocaleString()}원`}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">구독 시작일</span>
                <span className="font-medium text-slate-900">
                  {tenant.subscription_start_date
                    ? tenant.subscription_start_date.slice(0, 10)
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">구독 만료일</span>
                <span className="font-medium text-slate-900">
                  {tenant.subscription_end_date
                    ? tenant.subscription_end_date.slice(0, 10)
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">남은 기간</span>
                <span
                  className={`font-medium ${
                    tenant.days_remaining <= 7 && tenant.plan !== "none"
                      ? "text-red-600"
                      : tenant.days_remaining <= 30 && tenant.plan !== "none"
                        ? "text-amber-600"
                        : "text-slate-900"
                  }`}
                >
                  {remainingLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">상태</span>
                <Badge variant={tenant.is_active ? "success" : "default"}>
                  {tenant.is_active ? "활성" : "비활성"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>무료 체험 정책</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">실효 정책</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {tenant.effective_trial_enabled
                        ? `${tenant.effective_trial_months || 0}개월 제공`
                        : "무료 체험 미제공"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      적용 기준: {trialSourceLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">개별 override</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {trialOverrideSummary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {tenant.trial_override_reason || "사유 없음"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowTrialPolicyModal(true)}
              >
                <Calendar className="h-4 w-4" />
                고객사 무료 체험 정책 설정
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>사용 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">사용자</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {tenant.users_count}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <FolderKanban className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">총 프로젝트</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {tenant.project_stats.total}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">진행중</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {tenant.project_stats.in_progress}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">완료</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {tenant.project_stats.completed}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>사용자 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {tenant.users.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  사용자가 없어요
                </p>
              ) : (
                tenant.users.map((user) => (
                  <MobileListCard
                    key={user.id}
                    title={user.name}
                    subtitle={user.email}
                    metadata={[
                      {
                        label: "역할",
                        value: roleLabels[user.role] || user.role,
                      },
                      { label: "전화", value: user.phone },
                    ]}
                  />
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">아이디</th>
                    <th className="pb-3 font-medium">이름</th>
                    <th className="pb-3 font-medium">연락처</th>
                    <th className="pb-3 font-medium">이메일</th>
                    <th className="pb-3 font-medium">역할</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4 text-sm text-slate-600">{user.id}</td>
                      <td className="py-4 font-medium text-slate-900">
                        {user.name}
                      </td>
                      <td className="py-4 text-slate-600">{user.phone}</td>
                      <td className="py-4 text-slate-600">{user.email}</td>
                      <td className="py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>결제 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {tenant.payment_history.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  결제 이력이 없어요
                </p>
              ) : (
                tenant.payment_history.map((payment) => (
                  <MobileListCard
                    key={payment.id}
                    title={payment.date}
                    metadata={[
                      {
                        label: "금액",
                        value: `${payment.amount.toLocaleString()}원`,
                      },
                    ]}
                    badge={
                      payment.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          결제 성공
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          결제 실패
                        </span>
                      )
                    }
                  />
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">일시</th>
                    <th className="pb-3 font-medium">금액</th>
                    <th className="pb-3 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.payment_history.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        결제 이력이 없어요
                      </td>
                    </tr>
                  ) : (
                    tenant.payment_history.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-4 text-slate-600">{payment.date}</td>
                        <td className="py-4 font-medium text-slate-900">
                          {payment.amount.toLocaleString()}원
                        </td>
                        <td className="py-4">
                          {payment.status === "paid" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              결제 성공
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                              <XCircle className="h-4 w-4" />
                              결제 실패
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showTrialPolicyModal}
        onClose={() => setShowTrialPolicyModal(false)}
        title="고객사 무료 체험 정책 설정"
        description="기본 정책보다 우선하는 고객사별 무료 체험 override를 설정합니다."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant={trialEnabled ? "primary" : "secondary"}
              onClick={() => setTrialEnabled(true)}
              className="w-full"
            >
              무료 체험 제공
            </Button>
            <Button
              variant={!trialEnabled ? "primary" : "secondary"}
              onClick={() => setTrialEnabled(false)}
              className="w-full"
            >
              무료 체험 미제공
            </Button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              무료 체험 개월 수
            </label>
            <PrimitiveInput
              type="number"
              min={1}
              max={24}
              value={String(trialMonths)}
              onChange={(event) =>
                setTrialMonths(Math.max(1, Number(event.target.value) || 1))
              }
              disabled={!trialEnabled}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              1개월 단위로 입력하며 최대 24개월까지 지원합니다.
            </p>
          </div>

          <Textarea
            label="사유 (선택)"
            value={trialReason}
            onChange={(event) => setTrialReason(event.target.value)}
            placeholder="예: 파트너십 계약, 온보딩 지원, 데모 연장"
            rows={3}
          />
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowTrialPolicyModal(false)}
            className="flex-1"
            disabled={isSavingTrialPolicy}
          >
            취소
          </Button>
          <Button
            onClick={handleSaveTrialPolicy}
            className="flex-1"
            disabled={isSavingTrialPolicy}
          >
            {isSavingTrialPolicy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
