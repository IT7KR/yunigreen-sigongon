"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button, formatDate, toast } from "@sigongcore/ui";
import { api } from "@/lib/api";

export function WithdrawalBanner() {
  const [status, setStatus] = useState<{
    is_withdrawing: boolean;
    scheduled_at: string | null;
    remaining_days: number | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getWithdrawalStatus();
        if (result.success && result.data) {
          setStatus(result.data);
        }
      } catch {
        // 비로그인 상태 등
      }
    })();
  }, []);

  if (!status?.is_withdrawing || dismissed) return null;

  const isUrgent = (status.remaining_days ?? 30) <= 7;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await api.cancelWithdrawal();
      if (result.success) {
        setStatus({ ...status, is_withdrawing: false });
      }
    } catch {
      toast.error("탈퇴 철회에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div
      role="alert"
      className={`sticky top-0 z-[60] flex items-center justify-between gap-3 px-4 py-3 ${
        isUrgent ? "bg-red-600 text-white" : "bg-amber-500 text-amber-950"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          탈퇴 예정 계정 | {status.scheduled_at ? formatDate(status.scheduled_at) : ""}에 삭제됩니다
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          isUrgent ? "bg-white/20 text-white" : "bg-amber-950/10 text-amber-950"
        }`}>
          D-{status.remaining_days ?? 0}
        </span>
        <Button
          size="sm"
          variant="outline"
          className={`h-7 text-xs ${
            isUrgent ? "border-white/40 text-white hover:bg-white/10" : ""
          }`}
          onClick={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling ? "처리 중..." : "탈퇴 철회"}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 transition-colors hover:bg-black/10"
          aria-label="배너 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
