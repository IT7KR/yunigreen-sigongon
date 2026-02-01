"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Stepper } from "@sigongon/ui";
import { Droplets, Lock, AlertCircle } from "lucide-react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import {
  STEPS,
  PLANS,
  getSignupData,
  saveSignupData,
  type SignupData,
} from "../types";

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

// CSS selectors for widget containers
const PAYMENT_METHODS_SELECTOR = "#payment-methods";
const AGREEMENT_SELECTOR = "#payment-agreement";

function generateOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateCustomerKey() {
  // In production, this should be a unique user identifier
  return `customer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function PaymentPage() {
  const router = useRouter();
  const [data, setData] = useState<Partial<SignupData>>({});
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);

  useEffect(() => {
    const stored = getSignupData();

    // Redirect if previous steps not completed or trial plan
    if (!stored.email || !stored.businessVerified || !stored.planType) {
      router.push("/signup");
      return;
    }

    if (stored.planType === "trial") {
      router.push("/signup/complete");
      return;
    }

    setData(stored);
  }, [router]);

  const selectedPlan = PLANS.find((p) => p.id === data.planType);
  const price = selectedPlan?.price || 0;

  // Initialize TossPayments widget
  useEffect(() => {
    if (!price || price === 0) return;

    const initWidget = async () => {
      try {
        const customerKey = generateCustomerKey();
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
        paymentWidgetRef.current = paymentWidget;

        // Render payment methods widget using CSS selector
        await paymentWidget.renderPaymentMethods(
          PAYMENT_METHODS_SELECTOR,
          { value: price, currency: "KRW", country: "KR" },
        );

        // Render agreement widget using CSS selector
        await paymentWidget.renderAgreement(AGREEMENT_SELECTOR, {
          variantKey: "AGREEMENT",
        });

        setWidgetReady(true);
      } catch (err) {
        console.error("Failed to initialize payment widget:", err);
        setError("결제 모듈 로드에 실패했습니다. 페이지를 새로고침 해주세요.");
      }
    };

    initWidget();
  }, [price]);

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || !selectedPlan || !price) {
      setError("결제 모듈이 준비되지 않았습니다.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const orderId = generateOrderId();
      const orderName = `시공ON ${selectedPlan.name} 연간 구독`;

      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}/signup/payment/success`,
        failUrl: `${window.location.origin}/signup/payment/fail`,
        customerEmail: data.email,
        customerName: data.companyName || data.representativeName,
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "USER_CANCEL") {
        // User cancelled the payment
        setError(null);
      } else {
        console.error("Payment request failed:", err);
        setError("결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    saveSignupData(data);
    router.push("/signup/plan");
  };

  const formatPrice = (p: number) => {
    return p.toLocaleString("ko-KR");
  };

  const monthlyEquivalent = price ? Math.floor(price / 12) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-2xl p-6 md:p-8">
        <Stepper steps={STEPS} currentStep={4} className="mb-8" />

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">결제 정보 입력</h1>
          <p className="mt-2 text-slate-600">
            안전한 결제를 위해 결제 수단을 선택해주세요
          </p>
        </div>

        <div className="space-y-6">
          {/* Plan Summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 font-semibold text-slate-900">선택한 요금제</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{selectedPlan?.name}</p>
                <p className="text-sm text-slate-600">연간 결제</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">
                  ₩{formatPrice(price)}
                  <span className="text-sm font-normal text-slate-600">/년</span>
                </p>
                <p className="text-sm text-slate-500">
                  월 ₩{formatPrice(monthlyEquivalent)} 환산
                </p>
              </div>
            </div>
          </div>

          {/* Payment Security Notice */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">안전한 결제</p>
              <p className="mt-1 text-xs text-blue-700">
                모든 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
              </p>
            </div>
          </div>

          {/* TossPayments Widget Container */}
          <div className="space-y-4">
            <div
              id="payment-methods"
              className="min-h-[200px] rounded-lg border border-slate-200"
            />
            <div id="payment-agreement" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              fullWidth
              size="lg"
              className="flex-1"
              disabled={processing}
            >
              이전
            </Button>
            <Button
              onClick={handlePayment}
              fullWidth
              size="lg"
              className="flex-1"
              disabled={processing || !widgetReady}
            >
              {processing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  결제 처리중...
                </>
              ) : (
                `₩${formatPrice(price || 0)} 결제하기`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
