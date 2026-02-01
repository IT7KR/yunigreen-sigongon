"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@sigongon/ui";
import { Plus, Filter } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

type LaborContract = {
  id: string;
  worker_name: string;
  project_name: string;
  work_date: string;
  daily_rate: number;
  status: "draft" | "sent" | "signed" | "paid";
  created_at: string;
};

export default function LaborContractsPage() {
  const [contracts, setContracts] = useState<LaborContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "signed" | "paid">("all");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Mock data - replace with actual API call
      const mockContracts: LaborContract[] = [
        {
          id: "lc_1",
          worker_name: "김철수",
          project_name: "강남 아파트 리모델링",
          work_date: "2024-01-20",
          daily_rate: 150000,
          status: "signed",
          created_at: "2024-01-15",
        },
        {
          id: "lc_2",
          worker_name: "이영희",
          project_name: "서초 상가 인테리어",
          work_date: "2024-01-22",
          daily_rate: 140000,
          status: "sent",
          created_at: "2024-01-16",
        },
        {
          id: "lc_3",
          worker_name: "박민수",
          project_name: "강남 아파트 리모델링",
          work_date: "2024-01-20",
          daily_rate: 160000,
          status: "draft",
          created_at: "2024-01-17",
        },
      ];
      setContracts(mockContracts);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const getStatusBadge = (status: LaborContract["status"]) => {
    const statusMap = {
      draft: { label: "임시저장", variant: "default" as const },
      sent: { label: "발송완료", variant: "warning" as const },
      signed: { label: "서명완료", variant: "success" as const },
      paid: { label: "지급완료", variant: "success" as const },
    };
    return statusMap[status];
  };

  const filteredContracts =
    filter === "all"
      ? contracts
      : contracts.filter((c) => c.status === filter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">근로계약 관리</h1>
          <Link href="/labor/contracts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 계약 작성
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>전체 근로계약 목록</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  전체
                </Button>
                <Button
                  variant={filter === "draft" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilter("draft")}
                >
                  임시저장
                </Button>
                <Button
                  variant={filter === "sent" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilter("sent")}
                >
                  발송완료
                </Button>
                <Button
                  variant={filter === "signed" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilter("signed")}
                >
                  서명완료
                </Button>
                <Button
                  variant={filter === "paid" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilter("paid")}
                >
                  지급완료
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">근로자명</th>
                    <th className="pb-3 font-medium">프로젝트</th>
                    <th className="pb-3 font-medium">근무일자</th>
                    <th className="pb-3 font-medium">일당</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">작성일</th>
                    <th className="pb-3 font-medium">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        불러오는 중...
                      </td>
                    </tr>
                  ) : filteredContracts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        {filter === "all"
                          ? "등록된 계약이 없습니다."
                          : `${getStatusBadge(filter).label} 상태의 계약이 없습니다.`}
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((contract) => {
                      const statusInfo = getStatusBadge(contract.status);
                      return (
                        <tr
                          key={contract.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-4 font-medium text-slate-900">
                            {contract.worker_name}
                          </td>
                          <td className="py-4 text-slate-500">
                            {contract.project_name}
                          </td>
                          <td className="py-4 text-slate-500">
                            {contract.work_date}
                          </td>
                          <td className="py-4 text-slate-500">
                            {contract.daily_rate.toLocaleString()}원
                          </td>
                          <td className="py-4">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="py-4 text-slate-500">
                            {contract.created_at}
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary">
                                보기
                              </Button>
                              {contract.status === "draft" && (
                                <Button size="sm">발송</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
