"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, MessageSquare, Copy, Check } from "lucide-react";
import { Button, Modal, PrimitiveInput, PrimitiveSelect } from "@sigongon/ui";
import type { UserRole } from "@sigongon/types";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: { phone: string; name: string; role: UserRole }) => Promise<{
    token: string;
    invite_url: string;
  }>;
  /** Current user's role - determines which roles can be invited */
  currentUserRole?: UserRole;
}

/** Role options with Korean labels */
const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "site_manager", label: "현장소장", description: "프로젝트 현장 관리 담당" },
  { value: "company_admin", label: "대표", description: "회사 전체 관리 권한" },
  { value: "worker", label: "근로자", description: "일용직 근로자" },
  { value: "super_admin", label: "슈퍼관리자", description: "시스템 전체 관리" },
];

export function InviteUserModal({
  isOpen,
  onClose,
  onInvite,
  currentUserRole = "company_admin",
}: InviteUserModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("site_manager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Available roles based on current user's role:
   * - super_admin: can invite all roles
   * - company_admin: can only invite site_manager (within same org)
   * - site_manager/worker: cannot invite users (should not see this modal)
   */
  const availableRoles = useMemo(() => {
    if (currentUserRole === "super_admin") {
      return ROLE_OPTIONS;
    }
    if (currentUserRole === "company_admin") {
      return ROLE_OPTIONS.filter((r) => r.value === "site_manager");
    }
    return [];
  }, [currentUserRole]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setName("");
      setPhone("");
      setRole(availableRoles[0]?.value || "site_manager");
      setError(null);
      setInviteUrl(null);
      setCopied(false);
    }
  }, [isOpen, availableRoles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      setError("이름과 전화번호는 필수입니다");
      return;
    }

    // Korean phone number validation (010-xxxx-xxxx or 01xxxxxxxxx)
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(phone)) {
      setError("올바른 전화번호 형식이 아닙니다");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await onInvite({
        name: name.trim(),
        phone: phone.trim(),
        role,
      });

      // Show success state with invite URL
      const fullUrl = `${window.location.origin}${result.invite_url}`;
      setInviteUrl(fullUrl);
    } catch (err: any) {
      setError(err?.message || "초대 발송에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose() {
    setInviteUrl(null);
    onClose();
  }

  // Success view
  if (inviteUrl) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="초대 링크 생성 완료"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  {name}님에게 초대 링크가 생성되었습니다
                </p>
                <p className="mt-1 text-sm text-green-700">
                  {phone}으로 알림톡이 발송되었습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">초대 링크</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs text-slate-700">
                {inviteUrl}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    복사
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            * 초대 링크는 7일 후 만료됩니다.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setInviteUrl(null);
                setName("");
                setPhone("");
              }}
            >
              다른 사용자 초대
            </Button>
            <Button type="button" className="flex-1" onClick={handleClose}>
              완료
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Form view
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="사용자 초대"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          초대받은 사용자가 직접 비밀번호를 설정합니다.
        </p>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            이름 *
          </label>
          <PrimitiveInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            placeholder="홍길동"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            전화번호 *
          </label>
          <PrimitiveInput
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            placeholder="010-0000-0000"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            역할
          </label>
          <PrimitiveSelect
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={availableRoles.length <= 1}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200 disabled:bg-slate-100"
          >
            {availableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </PrimitiveSelect>
          {availableRoles.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {availableRoles.find((r) => r.value === role)?.description}
            </p>
          )}
          {currentUserRole === "company_admin" && (
            <p className="mt-1 text-xs text-slate-500">
              회사 대표는 현장소장만 초대할 수 있습니다
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                초대 보내기
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
