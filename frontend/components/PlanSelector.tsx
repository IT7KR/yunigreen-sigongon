"use client";

import { Card, CardContent, Button, Badge } from "@sigongcore/ui";
import { Check, Crown, Zap } from "lucide-react";

type PlanType = "basic" | "pro";

interface PlanSelectorProps {
  currentPlan: string | null;
  onSelectPlan: (plan: PlanType) => void;
}

interface PlanOption {
  id: PlanType;
  name: string;
  price: number;
  description: string;
  accentClass: string;
  icon: typeof Zap;
  features: string[];
  recommended?: boolean;
}

const plans: PlanOption[] = [
  {
    id: "basic",
    name: "Basic",
    price: 588000,
    description: "소규모 건설사를 위한 필수 운영 패키지",
    accentClass: "bg-blue-100 text-blue-700",
    icon: Zap,
    recommended: true,
    features: [
      "사용자 5명",
      "프로젝트 무제한",
      "AI 진단 무제한",
      "이메일 지원",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 1188000,
    description: "중대형 건설사를 위한 확장형 운영 패키지",
    accentClass: "bg-amber-100 text-amber-700",
    icon: Crown,
    features: [
      "사용자 무제한",
      "프로젝트 무제한",
      "AI 진단 무제한",
      "우선 지원",
      "API 연동",
    ],
  },
];

function getPlanId(planName: string | null): PlanType | null {
  if (!planName) return null;
  const normalized = planName.toLowerCase();
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
}

export function PlanSelector({
  currentPlan,
  onSelectPlan,
}: PlanSelectorProps) {
  const currentPlanId = getPlanId(currentPlan);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        const Icon = plan.icon;

        return (
          <Card
            key={plan.id}
            className={`relative ${
              plan.recommended
                ? "border-brand-point-500 shadow-lg"
                : "border-slate-200"
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default">추천</Badge>
              </div>
            )}
            {isCurrent && (
              <div className="absolute -top-3 right-4">
                <Badge variant="success">현재 플랜</Badge>
              </div>
            )}
            <CardContent className="p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${plan.accentClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {plan.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-900">
                    {plan.price.toLocaleString()}원
                  </p>
                  <p className="mt-1 text-sm text-slate-500">연간 결제</p>
                </div>
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-point-600" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.recommended ? "primary" : "secondary"}
                disabled={isCurrent}
                onClick={() => onSelectPlan(plan.id)}
              >
                {isCurrent ? "현재 플랜" : "이 플랜 선택"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
