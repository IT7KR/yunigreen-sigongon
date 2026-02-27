"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  useConfirmDialog,
} from "@sigongon/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LogOut, UserX, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@sigongon/ui";

export function AccountManagementSection() {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { confirm } = useConfirmDialog();

  const isSuperAdmin = user?.role === "super_admin";
  const canDeactivate = user?.role === "company_admin" || user?.role === "site_manager";
  const canDelete = user?.role === "company_admin" || user?.role === "site_manager";

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

  const handleDeleteAccount = async () => {
    if (!deletePassword || !deleteReason) {
      toast.error("입력이 필요합니다", {
        description: "비밀번호와 탈퇴 사유를 입력해 주세요",
      });
      return;
    }

    const confirmed = await confirm({
      title: "정말 회원 탈퇴하시겠습니까?",
      description: "모든 데이터가 삭제되며 복구할 수 없습니다.",
      confirmLabel: "탈퇴",
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);
    try {

      await api.requestAccountDeletion({
        password: deletePassword,
        reason: deleteReason,
      });
      toast.success("회원 탈퇴가 완료되었습니다");
      logout();
    } catch (error) {
      toast.error("탈퇴 실패", {
        description: "비밀번호를 확인하고 다시 시도해 주세요",
      });
    } finally {
      setProcessing(false);
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
                  계정을 비활성화하면 로그인할 수 없습니다. 관리자에게 문의하여 다시
                  활성화할 수 있습니다.
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
        {!isSuperAdmin && canDelete && (
          <>
            <div className="border-t pt-6" />
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-slate-900">회원 탈퇴</h3>
                <p className="mt-1 text-sm text-slate-500">
                  회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                </p>
              </div>

              {!showDeleteConfirm ? (
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
                        정말로 탈퇴하시겠습니까?
                      </p>
                      <p className="mt-1 text-xs text-red-700">
                        모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
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

                  <Textarea
                    label="탈퇴 사유"
                    rows={4}
                    placeholder="탈퇴 사유를 입력해 주세요"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />

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
                      onClick={handleDeleteAccount}
                      disabled={
                        !deletePassword || !deleteReason || processing
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      탈퇴하기
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
