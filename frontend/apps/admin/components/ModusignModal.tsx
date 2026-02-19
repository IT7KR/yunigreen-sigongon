"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Send, Download, X as XIcon } from "lucide-react";
import { Modal, Input, Button, Badge, useConfirmDialog } from "@sigongon/ui";
import type { ModusignStatus } from "@sigongon/types";
import { api } from "@/lib/api";

interface ModusignModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  onSuccess?: () => void;
}

interface ModusignRequestData {
  id?: string;
  contract_id?: string;
  status: string;
  signer_name?: string | null;
  signer_email?: string | null;
  signer_phone?: string | null;
  sent_at?: string | null;
  signed_at?: string | null;
  expired_at?: string | null;
  document_url?: string;
  sign_url?: string;
  message?: string;
  created_at?: string;
}

const modusignStatusConfig: Record<ModusignStatus, { label: string; icon: any; color: string }> = {
  pending: { label: "대기중", icon: Clock, color: "text-slate-500" },
  sent: { label: "발송됨", icon: Send, color: "text-blue-500" },
  viewed: { label: "열람됨", icon: CheckCircle2, color: "text-purple-500" },
  signed: { label: "서명완료", icon: CheckCircle2, color: "text-green-500" },
  rejected: { label: "거절됨", icon: XCircle, color: "text-red-500" },
  expired: { label: "만료됨", icon: XCircle, color: "text-slate-400" },
};

export function ModusignModal({ isOpen, onClose, contractId, onSuccess }: ModusignModalProps) {
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modusignRequest, setModusignRequest] = useState<ModusignRequestData | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (isOpen) {
      checkExistingRequest();
    }
  }, [isOpen, contractId]);

  async function checkExistingRequest() {
    try {
      setCheckingStatus(true);
      const response = await api.getModusignStatus(contractId);
      if (response.success && response.data) {
        const next = response.data as ModusignRequestData;
        // API returns "pending" when no sent request exists yet.
        setModusignRequest(next.status === "pending" ? null : next);
      }
    } catch (err) {
      // No existing request, that's fine
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleSendRequest() {
    if (!signerName || !signerEmail) {
      setError("서명자 정보를 모두 입력해 주세요");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signerEmail)) {
      setError("올바른 이메일 주소를 입력해 주세요");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.requestModusign(contractId, {
        signer_name: signerName,
        signer_email: signerEmail,
        signer_phone: signerPhone || undefined,
      });

      if (response.success && response.data) {
        setModusignRequest(response.data);
        onSuccess?.();
      } else {
        setError(response.error?.message || "전자서명 요청에 실패했어요");
      }
    } catch (err: any) {
      setError(err.message || "전자서명 요청에 실패했어요");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest() {
    const confirmed = await confirm({
      title: "전자서명 요청을 취소하시겠어요?",
      description: "취소 후에는 다시 요청해야 합니다.",
      confirmLabel: "요청 취소",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.cancelModusign(contractId);
      if (response.success) {
        setModusignRequest(null);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "요청 취소에 실패했어요");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const response = await api.downloadSignedDocument(contractId);
      if (response.success && response.data) {
        window.open(response.data.url, "_blank");
      }
    } catch (err: any) {
      setError(err.message || "다운로드에 실패했어요");
    }
  }

  function handleClose() {
    setSignerName("");
    setSignerEmail("");
    setSignerPhone("");
    setError(null);
    setModusignRequest(null);
    onClose();
  }

  function formatDateTime(value?: string | null) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("ko-KR");
  }

  function getStatusConfig(status: string) {
    if (status in modusignStatusConfig) {
      return modusignStatusConfig[status as ModusignStatus];
    }
    return modusignStatusConfig.pending;
  }

  if (checkingStatus) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="모두싸인 전자서명"
        description="전자계약 시스템을 통해 계약서에 서명을 요청합니다"
      >
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="모두싸인 전자서명"
      description="전자계약 시스템을 통해 계약서에 서명을 요청합니다"
      size="lg"
    >
      {modusignRequest ? (
        // Display existing request status
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  {(() => {
                    const statusConfig = getStatusConfig(modusignRequest.status);
                    const StatusIcon = statusConfig.icon;
                    return <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />;
                  })()}
                  <span className="font-medium text-slate-900">
                    {getStatusConfig(modusignRequest.status).label}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">서명자</span>
                    <span className="font-medium text-slate-900">{modusignRequest.signer_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">이메일</span>
                    <span className="text-slate-900">{modusignRequest.signer_email || "-"}</span>
                  </div>
                  {modusignRequest.signer_phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">전화번호</span>
                      <span className="text-slate-900">{modusignRequest.signer_phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">발송일시</span>
                    <span className="text-slate-900">
                      {formatDateTime(modusignRequest.sent_at)}
                    </span>
                  </div>
                  {modusignRequest.signed_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">서명일시</span>
                      <span className="text-green-600 font-medium">
                        {formatDateTime(modusignRequest.signed_at)}
                      </span>
                    </div>
                  )}
                  {modusignRequest.expired_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">만료일시</span>
                      <span className="text-slate-900">
                        {formatDateTime(modusignRequest.expired_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {modusignRequest.status === "sent" && (
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p>서명자에게 이메일이 발송되었습니다. 이메일의 링크를 통해 서명을 진행할 수 있습니다.</p>
            </div>
          )}

          {modusignRequest.status === "viewed" && (
            <div className="rounded-lg bg-purple-50 p-4 text-sm text-purple-700">
              <p>서명자가 계약서를 열람했습니다. 서명 대기 중입니다.</p>
            </div>
          )}

          {modusignRequest.status === "signed" && (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              <p>서명이 완료되었습니다. 서명된 문서를 다운로드할 수 있습니다.</p>
            </div>
          )}

          {modusignRequest.status === "rejected" && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <p>서명자가 계약을 거절했습니다.</p>
            </div>
          )}

          {modusignRequest.status === "expired" && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>서명 요청이 만료되었습니다. 새로운 요청을 보내주세요.</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {modusignRequest.status === "signed" && (
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4" />
                서명된 문서 다운로드
              </Button>
            )}
            {(modusignRequest.status === "sent" || modusignRequest.status === "viewed") && (
              <Button
                variant="secondary"
                onClick={handleCancelRequest}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "요청 취소"}
              </Button>
            )}
            <Button variant="secondary" onClick={handleClose}>
              닫기
            </Button>
          </div>
        </div>
      ) : (
        // Request form
        <div className="space-y-6">
          <div className="space-y-4">
            <Input
              label="서명자 이름"
              placeholder="홍길동"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
            />
            <Input
              label="이메일"
              type="email"
              placeholder="signer@example.com"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              required
            />
            <Input
              label="전화번호 (선택)"
              type="tel"
              placeholder="010-0000-0000"
              value={signerPhone}
              onChange={(e) => setSignerPhone(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p>전자서명 요청 후 서명자의 이메일로 서명 링크가 발송됩니다.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              취소
            </Button>
            <Button onClick={handleSendRequest} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  전자서명 요청
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
