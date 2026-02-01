"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Stepper } from "@sigongon/ui";
import { Droplets, Check, Sparkles, Zap, Crown } from "lucide-react";
import { cn } from "@sigongon/ui";
import {
  STEPS,
  PLANS,
  getSignupData,
  saveSignupData,
  type SignupData,
} from "../types";

export default function PlanPage() {
  const router = useRouter();
  const [data, setData] = useState<Partial<SignupData>>({});

  useEffect(() => {
    const stored = getSignupData();

    // Redirect if previous steps not completed
    if (!stored.email || !stored.businessVerified) {
      router.push("/signup");
      return;
    }

    setData(stored);
  }, [router]);

  const handleSelectPlan = (planType: "trial" | "basic" | "pro") => {
    const updatedData = {
      ...data,
      planType,
    };

    saveSignupData(updatedData);

    // Free trial goes directly to complete
    if (planType === "trial") {
      router.push("/signup/complete");
    } else {
      router.push("/signup/payment");
    }
  };

  const handleBack = () => {
    saveSignupData(data);
    router.push("/signup/business");
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("ko-KR");
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "trial":
        return <Sparkles className="h-6 w-6" />;
      case "basic":
        return <Zap className="h-6 w-6" />;
      case "pro":
        return <Crown className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case "trial":
        return "bg-slate-500";
      case "basic":
        return "bg-brand-point-500";
      case "pro":
        return "bg-purple-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-point-500 text-white">
          <Droplets className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900">시공ON</span>
      </Link>

      <Card className="w-full max-w-5xl p-6 md:p-8">
        <Stepper steps={STEPS} currentStep={3} className="mb-8" />

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">요금제 선택</h1>
          <p className="mt-2 text-slate-600">
            비즈니스에 맞는 최적의 플랜을 선택하세요
          </p>
        </div>

        {/* Plans Grid - 연간 결제만 지원 */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isTrial = plan.id === "trial";
            const monthlyEquivalent = plan.price / 12; // 월 환산 금액

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-xl border-2 bg-white p-6 transition-all hover:shadow-lg",
                  plan.id === "basic"
                    ? "border-brand-point-500 shadow-md"
                    : "border-slate-200",
                )}
              >
                {plan.id === "basic" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand-point-500 px-3 py-1 text-xs font-semibold text-white">
                      추천
                    </span>
                  </div>
                )}

                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg text-white",
                      getPlanColor(plan.id),
                    )}
                  >
                    {getPlanIcon(plan.id)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {plan.name}
                    </h3>
                  </div>
                </div>

                <p className="mb-6 text-sm text-slate-600">
                  {plan.description}
                </p>

                <div className="mb-6">
                  {isTrial ? (
                    <div className="text-3xl font-bold text-slate-900">
                      무료
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-slate-900">
                        ₩{formatPrice(plan.price)}
                        <span className="text-base font-normal text-slate-600">
                          /년
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        월 ₩{formatPrice(Math.floor(monthlyEquivalent))} 환산
                      </div>
                    </>
                  )}
                </div>

                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  fullWidth
                  variant={plan.id === "basic" ? "primary" : "secondary"}
                  size="lg"
                >
                  {isTrial ? "무료로 시작하기" : "선택하기"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button variant="ghost" onClick={handleBack}>
            이전 단계로
          </Button>
        </div>
      </Card>
    </div>
  );
}
