"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@sigongon/ui";
import { Droplets, CheckCircle, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { getSignupData, clearSignupData, PLANS } from "../types";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function CompletePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [planName, setPlanName] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const data = getSignupData();

    // Redirect if signup not completed
    if (!data.email || !data.businessVerified || !data.planType) {
      router.push("/signup");
      return;
    }

    setCompanyName(data.companyName || "");
    const plan = PLANS.find((p) => p.id === data.planType);
    setPlanName(plan?.name || "");

    // Store access token for auto-login
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
  }, [router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      clearSignupData();
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleGoToDashboard = async () => {
    if (!accessToken) {
      // Fallback: just go to login if we don't have access token
      clearSignupData();
      router.push("/login");
      return;
    }

    setIsLoggingIn(true);

    try {
      // Set the access token in localStorage and api client
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", accessToken);
        document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }
      api.setAccessToken(accessToken);

      // Clear signup data since we're done
      clearSignupData();

      // Redirect to dashboard - the AuthProvider will pick up the token and fetch user data
      router.push("/dashboard");
    } catch (error) {
      console.error("Auto-login failed:", error);
      clearSignupData();
      router.push("/login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoToLogin = () => {
    clearSignupData();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-2xl p-8 md:p-12">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>

          {/* Heading */}
          <h1 className="mb-3 text-3xl font-bold text-slate-900">
            회원가입이 완료되었습니다!
          </h1>

          <p className="mb-8 text-lg text-slate-600">
            {companyName && (
              <>
                <span className="font-semibold text-brand-point-600">
                  {companyName}
                </span>
                님,
              </>
            )}{" "}
            시공ON에 오신 것을 환영합니다
          </p>

          {/* Plan Info */}
          <div className="mb-8 rounded-lg border border-brand-point-200 bg-brand-point-50 p-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-point-600" />
              <span className="text-sm font-medium text-brand-point-900">
                선택하신 요금제
              </span>
            </div>
            <p className="text-2xl font-bold text-brand-point-900">{planName}</p>
          </div>

          {/* Next Steps */}
          <div className="mb-8 rounded-lg bg-slate-50 p-6 text-left">
            <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">
              다음 단계
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-500 text-sm font-semibold text-white">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-900">프로젝트 생성하기</p>
                  <p className="text-sm text-slate-600">
                    첫 번째 건설 프로젝트를 등록하고 관리를 시작하세요
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-500 text-sm font-semibold text-white">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-900">팀원 초대하기</p>
                  <p className="text-sm text-slate-600">
                    협업할 팀원들을 초대하여 함께 프로젝트를 관리하세요
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-500 text-sm font-semibold text-white">
                  3
                </div>
                <div>
                  <p className="font-medium text-slate-900">모바일 앱 다운로드</p>
                  <p className="text-sm text-slate-600">
                    현장에서 실시간으로 프로젝트 관리 및 보고서 작성
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleGoToDashboard}
              fullWidth
              size="lg"
              className="text-base"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  대시보드로 이동
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <Button
              onClick={handleGoToLogin}
              variant="secondary"
              fullWidth
              size="lg"
              className="text-base"
              disabled={isLoggingIn}
            >
              로그인 페이지로
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-slate-600">
            <p>도움이 필요하신가요?</p>
            <p className="mt-1">
              <Link
                href="#"
                className="font-medium text-brand-point-600 hover:text-brand-point-700"
              >
                고객센터
              </Link>
              {" 또는 "}
              <Link
                href="#"
                className="font-medium text-brand-point-600 hover:text-brand-point-700"
              >
                시작 가이드
              </Link>
              를 참고하세요
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
