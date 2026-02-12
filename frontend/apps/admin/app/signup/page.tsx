"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, PrimitiveInput, Stepper } from "@sigongon/ui";
import { Droplets, Check, X, Loader2 } from "lucide-react";
import {
  STEPS,
  getSignupData,
  saveSignupData,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUsername,
  type SignupData,
} from "./types";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [data, setData] = useState<Partial<SignupData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Username check state
  const [usernameChecking, setUsernameChecking] = useState(false);

  // Phone verification state (OTP)
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneOtpRequestId, setPhoneOtpRequestId] = useState("");

  useEffect(() => {
    const stored = getSignupData();
    setData(stored);
    if (stored.phoneVerified) setPhoneCodeSent(true);
    if (stored.phoneOtpRequestId) setPhoneOtpRequestId(stored.phoneOtpRequestId);
  }, []);

  // Username check handler
  const handleCheckUsername = async () => {
    if (!data.username || !validateUsername(data.username)) {
      setErrors({ ...errors, username: "4-20자, 영문으로 시작, 영문/숫자/밑줄만 가능" });
      return;
    }

    setUsernameChecking(true);
    setErrors({ ...errors, username: "" });
    try {
      const res = await api.checkUsername(data.username);
      if (res.success && res.data?.available) {
        setData({ ...data, usernameChecked: true, usernameAvailable: true });
      } else {
        setData({ ...data, usernameChecked: true, usernameAvailable: false });
        setErrors({ ...errors, username: "이미 사용 중인 아이디입니다" });
      }
    } catch {
      setErrors({ ...errors, username: "중복확인 중 오류가 발생했습니다" });
    }
    setUsernameChecking(false);
  };

  // Phone OTP handlers
  const handleSendPhoneCode = async () => {
    if (!data.phone || !validatePhone(data.phone)) {
      setErrors({ ...errors, phone: "010-0000-0000 형식으로 입력하세요" });
      return;
    }

    setPhoneSending(true);
    setErrors({ ...errors, phone: "" });
    try {
      // Phase 1: 휴대전화 중복 체크
      const checkRes = await api.checkPhone(data.phone);
      if (!checkRes.success || !checkRes.data?.available) {
        setErrors({ ...errors, phone: "이미 가입된 휴대전화번호입니다" });
        setPhoneSending(false);
        return;
      }

      const res = await api.sendOtp(data.phone);
      if (res.success && res.data) {
        setPhoneOtpRequestId(res.data.request_id);
        setPhoneCodeSent(true);
      }
    } catch {
      setErrors({ ...errors, phone: "인증번호 발송에 실패했습니다" });
    }
    setPhoneSending(false);
  };

  const handleVerifyPhoneCode = async () => {
    if (phoneCode.length !== 6) {
      setErrors({ ...errors, phoneCode: "6자리 인증번호를 입력하세요" });
      return;
    }

    setPhoneVerifying(true);
    try {
      const res = await api.verifyOtp(phoneOtpRequestId, phoneCode);
      if (res.success && res.data?.verified) {
        setData({ ...data, phoneVerified: true, phoneOtpRequestId });
        setErrors({ ...errors, phone: "", phoneCode: "" });
      } else {
        setErrors({ ...errors, phoneCode: "인증번호가 올바르지 않습니다" });
      }
    } catch {
      setErrors({ ...errors, phoneCode: "인증번호가 올바르지 않거나 만료되었습니다" });
    }
    setPhoneVerifying(false);
  };

  const handlePhoneFormat = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.username || !validateUsername(data.username)) {
      newErrors.username = "4-20자, 영문으로 시작, 영문/숫자/밑줄만 가능";
    } else if (!data.usernameChecked || !data.usernameAvailable) {
      newErrors.username = "아이디 중복확인이 필요합니다";
    }

    if (!data.password || !validatePassword(data.password)) {
      newErrors.password = "8자 이상, 영문+숫자+특수문자를 포함해야 합니다";
    }

    if (data.password !== data.passwordConfirm) {
      newErrors.passwordConfirm = "비밀번호가 일치하지 않습니다";
    }

    if (!data.phone || !validatePhone(data.phone)) {
      newErrors.phone = "010-0000-0000 형식으로 입력하세요";
    } else if (!data.phoneVerified) {
      newErrors.phone = "휴대폰 인증이 필요합니다";
    }

    if (!data.termsAgreed) {
      newErrors.terms = "서비스 이용약관에 동의해야 합니다";
    }

    if (!data.privacyAgreed) {
      newErrors.privacy = "개인정보 처리방침에 동의해야 합니다";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    saveSignupData(data);
    router.push("/signup/business");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-2xl p-6 md:p-8">
        <Stepper steps={STEPS} currentStep={1} className="mb-8" />

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">기본 정보 입력</h1>
          <p className="mt-2 text-slate-600">
            회원가입을 위한 기본 정보를 입력해주세요
          </p>
        </div>

        <div className="space-y-4">
          {/* Username with Check */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="아이디"
                  type="text"
                  placeholder="영문으로 시작, 4-20자"
                  value={data.username || ""}
                  onChange={(e) => {
                    setData({ ...data, username: e.target.value, usernameChecked: false, usernameAvailable: false });
                  }}
                  error={errors.username}
                  disabled={data.usernameChecked && data.usernameAvailable}
                />
              </div>
              {!(data.usernameChecked && data.usernameAvailable) && (
                <Button
                  onClick={handleCheckUsername}
                  disabled={usernameChecking}
                  className="mt-6"
                >
                  {usernameChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "중복확인"
                  )}
                </Button>
              )}
            </div>
            {data.usernameChecked && data.usernameAvailable && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                사용 가능한 아이디입니다
              </p>
            )}
          </div>

          {/* Email (optional, no verification) */}
          <Input
            label="이메일 (선택)"
            type="email"
            placeholder="name@company.com"
            value={data.email || ""}
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />

          {/* Password */}
          <Input
            label="비밀번호"
            type="password"
            placeholder="8자 이상, 영문+숫자+특수문자"
            value={data.password || ""}
            onChange={(e) => setData({ ...data, password: e.target.value })}
            error={errors.password}
          />

          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
            value={data.passwordConfirm || ""}
            onChange={(e) =>
              setData({ ...data, passwordConfirm: e.target.value })
            }
            error={errors.passwordConfirm}
          />

          {/* Phone with Verification */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="휴대폰 번호"
                  placeholder="010-0000-0000"
                  value={data.phone || ""}
                  onChange={(e) => {
                    const formatted = handlePhoneFormat(e.target.value);
                    setData({ ...data, phone: formatted, phoneVerified: false });
                    setPhoneCodeSent(false);
                    setPhoneCode("");
                  }}
                  error={errors.phone}
                  disabled={data.phoneVerified}
                />
              </div>
              {!data.phoneVerified && (
                <Button
                  onClick={handleSendPhoneCode}
                  disabled={phoneSending}
                  className="mt-6"
                >
                  {phoneSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : phoneCodeSent ? (
                    "재발송"
                  ) : (
                    "인증번호"
                  )}
                </Button>
              )}
            </div>
            {data.phoneVerified && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                휴대폰 인증이 완료되었습니다
              </p>
            )}
          </div>

          {/* Phone Verification Code */}
          {phoneCodeSent && !data.phoneVerified && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="mb-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{data.phone}</span>으로
                인증번호가 발송되었습니다.
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="휴대폰 인증번호"
                    placeholder="6자리 숫자 입력"
                    value={phoneCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPhoneCode(value);
                    }}
                    error={errors.phoneCode}
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleVerifyPhoneCode}
                  disabled={phoneVerifying || phoneCode.length !== 6}
                  className="mt-6"
                >
                  {phoneVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "확인"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <PrimitiveInput
                type="checkbox"
                checked={data.termsAgreed || false}
                onChange={(e) =>
                  setData({ ...data, termsAgreed: e.target.checked })
                }
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900">
                  서비스 이용약관 동의 (필수)
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <PrimitiveInput
                type="checkbox"
                checked={data.privacyAgreed || false}
                onChange={(e) =>
                  setData({ ...data, privacyAgreed: e.target.checked })
                }
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900">
                  개인정보 처리방침 동의 (필수)
                </span>
              </div>
            </label>

            {(errors.terms || errors.privacy) && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <X className="h-4 w-4" />
                {errors.terms || errors.privacy}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/login" className="flex-1">
              <Button variant="secondary" fullWidth size="lg">
                취소
              </Button>
            </Link>
            <Button onClick={handleNext} fullWidth size="lg" className="flex-1">
              다음
            </Button>
          </div>

          <div className="text-center text-sm text-slate-600">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-point-600 hover:text-brand-point-700"
            >
              로그인
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
