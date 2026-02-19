"use client";

import { use, useState, useEffect } from "react";
import {
  FileSignature,
  Plus,
  Loader2,
  Download,
  Send,
  FileSpreadsheet,
  Stamp,
  X,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Modal, PrimitiveSelect, formatDate } from "@sigongon/ui";
import type {
  ContractStatus,
  ContractDetail,
  ContractTemplateType,
} from "@sigongon/types";
import { api } from "@/lib/api";
import { ModusignModal } from "@/components/ModusignModal";
import {
  buildSampleFileDownloadUrl,
  PROJECT_MOCK_EXPORT_SAMPLE_FILES,
} from "@/lib/sampleFiles";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

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
    Array<{
      id: string;
      version: number;
      total_amount: string;
      status: "accepted" | "issued" | "draft" | "rejected" | "void";
    }>
  >([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [selectedTemplateType, setSelectedTemplateType] =
    useState<ContractTemplateType>("public_office");
  const [creating, setCreating] = useState(false);
  const [showModusignModal, setShowModusignModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

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
          (e) => e.status === "accepted",
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
        template_type: selectedTemplateType,
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
    if (USE_MOCKS) {
      const downloadUrl = buildSampleFileDownloadUrl(
        PROJECT_MOCK_EXPORT_SAMPLE_FILES.contractPdf,
      );
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `계약서_${contractId}.pdf`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    window.open(`/api/v1/contracts/${contractId}/pdf`, "_blank");
  }

  async function handleDownloadExcel() {
    // Prepare contract summary data
    const dataRows = contracts.map((contract, index) => ({
      No: index + 1,
      계약번호: contract.contract_number || contract.id,
      상태: contractStatusLabels[contract.status],
      계약금액: Number(contract.contract_amount),
      생성일: contract.created_at,
      서명일: contract.signed_at || "",
    }));

    // Create workbook with exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("계약서 목록");

    // Add headers
    const headers = Object.keys(dataRows[0]);
    worksheet.addRow(headers);

    // Add data rows
    for (const row of dataRows) {
      worksheet.addRow(Object.values(row));
    }

    // Auto-fit column widths
    worksheet.columns.forEach((col) => {
      col.width = 18;
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `계약서_목록.xlsx`);
  }

  function handleOpenModusign(contractId: string) {
    setSelectedContractId(contractId);
    setShowModusignModal(true);
  }

  function handleCloseModusign() {
    setShowModusignModal(false);
    setSelectedContractId(null);
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
          <div className="flex gap-2">
            {contracts.length > 0 && (
              <Button variant="secondary" onClick={handleDownloadExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            )}
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              계약서 생성
            </Button>
          </div>
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
                    <th className="pb-3 font-medium">양식</th>
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
                      <td className="py-4 text-sm text-slate-600">
                        {contract.template_type === "private_standard"
                          ? "민간 표준계약"
                          : "관공서 계약서류"}
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
                            <>
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
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenModusign(contract.id)}
                              >
                                <Stamp className="h-4 w-4" />
                                모두싸인 전자서명
                              </Button>
                            </>
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

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="계약서 생성"
      >
        {availableEstimates.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-500">고객 수락된 견적서가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-400">
              견적서 발송 후 고객 수락 처리까지 완료해 주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">견적서 선택</label>
              <PrimitiveSelect
                value={selectedEstimateId}
                onChange={(e) => setSelectedEstimateId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {availableEstimates.map((estimate) => (
                  <option key={estimate.id} value={estimate.id}>
                    v{estimate.version} - {Number(estimate.total_amount).toLocaleString()}원
                  </option>
                ))}
              </PrimitiveSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                계약서 양식
              </label>
              <PrimitiveSelect
                value={selectedTemplateType}
                onChange={(e) =>
                  setSelectedTemplateType(
                    e.target.value as ContractTemplateType,
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="public_office">관공서 계약서류</option>
                <option value="private_standard">민간 표준계약서</option>
              </PrimitiveSelect>
              <p className="mt-1 text-xs text-slate-500">
                선택한 양식 기준으로 계약서 문서 생성 플로우를 연결합니다.
              </p>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}><X className="h-4 w-4" />취소</Button>
          {availableEstimates.length > 0 && (
            <Button onClick={handleCreateContract} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />생성</>}
            </Button>
          )}
        </div>
      </Modal>

      {selectedContractId && (
        <ModusignModal
          isOpen={showModusignModal}
          onClose={handleCloseModusign}
          contractId={selectedContractId}
          onSuccess={loadContracts}
        />
      )}
    </div>
  );
}
