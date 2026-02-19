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
 * NEXT_PUBLIC_USE_MOCKS=true 또는 NEXT_PUBLIC_TOSS_CLIENT_KEY 미설정 시 Mock 동작
 * 실제 SDK: @tosspayments/payment-widget-sdk
 */
export function useTossPayments() {
  const [tossPayments, setTossPayments] = useState<TossPaymentsInstance | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

    if (useMocks || !clientKey) {
      // Mock implementation for development
      const mockTossPayments: TossPaymentsInstance = {
        requestPayment: async (method: string, options: PaymentRequest) => {
          console.log("[MockToss] requestPayment:", { method, options });
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
      return;
    }

    // Real SDK loading
    const loadRealSDK = async () => {
      try {
        // Dynamic import to avoid issues if package isn't installed yet
        const { loadPaymentWidget, ANONYMOUS } = await import(
          "@tosspayments/payment-widget-sdk"
        );
        // Use ANONYMOUS customer key for guest checkout
        const sdk = await loadPaymentWidget(clientKey, ANONYMOUS);
        // Wrap the SDK instance to match our interface
        const wrapper: TossPaymentsInstance = {
          requestPayment: async (_method: string, options: PaymentRequest) => {
            // Payment Widget SDK handles method selection in its UI
            // Map our PaymentRequest to SDK's PaymentInfo shape
            await sdk.requestPayment({
              orderId: options.orderId,
              orderName: options.orderName,
              customerName: options.customerName,
              customerEmail: options.customerEmail,
              customerMobilePhone: options.customerMobilePhone,
              successUrl: options.successUrl,
              failUrl: options.failUrl,
            });
          },
        };
        setTossPayments(wrapper);
        setIsLoaded(true);
      } catch (error) {
        console.error("[TossPayments] SDK 로드 실패, Mock으로 폴백:", error);
        // Fallback to mock on error
        const mockFallback: TossPaymentsInstance = {
          requestPayment: async (_method: string, options: PaymentRequest) => {
            const mockPaymentKey = `fallback_payment_${Date.now()}`;
            const successUrl = new URL(options.successUrl);
            successUrl.searchParams.set("paymentKey", mockPaymentKey);
            successUrl.searchParams.set("orderId", options.orderId);
            successUrl.searchParams.set("amount", options.amount.toString());
            window.location.href = successUrl.toString();
          },
        };
        setTossPayments(mockFallback);
        setIsLoaded(true);
      }
    };

    loadRealSDK();
  }, []);

  const requestPayment = async (options: PaymentRequest) => {
    if (!isLoaded || !tossPayments) {
      throw new Error("Toss Payments SDK is not loaded");
    }
    try {
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
