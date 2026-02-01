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

interface TossPaymentsInstance {
  requestPayment: (method: string, options: PaymentRequest) => Promise<void>;
}

/**
 * Toss Payments SDK 통합을 위한 커스텀 훅
 *
 * 주의: 실제 SDK 통합을 위해서는:
 * 1. Toss Payments 클라이언트 키 발급 필요
 * 2. SDK 스크립트 로드 필요
 * 3. 환경변수에 NEXT_PUBLIC_TOSS_CLIENT_KEY 설정 필요
 */
export function useTossPayments() {
  const [tossPayments, setTossPayments] = useState<TossPaymentsInstance | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // TODO: 실제 Toss Payments SDK 로드
    // const loadTossPayments = async () => {
    //   try {
    //     const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    //     if (!clientKey) {
    //       console.error("NEXT_PUBLIC_TOSS_CLIENT_KEY is not set");
    //       return;
    //     }
    //
    //     // SDK 로드 예시:
    //     // const tossPayments = await loadTossPayments(clientKey);
    //     // setTossPayments(tossPayments);
    //     // setIsLoaded(true);
    //   } catch (error) {
    //     console.error("Failed to load Toss Payments SDK:", error);
    //   }
    // };
    //
    // loadTossPayments();

    // Mock implementation for development
    const mockTossPayments: TossPaymentsInstance = {
      requestPayment: async (method: string, options: PaymentRequest) => {
        console.log("Mock Toss Payments Request:", { method, options });

        // 개발 환경에서는 바로 성공 페이지로 리다이렉트
        const mockPaymentKey = `mock_payment_${Date.now()}`;
        const successUrl = new URL(options.successUrl);
        successUrl.searchParams.set("paymentKey", mockPaymentKey);
        successUrl.searchParams.set("orderId", options.orderId);
        successUrl.searchParams.set("amount", options.amount.toString());

        window.location.href = successUrl.toString();
      },
    };

    setTossPayments(mockTossPayments);
    setIsLoaded(true);
  }, []);

  const requestPayment = async (options: PaymentRequest) => {
    if (!isLoaded || !tossPayments) {
      throw new Error("Toss Payments SDK is not loaded");
    }

    try {
      // 기본 결제 수단은 카드
      await tossPayments.requestPayment("카드", options);
    } catch (error) {
      console.error("Payment request failed:", error);
      throw error;
    }
  };

  return {
    isLoaded,
    requestPayment,
  };
}
