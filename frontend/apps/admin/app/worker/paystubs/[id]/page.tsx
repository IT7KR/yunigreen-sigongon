"use client";

import { Suspense, use, useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button, Card, CardContent } from "@sigongon/ui";
import { WorkerLayout } from "@/components/WorkerLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type PaystubItem = {
  label: string;
  amount: number;
  type: "income" | "deduction";
};

type PaystubDetail = {
  id: string;
  title: string;
  month: string;
  date: string;
  total_amount: number;
  deductions: number;
  net_amount: number;
  status: "sent" | "confirmed";
  items: PaystubItem[];
};

function PaystubDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const workerId = user?.id;
  const [paystub, setPaystub] = useState<PaystubDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const fetchPaystub = async () => {
      if (!workerId) return;
      setIsLoading(true);
      try {
        const response = await (api as any).getWorkerPaystub(workerId, id);
        if (response.success && response.data) {
          setPaystub(response.data);
          setConfirmed(response.data.status === "confirmed");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPaystub();
  }, [workerId, id]);

  const handleConfirm = async () => {
    if (!workerId || isConfirming) return;
    setIsConfirming(true);
    try {
      const response = await (api as any).ackWorkerPaystub(workerId, id);
      if (response.success) {
        setConfirmed(true);
        setPaystub((prev) =>
          prev ? { ...prev, status: "confirmed" } : prev,
        );
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const incomeItems = paystub?.items.filter((i) => i.type === "income") ?? [];
  const deductionItems =
    paystub?.items.filter((i) => i.type === "deduction") ?? [];

  return (
    <WorkerLayout title="지급명세서 상세" showBack>
      <div className="pb-24 p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-4 w-full animate-pulse rounded bg-slate-200"
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : paystub ? (
          <>
            {/* 제목 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {paystub.title || `${paystub.month}월 급여`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                지급일: {paystub.date}
              </p>
            </div>

            {/* 금액 요약 */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">지급총액</span>
                  <span className="font-semibold text-slate-900">
                    {paystub.total_amount.toLocaleString()}원
                  </span>
                </div>
                <div className="border-t border-slate-100" />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">공제총액</span>
                  <span className="font-semibold text-red-600">
                    -{paystub.deductions.toLocaleString()}원
                  </span>
                </div>
                <div className="border-t border-slate-200" />
                <div className="flex items-center justify-between pt-3">
                  <span className="font-semibold text-slate-900">실수령액</span>
                  <span className="text-xl font-bold text-brand-point-600">
                    {paystub.net_amount.toLocaleString()}원
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 상세 내역 */}
            {paystub.items.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-3 font-semibold text-slate-900">
                    상세 내역
                  </h3>

                  {incomeItems.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        지급 항목
                      </p>
                      <div className="space-y-2">
                        {incomeItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-slate-600">
                              {item.label}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {item.amount.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {deductionItems.length > 0 && (
                    <div>
                      {incomeItems.length > 0 && (
                        <div className="mb-3 border-t border-slate-100" />
                      )}
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        공제 항목
                      </p>
                      <div className="space-y-2">
                        {deductionItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-slate-600">
                              {item.label}
                            </span>
                            <span className="text-sm font-medium text-red-600">
                              -{item.amount.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-medium text-slate-600">
              명세서를 불러올 수 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* 하단 고정 수령 확인 */}
      {!isLoading && paystub && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pb-safe pt-3">
          {confirmed ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-600">
                수령 확인되었습니다
              </span>
            </div>
          ) : (
            <Button
              fullWidth
              size="lg"
              className="h-12"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              <CheckCircle className="h-5 w-5" />
              {isConfirming ? "확인 중..." : "수령 확인"}
            </Button>
          )}
        </div>
      )}
    </WorkerLayout>
  );
}

function PaystubDetailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function PaystubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PaystubDetailContent id={id} />;
}

export default function WorkerPaystubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PaystubDetailFallback />}>
      <PaystubDetailPage params={params} />
    </Suspense>
  );
}
