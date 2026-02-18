"use client";

import { Card, CardContent } from "@sigongon/ui";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { api } from "@/lib/api";

type WorkerContractListItem = {
  id: string;
  project_name: string;
  work_date: string;
  role: string;
  daily_rate: number;
  status: "pending" | "signed";
};

function WorkerContractsContent() {
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId") || "worker_1";
  const [contracts, setContracts] = useState<WorkerContractListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getWorkerContracts(workerId);
      if (response.success && response.data) {
        setContracts(response.data);
      }
      setIsLoading(false);
    };

    void fetchData();
  }, [workerId]);

  return (
    <MobileLayout title="근로계약서">
      <div className="space-y-3 p-4">
        {isLoading ? (
          <div className="text-center text-sm text-slate-400">불러오는 중...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center text-sm text-slate-400">확인할 근로계약서가 없습니다.</div>
        ) : (
          contracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/worker/contracts/${contract.id}?workerId=${encodeURIComponent(workerId)}`}
            >
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-slate-900">{contract.project_name}</h2>
                    <span
                      className={
                        contract.status === "signed"
                          ? "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                      }
                    >
                      {contract.status === "signed" ? "서명 완료" : "서명 대기"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>근로일: {contract.work_date}</span>
                    <span>직종: {contract.role}</span>
                    <span>일급: {contract.daily_rate.toLocaleString()}원</span>
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

function WorkerContractsFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function WorkerContractsPage() {
  return (
    <Suspense fallback={<WorkerContractsFallback />}>
      <WorkerContractsContent />
    </Suspense>
  );
}
