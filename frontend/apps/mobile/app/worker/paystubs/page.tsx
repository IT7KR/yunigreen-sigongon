"use client";

import { Card, CardContent } from "@sigongon/ui";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WorkerPaystubsPage() {
  const workerId = "worker_1";
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

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/worker/profile"
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">지급명세서함</h1>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
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
            <Link key={item.id} href={`/worker/paystubs/${item.id}`}>
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
      </main>
    </div>
  );
}
