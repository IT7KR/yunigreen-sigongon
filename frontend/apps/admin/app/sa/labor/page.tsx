"use client";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type SALaborWorker = {
  id: string;
  name: string;
  role: string;
  organization_id: string;
  organization_name: string;
  status: "active" | "inactive";
  contract_status: "signed" | "pending";
  last_work_date: string;
};

type TenantWorkerDistribution = {
  organization_id: string;
  organization_name: string;
  worker_count: number;
};

export default function SALaborPage() {
  const [summary, setSummary] = useState({
    active_workers: 0,
    pending_paystubs: 0,
    unsigned_contracts: 0,
    organizations_with_workers: 0,
  });
  const [workers, setWorkers] = useState<SALaborWorker[]>([]);
  const [tenantDistribution, setTenantDistribution] = useState<
    TenantWorkerDistribution[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getSALaborOverview();
      if (response.success && response.data) {
        setSummary(response.data.summary);
        setWorkers(response.data.workers);
        setTenantDistribution(response.data.tenant_worker_distribution);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">노무 모니터링</h1>
            <p className="mt-1 text-slate-500">
              플랫폼 전체 노무 현황을 조회합니다. 실행 작업은 고객사 노무관리에서 진행합니다.
            </p>
          </div>
          <Badge variant="default">읽기 전용</Badge>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          근로자 등록/수정, 지급명세서 발송, 보험요율 변경은 회원기업 노무 메뉴(`/labor/*`) 권한에서만 처리됩니다.
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                이번 달 출역 인원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.active_workers}명</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                지급명세서 발송 대기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {summary.pending_paystubs}건
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                미체결 근로계약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary.unsigned_contracts}건
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                근로자 보유 고객사
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {summary.organizations_with_workers}곳
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>고객사별 근로자 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantDistribution.length === 0 ? (
              <p className="text-sm text-slate-500">집계 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {tenantDistribution.map((tenant) => (
                  <div
                    key={tenant.organization_id}
                    className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-800">{tenant.organization_name}</span>
                    <span className="text-sm text-slate-500">{tenant.worker_count}명</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 등록 근로자 (조회 전용)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">이름</th>
                    <th className="pb-3 font-medium">직종</th>
                    <th className="pb-3 font-medium">소속 고객사</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">계약상태</th>
                    <th className="pb-3 font-medium">최근 출역일</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                        불러오는 중...
                      </td>
                    </tr>
                  ) : workers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                        등록된 근로자가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    workers.map((worker) => (
                      <tr key={worker.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-4 font-medium text-slate-900">{worker.name}</td>
                        <td className="py-4 text-slate-500">{worker.role}</td>
                        <td className="py-4 text-slate-500">{worker.organization_name}</td>
                        <td className="py-4">
                          <Badge variant={worker.status === "active" ? "success" : "default"}>
                            {worker.status === "active" ? "재직" : "대기"}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={
                              worker.contract_status === "signed" ? "success" : "warning"
                            }
                          >
                            {worker.contract_status === "signed" ? "서명 완료" : "서명 대기"}
                          </Badge>
                        </td>
                        <td className="py-4 text-slate-500">{worker.last_work_date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
