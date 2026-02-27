"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@sigongon/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Save, Pencil, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "최고관리자",
  company_admin: "대표",
  site_manager: "현장소장",
  worker: "작업자",
};

export function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const handleEdit = () => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await api.updateMyProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      if (response.success) {
        await refreshUser();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\. /g, ".").replace(/\.$/, "");
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const datePart = formatDate(dateString);
    const timePart = date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} ${timePart}`;
  };

  const shouldShowOrganization = user?.role === "company_admin" || user?.role === "site_manager";

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>기본 정보</CardTitle>
        {!isEditing ? (
          <Button variant="secondary" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            수정
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
            취소
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* 이름 */}
          <div>
            <label className="text-sm font-medium text-slate-500">이름</label>
            {isEditing ? (
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-slate-900">{user.name}</p>
            )}
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-sm font-medium text-slate-500">이메일</label>
            {isEditing ? (
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
                disabled
              />
            ) : (
              <p className="mt-1 text-slate-900">{user.email || "-"}</p>
            )}
          </div>

          {/* 연락처 */}
          <div>
            <label className="text-sm font-medium text-slate-500">연락처</label>
            {isEditing ? (
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-slate-900">{user.phone || "-"}</p>
            )}
          </div>

          {/* 아이디 */}
          <div>
            <label className="text-sm font-medium text-slate-500">아이디</label>
            <p className="mt-1 text-slate-900">{user.username}</p>
          </div>

          {/* 역할 */}
          <div>
            <label className="text-sm font-medium text-slate-500">역할</label>
            <p className="mt-1 text-slate-900">{ROLE_LABELS[user.role] || user.role}</p>
          </div>

          {/* 소속 - 조건부 표시 */}
          {shouldShowOrganization && (
            <div>
              <label className="text-sm font-medium text-slate-500">소속</label>
              <p className="mt-1 text-slate-900">{user.organization?.name || "-"}</p>
            </div>
          )}

          {/* 가입일 */}
          <div>
            <label className="text-sm font-medium text-slate-500">가입일</label>
            <p className="mt-1 text-slate-900">{formatDate(user.created_at)}</p>
          </div>

          {/* 최근 로그인 */}
          <div>
            <label className="text-sm font-medium text-slate-500">최근 로그인</label>
            <p className="mt-1 text-slate-900">{formatDateTime(user.last_login_at)}</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
