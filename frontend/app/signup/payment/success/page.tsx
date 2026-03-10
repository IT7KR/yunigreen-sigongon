"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@sigongcore/ui";
import { Droplets, Loader2 } from "lucide-react";
import { getSignupData } from "../../types";

function PaymentSuccessContent() {
  const router = useRouter();

  useEffect(() => {
    const signupData = getSignupData();

    if (typeof window !== "undefined" && localStorage.getItem("access_token")) {
      router.replace("/billing");
      return;
    }

    if (signupData.username && signupData.businessVerified) {
      router.replace("/signup/complete");
      return;
    }

    router.replace("/signup");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공코어</span>
      </Link>

      <Card className="w-full max-w-md p-8 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-point-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          새 결제 흐름으로 이동하는 중입니다
        </h1>
        <p className="mt-2 text-slate-600">
          회원가입 후 `/billing`에서 결제를 관리합니다.
        </p>
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
