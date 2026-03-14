"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  useConfirmDialog,
  formatDate,
} from "@sigongcore/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LogOut, UserX, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@sigongcore/ui";

const WITHDRAWAL_REASONS = [
  "서비스가 더 이상 필요하지 않아요",
  "다른 서비스로 이전할 예정이에요",
  "사용 빈도가 낮아요",
  "서비스에 불만족해요",
  "기타",
];

export function AccountManagementSection() {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<{
    scheduled_at: string | null;
    remaining_days: number | null;
  }>({ scheduled_at: null, remaining_days: null });
  const { confirm } = useConfirmDialog();

  const isSuperAdmin = user?.role === "super_admin";
  const canDeactivate =
    user?.role === "company_admin" || user?.role === "site_manager";
  const canDelete =
    user?.role === "company_admin" || user?.role === "site_manager";

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getWithdrawalStatus();
        if (result.success && result.data) {
          setIsWithdrawing(result.data.is_withdrawing);
          setWithdrawalStatus({
            scheduled_at: result.data.scheduled_at,
            remaining_days: result.data.remaining_days,
          });
        }
      } catch {
        // 비로그인 등
      }
    })();
  }, []);

  const handleLogoutAll = async () => {
    const confirmed = await confirm({
      title: "모든 기기에서 로그아웃하시겠습니까?",
      confirmLabel: "로그아웃",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);
    try {
      await api.logoutAllDevices();
      toast.success("모든 기기에서 로그아웃되었습니다");
      logout();
    } catch (error) {
      toast.error("로그아웃 실패", {
        description: "다시 시도해 주세요",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = await confirm({
      title: "정말 계정을 비활성화하시겠습니까?",
      description: "비활성화 후에는 로그인할 수 없습니다.",
      confirmLabel: "비활성화",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);
    try {
      await api.requestAccountDeactivation();
      toast.success("계정이 비활성화되었습니다");
      logout();
    } catch (error) {
      toast.error("비활성화 실패", {
        description: "다시 시도해 주세요",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!deletePassword || !deleteReason) {
      toast.error("입력이 필요합니다", {
        description: "비밀번호와 탈퇴 사유를 선택해 주세요",
      });
      return;
    }

    const confirmed = await confirm({
      title: "정말 회원 탈퇴를 신청하시겠습니까?",
      description: "30일 후 계정이 영구 삭제됩니다. 유예 기간 중 철회할 수 있습니다.",
      confirmLabel: "탈퇴 신청",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);
    try {
      const result = await api.requestWithdrawal(deletePassword, deleteReason);
      if (result.success && result.data) {
        toast.success("탈퇴 신청이 접수되었습니다", {
          description: result.data.message,
        });
        setIsWithdrawing(true);
        setWithdrawalStatus({
          scheduled_at: result.data.scheduled_at,
          remaining_days: 30,
        });
        setShowDeleteConfirm(false);
        setDeletePassword("");
        setDeleteReason("");
      }
    } catch (error) {
      toast.error("탈퇴 신청 실패", {
        description: "비밀번호를 확인하고 다시 시도해 주세요",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelWithdrawal = async () => {
    setIsCancelling(true);
    try {
      const result = await api.cancelWithdrawal();
      if (result.success) {
        toast.success("탈퇴 신청이 철회되었습니다");
        setIsWithdrawing(false);
        setWithdrawalStatus({ scheduled_at: null, remaining_days: null });
      }
    } catch (error) {
      toast.error("철회 실패", {
        description: "다시 시도해 주세요",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          계정 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section A: 모든 기기에서 로그아웃 */}
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-slate-900">
              모든 기기에서 로그아웃
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              현재 기기를 포함한 모든 기기에서 로그아웃합니다
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogoutAll}
            disabled={processing}
          >
            <LogOut className="h-4 w-4" />
            모든 기기에서 로그아웃
          </Button>
        </div>

        {/* Section B: 계정 비활성화 (admin only) */}
        {!isSuperAdmin && canDeactivate && (
          <>
            <div className="border-t pt-6" />
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-slate-900">계정 비활성화</h3>
                <p className="mt-1 text-sm text-slate-500">
                  계정을 비활성화하면 로그인할 수 없습니다. 관리자에게 문의하여
                  다시 활성화할 수 있습니다.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeactivate}
                disabled={processing}
              >
                <UserX className="h-4 w-4" />
                계정 비활성화
              </Button>
            </div>
          </>
        )}

        {/* Section C: 회원 탈퇴 (admin only) */}
        {isSuperAdmin && (
          <>
            <div className="border-t pt-6" />
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  최고관리자 계정은 본인이 직접 탈퇴할 수 없습니다
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  탈퇴가 필요하신 경우 고객센터에 문의해 주세요.
                </p>
              </div>
            </div>
          </>
        )}

        {!isSuperAdmin && canDelete && (
          <>
            <div className="border-t pt-6" />
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-slate-900">회원 탈퇴</h3>
                <p className="mt-1 text-sm text-slate-500">
                  탈퇴 신청 후 30일 유예 기간이 지나면 계정이 영구 삭제됩니다.
                  유예 기간 중에는 언제든 철회할 수 있습니다.
                </p>
              </div>

              {isWithdrawing ? (
                <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">회원 탈퇴가 진행 중입니다</p>
                      <p className="mt-1 text-xs text-amber-800">
                        탈퇴 예정일: {withdrawalStatus.scheduled_at ? formatDate(withdrawalStatus.scheduled_at) : "—"} (D-{withdrawalStatus.remaining_days ?? 0})
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        예정일이 지나면 계정이 영구 삭제됩니다.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleCancelWithdrawal}
                    disabled={isCancelling}
                    className="w-full"
                  >
                    {isCancelling ? "처리 중..." : "탈퇴 철회하기"}
                  </Button>
                </div>
              ) : !showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  회원 탈퇴
                </Button>
              ) : (
                <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-red-900">
                        탈퇴 신청 후 30일 유예 기간이 적용됩니다
                      </p>
                      <p className="mt-1 text-xs text-red-700">
                        유예 기간 중 탈퇴를 철회할 수 있으며, 이후 모든 데이터가 영구 삭제됩니다.
                      </p>
                    </div>
                  </div>

                  <Input
                    type="password"
                    label="비밀번호 확인"
                    placeholder="현재 비밀번호를 입력하세요"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">탈퇴 사유</p>
                    <div className="space-y-2">
                      {WITHDRAWAL_REASONS.map((reason) => (
                        <label
                          key={reason}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:bg-slate-50 has-[:checked]:border-red-300 has-[:checked]:bg-red-50"
                        >
                          <input
                            type="radio"
                            name="withdrawal-reason"
                            value={reason}
                            checked={deleteReason === reason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            className="accent-red-600"
                          />
                          <span className="text-sm text-slate-700">{reason}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword("");
                        setDeleteReason("");
                      }}
                      disabled={processing}
                    >
                      취소
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRequestWithdrawal}
                      disabled={!deletePassword || !deleteReason || processing}
                    >
                      <Trash2 className="h-4 w-4" />
                      탈퇴 신청하기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
