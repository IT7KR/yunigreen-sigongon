"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
  StatusBadge,
  Badge,
  Select,
} from "@sigongon/ui";
import type { EstimateStatus } from "@sigongon/types";
import { api } from "@/lib/api";

interface EstimateListItem {
  id: string;
  version: number;
  status: EstimateStatus;
  total_amount: string;
  created_at?: string;
  issued_at?: string;
}

export default function EstimatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [estimates, setEstimates] = useState<EstimateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingEstimate, setCreatingEstimate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "">("");

  useEffect(() => {
    loadEstimates();
  }, [projectId]);

  async function loadEstimates() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getProject(projectId);
      if (response.success && response.data) {
        setEstimates(
          response.data.estimates.map((e) => ({
            ...e,
            created_at: e.created_at || new Date().toISOString(),
          })),
        );
      }
    } catch (err) {
      setError("견적서 목록을 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEstimate() {
    try {
      setCreatingEstimate(true);
      const projectResponse = await api.getProject(projectId);
      const visits = projectResponse.success ? projectResponse.data?.site_visits || [] : [];
      if (visits.length === 0) {
        setError("현장방문 기록이 있어야 견적서를 생성할 수 있어요");
        return;
      }
      const hasArea = visits.some((visit) => Boolean(visit.estimated_area_m2));
      if (!hasArea) {
        setError("면적 산출값을 먼저 입력해 주세요. (현장방문 > 면적 산출)");
        return;
      }
      const result = await api.createEstimate(projectId);
      if (result.success && result.data) {
        router.push(`/estimates/${result.data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingEstimate(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={loadEstimates}>다시 시도</Button>
      </div>
    );
  }

  const sortedEstimates = [...estimates].sort((a, b) => b.version - a.version);
  const filteredEstimates = statusFilter
    ? sortedEstimates.filter((estimate) => estimate.status === statusFilter)
    : sortedEstimates;
  const latestEstimate = sortedEstimates[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            견적서 버전 목록
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as EstimateStatus | "")}
              options={[
                { value: "", label: "모든 상태" },
                { value: "draft", label: "초안" },
                { value: "issued", label: "발행" },
                { value: "accepted", label: "수락" },
                { value: "rejected", label: "거절" },
              ]}
            />
            <Button onClick={handleCreateEstimate} disabled={creatingEstimate}>
              {creatingEstimate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              견적서 생성
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {estimates.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">아직 견적서가 없습니다.</p>
              <p className="mt-1 text-sm text-slate-400">
                견적서를 생성하고 고객에게 발송해 보세요.
              </p>
              <Button className="mt-6" onClick={handleCreateEstimate}>
                <Plus className="h-4 w-4" />
                견적서 생성하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">버전</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">금액</th>
                    <th className="pb-3 font-medium">생성일</th>
                    <th className="pb-3 font-medium">발송일</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstimates.map((estimate) => (
                    <tr
                      key={estimate.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            v{estimate.version}
                          </span>
                          {estimate.id === latestEstimate?.id && (
                            <Badge className="bg-brand-point-100 text-brand-point-700">
                              최신
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <StatusBadge status={estimate.status} />
                      </td>
                      <td className="py-4 font-medium text-slate-900">
                        {Number(estimate.total_amount).toLocaleString()}원
                      </td>
                      <td className="py-4 text-slate-500">
                        {estimate.created_at
                          ? formatDate(estimate.created_at)
                          : "-"}
                      </td>
                      <td className="py-4 text-slate-500">
                        {estimate.issued_at
                          ? formatDate(estimate.issued_at)
                          : "-"}
                      </td>
                      <td className="py-4">
                        <Button size="sm" variant="secondary" asChild><Link href={`/estimates/${estimate.id}`}>
                            상세보기
                          </Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEstimates.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  선택한 상태의 견적서가 없습니다.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {estimates.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>견적 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">총 견적서 수</span>
                  <span className="font-medium text-slate-900">
                    {estimates.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">최신 버전</span>
                  <span className="font-medium text-slate-900">
                    v{latestEstimate?.version}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">최신 견적 금액</span>
                  <span className="text-lg font-bold text-brand-point-600">
                    {Number(latestEstimate?.total_amount || 0).toLocaleString()}
                    원
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>상태별 견적서</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(["draft", "issued", "accepted", "rejected"] as const).map(
                  (status) => {
                    const count = estimates.filter(
                      (e) => e.status === status,
                    ).length;
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between"
                      >
                        <StatusBadge status={status} />
                        <span className="font-medium text-slate-900">
                          {count}개
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
