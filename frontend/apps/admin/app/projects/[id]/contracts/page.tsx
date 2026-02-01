"use client";

import { use, useState, useEffect } from "react";
import { FileSignature, Plus, Loader2, Download, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
  Badge,
} from "@sigongon/ui";
import type { ContractStatus, ContractDetail } from "@sigongon/types";
import { api } from "@/lib/api";

const contractStatusColors: Record<ContractStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const contractStatusLabels: Record<ContractStatus, string> = {
  draft: "초안",
  sent: "발송됨",
  signed: "서명완료",
  active: "진행중",
  completed: "완료",
  cancelled: "취소됨",
};

export default function ContractsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableEstimates, setAvailableEstimates] = useState<
    Array<{ id: string; version: number; total_amount: string }>
  >([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadContracts();
    loadEstimates();
  }, [projectId]);

  async function loadContracts() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getContracts(projectId);
      if (response.success && response.data) {
        setContracts(response.data);
      }
    } catch (err) {
      setError("계약서 목록을 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadEstimates() {
    try {
      const response = await api.getProject(projectId);
      if (response.success && response.data) {
        const acceptedEstimates = response.data.estimates.filter(
          (e) => e.status === "accepted" || e.status === "issued",
        );
        setAvailableEstimates(acceptedEstimates);
        if (acceptedEstimates.length > 0) {
          setSelectedEstimateId(acceptedEstimates[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateContract() {
    if (!selectedEstimateId) return;
    try {
      setCreating(true);
      const response = await api.createContract(projectId, {
        estimate_id: selectedEstimateId,
        start_date: new Date().toISOString().split("T")[0],
      });
      if (response.success) {
        await loadContracts();
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleSendForSignature(contractId: string) {
    try {
      const response = await api.sendContractForSignature(contractId);
      if (response.success) {
        await loadContracts();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleDownloadPDF(contractId: string) {
    alert(`계약서 ${contractId} PDF 다운로드 (Mock)`);
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
        <Button onClick={loadContracts}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-slate-400" />
            계약서 목록
          </CardTitle>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            계약서 생성
          </Button>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="py-16 text-center">
              <FileSignature className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                아직 계약서가 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                승인된 견적서를 기반으로 계약서를 생성해 보세요.
              </p>
              <Button
                className="mt-6"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                계약서 생성하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">계약번호</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">계약금액</th>
                    <th className="pb-3 font-medium">생성일</th>
                    <th className="pb-3 font-medium">서명일</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-4 font-medium text-slate-900">
                        {contract.contract_number || contract.id}
                      </td>
                      <td className="py-4">
                        <Badge
                          className={
                            contractStatusColors[contract.status]
                          }
                        >
                          {contractStatusLabels[contract.status]}
                        </Badge>
                      </td>
                      <td className="py-4 font-medium text-slate-900">
                        {Number(contract.contract_amount).toLocaleString()}원
                      </td>
                      <td className="py-4 text-slate-500">
                        {formatDate(contract.created_at)}
                      </td>
                      <td className="py-4 text-slate-500">
                        {contract.signed_at
                          ? formatDate(contract.signed_at)
                          : "-"}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {contract.status === "draft" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleSendForSignature(contract.id)
                              }
                            >
                              <Send className="h-4 w-4" />
                              서명 요청
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadPDF(contract.id)}
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>계약 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">총 계약서 수</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {contracts.length}개
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">서명 완료</p>
                <p className="mt-2 text-2xl font-bold text-green-600">
                  {
                    contracts.filter((c) => c.status === "signed").length
                  }
                  개
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">대기중</p>
                <p className="mt-2 text-2xl font-bold text-blue-600">
                  {
                    contracts.filter(
                      (c) => c.status === "draft" || c.status === "sent",
                    ).length
                  }
                  개
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-bold text-slate-900">
              계약서 생성
            </h3>
            {availableEstimates.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-500">
                  승인된 견적서가 없습니다.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  먼저 견적서를 생성하고 발송해 주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    견적서 선택
                  </label>
                  <select
                    value={selectedEstimateId}
                    onChange={(e) => setSelectedEstimateId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {availableEstimates.map((estimate) => (
                      <option key={estimate.id} value={estimate.id}>
                        v{estimate.version} -{" "}
                        {Number(estimate.total_amount).toLocaleString()}원
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                취소
              </Button>
              {availableEstimates.length > 0 && (
                <Button
                  onClick={handleCreateContract}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "생성"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
