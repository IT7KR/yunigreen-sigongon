"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Loader2,
  Check,
  X,
  Clock,
  Send,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
  StatusBadge,
  Badge,
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

const estimateStatusIcons: Record<EstimateStatus, React.ReactNode> = {
  draft: <Clock className="h-4 w-4" />,
  issued: <Send className="h-4 w-4" />,
  accepted: <Check className="h-4 w-4" />,
  rejected: <X className="h-4 w-4" />,
  void: <X className="h-4 w-4" />,
};

const estimateStatusColors: Record<EstimateStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  issued: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  void: "bg-slate-100 text-slate-500",
};

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
  const latestEstimate = sortedEstimates[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            견적서 버전 목록
          </CardTitle>
          <Button
            onClick={handleCreateEstimate}
            disabled={creatingEstimate}
          >
            {creatingEstimate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            견적서 생성
          </Button>
        </CardHeader>
        <CardContent>
          {estimates.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                아직 견적서가 없습니다.
              </p>
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
                  {sortedEstimates.map((estimate) => (
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
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              estimateStatusColors[estimate.status]
                            }
                          >
                            <span className="flex items-center gap-1">
                              {estimateStatusIcons[estimate.status]}
                              <StatusBadge status={estimate.status} />
                            </span>
                          </Badge>
                        </div>
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
                        <Link href={`/estimates/${estimate.id}`}>
                          <Button size="sm" variant="secondary">
                            상세보기
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <span className="text-sm text-slate-500">
                    총 견적서 수
                  </span>
                  <span className="font-medium text-slate-900">
                    {estimates.length}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    최신 버전
                  </span>
                  <span className="font-medium text-slate-900">
                    v{latestEstimate?.version}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    최신 견적 금액
                  </span>
                  <span className="text-lg font-bold text-brand-point-600">
                    {Number(
                      latestEstimate?.total_amount || 0,
                    ).toLocaleString()}
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
                        <div className="flex items-center gap-2">
                          <Badge className={estimateStatusColors[status]}>
                            <StatusBadge status={status} />
                          </Badge>
                        </div>
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
