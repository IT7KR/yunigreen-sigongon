"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@sigongcore/ui";
import { Droplets, Loader2 } from "lucide-react";
import { getSignupData } from "../types";

export default function PaymentPage() {
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

      <Card className="w-full max-w-lg p-8 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-point-500" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          결제 페이지로 이동하는 중입니다
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          로그인 후 `/billing`에서 요금제를 선택하고 결제를 진행합니다.
        </p>
      </Card>
    </div>
  );
}
