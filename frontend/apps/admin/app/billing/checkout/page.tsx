"use client";

import { Card, CardContent, CardHeader, CardTitle, Button } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useTossPayments } from "@/hooks/useTossPayments";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") as "STARTER" | "STANDARD" | "PREMIUM" | null;
  const [isProcessing, setIsProcessing] = useState(false);
  const { requestPayment } = useTossPayments();

  const planDetails: Record<
    "STARTER" | "STANDARD" | "PREMIUM",
    { name: string; price: number; description: string }
  > = {
    STARTER: {
      name: "스타터",
      price: 99000,
      description: "소규모 프로젝트에 적합한 기본 플랜",
    },
    STANDARD: {
      name: "스탠다드",
      price: 199000,
      description: "중소규모 프로젝트를 위한 추천 플랜",
    },
    PREMIUM: {
      name: "프리미엄",
      price: 399000,
      description: "대규모 프로젝트를 위한 완전한 솔루션",
    },
  };

  if (!plan || !planDetails[plan]) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-slate-600">
            플랜이 선택되지 않았습니다.
          </p>
          <Button onClick={() => router.push("/billing")}>
            플랜 선택하러 가기
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const selectedPlan = planDetails[plan];
  const orderId = `ORDER_${Date.now()}_${plan}`;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await requestPayment({
        amount: selectedPlan.price,
        orderId,
        orderName: `${selectedPlan.name} 플랜 연간 구독`,
        customerName: "구독자",
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch (error) {
      console.error("결제 요청 실패:", error);
      alert("결제 요청에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">결제하기</h1>
          <p className="mt-2 text-slate-600">
            선택하신 플랜의 결제를 진행합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>주문 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedPlan.name} 플랜
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedPlan.description}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  주문번호: {orderId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {selectedPlan.price.toLocaleString()}원
                </p>
                <p className="text-sm text-slate-500">연간 결제</p>
              </div>
            </div>

            <div className="space-y-2 border-b border-slate-200 pb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">소계</span>
                <span className="text-slate-900">
                  {selectedPlan.price.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">부가세 (VAT)</span>
                <span className="text-slate-900">포함</span>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-lg font-semibold text-slate-900">
                총 결제금액
              </span>
              <span className="text-2xl font-bold text-brand-point-600">
                {selectedPlan.price.toLocaleString()}원
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                토스페이먼츠를 통해 안전하게 결제하실 수 있습니다.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                신용카드, 체크카드, 계좌이체 등 다양한 결제 수단을 지원합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => router.push("/billing")}
            disabled={isProcessing}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? "처리 중..." : "결제하기"}
          </Button>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            • 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
            <br />
            • 구독은 결제일로부터 1년간 유효합니다.
            <br />
            • 환불 정책은 이용약관을 참고해주세요.
            <br />• 결제 관련 문의사항은 고객센터로 연락주세요.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500">불러오는 중...</p>
          </div>
        </AdminLayout>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
