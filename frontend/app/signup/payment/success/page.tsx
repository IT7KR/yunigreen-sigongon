"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@sigongcore/ui";
import { Droplets, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { getSignupData, clearSignupData, saveSignupData } from "../../types";
import { api } from "@/lib/api";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const processSignup = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");

      if (!paymentKey || !orderId || !amount) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다.");
        return;
      }

      const signupData = getSignupData();
      if (
        !signupData.username ||
        !signupData.companyName ||
        !signupData.businessNumber
      ) {
        setStatus("error");
        setErrorMessage("회원가입 정보가 누락되었습니다.");
        return;
      }

      try {
        // Step 1: 회원가입 (계정 + 구독 생성, JWT 반환)
        const registerResponse = await api.register({
          username: signupData.username,
          email: signupData.email,
          password: signupData.password,
          phone: signupData.phone,
          company_name: signupData.companyName,
          business_number: signupData.businessNumber.replace(/-/g, ""),
          representative_name: signupData.representativeName,
          rep_phone: signupData.repPhone,
          rep_email: signupData.repEmail,
          contact_name: signupData.contactName || undefined,
          contact_phone: signupData.contactPhone || undefined,
          contact_position: signupData.contactPosition || undefined,
          plan: signupData.planType,
        });

        if (!registerResponse.success || !registerResponse.data) {
          setStatus("error");
          setErrorMessage("회원가입 처리 중 오류가 발생했습니다.");
          return;
        }

        // Step 2: 결제 확인 (register가 자동으로 setAccessToken 호출함)
        const confirmResponse = await api.confirmPayment({
          payment_key: paymentKey,
          order_id: orderId,
          amount: parseInt(amount, 10),
        });

        if (confirmResponse.success) {
          saveSignupData({
            accessToken: registerResponse.data.access_token,
            paymentCompleted: true,
          });
          setStatus("success");
          setTimeout(() => {
            router.push("/signup/complete");
          }, 2000);
        } else {
          // 결제 확인 실패 — 계정은 생성됨, 결제만 재시도 필요
          setStatus("error");
          setErrorMessage(
            "결제 확인에 실패했습니다. 로그인 후 다시 시도해주세요.",
          );
        }
      } catch (err) {
        console.error("Signup process failed:", err);
        setStatus("error");
        setErrorMessage("처리 중 오류가 발생했습니다.");
      }
    };

    processSignup();
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-point-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            결제 확인 중...
          </h1>
          <p className="mt-2 text-slate-600">잠시만 기다려 주세요.</p>
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
          <span className="text-2xl font-bold text-slate-900">시공코어</span>
        </Link>

        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">결제 확인 실패</h1>
          <p className="mt-2 text-slate-600">{errorMessage}</p>
          <div className="mt-6 space-y-3">
            <Button onClick={() => router.push("/signup/payment")} fullWidth>
              <RefreshCw className="h-4 w-4" />
              다시 시도하기
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
        <span className="text-2xl font-bold text-slate-900">시공코어</span>
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
