"use client";

import { Card, CardContent } from "@sigongon/ui";
import { MobileLayout } from "@/components/MobileLayout";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function WorkerPaystubsContent() {
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId") || "worker_1";
  const [paystubs, setPaystubs] = useState<
    Array<{
      id: string;
      month: string;
      amount: number;
      status: "sent" | "confirmed";
      date: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getWorkerPaystubs(workerId);
      if (response.success && response.data) {
        setPaystubs(response.data);
      }
      setIsLoading(false);
    };

    void fetchData();
  }, [workerId]);

  return (
    <MobileLayout title="지급명세서함">
      <div className="space-y-4 p-4">
        {isLoading ? (
          <div className="text-center text-sm text-slate-400">
            불러오는 중...
          </div>
        ) : paystubs.length === 0 ? (
          <div className="text-center text-sm text-slate-400">
            지급명세서가 없습니다.
          </div>
        ) : (
          paystubs.map((item) => (
            <Link
              key={item.id}
              href={`/worker/paystubs/${item.id}?workerId=${encodeURIComponent(workerId)}`}
            >
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {item.month} 급여
                    </h3>
                    <p className="text-sm text-slate-500">
                      지급일: {item.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-point-600">
                      {item.amount.toLocaleString()}원
                    </p>
                    {item.status === "confirmed" ? (
                      <p className="text-xs text-green-600 font-medium">
                        수령 확인됨
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">미확인</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </MobileLayout>
  );
}

function WorkerPaystubsFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function WorkerPaystubsPage() {
  return (
    <Suspense fallback={<WorkerPaystubsFallback />}>
      <WorkerPaystubsContent />
    </Suspense>
  );
}
