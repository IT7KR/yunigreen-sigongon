"use client";

import { Card, CardContent, Button, Badge } from "@sigongon/ui";
import { Check } from "lucide-react";

type PlanType = "STARTER" | "STANDARD" | "PREMIUM";

interface PlanSelectorProps {
  currentPlan: string | null;
  onSelectPlan: (plan: PlanType) => void;
}

interface PlanOption {
  id: PlanType;
  name: string;
  price: number;
  priceLabel: string;
  features: string[];
  recommended?: boolean;
}

const plans: PlanOption[] = [
  {
    id: "STARTER",
    name: "스타터",
    price: 99000,
    priceLabel: "99,000원/년",
    features: [
      "프로젝트 10개",
      "사용자 3명",
      "기본 견적 관리",
      "AI 자재 추천",
      "모바일 앱 지원",
    ],
  },
  {
    id: "STANDARD",
    name: "스탠다드",
    price: 199000,
    priceLabel: "199,000원/년",
    features: [
      "프로젝트 50개",
      "사용자 10명",
      "고급 견적 관리",
      "AI 자재 추천",
      "전자계약 서명",
      "근로계약 관리",
      "모바일 앱 지원",
    ],
    recommended: true,
  },
  {
    id: "PREMIUM",
    name: "프리미엄",
    price: 399000,
    priceLabel: "399,000원/년",
    features: [
      "무제한 프로젝트",
      "무제한 사용자",
      "모든 기능 포함",
      "AI 자재 추천",
      "전자계약 서명",
      "근로계약 관리",
      "전자세금계산서 발행",
      "우선 기술 지원",
      "API 접근",
    ],
  },
];

export function PlanSelector({ currentPlan, onSelectPlan }: PlanSelectorProps) {
  const getCurrentPlanId = (planName: string | null): PlanType | null => {
    if (!planName) return null;
    const normalized = planName.toLowerCase();
    if (normalized.includes("스타터") || normalized.includes("starter"))
      return "STARTER";
    if (normalized.includes("스탠다드") || normalized.includes("standard"))
      return "STANDARD";
    if (normalized.includes("프리미엄") || normalized.includes("premium"))
      return "PREMIUM";
    return null;
  };

  const currentPlanId = getCurrentPlanId(currentPlan);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        return (
          <Card
            key={plan.id}
            className={`relative ${
              plan.recommended
                ? "border-brand-point-500 shadow-lg"
                : isCurrent
                  ? "border-brand-point-300"
                  : ""
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
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {plan.price.toLocaleString()}원
                  </span>
                  <span className="text-slate-500">/년</span>
                </div>
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-point-600" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.recommended ? "default" : "secondary"}
                disabled={isCurrent}
                onClick={() => onSelectPlan(plan.id)}
              >
                {isCurrent ? "현재 플랜" : "선택"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
