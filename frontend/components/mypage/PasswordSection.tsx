"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PrimitiveButton } from "@sigongon/ui";
import { api } from "@/lib/api";
import { Lock, Eye, EyeOff } from "lucide-react";

export function PasswordSection() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!form.currentPassword) {
      newErrors.currentPassword = "현재 비밀번호를 입력해 주세요";
    }

    if (form.newPassword.length < 8) {
      newErrors.newPassword = "8자 이상이어야 합니다";
    } else if (
      !/[a-zA-Z]/.test(form.newPassword) ||
      !/[0-9]/.test(form.newPassword) ||
      !/[!@#$%^&*]/.test(form.newPassword)
    ) {
      newErrors.newPassword = "영문, 숫자, 특수문자를 포함해야 합니다";
    }

    if (form.confirmPassword !== form.newPassword) {
      newErrors.confirmPassword = "새 비밀번호가 일치하지 않습니다";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await api.changeMyPassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });

      setSuccess("비밀번호가 변경되었습니다");
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
    } catch (error) {
      setErrors({
        currentPassword: "비밀번호 변경에 실패했습니다",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 변경</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Input
                label="현재 비밀번호"
                type={showPasswords.current ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) =>
                  setForm({ ...form, currentPassword: e.target.value })
                }
                className={errors.currentPassword ? "border-red-500" : ""}
              />
              <PrimitiveButton
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </PrimitiveButton>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-500">
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <Input
                label="새 비밀번호"
                type={showPasswords.new ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) =>
                  setForm({ ...form, newPassword: e.target.value })
                }
                className={errors.newPassword ? "border-red-500" : ""}
              />
              <PrimitiveButton
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </PrimitiveButton>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <Input
                label="새 비밀번호 확인"
                type={showPasswords.confirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              <PrimitiveButton
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </PrimitiveButton>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>
              <Lock className="h-4 w-4" />
              {saving ? "저장 중..." : "비밀번호 변경"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
