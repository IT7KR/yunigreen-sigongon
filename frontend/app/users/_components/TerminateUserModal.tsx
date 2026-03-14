"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Modal, PrimitiveInput, toast } from "@sigongcore/ui";
import { AlertTriangle, Loader2, ShieldX, UserMinus } from "lucide-react";
import { api } from "@/lib/api";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TerminateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  onTerminated: () => void;
}

type FlowStep =
  | { step: "checking" }
  | { step: "blocked"; reasons: Array<{ code: string; message: string }> }
  | { step: "confirmable"; projects: Array<{ project_id: string; project_name: string; status: string }> }
  | { step: "submitting" }
  | { step: "error"; message: string };

export function TerminateUserModal({ isOpen, onClose, user, onTerminated }: TerminateUserModalProps) {
  const [flowState, setFlowState] = useState<FlowStep>({ step: "checking" });
  const [reason, setReason] = useState("");
  const [nameConfirm, setNameConfirm] = useState("");

  const userName = user?.name ?? "";
  const conditionsMet = nameConfirm.trim() === userName && reason.trim().length >= 5;

  // 모달 열릴 때 사전 검증
  useEffect(() => {
    if (!isOpen || !user) return;
    setReason("");
    setNameConfirm("");
    setFlowState({ step: "checking" });

    (async () => {
      try {
        const result = await api.checkTermination(user.id);
        if (result.success && result.data) {
          if (result.data.can_terminate) {
            setFlowState({
              step: "confirmable",
              projects: result.data.assigned_projects,
            });
          } else {
            setFlowState({ step: "blocked", reasons: result.data.blocking_reasons });
          }
        } else {
          setFlowState({ step: "error", message: "퇴사 처리 가능 여부를 확인할 수 없어요." });
        }
      } catch {
        setFlowState({ step: "error", message: "퇴사 처리 가능 여부를 확인할 수 없어요." });
      }
    })();
  }, [isOpen, user]);

  const handleTerminate = useCallback(async () => {
    if (!user) return;
    setFlowState({ step: "submitting" });

    try {
      const result = await api.terminateUser(user.id, reason.trim());
      if (result.success) {
        onClose();
        onTerminated();
        toast.success(`${userName}님의 퇴사 처리가 완료되었어요.`);
      } else {
        setFlowState({ step: "error", message: "퇴사 처리에 실패했어요." });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setFlowState({ step: "error", message: "이미 변경된 계정이에요." });
      } else {
        setFlowState({ step: "error", message: "퇴사 처리에 실패했어요. 잠시 후 다시 시도해주세요." });
      }
    }
  }, [user, reason, userName, onClose, onTerminated]);

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`퇴사 처리 — ${userName}`} size="md">
      {/* 로딩 */}
      {flowState.step === "checking" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">퇴사 처리 가능 여부를 확인하고 있어요...</p>
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

      {/* 퇴사 불가 */}
      {flowState.step === "blocked" && (
        <div className="space-y-5">
          <div className="rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200/50">
            <div className="flex items-start gap-3">
              <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">퇴사 처리할 수 없어요.</p>
                {flowState.reasons.map((r, i) => (
                  <p key={i} className="mt-1 text-xs text-red-600">{r.message}</p>
                ))}
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={onClose}>닫기</Button>
        </div>
      )}

      {/* 퇴사 확인 */}
      {(flowState.step === "confirmable" || flowState.step === "submitting") && (
        <div className="space-y-5">
          {/* 경고 */}
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-xs leading-relaxed text-amber-800">
                <p className="font-semibold text-sm text-amber-900">퇴사 처리 안내</p>
                <ul className="mt-2 space-y-1">
                  <li>• 계정이 즉시 비활성화되어 로그인할 수 없어요</li>
                  <li>• 개인정보(이름, 연락처)가 익명화돼요</li>
                  <li>• 업무 데이터(보고서, 견적서 등)는 조직에 유지돼요</li>
                  <li>• 이 작업은 되돌릴 수 없어요</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 담당 프로젝트 안내 */}
          {flowState.step === "confirmable" && flowState.projects.length > 0 && (
            <div className="rounded-lg bg-blue-50 p-3 ring-1 ring-inset ring-blue-200/50">
              <p className="text-xs font-medium text-blue-800 mb-2">
                담당 프로젝트 {flowState.projects.length}건 (퇴사 시 담당자에서 제거됩니다)
              </p>
              <ul className="space-y-1">
                {flowState.projects.map((p) => (
                  <li key={p.project_id} className="text-xs text-blue-700">
                    • {p.project_name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 사유 입력 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              퇴사 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 자발적 퇴사, 계약 만료"
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* 이름 확인 */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-600">
              확인을 위해 <strong className="text-slate-900">{userName}</strong>을(를) 입력해 주세요.
            </label>
            <PrimitiveInput
              value={nameConfirm}
              onChange={(e) => setNameConfirm(e.target.value)}
              placeholder={userName}
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={flowState.step === "submitting"}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!conditionsMet || flowState.step === "submitting"}
              onClick={handleTerminate}
            >
              {flowState.step === "submitting" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> 처리 중...</>
              ) : (
                <><UserMinus className="h-4 w-4" /> 퇴사 처리</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
