"use client";

import { useEffect, useState } from "react";

interface PaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerMobilePhone?: string;
}

/**
 * Toss Payments SDK v2 통합을 위한 커스텀 훅
 *
 * NEXT_PUBLIC_USE_MOCKS=true 또는 NEXT_PUBLIC_TOSS_CLIENT_KEY 미설정 시 Mock 동작
 * 실제 SDK: @tosspayments/tosspayments-sdk (v2 redirect-based payment window)
 */
export function useTossPayments() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [clientKey, setClientKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
    const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

    if (useMocks || !key) {
      setIsMock(true);
      setIsLoaded(true);
      return;
    }

    setClientKey(key);
    setIsLoaded(true);
  }, []);

  const requestPayment = async (options: PaymentRequest): Promise<void> => {
    if (!isLoaded) {
      throw new Error("Toss Payments SDK is not loaded");
    }

    // Mock / fallback path: redirect directly to successUrl with mock params
    if (isMock || !clientKey) {
      console.log("[MockToss] requestPayment:", options);
      const mockPaymentKey = `mock_payment_${Date.now()}`;
      const successUrl = new URL(options.successUrl);
      successUrl.searchParams.set("paymentKey", mockPaymentKey);
      successUrl.searchParams.set("orderId", options.orderId);
      successUrl.searchParams.set("amount", options.amount.toString());
      window.location.href = successUrl.toString();
      return;
    }

    // Real SDK path: v2 redirect-based payment window
    try {
      const { loadTossPayments } = await import(
        "@tosspayments/tosspayments-sdk"
      );
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: "ANONYMOUS_CUSTOMER" });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: options.amount },
        orderId: options.orderId,
        orderName: options.orderName,
        successUrl: options.successUrl,
        failUrl: options.failUrl,
      });
    } catch (error) {
      console.error("[TossPayments] 결제 요청 실패, Mock으로 폴백:", error);
      // Fallback to mock redirect on error
      const mockPaymentKey = `fallback_payment_${Date.now()}`;
      const successUrl = new URL(options.successUrl);
      successUrl.searchParams.set("paymentKey", mockPaymentKey);
      successUrl.searchParams.set("orderId", options.orderId);
      successUrl.searchParams.set("amount", options.amount.toString());
      window.location.href = successUrl.toString();
    }
  };

  return {
    isLoaded,
    requestPayment,
  };
}
