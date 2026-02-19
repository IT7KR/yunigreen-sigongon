"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PrimitiveSelect,
  toast,
} from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Loader2,
  Eye,
  ShieldCheck,
  CircleX,
  ShieldAlert,
  Ban,
  CheckCircle2,
} from "lucide-react";
import type {
  WorkerDocument,
  WorkerDocumentReviewAction,
  WorkerDocumentReviewQueueItem,
} from "@sigongon/types";

type SALaborWorker = {
  id: string;
  name: string;
  role: string;
  organization_id: string;
  organization_name: string;
  status: "active" | "inactive";
  contract_status: "signed" | "pending";
  last_work_date: string;
  is_blocked_for_labor?: boolean;
  block_reason?: string | null;
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
  const [reviewQueue, setReviewQueue] = useState<WorkerDocumentReviewQueueItem[]>([]);
  const [reviewFilter, setReviewFilter] = useState<WorkerDocument["review_status"] | "all">("pending_review");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewActionKey, setReviewActionKey] = useState<string | null>(null);
  const [workerActionKey, setWorkerActionKey] = useState<string | null>(null);

  const fetchReviewQueue = async (
    status: WorkerDocument["review_status"] | "all" = reviewFilter,
  ) => {
    setIsReviewLoading(true);
    try {
      const response = await api.getWorkerDocumentReviewQueue(status);
      if (response.success && response.data) {
        setReviewQueue(response.data);
      }
    } catch {
      toast.error("서류 검토 대기 목록을 불러오지 못했습니다.");
    } finally {
      setIsReviewLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.getSALaborOverview();
        if (response.success && response.data) {
          setSummary(response.data.summary);
          setWorkers(response.data.workers);
          setTenantDistribution(response.data.tenant_worker_distribution);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void Promise.all([fetchData(), fetchReviewQueue("pending_review")]);
  }, []);

  const formatFileSize = (size: number) => {
    if (!size) return "0 KB";
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.ceil(size / 1024)} KB`;
  };

  const renderReviewBadge = (status: WorkerDocument["review_status"]) => {
    if (status === "approved") {
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          승인
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="warning">
          <CircleX className="h-3.5 w-3.5" />
          반려
        </Badge>
      );
    }
    if (status === "quarantined") {
      return (
        <Badge variant="error">
          <ShieldAlert className="h-3.5 w-3.5" />
          격리
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        <Loader2 className="h-3.5 w-3.5" />
        검토대기
      </Badge>
    );
  };

  const handleDownloadDocument = async (item: WorkerDocumentReviewQueueItem) => {
    try {
      const blob = await api.downloadWorkerDocument(item.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast.error("서류 파일을 열 수 없습니다.");
    }
  };

  const handleReviewAction = async (
    item: WorkerDocumentReviewQueueItem,
    action: WorkerDocumentReviewAction,
  ) => {
    const key = `${item.id}:${action}`;
    setReviewActionKey(key);
    try {
      let reason: string | undefined;
      if (action === "reject" || action === "quarantine" || action === "request_reupload") {
        const input = window.prompt("사유를 입력하세요.", "");
        if (!input || !input.trim()) {
          toast.error("사유를 입력해야 합니다.");
          return;
        }
        reason = input.trim();
      }
      const response = await api.reviewWorkerDocument(item.id, { action, reason });
      if (response.success) {
        toast.success("검토 결과를 반영했습니다.");
        await Promise.all([fetchReviewQueue(reviewFilter), refreshWorkerOverview()]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "서류 검토에 실패했습니다.");
    } finally {
      setReviewActionKey(null);
    }
  };

  const refreshWorkerOverview = async () => {
    const response = await api.getSALaborOverview();
    if (response.success && response.data) {
      setSummary(response.data.summary);
      setWorkers(response.data.workers);
      setTenantDistribution(response.data.tenant_worker_distribution);
    }
  };

  const handleWorkerControl = async (worker: SALaborWorker) => {
    const action = worker.is_blocked_for_labor ? "unblock" : "block";
    let reason: string | undefined;
    if (action === "block") {
      const input = window.prompt("노무 투입 차단 사유를 입력하세요.", worker.block_reason || "");
      if (!input || !input.trim()) {
        toast.error("차단 사유를 입력해야 합니다.");
        return;
      }
      reason = input.trim();
    }

    setWorkerActionKey(`${worker.id}:${action}`);
    try {
      const response = await api.setDailyWorkerControl(worker.id, { action, reason });
      if (response.success) {
        toast.success(action === "block" ? "근로자를 차단했습니다." : "근로자 차단을 해제했습니다.");
        await Promise.all([refreshWorkerOverview(), fetchReviewQueue(reviewFilter)]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "근로자 통제 변경에 실패했습니다.");
    } finally {
      setWorkerActionKey(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">노무 모니터링</h1>
            <p className="mt-1 text-slate-500">
              플랫폼 전체 노무 현황 및 이상 서류를 조회/제어합니다.
            </p>
          </div>
          <Badge variant="warning">운영 제어</Badge>
        </div>

        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          최고관리자는 이상 서류 검토/격리/강제 반려 및 노무 투입 차단·해제를 수행할 수 있습니다.
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>서류 검토 큐</CardTitle>
              <div className="flex items-center gap-2">
                <PrimitiveSelect
                  value={reviewFilter}
                  onChange={(e) => {
                    const next = e.target.value as WorkerDocument["review_status"] | "all";
                    setReviewFilter(next);
                    void fetchReviewQueue(next);
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="pending_review">검토대기</option>
                  <option value="approved">승인</option>
                  <option value="rejected">반려</option>
                  <option value="quarantined">격리</option>
                  <option value="all">전체</option>
                </PrimitiveSelect>
                <Button
                  variant="secondary"
                  onClick={() => fetchReviewQueue(reviewFilter)}
                  disabled={isReviewLoading}
                >
                  {isReviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "새로고침"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isReviewLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">검토 목록을 불러오는 중...</div>
            ) : reviewQueue.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">검토할 서류가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {reviewQueue.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.worker_name} · {item.document_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.original_filename || "파일명 없음"} · {formatFileSize(item.file_size_bytes)}
                        </p>
                        {!!item.anomaly_flags.length && (
                          <p className="mt-1 text-xs text-amber-700">
                            이상 플래그: {item.anomaly_flags.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderReviewBadge(item.review_status)}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownloadDocument(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          보기
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReviewAction(item, "approve")}
                          disabled={reviewActionKey === `${item.id}:approve`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReviewAction(item, "reject")}
                          disabled={reviewActionKey === `${item.id}:reject`}
                        >
                          <CircleX className="h-3.5 w-3.5" />
                          반려
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReviewAction(item, "quarantine")}
                          disabled={reviewActionKey === `${item.id}:quarantine`}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          격리
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 등록 근로자</CardTitle>
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
                    <th className="pb-3 font-medium">통제</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-slate-400">
                        불러오는 중...
                      </td>
                    </tr>
                  ) : workers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-slate-400">
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
                        <td className="py-4">
                          <Button
                            size="sm"
                            variant={worker.is_blocked_for_labor ? "secondary" : "ghost"}
                            onClick={() => handleWorkerControl(worker)}
                            disabled={workerActionKey === `${worker.id}:${worker.is_blocked_for_labor ? "unblock" : "block"}`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {worker.is_blocked_for_labor ? "차단해제" : "차단"}
                          </Button>
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
