"use client";

import { Card, CardContent, Button } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { XCircle } from "lucide-react";

function FailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  const getErrorDetails = (code: string | null) => {
    const errorMap: Record<string, { title: string; description: string }> = {
      PAY_PROCESS_CANCELED: {
        title: "결제가 취소되었습니다",
        description: "사용자에 의해 결제가 취소되었습니다.",
      },
      PAY_PROCESS_ABORTED: {
        title: "결제가 중단되었습니다",
        description: "결제 과정에서 오류가 발생하여 중단되었습니다.",
      },
      REJECT_CARD_COMPANY: {
        title: "카드사 승인 거부",
        description: "카드사에서 승인을 거부했습니다. 다른 카드를 시도해주세요.",
      },
      EXCEED_MAX_CARD_LIMIT: {
        title: "한도 초과",
        description: "카드 한도를 초과했습니다.",
      },
      INVALID_CARD_EXPIRATION: {
        title: "카드 유효기간 오류",
        description: "카드 유효기간을 확인해주세요.",
      },
      INVALID_STOPPED_CARD: {
        title: "정지된 카드",
        description: "해당 카드는 사용이 정지되었습니다.",
      },
      BELOW_MINIMUM_AMOUNT: {
        title: "최소 결제금액 미만",
        description: "최소 결제금액 이상으로 결제해주세요.",
      },
      default: {
        title: "결제에 실패했습니다",
        description: "결제 처리 중 오류가 발생했습니다.",
      },
    };

    return errorMap[code || ""] || errorMap.default;
  };

  const errorDetails = getErrorDetails(errorCode);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-slate-900">
              {errorDetails.title}
            </h2>
            <p className="mb-6 text-slate-600">{errorDetails.description}</p>

            {errorMessage && (
              <div className="mb-6 rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {errorMessage}
                </p>
                {errorCode && (
                  <p className="mt-1 text-xs text-red-600">
                    오류 코드: {errorCode}
                  </p>
                )}
              </div>
            )}

            <div className="mb-6 space-y-2 text-left">
              <h3 className="font-semibold text-slate-900">해결 방법</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                <li>다른 카드로 시도해보세요</li>
                <li>카드 정보를 정확하게 입력했는지 확인하세요</li>
                <li>카드사에 문의하여 승인 가능 여부를 확인하세요</li>
                <li>계좌이체 등 다른 결제 수단을 이용해보세요</li>
              </ul>
            </div>

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
                다시 시도하기
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            • 결제 관련 문의사항은 고객센터로 연락주세요.
            <br />
            • 문의 시 오류 코드를 함께 알려주시면 빠른 해결이 가능합니다.
            <br />• 고객센터: support@sigongon.com
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function FailPage() {
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
      <FailContent />
    </Suspense>
  );
}
