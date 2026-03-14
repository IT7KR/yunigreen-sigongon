"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  PrimitiveInput,
} from "@sigongcore/ui";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  Loader2,
  ShieldX,
  Trash2,
} from "lucide-react";
import type { DeleteFlowStep } from "./useDeleteUser";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_name: string;
  is_active: boolean;
}

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo;
  flowState: DeleteFlowStep;
  onConfirm: (reason: string) => void;
  onDeactivate?: () => void;
}

export function DeleteUserModal({
  isOpen,
  onClose,
  user,
  flowState,
  onConfirm,
  onDeactivate,
}: DeleteUserModalProps) {
  const [reason, setReason] = useState("");
  const [nameConfirm, setNameConfirm] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const conditionsMet = nameConfirm.trim() === user.name && reason.trim().length >= 10;
  const isReady = conditionsMet && cooldown === 0;

  useEffect(() => {
    if (!conditionsMet) {
      setCooldown(0);
      return;
    }
    setCooldown(3);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [conditionsMet]);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setNameConfirm("");
      setCooldown(0);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={flowState.step === "blocked" ? "계정 삭제 불가" : "계정 삭제 확인"}
      size="md"
    >
      {/* 로딩 */}
      {flowState.step === "checking" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">삭제 가능 여부를 확인하고 있어요...</p>
        </div>
      )}

      {/* 에러 */}
      {flowState.step === "error" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-sm text-slate-700">{flowState.message}</p>
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </div>
      )}

      {/* 삭제 불가 */}
      {flowState.step === "blocked" && (
        <div className="space-y-5">
          <div className="rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200/50">
            <div className="flex items-start gap-3">
              <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">이 계정은 삭제할 수 없어요.</p>
                <p className="mt-1 text-xs text-red-600">연결된 비즈니스 데이터가 있어서 계정을 보호하고 있어요.</p>
              </div>
            </div>
          </div>

          {Object.keys(flowState.check.business_data).length > 0 && (
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/50">
              <ul className="space-y-1.5 text-sm text-slate-700">
                {Object.entries(flowState.check.business_data).map(([label, count]) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    {label} {count}건
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-xs leading-relaxed text-blue-800">
              계정을 비활성화하면 로그인이 차단되지만 기존 데이터는 안전하게 유지돼요.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>닫기</Button>
            {onDeactivate && user.is_active && (
              <Button variant="secondary" className="flex-1" onClick={onDeactivate}>
                비활성화로 전환
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 삭제 가능 */}
      {(flowState.step === "deletable" || flowState.step === "confirming") && (
        <div className="space-y-5">
          <div className="rounded-xl bg-red-50 p-4 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {user.name} ({user.email})
            </p>
            <p className="mt-1 text-xs text-red-600">이 작업은 되돌릴 수 없어요.</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              삭제된 계정 정보는 법적 의무에 따라 5년간 보관 후 폐기됩니다.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              삭제 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 퇴사, 중복 계정, 테스트 계정 정리"
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              {reason.trim().length < 10
                ? `최소 10자 이상 입력해 주세요. (${reason.trim().length}/10)`
                : `${reason.trim().length}자`}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-600">
              확인을 위해 <strong className="text-slate-900">{user.name}</strong>을(를) 입력해 주세요.
            </label>
            <PrimitiveInput
              value={nameConfirm}
              onChange={(e) => setNameConfirm(e.target.value)}
              placeholder={user.name}
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={flowState.step === "confirming"}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!isReady || flowState.step === "confirming"}
              onClick={() => onConfirm(reason.trim())}
            >
              {flowState.step === "confirming" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> 삭제 중...</>
              ) : cooldown > 0 ? (
                `${cooldown}초 후 삭제 가능`
              ) : (
                <><Trash2 className="h-4 w-4" /> 영구 삭제</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
