"use client";

import { Card, CardContent, Button } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentKey || !orderId || !amount) {
        setError("결제 정보가 올바르지 않습니다.");
        setIsConfirming(false);
        return;
      }

      try {
        const response = await api.confirmPayment({
          payment_key: paymentKey,
          order_id: orderId,
          amount: parseInt(amount, 10),
        });

        if (response.success) {
          setIsConfirming(false);
        } else {
          setError(response.error?.message || "결제 승인에 실패했습니다.");
          setIsConfirming(false);
        }
      } catch (err) {
        console.error("결제 승인 오류:", err);
        setError("결제 승인 중 오류가 발생했습니다.");
        setIsConfirming(false);
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  if (isConfirming) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-point-500"></div>
          <p className="text-slate-600">결제를 승인하는 중입니다...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <span className="text-3xl">✕</span>
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                결제 승인 실패
              </h2>
              <p className="mb-6 text-slate-600">{error}</p>
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => router.push("/billing")}
                >
                  결제 관리로 이동
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => router.push("/billing/checkout")}
                >
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900">
              결제가 완료되었습니다
            </h2>
            <p className="mb-6 text-slate-600">
              구독이 활성화되었습니다. 이제 모든 기능을 사용하실 수 있습니다.
            </p>

            <div className="mb-6 space-y-2 rounded-lg bg-slate-50 p-4 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">주문번호</span>
                <span className="font-medium text-slate-900">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">결제금액</span>
                <span className="font-medium text-slate-900">
                  {parseInt(amount || "0", 10).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">결제수단</span>
                <span className="font-medium text-slate-900">
                  토스페이먼츠
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => router.push("/billing")}
              >
                결제 내역 확인
              </Button>
              <Button className="flex-1" onClick={() => router.push("/")}>
                대시보드로 이동
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            • 결제 영수증은 이메일로 발송됩니다.
            <br />
            • 구독 기간은 결제일로부터 1년간입니다.
            <br />• 결제 관련 문의사항은 고객센터로 연락주세요.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function SuccessPage() {
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
      <SuccessContent />
    </Suspense>
  );
}
