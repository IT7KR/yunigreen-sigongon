"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  toast,
} from "@sigongon/ui";
import { Download, UserPlus, Mail, Send, Eye, Settings } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function SALaborPage() {
  const router = useRouter();
  const [summary, setSummary] = useState({
    active_workers: 0,
    pending_paystubs: 0,
    unsigned_contracts: 0,
  });
  const [workers, setWorkers] = useState<
    Array<{
      id: string;
      name: string;
      role: string;
      status: "active" | "inactive";
      contract_status: "signed" | "pending";
      last_work_date: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchSending, setIsBatchSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await api.getLaborOverview();
      if (response.success && response.data) {
        setSummary(response.data.summary);
        setWorkers(response.data.workers);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  async function handleBatchSendPaystubs() {
    if (summary.pending_paystubs === 0 || isBatchSending) {
      return;
    }

    try {
      setIsBatchSending(true);
      const response = await api.batchSendPaystubs();
      if (response.success) {
        setSummary((prev) => ({ ...prev, pending_paystubs: 0 }));
        toast.success(
          response.data?.message ||
            `${summary.pending_paystubs}건의 지급명세서를 발송했어요.`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("지급명세서 발송에 실패했어요.");
    } finally {
      setIsBatchSending(false);
    }
  }

  function handleWorkerNotification(workerName: string) {
    toast.success(`${workerName}님에게 안내 알림톡을 발송했어요.`);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">노무 관리</h1>
            <p className="mt-1 text-slate-500">전체 시스템의 일용직 근로자를 관리합니다</p>
          </div>
          <div className="flex gap-2">
            <Link href="/sa/labor/settings">
              <Button variant="secondary">
                <Settings className="mr-2 h-4 w-4" />
                보험요율 설정
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => router.push("/labor/payroll")}>
              <Download className="mr-2 h-4 w-4" />
              신고 엑셀 다운로드
            </Button>
            <Button onClick={() => router.push("/labor/workers")}>
              <UserPlus className="mr-2 h-4 w-4" />
              근로자 등록
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                이번 달 출역 인원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.active_workers}명
              </div>
              <p className="text-xs text-green-500">전체 고객사 기준</p>
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
              <Button
                size="sm"
                variant="ghost"
                className="px-0"
                onClick={handleBatchSendPaystubs}
                disabled={summary.pending_paystubs === 0 || isBatchSending}
              >
                <Send className="h-3.5 w-3.5" />일괄 발송하기
              </Button>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>일용직 근로자 목록</CardTitle>
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
                  ) : workers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        등록된 근로자가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    workers.map((worker) => (
                      <tr
                        key={worker.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-4 font-medium text-slate-900">
                          {worker.name}
                        </td>
                        <td className="py-4 text-slate-500">{worker.role}</td>
                        <td className="py-4 text-slate-500">-</td>
                        <td className="py-4">
                          <Badge
                            variant={
                              worker.status === "active" ? "success" : "default"
                            }
                          >
                            {worker.status === "active" ? "재직" : "대기"}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={
                              worker.contract_status === "signed"
                                ? "success"
                                : "warning"
                            }
                          >
                            {worker.contract_status === "signed"
                              ? "서명 완료"
                              : "서명 대기"}
                          </Badge>
                        </td>
                        <td className="py-4 text-slate-500">
                          {worker.last_work_date}
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => router.push("/labor/workers")}
                            >
                              <Eye className="h-3.5 w-3.5" />상세보기
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleWorkerNotification(worker.name)}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
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
