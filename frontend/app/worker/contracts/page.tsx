"use client";

import { Suspense, useEffect, useState } from "react";
import { WorkerLayout } from "@/components/WorkerLayout";
import { AppLink, Badge, Card, CardContent } from "@sigongon/ui";
import { FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type WorkerContract = {
  id: string;
  project_name: string;
  work_date: string;
  role: string;
  daily_rate: number;
  status: "pending" | "signed";
};

function ContractSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerContractsContent() {
  const { user } = useAuth();
  const workerId = user?.id ?? "";
  const [contracts, setContracts] = useState<WorkerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      setIsLoading(true);
      try {
        const response = await (api as any).getWorkerContracts(workerId);
        if (response.success && response.data) {
          setContracts(response.data);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };

    void fetchContracts();
  }, [workerId]);

  return (
    <WorkerLayout title="근로계약서">
      <div className="flex flex-col space-y-3 p-4">
        {isLoading ? (
          <>
            <ContractSkeleton />
            <ContractSkeleton />
            <ContractSkeleton />
          </>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              확인할 근로계약서가 없습니다.
            </p>
          </div>
        ) : (
          contracts.map((contract) => (
            <AppLink
              key={contract.id}
              href={`/worker/contracts/${contract.id}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-100">
                        <FileText className="h-5 w-5 text-brand-point-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {contract.project_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {contract.work_date} · {contract.role}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-brand-point-600">
                          {contract.daily_rate.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        contract.status === "signed" ? "success" : "warning"
                      }
                    >
                      {contract.status === "signed" ? "서명완료" : "서명대기"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AppLink>
          ))
        )}
      </div>
    </WorkerLayout>
  );
}

function WorkerContractsFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
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
