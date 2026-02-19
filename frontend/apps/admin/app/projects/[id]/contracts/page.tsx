"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  FileSignature,
  Plus,
  Loader2,
  Download,
  Send,
  FileSpreadsheet,
  Stamp,
  X,
  CheckCircle,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
  PrimitiveSelect,
  formatDate,
} from "@sigongon/ui";
import type {
  ContractDetail,
  ContractKind,
  ContractTemplateType,
  PublicPlatformType,
} from "@sigongon/types";
import { api } from "@/lib/api";
import { ModusignModal } from "@/components/ModusignModal";
import {
  buildSampleFileDownloadUrl,
  PROJECT_MOCK_EXPORT_SAMPLE_FILES,
} from "@/lib/sampleFiles";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const contractStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const contractStatusLabels: Record<string, string> = {
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
  const [creating, setCreating] = useState(false);
  const [showModusignModal, setShowModusignModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const [projectContext, setProjectContext] = useState<{
    name?: string;
    address?: string;
    client_name?: string;
  }>({});

  const [selectedContractKind, setSelectedContractKind] =
    useState<ContractKind>("private_standard");

  const selectedTemplateType: ContractTemplateType = useMemo(
    () =>
      selectedContractKind === "private_standard"
        ? "private_standard"
        : "public_office",
    [selectedContractKind],
  );

  const [ownerName, setOwnerName] = useState("");
  const [ownerRepresentative, setOwnerRepresentative] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerBusinessNumber, setOwnerBusinessNumber] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const [contractDate, setContractDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [workStartDate, setWorkStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [workEndDate, setWorkEndDate] = useState("");
  const [delayPenaltyRate, setDelayPenaltyRate] = useState("0.0005");
  const [specialTerms, setSpecialTerms] = useState("");

  const [publicPlatformType, setPublicPlatformType] =
    useState<PublicPlatformType>("narajangteo");
  const [publicReference, setPublicReference] = useState("");
  const [publicNoticeNumber, setPublicNoticeNumber] = useState("");
  const [publicBidNumber, setPublicBidNumber] = useState("");
  const [publicSourceFile, setPublicSourceFile] = useState<File | null>(null);

  useEffect(() => {
    loadContracts();
    loadEstimates();
  }, [projectId]);

  useEffect(() => {
    if (!ownerName && projectContext.client_name) {
      setOwnerName(projectContext.client_name);
    }
    if (!ownerAddress && projectContext.address) {
      setOwnerAddress(projectContext.address);
    }
  }, [projectContext, ownerName, ownerAddress]);

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
        setProjectContext({
          name: response.data.name,
          address: response.data.address,
          client_name: response.data.client_name,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  function resetCreateForm() {
    setSelectedContractKind("private_standard");
    setContractDate(new Date().toISOString().split("T")[0]);
    setWorkStartDate(new Date().toISOString().split("T")[0]);
    setWorkEndDate("");
    setDelayPenaltyRate("0.0005");
    setSpecialTerms("");
    setPublicPlatformType("narajangteo");
    setPublicReference("");
    setPublicNoticeNumber("");
    setPublicBidNumber("");
    setPublicSourceFile(null);
  }

  async function handleCreateContract() {
    if (!selectedEstimateId) return;

    try {
      setCreating(true);

      const payload: Parameters<typeof api.createContract>[1] = {
        estimate_id: selectedEstimateId,
        template_type: selectedTemplateType,
        contract_kind: selectedContractKind,
        execution_mode:
          selectedContractKind === "private_standard"
            ? "modusign"
            : "upload_only",
        start_date: workStartDate || undefined,
        expected_end_date: workEndDate || undefined,
      };

      if (selectedContractKind === "private_standard") {
        payload.owner_name = ownerName || undefined;
        payload.owner_representative_name = ownerRepresentative || undefined;
        payload.owner_address = ownerAddress || undefined;
        payload.owner_business_number = ownerBusinessNumber || undefined;
        payload.owner_phone = ownerPhone || undefined;
        payload.contract_date = contractDate || undefined;
        payload.work_start_date = workStartDate || undefined;
        payload.work_end_date = workEndDate || undefined;
        payload.delay_penalty_rate = delayPenaltyRate || undefined;
        payload.special_terms = specialTerms || undefined;
      } else {
        payload.public_platform_type = publicPlatformType;
        payload.public_contract_reference = publicReference || undefined;
        payload.public_notice_number = publicNoticeNumber || undefined;
        payload.public_bid_number = publicBidNumber || undefined;
      }

      const response = await api.createContract(projectId, payload);
      if (!response.success || !response.data) return;

      if (
        selectedContractKind === "public_platform" &&
        publicSourceFile &&
        response.data.id
      ) {
        await api.uploadContractSource(response.data.id, {
          file: publicSourceFile,
          public_platform_type: publicPlatformType,
          public_contract_reference: publicReference || undefined,
          public_notice_number: publicNoticeNumber || undefined,
          public_bid_number: publicBidNumber || undefined,
        });
      }

      await loadContracts();
      setShowCreateModal(false);
      resetCreateForm();
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

  async function handleFinalizeContract(contractId: string) {
    try {
      const response = await api.finalizeContract(contractId);
      if (response.success) {
        await loadContracts();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleDownloadPDF(contract: ContractDetail) {
    if (USE_MOCKS) {
      const downloadUrl = buildSampleFileDownloadUrl(
        PROJECT_MOCK_EXPORT_SAMPLE_FILES.contractPdf,
      );
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `계약서_${contract.id}.pdf`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    if (contract.contract_kind === "public_platform" && contract.source_document_path) {
      window.open(`/api/v1/contracts/${contract.id}/source`, "_blank");
      return;
    }

    window.open(`/api/v1/contracts/${contract.id}/pdf`, "_blank");
  }

  async function handleDownloadExcel() {
    const dataRows = contracts.map((contract, index) => ({
      No: index + 1,
      계약번호: contract.contract_number || contract.id,
      구분: contract.contract_kind === "public_platform" ? "관공서" : "민간",
      상태: contractStatusLabels[contract.status],
      계약금액: Number(contract.contract_amount),
      완성도: `${contract.completeness?.completion_rate ?? 0}%`,
      생성일: contract.created_at,
      서명일: contract.signed_at || "",
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("계약서 목록");
    const headers = Object.keys(dataRows[0]);
    worksheet.addRow(headers);

    for (const row of dataRows) {
      worksheet.addRow(Object.values(row));
    }

    worksheet.columns.forEach((col) => {
      col.width = 18;
    });

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
              <p className="mt-4 text-slate-500">아직 계약서가 없습니다.</p>
              <p className="mt-1 text-sm text-slate-400">
                승인된 견적서를 기반으로 계약서를 생성해 보세요.
              </p>
              <Button className="mt-6" onClick={() => setShowCreateModal(true)}>
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
                    <th className="pb-3 font-medium">구분</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">계약금액</th>
                    <th className="pb-3 font-medium">완성도</th>
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
                      <td className="py-4 text-sm text-slate-600">
                        {contract.contract_kind === "public_platform"
                          ? "관공서"
                          : "민간"}
                      </td>
                      <td className="py-4">
                        <Badge className={contractStatusColors[contract.status]}>
                          {contractStatusLabels[contract.status]}
                        </Badge>
                      </td>
                      <td className="py-4 font-medium text-slate-900">
                        {Number(contract.contract_amount).toLocaleString()}원
                      </td>
                      <td className="py-4 text-slate-600">
                        {contract.completeness?.completion_rate ?? 0}%
                      </td>
                      <td className="py-4 text-slate-500">
                        {formatDate(contract.created_at)}
                      </td>
                      <td className="py-4 text-slate-500">
                        {contract.signed_at ? formatDate(contract.signed_at) : "-"}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {contract.status === "draft" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleFinalizeContract(contract.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                              확정
                            </Button>
                          )}
                          {contract.status === "draft" &&
                            contract.contract_kind === "private_standard" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleSendForSignature(contract.id)}
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
                                  모두싸인
                                </Button>
                              </>
                            )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadPDF(contract)}
                          >
                            <Download className="h-4 w-4" />
                            {contract.contract_kind === "public_platform" ? "원본" : "PDF"}
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

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
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
              <label className="block text-sm font-medium text-slate-700">계약 구분</label>
              <PrimitiveSelect
                value={selectedContractKind}
                onChange={(e) => setSelectedContractKind(e.target.value as ContractKind)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="private_standard">민간 표준계약 (모두싸인)</option>
                <option value="public_platform">관공서 계약 (원본 업로드)</option>
              </PrimitiveSelect>
            </div>

            {selectedContractKind === "private_standard" ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">발주자명</label>
                    <input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">발주자 대표자</label>
                    <input
                      value={ownerRepresentative}
                      onChange={(e) => setOwnerRepresentative(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">발주자 사업자번호</label>
                    <input
                      value={ownerBusinessNumber}
                      onChange={(e) => setOwnerBusinessNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">발주자 연락처</label>
                    <input
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">발주자 주소</label>
                  <input
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">계약일</label>
                    <input
                      type="date"
                      value={contractDate}
                      onChange={(e) => setContractDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">착공일</label>
                    <input
                      type="date"
                      value={workStartDate}
                      onChange={(e) => setWorkStartDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">준공예정일</label>
                    <input
                      type="date"
                      value={workEndDate}
                      onChange={(e) => setWorkEndDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">지체상금율</label>
                  <input
                    value={delayPenaltyRate}
                    onChange={(e) => setDelayPenaltyRate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="예: 0.0005"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">특약사항</label>
                  <textarea
                    value={specialTerms}
                    onChange={(e) => setSpecialTerms(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">플랫폼</label>
                    <PrimitiveSelect
                      value={publicPlatformType}
                      onChange={(e) => setPublicPlatformType(e.target.value as PublicPlatformType)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="narajangteo">나라장터</option>
                      <option value="s2b">S2B</option>
                      <option value="etc">기타</option>
                    </PrimitiveSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">계약참조번호</label>
                    <input
                      value={publicReference}
                      onChange={(e) => setPublicReference(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">공고번호</label>
                    <input
                      value={publicNoticeNumber}
                      onChange={(e) => setPublicNoticeNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">입찰번호</label>
                    <input
                      value={publicBidNumber}
                      onChange={(e) => setPublicBidNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">관공서 원본 계약서 파일</label>
                  <input
                    type="file"
                    accept=".pdf,.hwp,.hwpx,.doc,.docx"
                    onChange={(e) => setPublicSourceFile(e.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    관공서 계약은 업로드 원본을 기준으로 관리합니다.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              resetCreateForm();
            }}
          >
            <X className="h-4 w-4" />
            취소
          </Button>
          {availableEstimates.length > 0 && (
            <Button onClick={handleCreateContract} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  생성
                </>
              )}
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
