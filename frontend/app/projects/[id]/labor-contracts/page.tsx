"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, FileDown, Send } from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
  Skeleton,
} from "@sigongcore/ui";
import { api } from "@/lib/api";
import { MobileListCard } from "@/components/MobileListCard";

type ContractStatus = "draft" | "sent" | "signed" | "paid";

const STATUS_MAP: Record<ContractStatus, { label: string; variant: "default" | "warning" | "success" }> = {
  draft: { label: "임시저장", variant: "default" },
  sent: { label: "발송완료", variant: "warning" },
  signed: { label: "서명완료", variant: "success" },
  paid: { label: "지급완료", variant: "success" },
};

export default function ProjectLaborContractsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const queryClient = useQueryClient();
  const [visibleSSN, setVisibleSSN] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ["labor-contracts", projectId],
    queryFn: () => api.getLaborContracts(projectId),
    enabled: !!projectId,
  });

  const contracts = response?.success ? response.data : [];

  const sendMutation = useMutation({
    mutationFn: (contractId: string) => api.sendLaborContractForSignature(contractId),
    onSuccess: () => {
      toast.success("서명 요청을 발송했어요.");
      queryClient.invalidateQueries({ queryKey: ["labor-contracts", projectId] });
    },
    onError: () => toast.error("발송에 실패했어요."),
  });

  const handleDownload = async (contractId: string, workerName: string) => {
    try {
      const blob = await api.downloadLaborContractHwpx(contractId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `표준근로계약서_${workerName}.hwpx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("근로계약서 다운로드에 실패했어요.");
    }
  };

  const handleTaxReportDownload = async () => {
    try {
      const blob = await api.downloadLaborTaxReport(projectId, reportMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportMonth}_일용근로소득_지급명세서.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("지급명세서 다운로드에 실패했어요.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">근로계약 관리</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-sm"
            />
            <Button variant="outline" size="sm" onClick={handleTaxReportDownload}>
              <FileDown className="mr-1 h-4 w-4" />지급명세서 다운로드
            </Button>
          </div>
          <Button asChild>
            <Link href={`/projects/${projectId}/labor-contracts/new`}>
              <Plus className="mr-2 h-4 w-4" />새 계약 작성
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>근로계약 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">등록된 근로계약이 없어요.</p>
              <Button asChild className="mt-4" size="sm">
                <Link href={`/projects/${projectId}/labor-contracts/new`}>
                  첫 계약 작성하기
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* 모바일 */}
              <div className="space-y-3 md:hidden">
                {contracts.map((contract) => {
                  const statusInfo = STATUS_MAP[contract.status as ContractStatus] ?? STATUS_MAP.draft;
                  return (
                    <MobileListCard
                      key={contract.id}
                      title={contract.worker_name}
                      subtitle={contract.work_date}
                      badge={<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
                      metadata={[
                        { label: "일당", value: `${Number(contract.daily_rate).toLocaleString()}원` },
                        ...(contract.worker_id_number_masked
                          ? [{ label: "주민등록번호", value: contract.worker_id_number_masked }]
                          : []),
                      ]}
                      actions={
                        <>
                          {contract.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => sendMutation.mutate(String(contract.id))}
                              disabled={sendMutation.isPending}
                            >
                              <Send className="mr-1 h-3 w-3" />발송
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(String(contract.id), contract.worker_name)}
                          >
                            <FileDown className="mr-1 h-3 w-3" />다운로드
                          </Button>
                        </>
                      }
                    />
                  );
                })}
              </div>
              {/* 데스크톱 */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                      <th className="pb-3 font-medium">근로자명</th>
                      <th className="pb-3 font-medium">주민등록번호</th>
                      <th className="pb-3 font-medium">근무일자</th>
                      <th className="pb-3 font-medium">일당</th>
                      <th className="pb-3 font-medium">직종</th>
                      <th className="pb-3 font-medium">상태</th>
                      <th className="pb-3 font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => {
                      const statusInfo = STATUS_MAP[contract.status as ContractStatus] ?? STATUS_MAP.draft;
                      return (
                        <tr key={contract.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-4 font-medium text-slate-900">{contract.worker_name}</td>
                          <td className="py-4">
                            {contract.worker_id_number_masked ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-slate-700">
                                  {visibleSSN === String(contract.id)
                                    ? contract.worker_id_number
                                    : contract.worker_id_number_masked}
                                </span>
                                {contract.worker_id_number && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setVisibleSSN(
                                        visibleSSN === String(contract.id) ? null : String(contract.id)
                                      )
                                    }
                                  >
                                    {visibleSSN === String(contract.id) ? "숨기기" : "전체 보기"}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">미입력</span>
                            )}
                          </td>
                          <td className="py-4 text-slate-500">{contract.work_date}</td>
                          <td className="py-4 text-slate-500">{Number(contract.daily_rate).toLocaleString()}원</td>
                          <td className="py-4 text-slate-500">{contract.work_type ?? "-"}</td>
                          <td className="py-4">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              {contract.status === "draft" && (
                                <Button
                                  size="sm"
                                  onClick={() => sendMutation.mutate(String(contract.id))}
                                  disabled={sendMutation.isPending}
                                >
                                  발송
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(String(contract.id), contract.worker_name)}
                              >
                                <FileDown className="mr-1 h-3 w-3" />다운로드
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
