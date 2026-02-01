"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  formatDate,
} from "@sigongon/ui";
import {
  Building2,
  Users,
  FolderKanban,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { SANav } from "../../components/SANav";

interface TenantDetail {
  id: string;
  name: string;
  business_number: string;
  representative: string;
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

  useEffect(() => {
    loadTenantDetail();
  }, [tenantId]);

  async function loadTenantDetail() {
    try {
      setIsLoading(true);
      const response = await api.getTenant(tenantId);

      if (response.success && response.data) {
        // 남은 일수 계산
        const now = new Date();
        const endDate = new Date(response.data.subscription_end_date);
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Mock extended data for SA detail view
        const mockDetail: TenantDetail = {
          id: response.data.id,
          name: response.data.name,
          plan: response.data.plan as "trial" | "basic" | "pro",
          users_count: response.data.users_count,
          projects_count: response.data.projects_count,
          created_at: response.data.created_at,
          subscription_start_date: response.data.subscription_start_date,
          subscription_end_date: response.data.subscription_end_date,
          is_custom_trial: response.data.is_custom_trial,
          billing_amount: response.data.billing_amount || 0,
          days_remaining: daysRemaining,
          business_number: "123-45-67890",
          representative: "홍길동",
          payment_history: (response.data.billing_amount || 0) > 0 ? [
            {
              id: "p1",
              date: response.data.subscription_start_date?.slice(0, 10) || "2026-01-24",
              amount: response.data.billing_amount || 0,
              status: "paid" as const,
            },
          ] : [],
          users: [
            {
              id: "u1",
              name: "이중호",
              email: "admin@sigongon.com",
              role: "admin",
              last_login_at: "2026-01-24T10:30:00Z",
            },
            {
              id: "u2",
              name: "김대표",
              email: "ceo@partner.com",
              role: "manager",
              last_login_at: "2026-01-23T15:20:00Z",
            },
          ],
          project_stats: {
            draft: 3,
            in_progress: 5,
            completed: 4,
            total: 12,
          },
          is_active: true,
        };
        setTenant(mockDetail);
      }
    } catch (err) {
      console.error("Failed to load tenant detail:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetCustomTrial() {
    if (!customEndDate) {
      alert("종료일을 선택해 주세요");
      return;
    }

    setIsSettingCustomTrial(true);
    try {
      const response = await api.setCustomTrialPeriod(tenantId, {
        end_date: new Date(customEndDate).toISOString(),
        reason: customTrialReason,
      });

      if (response.success) {
        alert("커스텀 무료 기간이 설정되었어요");
        setShowCustomTrialModal(false);
        setCustomEndDate("");
        setCustomTrialReason("");
        loadTenantDetail(); // 리로드
      } else {
        alert(response.error?.message || "설정에 실패했어요");
      }
    } catch (err) {
      console.error("Failed to set custom trial:", err);
      alert("설정에 실패했어요");
    } finally {
      setIsSettingCustomTrial(false);
    }
  }

  async function toggleActiveStatus() {
    if (!tenant) return;

    if (
      !confirm(
        `정말 이 계정을 ${tenant.is_active ? "비활성화" : "활성화"}할까요?`,
      )
    ) {
      return;
    }

    // Mock toggle
    setTenant({ ...tenant, is_active: !tenant.is_active });
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
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
              {tenant.is_active ? "계정 비활성화" : "계정 활성화"}
            </Button>
          </div>
        </div>

        <SANav />

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
                <span className="text-sm text-slate-500">대표자</span>
                <span className="font-medium text-slate-900">
                  {tenant.representative}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">가입일</span>
                <span className="font-medium text-slate-900">
                  {formatDate(tenant.created_at)}
                </span>
              </div>
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
                  커스텀 무료 기간 설정
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
                    <th className="pb-3 font-medium">이름</th>
                    <th className="pb-3 font-medium">이메일</th>
                    <th className="pb-3 font-medium">역할</th>
                    <th className="pb-3 font-medium">마지막 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4 font-medium text-slate-900">
                        {user.name}
                      </td>
                      <td className="py-4 text-slate-600">{user.email}</td>
                      <td className="py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 text-slate-500">
                        {user.last_login_at
                          ? formatDate(user.last_login_at)
                          : "-"}
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
      {showCustomTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              커스텀 무료 기간 설정
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              이 고객사에 특별 무료 이용 기간을 부여합니다.
              설정 시 기존 결제 금액과 관계없이 무료로 전환됩니다.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  종료일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  사유 (선택)
                </label>
                <textarea
                  value={customTrialReason}
                  onChange={(e) => setCustomTrialReason(e.target.value)}
                  placeholder="예: 파트너십 계약, 데모 기간 연장 등"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
                />
              </div>
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
                취소
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
                  "적용"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
