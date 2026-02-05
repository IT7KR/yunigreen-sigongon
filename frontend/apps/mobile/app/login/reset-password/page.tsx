"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardContent, Input } from "@sigongon/ui";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { api } from "@/lib/api";

type PasswordResetStep = "request" | "verify" | "reset" | "done";

type PasswordResetApi = {
  requestPasswordResetOtp: (
    loginId: string,
    phone: string,
  ) => Promise<{
    success: boolean;
    data:
      | {
          request_id: string;
          expires_in_sec: number;
          channel?: "alimtalk";
          mock_otp?: string;
        }
      | null;
    error: { code: string; message: string } | null;
  }>;
  verifyPasswordResetOtp: (
    requestId: string,
    code: string,
  ) => Promise<{
    success: boolean;
    data: { verification_id: string } | null;
    error: { code: string; message: string } | null;
  }>;
  resetPasswordWithOtp: (
    verificationId: string,
    password: string,
  ) => Promise<{
    success: boolean;
    data: { success: boolean } | null;
    error: { code: string; message: string } | null;
  }>;
};

const passwordResetApi = api as unknown as PasswordResetApi;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<PasswordResetStep>("request");
  const [loginId, setLoginId] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [requestId, setRequestId] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestOtp() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await passwordResetApi.requestPasswordResetOtp(loginId, phone);
      if (!response.success || !response.data) {
        setError(response.error?.message || "알림톡 발송 요청에 실패했어요");
        return;
      }

      setRequestId(response.data.request_id);
      setMockOtp(response.data.mock_otp || null);
      setStep("verify");
    } catch {
      setError("알림톡 발송 요청 중 오류가 발생했어요");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await passwordResetApi.verifyPasswordResetOtp(
        requestId,
        code,
      );
      if (!response.success || !response.data) {
        setError(response.error?.message || "인증번호 확인에 실패했어요");
        return;
      }

      setVerificationId(response.data.verification_id);
      setStep("reset");
    } catch {
      setError("인증번호 확인 중 오류가 발생했어요");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요");
      return;
    }

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await passwordResetApi.resetPasswordWithOtp(
        verificationId,
        password,
      );
      if (!response.success) {
        setError(response.error?.message || "비밀번호 재설정에 실패했어요");
        return;
      }

      setStep("done");
    } catch {
      setError("비밀번호 재설정 중 오류가 발생했어요");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-primary-50 to-white p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-bold text-slate-900">비밀번호 재설정</h1>
            <p className="text-sm text-slate-500">
              아이디와 휴대폰 번호를 확인하고 알림톡 인증으로 재설정합니다.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {step === "request" && (
            <div className="space-y-4">
              <Input
                type="email"
                label="아이디(이메일)"
                placeholder="name@company.com"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                required
              />
              <Input
                type="tel"
                label="휴대폰 번호"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
              <Button
                fullWidth
                onClick={handleRequestOtp}
                loading={isSubmitting}
                disabled={isSubmitting || !loginId.trim() || !phone.trim()}
              >
                <Smartphone className="h-4 w-4" />
                알림톡 인증번호 받기
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <Input
                label="알림톡 인증번호"
                placeholder="6자리 숫자"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={6}
                required
              />
              {mockOtp && (
                <p className="text-xs text-brand-point-700">
                  목업 테스트 알림톡 인증번호:{" "}
                  <span className="font-semibold">{mockOtp}</span>
                </p>
              )}
              <Button
                fullWidth
                onClick={handleVerifyOtp}
                loading={isSubmitting}
                disabled={isSubmitting || code.trim().length !== 6}
              >
                <ShieldCheck className="h-4 w-4" />
                인증 확인
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={handleRequestOtp}
                disabled={isSubmitting}
              >
                알림톡 재전송
              </Button>
            </div>
          )}

          {step === "reset" && (
            <div className="space-y-4">
              <Input
                type="password"
                label="새 비밀번호"
                placeholder="8자 이상"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Input
                type="password"
                label="새 비밀번호 확인"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
              />
              <Button
                fullWidth
                onClick={handleResetPassword}
                loading={isSubmitting}
                disabled={isSubmitting || !password || !passwordConfirm}
              >
                <KeyRound className="h-4 w-4" />
                비밀번호 변경
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                비밀번호가 재설정되었습니다. 다시 로그인해 주세요.
              </div>
              <Button fullWidth onClick={() => router.push("/login")}>
                로그인으로 이동
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-brand-primary-600 hover:underline"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
