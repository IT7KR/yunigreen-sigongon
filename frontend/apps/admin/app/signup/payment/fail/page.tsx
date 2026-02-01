"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@sigongon/ui";
import { Droplets, AlertCircle, Loader2 } from "lucide-react";

function PaymentFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  const getErrorDescription = (code: string | null) => {
    switch (code) {
      case "PAY_PROCESS_CANCELED":
        return "결제가 취소되었습니다.";
      case "PAY_PROCESS_ABORTED":
        return "결제 진행 중 문제가 발생했습니다.";
      case "REJECT_CARD_COMPANY":
        return "카드사에서 결제가 거절되었습니다.";
      case "INVALID_CARD_NUMBER":
        return "유효하지 않은 카드 번호입니다.";
      case "INVALID_CARD_EXPIRATION":
        return "카드 유효기간이 만료되었습니다.";
      case "EXCEED_MAX_DAILY_PAYMENT_COUNT":
        return "일일 결제 한도를 초과했습니다.";
      case "EXCEED_MAX_PAYMENT_AMOUNT":
        return "결제 금액 한도를 초과했습니다.";
      default:
        return errorMessage || "결제 처리 중 오류가 발생했습니다.";
    }
  };

  const handleRetry = () => {
    router.push("/signup/payment");
  };

  const handleBack = () => {
    router.push("/signup/plan");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            결제에 실패했습니다
          </h1>
          <p className="mt-2 text-slate-600">
            {getErrorDescription(errorCode)}
          </p>
          {errorCode && (
            <p className="mt-1 text-xs text-slate-400">
              오류 코드: {errorCode}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <Button onClick={handleRetry} fullWidth>
            다시 시도
          </Button>
          <Button variant="secondary" onClick={handleBack} fullWidth>
            요금제 다시 선택
          </Button>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-slate-900">
            결제 실패 시 확인사항
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li>• 카드 번호와 유효기간이 정확한지 확인해주세요</li>
            <li>• 결제 한도가 충분한지 확인해주세요</li>
            <li>• 카드사 앱에서 결제 알림을 확인해주세요</li>
            <li>• 문제가 지속되면 카드사에 문의해주세요</li>
          </ul>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          결제 문의:{" "}
          <a href="mailto:support@sigongon.com" className="text-brand-point-600">
            support@sigongon.com
          </a>
        </p>
      </Card>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
          <Card className="w-full max-w-md p-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-point-500" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              로딩 중...
            </h1>
          </Card>
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
