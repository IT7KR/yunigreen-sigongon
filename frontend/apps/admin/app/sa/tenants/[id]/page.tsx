"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LoadingOverlay, Modal, PrimitiveInput, Textarea, formatDate, toast, useConfirmDialog } from "@sigongon/ui";
import {
  Building2,
  Users,
  FolderKanban,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";


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
  plan: "trial" | "basic" | "pro";
  users_count: number;
  projects_count: number;
  created_at: string;
  // 구독 관련 필드
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
}

const planConfig: Record<
  "trial" | "basic" | "pro",
  { label: string; yearlyPrice: number }
> = {
  trial: { label: "무료 체험", yearlyPrice: 0 },
  basic: { label: "Basic", yearlyPrice: 588000 },
  pro: { label: "Pro", yearlyPrice: 1188000 },
};

const roleLabels: Record<string, string> = {
  super_admin: "슈퍼관리자",
  company_admin: "대표",
  site_manager: "현장소장",
  worker: "근로자",
  admin: "관리자",
  manager: "매니저",
};

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 커스텀 무료 기간 설정 상태
  const [showCustomTrialModal, setShowCustomTrialModal] = useState(false);
  const [customEndDate, setCustomEndDate] = useState("");
  const [customTrialReason, setCustomTrialReason] = useState("");
  const [isSettingCustomTrial, setIsSettingCustomTrial] = useState(false);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    loadTenantDetail();
  }, [tenantId]);

  async function loadTenantDetail() {
    try {
      setIsLoading(true);
      const response = await api.getTenant(tenantId);

      if (response.success && response.data) {
        const tenantData = response.data;
        const tenantAny = tenantData as any;
        // 남은 일수 계산
        const now = new Date();
        const endDate = new Date(tenantData.subscription_end_date);
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // API가 상세 필드를 제공하지 않는 경우를 고려한 안전 매핑
        const mappedDetail: TenantDetail = {
          id: tenantData.id,
          name: tenantData.name,
          plan: tenantData.plan as "trial" | "basic" | "pro",
          users_count: tenantData.users_count,
          projects_count: tenantData.projects_count,
          created_at: tenantData.created_at,
          subscription_start_date: tenantData.subscription_start_date,
          subscription_end_date: tenantData.subscription_end_date,
          is_custom_trial: tenantData.is_custom_trial,
          billing_amount: tenantData.billing_amount || 0,
          days_remaining: daysRemaining,
          business_number:
            tenantAny.business_number || tenantAny.businessNumber || "-",
          representative: tenantAny.representative || "미등록",
          rep_phone: tenantAny.rep_phone || "-",
          rep_email: tenantAny.rep_email || "-",
          contact_name: tenantAny.contact_name,
          contact_phone: tenantAny.contact_phone,
          contact_position: tenantAny.contact_position,
          payment_history: (tenantData.billing_amount || 0) > 0 ? [
            {
              id: "p1",
              date: tenantData.subscription_start_date?.slice(0, 10) || "-",
              amount: tenantData.billing_amount || 0,
              status: "paid" as const,
            },
          ] : [],
          users: [],
          project_stats: {
            draft: 0,
            in_progress: 0,
            completed: tenantData.projects_count,
            total: tenantData.projects_count,
          },
          is_active: tenantAny.is_active ?? true,
        };
        setTenant(mappedDetail);
      }
    } catch (err) {
      console.error("Failed to load tenant detail:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetCustomTrial() {
    if (!customEndDate) {
      toast.error("종료일을 선택해 주세요");
      return;
    }

    setIsSettingCustomTrial(true);
    try {
      const response = await api.setCustomTrialPeriod(tenantId, {
        end_date: new Date(customEndDate).toISOString(),
        reason: customTrialReason,
      });

      if (response.success) {
        toast.success("커스텀 무료 기간이 설정되었어요");
        setShowCustomTrialModal(false);
        setCustomEndDate("");
        setCustomTrialReason("");
        loadTenantDetail(); // 리로드
      } else {
        toast.error(response.error?.message || "설정에 실패했어요");
      }
    } catch (err) {
      console.error("Failed to set custom trial:", err);
      toast.error("설정에 실패했어요");
    } finally {
      setIsSettingCustomTrial(false);
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

    // Mock toggle
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

  const plan = planConfig[tenant.plan];

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
              {tenant.is_active ? <><ToggleLeft className="h-4 w-4" />계정 비활성화</> : <><ToggleRight className="h-4 w-4" />계정 활성화</>}
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
                <span className="font-medium text-slate-900">
                  {tenant.name}
                </span>
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
                <h4 className="mb-3 text-sm font-semibold text-slate-700">대표자 정보</h4>
                <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">성함</span>
                    <span className="font-medium text-slate-900">{tenant.representative}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">연락처</span>
                    <span className="font-medium text-slate-900">{tenant.rep_phone}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm text-slate-500">이메일</span>
                    <span className="font-medium text-slate-900">{tenant.rep_email}</span>
                  </div>
                </div>
              </div>

              {tenant.contact_name && (
                <div className="pt-2">
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">실무자 정보</h4>
                  <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">성함</span>
                      <span className="font-medium text-slate-900">{tenant.contact_name}</span>
                    </div>
                    {tenant.contact_phone && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm text-slate-500">연락처</span>
                        <span className="font-medium text-slate-900">{tenant.contact_phone}</span>
                      </div>
                    )}
                    {tenant.contact_position && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm text-slate-500">직위</span>
                        <span className="font-medium text-slate-900">{tenant.contact_position}</span>
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
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      tenant.plan === "pro"
                        ? "bg-purple-100 text-purple-700"
                        : tenant.plan === "basic"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {plan.label}
                  </span>
                  {tenant.is_custom_trial && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      커스텀 무료
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">연간 요금</span>
                <span className="font-medium text-slate-900">
                  {tenant.is_custom_trial ? "무료" : `${plan.yearlyPrice.toLocaleString()}원`}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">구독 시작일</span>
                <span className="font-medium text-slate-900">
                  {tenant.subscription_start_date?.slice(0, 10) || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">구독 만료일</span>
                <span className="font-medium text-slate-900">
                  {tenant.subscription_end_date?.slice(0, 10) || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">남은 기간</span>
                <span className={`font-medium ${tenant.days_remaining <= 7 ? "text-red-600" : tenant.days_remaining <= 30 ? "text-amber-600" : "text-slate-900"}`}>
                  {tenant.days_remaining > 0 ? `${tenant.days_remaining}일` : "만료됨"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">상태</span>
                <Badge variant={tenant.is_active ? "success" : "default"}>
                  {tenant.is_active ? "활성" : "비활성"}
                </Badge>
              </div>

              {/* 커스텀 무료 기간 설정 버튼 */}
              <div className="pt-4 border-t border-slate-100">
                <Button
                  variant="secondary"
                  onClick={() => setShowCustomTrialModal(true)}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4" />커스텀 무료 기간 설정
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>사용 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle>사용자 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                      <td className="py-4 text-sm text-slate-600">
                        {user.id}
                      </td>
                      <td className="py-4 font-medium text-slate-900">
                        {user.name}
                      </td>
                      <td className="py-4 text-slate-600">
                        {user.phone}
                      </td>
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
            <div className="overflow-x-auto">
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
                      <td colSpan={3} className="py-6 text-center text-sm text-slate-400">
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

      {/* 커스텀 무료 기간 설정 모달 */}
      <Modal
        isOpen={showCustomTrialModal}
        onClose={() => {
          setShowCustomTrialModal(false);
          setCustomEndDate("");
          setCustomTrialReason("");
        }}
        title="커스텀 무료 기간 설정"
        description="이 고객사에 특별 무료 이용 기간을 부여합니다. 설정 시 기존 결제 금액과 관계없이 무료로 전환됩니다."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              종료일 <span className="text-red-500">*</span>
            </label>
            <PrimitiveInput
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            />
          </div>
          <Textarea
            label="사유 (선택)"
            value={customTrialReason}
            onChange={(e) => setCustomTrialReason(e.target.value)}
            placeholder="예: 파트너십 계약, 데모 기간 연장 등"
            rows={3}
          />
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCustomTrialModal(false);
              setCustomEndDate("");
              setCustomTrialReason("");
            }}
            className="flex-1"
            disabled={isSettingCustomTrial}
          >
            <X className="h-4 w-4" />취소
          </Button>
          <Button
            onClick={handleSetCustomTrial}
            className="flex-1"
            disabled={isSettingCustomTrial || !customEndDate}
          >
            {isSettingCustomTrial ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                적용 중...
              </>
            ) : (
              <><Check className="h-4 w-4" />적용</>
            )}
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
