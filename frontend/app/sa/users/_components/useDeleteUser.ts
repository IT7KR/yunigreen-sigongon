"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";

interface DeletionCheckResult {
  deletable: boolean;
  blocking_reasons: Array<{ code: string; message: string; detail: string }>;
  business_data: Record<string, number>;
}

export type DeleteFlowStep =
  | { step: "idle" }
  | { step: "checking" }
  | { step: "deletable"; check: DeletionCheckResult }
  | { step: "blocked"; check: DeletionCheckResult }
  | { step: "confirming" }
  | { step: "error"; message: string };

export function useDeleteUser(onDeleted: () => void) {
  const [flowState, setFlowState] = useState<DeleteFlowStep>({ step: "idle" });
  const [isOpen, setIsOpen] = useState(false);

  const startDeletionCheck = useCallback(async (userId: string) => {
    setIsOpen(true);
    setFlowState({ step: "checking" });

    try {
      const result = await api.checkUserDeletion(userId);
      if (result.success && result.data) {
        setFlowState(
          result.data.deletable
            ? { step: "deletable", check: result.data }
            : { step: "blocked", check: result.data },
        );
      } else {
        setFlowState({ step: "error", message: "삭제 가능 여부를 확인할 수 없어요." });
      }
    } catch {
      setFlowState({ step: "error", message: "삭제 가능 여부를 확인할 수 없어요." });
    }
  }, []);

  const executeDelete = useCallback(
    async (userId: string, reason: string) => {
      setFlowState({ step: "confirming" });
      try {
        const result = await api.deleteUser(userId, reason);
        if (result.success) {
          setIsOpen(false);
          setFlowState({ step: "idle" });
          onDeleted();
          return true;
        }
        setFlowState({ step: "error", message: "삭제에 실패했어요." });
        return false;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 409) {
          setFlowState({ step: "error", message: "다른 관리자가 이 계정을 이미 변경했어요." });
        } else if (status === 404) {
          setFlowState({ step: "error", message: "이미 삭제된 계정이에요." });
          onDeleted();
        } else {
          setFlowState({ step: "error", message: "삭제에 실패했어요. 잠시 후 다시 시도해주세요." });
        }
        return false;
      }
    },
    [onDeleted],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setFlowState({ step: "idle" });
  }, []);

  return { flowState, isOpen, startDeletionCheck, executeDelete, close };
}
