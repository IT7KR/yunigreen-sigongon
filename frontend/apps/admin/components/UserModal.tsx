"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button, Modal } from "@sigongon/ui";
import type { UserRole } from "@sigongon/types";

interface UserData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserData & { password?: string }) => Promise<void>;
  user?: UserData | null;
  /** Current user's role - determines which roles can be created */
  currentUserRole?: UserRole;
}

/** Role options with Korean labels */
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "site_manager", label: "현장소장" },
  { value: "company_admin", label: "대표" },
  { value: "worker", label: "근로자" },
  { value: "super_admin", label: "슈퍼관리자" },
];

export function UserModal({
  isOpen,
  onClose,
  onSave,
  user,
  currentUserRole = "company_admin",
}: UserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("site_manager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!user;

  /**
   * Available roles based on current user's role:
   * - super_admin: can create all roles
   * - company_admin: can only create site_manager (within same org)
   * - site_manager/worker: cannot create users (should not see this modal)
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
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || "");
      setRole(user.role);
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      // Default to first available role
      setRole(availableRoles[0]?.value || "site_manager");
      setPassword("");
    }
    setError(null);
  }, [user, isOpen, availableRoles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setError("이름과 이메일은 필수입니다");
      return;
    }

    if (!isEditMode && !password.trim()) {
      setError("비밀번호를 입력해주세요");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onSave({
        id: user?.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        password: password || undefined,
      });

      onClose();
    } catch (err) {
      setError("저장에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "사용자 수정" : "사용자 추가"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            이름 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="홍길동"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            이메일 *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEditMode}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-100"
            placeholder="user@example.com"
          />
        </div>

        {!isEditMode && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              비밀번호 *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="••••••••"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            전화번호
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="010-1234-5678"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            역할
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={availableRoles.length <= 1}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-100"
          >
            {availableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {currentUserRole === "company_admin" && (
            <p className="mt-1 text-xs text-slate-500">
              회사 대표는 현장소장만 추가할 수 있습니다
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
            ) : isEditMode ? (
              "수정"
            ) : (
              "추가"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
