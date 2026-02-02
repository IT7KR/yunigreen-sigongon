"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@sigongon/ui";
import { Droplets, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { getSignupData, clearSignupData, saveSignupData } from "../../types";
import { api } from "@/lib/api";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");

      if (!paymentKey || !orderId || !amount) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다.");
        return;
      }

      try {
        // Confirm payment with backend
        const response = await api.confirmPayment({
          payment_key: paymentKey,
          order_id: orderId,
          amount: parseInt(amount, 10),
        });

        if (response.success) {
          // Get signup data and complete registration
          const signupData = getSignupData();

          if (signupData.email && signupData.companyName && signupData.businessNumber) {
            const registerResponse = await api.register({
              username: signupData.email,
              email: signupData.email,
              password: signupData.password,
              phone: signupData.phone,
              company_name: signupData.companyName,
              business_number: signupData.businessNumber.replace(/-/g, ""),
              representative_name: signupData.companyName,
              rep_phone: signupData.phone,
              rep_email: signupData.email,
              plan: signupData.planType,
            });

            if (registerResponse.success && registerResponse.data) {
              // Save access token to signup data for auto-login on complete page
              saveSignupData({
                accessToken: registerResponse.data.access_token,
                paymentCompleted: true
              });
              setStatus("success");
              // Redirect to complete page after short delay
              setTimeout(() => {
                router.push("/signup/complete");
              }, 2000);
            } else {
              setStatus("error");
              setErrorMessage("회원가입 처리 중 오류가 발생했습니다.");
            }
          } else {
            // If signup data is missing, still mark as success but redirect to complete
            setStatus("success");
            setTimeout(() => {
              router.push("/signup/complete");
            }, 2000);
          }
        } else {
          setStatus("error");
          setErrorMessage("결제 확인 중 오류가 발생했습니다.");
        }
      } catch (err) {
        console.error("Payment confirmation failed:", err);
        setStatus("error");
        setErrorMessage("결제 처리 중 오류가 발생했습니다.");
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-point-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            결제 확인 중...
          </h1>
          <p className="mt-2 text-slate-600">
            잠시만 기다려 주세요.
          </p>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
            <Droplets className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900">시공ON</span>
        </Link>

        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            결제 확인 실패
          </h1>
          <p className="mt-2 text-slate-600">
            {errorMessage}
          </p>
          <div className="mt-6 space-y-3">
            <Button
              onClick={() => router.push("/signup/payment")}
              fullWidth
            >
              <RefreshCw className="h-4 w-4" />다시 시도하기
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/signup")}
              fullWidth
            >
              처음부터 시작하기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          결제가 완료되었습니다!
        </h1>
        <p className="mt-2 text-slate-600">
          회원가입 완료 페이지로 이동합니다...
        </p>
        <div className="mt-4">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-point-500" />
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
