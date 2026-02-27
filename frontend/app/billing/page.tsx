"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  toast,
} from "@sigongon/ui";
import { CheckCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PlanSelector } from "@/components/PlanSelector";

interface BillingOverview {
  plan: string;
  subscription_start_date?: string;
  subscription_end_date: string;
  days_remaining: number;
  is_custom_trial: boolean;
  billing_amount: number;
  seats_used: number;
  seats_total: number;
  /** 변경 예약된 플랜 (현재 구독 종료 후 적용) */
  scheduled_plan?: string | null;
  scheduled_plan_date?: string | null;
  history: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    status: "paid" | "failed";
  }>;
}

const initialOverview: BillingOverview = {
  plan: "",
  subscription_start_date: "",
  subscription_end_date: "",
  days_remaining: 0,
  is_custom_trial: false,
  billing_amount: 0,
  seats_used: 0,
  seats_total: 0,
  scheduled_plan: null,
  scheduled_plan_date: null,
  history: [],
};

export default function BillingPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<BillingOverview>(initialOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.getBillingOverview();
        if (response.success && response.data) {
          setOverview({
            ...initialOverview,
            ...response.data,
          });
          // 구독이 없으면 플랜 선택 표시
          if (!response.data.plan || response.data.plan === "무료 체험") {
            setShowPlanSelector(true);
          }
        }
      } catch (err) {
        console.error("결제 정보 불러오기 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePlanSelect = (plan: "STARTER" | "STANDARD" | "PREMIUM") => {
    router.push(`/billing/checkout?plan=${plan}`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">불러오는 중...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">결제 및 구독</h1>

        {showPlanSelector ? (
          <div>
            <p className="mb-6 text-slate-600">
              서비스를 계속 이용하시려면 플랜을 선택해주세요.
            </p>
            <PlanSelector
              currentPlan={null}
              onSelectPlan={handlePlanSelect}
            />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>현재 플랜</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {overview.plan || "무료 체험"}
                    </span>
                    {overview.is_custom_trial && (
                      <Badge variant="warning">커스텀 무료</Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-500">
                      구독 만료일:{" "}
                      {overview.subscription_end_date
                        ? overview.subscription_end_date.slice(0, 10)
                        : "-"}
                    </p>
                    <p className="text-sm font-medium text-brand-point-600">
                      {overview.days_remaining > 0
                        ? `${overview.days_remaining}일 남음`
                        : overview.days_remaining === 0
                          ? "오늘 만료"
                          : "만료됨"}
                    </p>
                  </div>
                  {overview.billing_amount > 0 && (
                    <p className="mt-2 text-slate-500">
                      연간 요금: ₩{overview.billing_amount.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>사용자 좌석</span>
                    <span className="font-medium">
                      {overview.seats_used} /{" "}
                      {overview.seats_total === 999
                        ? "무제한"
                        : `${overview.seats_total}석`}
                    </span>
                  </div>
                  {overview.seats_total !== 999 && (
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-brand-point-500"
                        style={{
                          width:
                            overview.seats_total === 0
                              ? "0%"
                              : `${Math.min(100, Math.round((overview.seats_used / overview.seats_total) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                {overview.scheduled_plan && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-800">
                      플랜 변경 예약됨
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      현재 구독 종료 후 <strong>{overview.scheduled_plan}</strong> 플랜으로 변경됩니다.
                      {overview.scheduled_plan_date && (
                        <span> (적용일: {overview.scheduled_plan_date.slice(0, 10)})</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setShowPlanSelector(true)}>
                    <RefreshCw className="h-4 w-4" />
                    {overview.scheduled_plan ? "예약 변경" : "플랜 변경"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {showPlanSelector && (
              <Card>
                <CardHeader>
                  <CardTitle>플랜 선택</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlanSelector
                    currentPlan={overview.plan}
                    onSelectPlan={handlePlanSelect}
                    scheduledPlan={overview.scheduled_plan}
                    reservationMode={!!overview.plan && overview.plan !== "무료 체험"}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>결제 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <th className="pb-3 font-medium">일시</th>
                        <th className="pb-3 font-medium">내용</th>
                        <th className="pb-3 font-medium">금액</th>
                        <th className="pb-3 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.history.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-6 text-center text-sm text-slate-400"
                          >
                            결제 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        overview.history.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-4 text-slate-500">{item.date}</td>
                            <td className="py-4 text-slate-900">
                              {item.description}
                            </td>
                            <td className="py-4 text-slate-900">
                              {item.amount.toLocaleString()}원
                            </td>
                            <td className="py-4">
                              <span
                                className={`flex items-center gap-1 text-sm font-medium ${
                                  item.status === "paid"
                                    ? "text-brand-point-600"
                                    : "text-red-600"
                                }`}
                              >
                                <CheckCircle className="h-3 w-3" />
                                {item.status === "paid"
                                  ? "결제 성공"
                                  : "결제 실패"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
