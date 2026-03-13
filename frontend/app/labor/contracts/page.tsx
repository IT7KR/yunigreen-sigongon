"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, FileDown, Send } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, toast, Skeleton,
} from "@sigongcore/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { MobileListCard } from "@/components/MobileListCard";
import { api } from "@/lib/api";
import { useProjects } from "@/hooks";

type ContractStatus = "draft" | "sent" | "signed" | "paid";
const STATUS_MAP: Record<ContractStatus, { label: string; variant: "default" | "warning" | "success" }> = {
  draft: { label: "임시저장", variant: "default" },
  sent: { label: "발송완료", variant: "warning" },
  signed: { label: "서명완료", variant: "success" },
  paid: { label: "지급완료", variant: "success" },
};

export default function LaborContractsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const queryClient = useQueryClient();

  // 내 프로젝트 목록
  const { data: projectsResponse } = useProjects();
  const projects = projectsResponse?.success ? projectsResponse.data : [];

  // 선택한 프로젝트의 근로계약 목록
  const { data: contractsResponse, isLoading } = useQuery({
    queryKey: ["labor-contracts", selectedProjectId],
    queryFn: () => api.getLaborContracts(selectedProjectId),
    enabled: !!selectedProjectId,
  });
  const allContracts = contractsResponse?.success ? contractsResponse.data : [];
  const contracts = statusFilter === "all"
    ? allContracts
    : allContracts.filter((c) => c.status === statusFilter);

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.sendLaborContractForSignature(id),
    onSuccess: () => {
      toast.success("서명 요청을 발송했어요.");
      queryClient.invalidateQueries({ queryKey: ["labor-contracts", selectedProjectId] });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">근로계약 관리</h1>
          {selectedProjectId && (
            <Button asChild>
              <Link href={`/projects/${selectedProjectId}/labor-contracts/new`}>
                <Plus className="mr-2 h-4 w-4" />새 계약 작성
              </Link>
            </Button>
          )}
        </div>

        {/* 프로젝트 선택 */}
        <Card>
          <CardHeader><CardTitle>프로젝트 선택</CardTitle></CardHeader>
          <CardContent>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">프로젝트를 선택하세요</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* 계약 목록 */}
        {selectedProjectId && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>근로계약 목록</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {(["all", "draft", "sent", "signed", "paid"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={statusFilter === s ? "primary" : "secondary"}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === "all" ? "전체" : STATUS_MAP[s].label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : contracts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  {statusFilter === "all" ? "등록된 계약이 없어요." : `${STATUS_MAP[statusFilter as ContractStatus]?.label} 상태의 계약이 없어요.`}
                </p>
              ) : (
                <>
                  {/* 모바일 */}
                  <div className="space-y-3 md:hidden">
                    {contracts.map((c) => {
                      const si = STATUS_MAP[c.status as ContractStatus] ?? STATUS_MAP.draft;
                      return (
                        <MobileListCard
                          key={c.id}
                          title={c.worker_name}
                          subtitle={c.work_date}
                          badge={<Badge variant={si.variant}>{si.label}</Badge>}
                          metadata={[{ label: "일당", value: `${Number(c.daily_rate).toLocaleString()}원` }]}
                          actions={
                            <>
                              {c.status === "draft" && (
                                <Button size="sm" onClick={() => sendMutation.mutate(String(c.id))} disabled={sendMutation.isPending}>
                                  <Send className="mr-1 h-3 w-3" />발송
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleDownload(String(c.id), c.worker_name)}>
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
                          <th className="pb-3 font-medium">근무일자</th>
                          <th className="pb-3 font-medium">일당</th>
                          <th className="pb-3 font-medium">직종</th>
                          <th className="pb-3 font-medium">상태</th>
                          <th className="pb-3 font-medium">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contracts.map((c) => {
                          const si = STATUS_MAP[c.status as ContractStatus] ?? STATUS_MAP.draft;
                          return (
                            <tr key={c.id} className="border-b border-slate-100 last:border-0">
                              <td className="py-4 font-medium text-slate-900">{c.worker_name}</td>
                              <td className="py-4 text-slate-500">{c.work_date}</td>
                              <td className="py-4 text-slate-500">{Number(c.daily_rate).toLocaleString()}원</td>
                              <td className="py-4 text-slate-500">{c.work_type ?? "-"}</td>
                              <td className="py-4"><Badge variant={si.variant}>{si.label}</Badge></td>
                              <td className="py-4">
                                <div className="flex gap-2">
                                  {c.status === "draft" && (
                                    <Button size="sm" onClick={() => sendMutation.mutate(String(c.id))} disabled={sendMutation.isPending}>발송</Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => handleDownload(String(c.id), c.worker_name)}>
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
        )}
      </div>
    </AdminLayout>
  );
}
