"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@sigongcore/ui";
import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  Droplets,
  Loader2,
  Sparkles,
} from "lucide-react";
import { clearSignupData, getSignupData, saveSignupData } from "../types";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type NextDestination = "dashboard" | "billing";

export default function CompletePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextDestination, setNextDestination] =
    useState<NextDestination>("billing");
  const [summaryTitle, setSummaryTitle] = useState("요금제 선택이 필요합니다");
  const [summaryDescription, setSummaryDescription] = useState(
    "회원가입 후 `/billing`에서 요금제를 선택하고 결제를 진행할 수 있습니다.",
  );

  useEffect(() => {
    if (isAuthenticated) {
      clearSignupData();
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    let cancelled = false;

    const prepareSignup = async () => {
      const signupData = getSignupData();

      if (!signupData.username || !signupData.businessVerified) {
        router.push("/signup");
        return;
      }

      setCompanyName(signupData.companyName || "");

      try {
        let token = signupData.accessToken;

        if (!token) {
          try {
            const registerResult = await api.register({
              username: signupData.username,
              email: signupData.email,
              password: signupData.password,
              phone: signupData.phone,
              company_name: signupData.companyName,
              business_number: signupData.businessNumber.replace(/-/g, ""),
              representative_name: signupData.representativeName,
              rep_phone: signupData.repPhone,
              rep_email: signupData.repEmail,
              contact_name: signupData.contactName || undefined,
              contact_phone: signupData.contactPhone || undefined,
              contact_position: signupData.contactPosition || undefined,
            });
            token = registerResult.data?.access_token;
          } catch (registerErr: unknown) {
            // 409: username already exists from a concurrent call (React StrictMode)
            const status = (registerErr as { status?: number })?.status;
            if (status === 409) {
              const refreshed = getSignupData();
              token = refreshed.accessToken;
            } else {
              throw registerErr;
            }
          }
        }

        if (!token) {
          throw new Error("missing_access_token");
        }

        api.setAccessToken(token);
        saveSignupData({ accessToken: token });

        const billingResponse = await api.getBillingOverview();
        if (!cancelled) {
          setAccessToken(token);

          if (
            billingResponse.success &&
            billingResponse.data?.plan === "무료 체험"
          ) {
            const trialMonths = billingResponse.data.trial_months || 0;
            setNextDestination("dashboard");
            setSummaryTitle(
              trialMonths > 0
                ? `무료 체험 ${trialMonths}개월이 시작되었습니다`
                : "무료 체험이 시작되었습니다",
            );
            setSummaryDescription(
              "로그인 후 바로 대시보드에서 프로젝트를 만들고 서비스를 사용하실 수 있습니다.",
            );
          } else {
            setNextDestination("billing");
            setSummaryTitle("요금제를 선택하고 결제를 진행하세요");
            setSummaryDescription(
              "회원가입은 완료되었습니다. 로그인 후 `/billing`에서 Basic 또는 Pro 플랜을 선택해 서비스를 시작할 수 있습니다.",
            );
          }
        }
      } catch (prepareError) {
        console.error("Signup completion failed:", prepareError);
        if (!cancelled) {
          setError(
            "회원가입 처리 중 오류가 발생했습니다. 로그인 페이지에서 다시 시도해주세요.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsPreparing(false);
        }
      }
    };

    void prepareSignup();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleContinue = async () => {
    if (!accessToken) {
      clearSignupData();
      router.push("/login");
      return;
    }

    setIsContinuing(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", accessToken);
        document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }

      api.setAccessToken(accessToken);
      clearSignupData();
      router.push(nextDestination === "dashboard" ? "/dashboard" : "/billing");
    } catch (continueError) {
      console.error("Auto-login failed:", continueError);
      clearSignupData();
      router.push("/login");
    } finally {
      setIsContinuing(false);
    }
  };

  const handleGoToLogin = () => {
    clearSignupData();
    router.push("/login");
  };

  const SummaryIcon =
    nextDestination === "dashboard" ? Sparkles : CreditCard;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공코어</span>
      </Link>

      <Card className="w-full max-w-2xl p-8 md:p-12">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            {isPreparing ? (
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
          </div>

          <h1 className="mb-3 text-3xl font-bold text-slate-900">
            회원가입이 완료되었습니다
          </h1>

          <p className="mb-8 text-lg text-slate-600">
            {companyName ? (
              <>
                <span className="font-semibold text-brand-point-600">
                  {companyName}
                </span>
                님, 바로 서비스를 시작할 준비가 되었습니다.
              </>
            ) : (
              "로그인 후 바로 서비스를 시작할 수 있습니다."
            )}
          </p>

          <div className="mb-8 rounded-lg border border-brand-point-200 bg-brand-point-50 p-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <SummaryIcon className="h-5 w-5 text-brand-point-600" />
              <span className="text-sm font-medium text-brand-point-900">
                다음 단계
              </span>
            </div>
            {isPreparing ? (
              <p className="text-base text-brand-point-900">
                무료 체험 및 결제 상태를 확인하는 중입니다.
              </p>
            ) : error ? (
              <p className="text-base text-red-700">{error}</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-brand-point-900">
                  {summaryTitle}
                </p>
                <p className="mt-2 text-sm text-brand-point-800">
                  {summaryDescription}
                </p>
              </>
            )}
          </div>

          <div className="mb-8 rounded-lg bg-slate-50 p-6 text-left">
            <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">
              시작 안내
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-500 text-sm font-semibold text-white">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-900">로그인 상태 유지</p>
                  <p className="text-sm text-slate-600">
                    계속 진행 버튼을 누르면 방금 만든 계정으로 바로 로그인됩니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-500 text-sm font-semibold text-white">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {nextDestination === "dashboard"
                      ? "대시보드에서 프로젝트 시작"
                      : "결제 페이지에서 요금제 선택"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {nextDestination === "dashboard"
                      ? "무료 체험이 적용되어 바로 서비스를 사용할 수 있습니다."
                      : "무료 체험이 없는 계정은 `/billing`에서 결제를 완료하면 바로 활성화됩니다."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              fullWidth
              size="lg"
              className="text-base"
              disabled={isPreparing || isContinuing || !!error}
            >
              {isContinuing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  {nextDestination === "dashboard"
                    ? "대시보드로 이동"
                    : "요금제 선택하러 가기"}
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
              disabled={isPreparing || isContinuing}
            >
              로그인 페이지로
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
