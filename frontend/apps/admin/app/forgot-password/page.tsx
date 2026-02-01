"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardContent } from "@sigongon/ui";
import { Droplets, ArrowLeft, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type Step = "username" | "verify" | "reset" | "complete";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string) => {
    return (
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  };

  const handleRequestReset = async () => {
    if (!username || username.length < 4) {
      setErrors({ username: "아이디를 입력하세요" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await api.requestPasswordReset(username);
      if (res.success && res.data) {
        setOtpRequestId(res.data.request_id);
        setMaskedPhone(res.data.masked_phone);
        setStep("verify");
      } else {
        setErrors({ username: res.error?.message || "등록된 사용자를 찾을 수 없어요" });
      }
    } catch {
      setErrors({ username: "등록된 사용자를 찾을 수 없어요" });
    }

    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setErrors({ code: "6자리 인증번호를 입력하세요" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await api.verifyOtp(otpRequestId, verificationCode);
      if (res.success && res.data?.verified) {
        setStep("reset");
      } else {
        setErrors({ code: "인증번호가 올바르지 않습니다" });
      }
    } catch {
      setErrors({ code: "인증번호가 올바르지 않거나 만료되었습니다" });
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    const newErrors: Record<string, string> = {};

    if (!validatePassword(newPassword)) {
      newErrors.newPassword = "8자 이상, 영문+숫자+특수문자를 포함해야 합니다";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await api.confirmPasswordReset(otpRequestId, verificationCode, newPassword);
      if (res.success) {
        setStep("complete");
      } else {
        setErrors({ newPassword: "비밀번호 변경에 실패했습니다" });
      }
    } catch {
      setErrors({ newPassword: "비밀번호 변경 중 오류가 발생했습니다" });
    }

    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const res = await api.requestPasswordReset(username);
      if (res.success && res.data) {
        setOtpRequestId(res.data.request_id);
      }
    } catch {
      // 에러 무시
    }
    setLoading(false);
    setVerificationCode("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          {/* Step: Enter Username */}
          {step === "username" && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-bold text-slate-900">비밀번호 찾기</h1>
                <p className="mt-2 text-sm text-slate-600">
                  가입 시 등록한 아이디를 입력하시면
                  <br />
                  등록된 휴대폰으로 인증번호를 보내드립니다.
                </p>
              </div>

              <Input
                label="아이디"
                placeholder="아이디 입력"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={errors.username}
                autoFocus
              />

              <Button
                onClick={handleRequestReset}
                fullWidth
                disabled={loading || !username}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "인증번호 발송"
                )}
              </Button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                로그인으로 돌아가기
              </Link>
            </div>
          )}

          {/* Step: Verify Code */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-bold text-slate-900">인증번호 확인</h1>
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{maskedPhone}</span>
                  <br />
                  으로 발송된 6자리 인증번호를 입력하세요.
                </p>
              </div>

              <Input
                label="인증번호"
                placeholder="6자리 숫자 입력"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationCode(value);
                }}
                error={errors.code}
                maxLength={6}
                autoFocus
              />

              <Button
                onClick={handleVerifyCode}
                fullWidth
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "확인"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-brand-point-600 hover:text-brand-point-700"
                >
                  인증번호 다시 받기
                </button>
              </div>

              <button
                onClick={() => setStep("username")}
                className="flex w-full items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                아이디 다시 입력
              </button>
            </div>
          )}

          {/* Step: Reset Password */}
          {step === "reset" && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-bold text-slate-900">새 비밀번호 설정</h1>
                <p className="mt-2 text-sm text-slate-600">
                  새로운 비밀번호를 입력해주세요.
                </p>
              </div>

              <Input
                type="password"
                label="새 비밀번호"
                placeholder="8자 이상, 영문+숫자+특수문자"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.newPassword}
                autoFocus
              />

              <Input
                type="password"
                label="새 비밀번호 확인"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />

              <Button
                onClick={handleResetPassword}
                fullWidth
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "비밀번호 변경"
                )}
              </Button>
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  비밀번호가 변경되었습니다
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  새로운 비밀번호로 로그인해주세요.
                </p>
              </div>

              <Button onClick={() => router.push("/login")} fullWidth>
                로그인하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-slate-400">
        © 2026 시공ON. All rights reserved.
      </p>
    </div>
  );
}
