"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@sigongon/ui";
import { WorkerLayout } from "@/components/WorkerLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Paystub = {
  id: string;
  month: string;
  date: string;
  amount: number;
  status: "sent" | "confirmed";
};

function PaystubsContent() {
  const { user } = useAuth();
  const workerId = user?.id;
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaystubs = async () => {
      if (!workerId) return;
      setIsLoading(true);
      try {
        const response = await (api as any).getWorkerPaystubs(workerId);
        if (response.success && response.data) {
          setPaystubs(response.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPaystubs();
  }, [workerId]);

  return (
    <WorkerLayout title="지급명세서함">
      <div className="space-y-3 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paystubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <CreditCard className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-medium text-slate-600">
              지급명세서가 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">
              지급된 급여 명세서가 여기 표시됩니다.
            </p>
          </div>
        ) : (
          paystubs.map((paystub) => (
            <Link key={paystub.id} href={`/worker/paystubs/${paystub.id}`}>
              <Card className="transition-shadow hover:shadow-md active:opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-100">
                        <CreditCard className="h-5 w-5 text-brand-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {paystub.month}월 급여
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          지급일: {paystub.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {paystub.amount.toLocaleString()}원
                      </p>
                      {paystub.status === "confirmed" ? (
                        <span className="mt-0.5 inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          수령확인됨
                        </span>
                      ) : (
                        <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          미확인
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </WorkerLayout>
  );
}

function PaystubsFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function WorkerPaystubsPage() {
  return (
    <Suspense fallback={<PaystubsFallback />}>
      <PaystubsContent />
    </Suspense>
  );
}
