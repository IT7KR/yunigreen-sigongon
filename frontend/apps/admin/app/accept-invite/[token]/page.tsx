"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle2, XCircle, Shield, Building2 } from "lucide-react";
import { Button, Card, CardContent, PrimitiveInput } from "@sigongon/ui";
import type { UserRole } from "@sigongon/types";
import { api } from "@/lib/api";

const roleLabels: Record<UserRole, string> = {
  super_admin: "슈퍼관리자",
  company_admin: "대표",
  site_manager: "현장소장",
  worker: "근로자",
};

interface InvitationInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_name: string;
  status: string;
  expires_at: string;
}

type PageState = "loading" | "form" | "success" | "error";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  async function loadInvitation() {
    try {
      setPageState("loading");
      const response = await api.getInvitationByToken(token);

      if (response.success && response.data) {
        setInvitation(response.data as InvitationInfo);
        setPageState("form");
      } else {
        setErrorMessage(response.error?.message || "유효하지 않은 초대 링크예요");
        setPageState("error");
      }
    } catch (err) {
      setErrorMessage("초대 정보를 불러오는데 실패했어요");
      setPageState("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!password || password.length < 6) {
      setFormError("비밀번호는 6자 이상이어야 해요");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("비밀번호가 일치하지 않아요");
      return;
    }

    if (!agreeTerms) {
      setFormError("이용약관에 동의해 주세요");
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.acceptInvitation(token, { password });

      if (response.success) {
        setPageState("success");
      } else {
        setFormError(response.error?.message || "계정 생성에 실패했어요");
      }
    } catch (err) {
      setFormError("계정 생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-point-500" />
          <p className="mt-4 text-slate-500">초대 정보를 확인하고 있어요...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">초대 링크 오류</h1>
            <p className="mt-2 text-slate-500">{errorMessage}</p>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  로그인 페이지로 이동
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">계정 생성 완료!</h1>
            <p className="mt-2 text-slate-500">
              {invitation?.name}님, 환영합니다!<br />
              이제 시공ON 서비스를 이용하실 수 있어요.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                로그인하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="시공ON"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        <Card>
          <CardContent className="p-8">
            <h1 className="text-center text-xl font-bold text-slate-900">
              초대를 수락하세요
            </h1>

            {/* Invitation info */}
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-point-100">
                  <Building2 className="h-6 w-6 text-brand-point-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {invitation?.organization_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Shield className="h-3.5 w-3.5" />
                    <span>{roleLabels[invitation?.role || "site_manager"]} 역할로 초대됨</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User info (readonly) */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  이름
                </label>
                <PrimitiveInput
                  type="text"
                  value={invitation?.name || ""}
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  이메일
                </label>
                <PrimitiveInput
                  type="email"
                  value={invitation?.email || ""}
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700"
                />
              </div>
            </div>

            {/* Password form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  비밀번호 *
                </label>
                <PrimitiveInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상 입력"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  비밀번호 확인 *
                </label>
                <PrimitiveInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-start gap-2">
                <PrimitiveInput
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-point-500 focus:ring-brand-point-500"
                />
                <label htmlFor="agreeTerms" className="text-sm text-slate-600">
                  <Link href="/terms" className="text-brand-point-500 hover:underline">
                    이용약관
                  </Link>
                  {" "}및{" "}
                  <Link href="/privacy" className="text-brand-point-500 hover:underline">
                    개인정보처리방침
                  </Link>
                  에 동의합니다.
                </label>
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "계정 생성하기"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-brand-point-500 hover:underline">
                로그인
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
