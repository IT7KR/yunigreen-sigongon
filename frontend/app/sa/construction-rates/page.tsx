"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmModal,
  Input,
  Modal,
  Skeleton,
  toast,
} from "@sigongcore/ui";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Percent,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface ConstructionCostRate {
  id: string;
  label: string;
  effective_from: string;
  effective_to: string;
  status: "active" | "deprecated";
  industrial_accident_rate: string;
  employment_insurance_rate: string;
  health_insurance_rate: string;
  national_pension_rate: string;
  longterm_care_rate: string;
  safety_management_rate: string;
  environmental_rate: string;
  indirect_labor_rate: string;
  other_expense_rate: string;
  general_admin_rate: string;
  profit_rate_cap: string;
  subcontract_guarantee_rate: string;
  equipment_guarantee_rate: string;
  health_insurance_min_days: number;
  pension_min_days: number;
  longterm_care_min_days: number;
  created_at: string;
}

const RATE_DEFAULTS: Omit<
  ConstructionCostRate,
  "id" | "label" | "effective_from" | "effective_to" | "status" | "created_at"
> = {
  industrial_accident_rate: "3.7",
  employment_insurance_rate: "1.8",
  health_insurance_rate: "7.09",
  national_pension_rate: "9.0",
  longterm_care_rate: "12.95",
  safety_management_rate: "1.86",
  environmental_rate: "0.5",
  indirect_labor_rate: "15.0",
  other_expense_rate: "6.0",
  general_admin_rate: "6.0",
  profit_rate_cap: "15.0",
  subcontract_guarantee_rate: "0.9",
  equipment_guarantee_rate: "0.9",
  health_insurance_min_days: 8,
  pension_min_days: 8,
  longterm_care_min_days: 8,
};

type FormData = Omit<ConstructionCostRate, "id" | "status" | "created_at">;

const MOCK_RATES: ConstructionCostRate[] = [
  {
    id: "rate-2026-01",
    label: "2026년 1분기 요율",
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    status: "active",
    industrial_accident_rate: "3.7",
    employment_insurance_rate: "1.8",
    health_insurance_rate: "7.09",
    national_pension_rate: "9.0",
    longterm_care_rate: "12.95",
    safety_management_rate: "1.86",
    environmental_rate: "0.5",
    indirect_labor_rate: "15.0",
    other_expense_rate: "6.0",
    general_admin_rate: "6.0",
    profit_rate_cap: "15.0",
    subcontract_guarantee_rate: "0.9",
    equipment_guarantee_rate: "0.9",
    health_insurance_min_days: 8,
    pension_min_days: 8,
    longterm_care_min_days: 8,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "rate-2025-01",
    label: "2025년 요율",
    effective_from: "2025-01-01",
    effective_to: "2025-12-31",
    status: "deprecated",
    industrial_accident_rate: "3.6",
    employment_insurance_rate: "1.8",
    health_insurance_rate: "7.09",
    national_pension_rate: "9.0",
    longterm_care_rate: "12.27",
    safety_management_rate: "1.86",
    environmental_rate: "0.5",
    indirect_labor_rate: "14.5",
    other_expense_rate: "6.0",
    general_admin_rate: "6.0",
    profit_rate_cap: "15.0",
    subcontract_guarantee_rate: "0.9",
    equipment_guarantee_rate: "0.9",
    health_insurance_min_days: 8,
    pension_min_days: 8,
    longterm_care_min_days: 8,
    created_at: "2025-01-01T00:00:00Z",
  },
];

function formatDateKr(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function RateField({
  label,
  value,
  unit = "%",
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-800">
        {value}
        {unit}
      </span>
    </div>
  );
}

interface RateCardProps {
  rate: ConstructionCostRate;
  onActivate: (rate: ConstructionCostRate) => void;
}

function RateCard({ rate, onActivate }: RateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isActive = rate.status === "active";

  return (
    <Card
      className={`transition-all duration-200 ${
        isActive
          ? "border-2 border-green-400 shadow-md shadow-green-100"
          : "border border-slate-200"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{rate.label}</CardTitle>
              {isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  현재 사용 중
                </span>
              ) : (
                <Badge variant="default">비활성</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              <span>
                {formatDateKr(rate.effective_from)} ~{" "}
                {formatDateKr(rate.effective_to)}
              </span>
            </div>
          </div>
          {!isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onActivate(rate)}
            >
              <Zap className="h-3.5 w-3.5" />
              활성화
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="grid grid-cols-3 gap-x-4 divide-x divide-slate-200">
            <div className="pr-4 text-center">
              <p className="text-xs text-slate-400">간접노무비</p>
              <p className="mt-0.5 text-lg font-bold text-slate-800">
                {rate.indirect_labor_rate}
                <span className="text-xs font-normal text-slate-500">%</span>
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="text-xs text-slate-400">일반관리비</p>
              <p className="mt-0.5 text-lg font-bold text-slate-800">
                {rate.general_admin_rate}
                <span className="text-xs font-normal text-slate-500">%</span>
              </p>
            </div>
            <div className="pl-4 text-center">
              <p className="text-xs text-slate-400">이윤 상한</p>
              <p className="mt-0.5 text-lg font-bold text-slate-800">
                {rate.profit_rate_cap}
                <span className="text-xs font-normal text-slate-500">%</span>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              요율 상세 접기
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              요율 상세 보기
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-3 space-y-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              법정 사회보험 요율
            </p>
            <RateField
              label="산업재해보상보험"
              value={rate.industrial_accident_rate}
            />
            <RateField
              label="고용보험"
              value={rate.employment_insurance_rate}
            />
            <RateField label="건강보험" value={rate.health_insurance_rate} />
            <RateField label="국민연금" value={rate.national_pension_rate} />
            <RateField label="장기요양보험" value={rate.longterm_care_rate} />
            <div className="mt-3 mb-2 border-t border-slate-200 pt-2">
              <p className="mb-2 text-xs font-semibold text-slate-600">
                공사원가 요율
              </p>
            </div>
            <RateField
              label="안전관리비"
              value={rate.safety_management_rate}
            />
            <RateField label="환경관리비" value={rate.environmental_rate} />
            <RateField label="기타경비" value={rate.other_expense_rate} />
            <RateField
              label="하도급보증요율"
              value={rate.subcontract_guarantee_rate}
            />
            <RateField
              label="기계장비보증요율"
              value={rate.equipment_guarantee_rate}
            />
            <div className="mt-3 mb-2 border-t border-slate-200 pt-2">
              <p className="mb-2 text-xs font-semibold text-slate-600">
                조건부 적용 규칙
              </p>
            </div>
            <RateField
              label="건강보험 최소 근무일"
              value={rate.health_insurance_min_days}
              unit="일"
            />
            <RateField
              label="국민연금 최소 근무일"
              value={rate.pension_min_days}
              unit="일"
            />
            <RateField
              label="장기요양 최소 근무일"
              value={rate.longterm_care_min_days}
              unit="일"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

function FormSection({ title, children }: FormSectionProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  );
}

export default function SAConstructionRatesPage() {
  const [rates, setRates] = useState<ConstructionCostRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingActivate, setPendingActivate] =
    useState<ConstructionCostRate | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const [form, setForm] = useState<FormData>({
    label: "",
    effective_from: "",
    effective_to: "",
    ...RATE_DEFAULTS,
  });

  useEffect(() => {
    void loadRates();
  }, []);

  function setField(key: keyof FormData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyApi = api as any;

  async function loadRates(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      // Try real API first, fall back to mock data
      const response =
        typeof anyApi.getConstructionRates === "function"
          ? await anyApi.getConstructionRates()
          : null;
      if (response && response.success && response.data) {
        setRates(
          Array.isArray(response.data)
            ? response.data
            : response.data.items ?? [],
        );
      } else {
        setRates(MOCK_RATES);
      }
    } catch {
      // API method not yet implemented — use mock data
      setRates(MOCK_RATES);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function openCreateModal() {
    setForm({
      label: "",
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: `${new Date().getFullYear()}-12-31`,
      ...RATE_DEFAULTS,
    });
    setIsCreateModalOpen(true);
  }

  async function handleCreateRate() {
    if (!form.label.trim()) {
      toast.error("요율 세트 이름을 입력해 주세요.");
      return;
    }
    if (!form.effective_from || !form.effective_to) {
      toast.error("적용 기간을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof anyApi.createConstructionRate === "function") {
        const response = await anyApi.createConstructionRate(form);
        if (!response.success) {
          toast.error("요율 등록에 실패했어요.");
          return;
        }
      } else {
        // Mock: add optimistically
        const newRate: ConstructionCostRate = {
          id: `rate-${Date.now()}`,
          ...form,
          status: "deprecated",
          created_at: new Date().toISOString(),
        };
        setRates((prev) => [newRate, ...prev]);
      }
      toast.success("신규 요율을 등록했어요.");
      setIsCreateModalOpen(false);
      await loadRates(true);
    } catch {
      toast.error("요율 등록 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivateRate() {
    if (!pendingActivate) return;
    setIsActivating(true);
    try {
      if (typeof anyApi.activateConstructionRate === "function") {
        const response = await anyApi.activateConstructionRate(pendingActivate.id);
        if (!response.success) {
          toast.error(response.error?.message || "활성화에 실패했어요.");
          return;
        }
      } else {
        // Mock: toggle statuses locally
        setRates((prev) =>
          prev.map((r) => ({
            ...r,
            status:
              r.id === pendingActivate.id
                ? ("active" as const)
                : ("deprecated" as const),
          })),
        );
      }
      toast.success(`${pendingActivate.label}을(를) 활성화했어요.`);
      setPendingActivate(null);
      await loadRates(true);
    } catch {
      toast.error("활성화 중 오류가 발생했어요.");
    } finally {
      setIsActivating(false);
    }
  }

  const activeRate = rates.find((r) => r.status === "active");
  const deprecatedRates = rates.filter((r) => r.status === "deprecated");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Link
                href="/sa"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                SA 홈
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              건설 원가 요율 관리
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              공사비 원가 산정에 적용되는 법정·편집 가능 요율 세트를 관리합니다.
              활성 요율만 견적에 반영됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void loadRates(true)}
              loading={isRefreshing}
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              신규 요율 등록
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {!isLoading && (
          <Card
            className={
              activeRate
                ? "border-green-200 bg-green-50"
                : "border-amber-200 bg-amber-50"
            }
          >
            <CardContent className="px-4 py-3">
              <div className="flex items-center gap-3">
                {activeRate ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <Percent className="h-5 w-5 shrink-0 text-amber-600" />
                )}
                <div>
                  <p
                    className={`text-sm font-semibold ${activeRate ? "text-green-900" : "text-amber-900"}`}
                  >
                    {activeRate
                      ? `현재 적용 요율: ${activeRate.label}`
                      : "활성 요율이 없습니다"}
                  </p>
                  <p
                    className={`text-xs ${activeRate ? "text-green-700" : "text-amber-800"}`}
                  >
                    {activeRate
                      ? `적용 기간: ${formatDateKr(activeRate.effective_from)} ~ ${formatDateKr(activeRate.effective_to)}`
                      : "요율 세트를 등록하고 활성화하세요. 활성 요율이 없으면 원가 계산이 중단됩니다."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rate Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Percent className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                등록된 요율 세트가 없어요
              </p>
              <p className="mt-1 text-xs text-slate-500">
                신규 요율 등록 버튼으로 첫 번째 요율을 추가해 보세요.
              </p>
              <Button className="mt-4" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                신규 요율 등록
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeRate && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  현재 활성 요율
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <RateCard
                    rate={activeRate}
                    onActivate={setPendingActivate}
                  />
                </div>
              </div>
            )}

            {deprecatedRates.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  이전 요율 세트
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {deprecatedRates.map((rate) => (
                    <RateCard
                      key={rate.id}
                      rate={rate}
                      onActivate={setPendingActivate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Rate Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="신규 요율 등록"
        description="새로운 건설 원가 요율 세트를 등록합니다. 등록 후 '활성화' 버튼으로 적용할 수 있어요."
        size="lg"
      >
        <div className="space-y-6">
          {/* 기본 정보 */}
          <FormSection title="기본 정보">
            <Input
              id="rate-label"
              name="rateLabel"
              label="요율 세트 이름"
              placeholder="예: 2026년 상반기 요율"
              value={form.label}
              onChange={(e) => setField("label", e.target.value)}
              required
            />
            <FormRow>
              <Input
                id="effective-from"
                name="effectiveFrom"
                label="적용 시작일"
                type="date"
                value={form.effective_from}
                onChange={(e) => setField("effective_from", e.target.value)}
                required
              />
              <Input
                id="effective-to"
                name="effectiveTo"
                label="적용 종료일"
                type="date"
                value={form.effective_to}
                onChange={(e) => setField("effective_to", e.target.value)}
                required
              />
            </FormRow>
          </FormSection>

          {/* 법정 사회보험 요율 */}
          <FormSection title="법정 요율 (SA 전용 설정)">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              아래 항목은 법정 요율로 SA만 수정할 수 있습니다. 매년 고시 기준을
              참고하여 입력하세요.
            </div>
            <FormRow>
              <Input
                id="industrial-accident-rate"
                name="industrialAccidentRate"
                label="산업재해보상보험율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.industrial_accident_rate}
                onChange={(e) =>
                  setField("industrial_accident_rate", e.target.value)
                }
              />
              <Input
                id="employment-insurance-rate"
                name="employmentInsuranceRate"
                label="고용보험율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.employment_insurance_rate}
                onChange={(e) =>
                  setField("employment_insurance_rate", e.target.value)
                }
              />
            </FormRow>
            <FormRow>
              <Input
                id="health-insurance-rate"
                name="healthInsuranceRate"
                label="건강보험율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.health_insurance_rate}
                onChange={(e) =>
                  setField("health_insurance_rate", e.target.value)
                }
              />
              <Input
                id="national-pension-rate"
                name="nationalPensionRate"
                label="국민연금율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.national_pension_rate}
                onChange={(e) =>
                  setField("national_pension_rate", e.target.value)
                }
              />
            </FormRow>
            <FormRow>
              <Input
                id="longterm-care-rate"
                name="longtermCareRate"
                label="장기요양보험율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.longterm_care_rate}
                onChange={(e) =>
                  setField("longterm_care_rate", e.target.value)
                }
              />
              <Input
                id="safety-management-rate"
                name="safetyManagementRate"
                label="안전관리비율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.safety_management_rate}
                onChange={(e) =>
                  setField("safety_management_rate", e.target.value)
                }
              />
            </FormRow>
            <FormRow>
              <Input
                id="environmental-rate"
                name="environmentalRate"
                label="환경관리비율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.environmental_rate}
                onChange={(e) => setField("environmental_rate", e.target.value)}
              />
              <Input
                id="subcontract-guarantee-rate"
                name="subcontractGuaranteeRate"
                label="하도급보증요율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.subcontract_guarantee_rate}
                onChange={(e) =>
                  setField("subcontract_guarantee_rate", e.target.value)
                }
              />
            </FormRow>
            <FormRow>
              <Input
                id="equipment-guarantee-rate"
                name="equipmentGuaranteeRate"
                label="기계장비보증요율 (%)"
                type="number"
                step="0.01"
                min="0"
                value={form.equipment_guarantee_rate}
                onChange={(e) =>
                  setField("equipment_guarantee_rate", e.target.value)
                }
              />
            </FormRow>
          </FormSection>

          {/* 편집 가능 기본값 */}
          <FormSection title="편집 가능 기본값">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              아래 항목은 각 견적 단위에서 담당자가 수정할 수 있는 기본값입니다.
            </div>
            <FormRow>
              <Input
                id="indirect-labor-rate"
                name="indirectLaborRate"
                label="간접노무비율 (%)"
                type="number"
                step="0.1"
                min="0"
                value={form.indirect_labor_rate}
                onChange={(e) =>
                  setField("indirect_labor_rate", e.target.value)
                }
              />
              <Input
                id="other-expense-rate"
                name="otherExpenseRate"
                label="기타경비율 (%)"
                type="number"
                step="0.1"
                min="0"
                value={form.other_expense_rate}
                onChange={(e) => setField("other_expense_rate", e.target.value)}
              />
            </FormRow>
            <FormRow>
              <Input
                id="general-admin-rate"
                name="generalAdminRate"
                label="일반관리비율 (%)"
                type="number"
                step="0.1"
                min="0"
                value={form.general_admin_rate}
                onChange={(e) => setField("general_admin_rate", e.target.value)}
              />
              <Input
                id="profit-rate-cap"
                name="profitRateCap"
                label="이윤 상한율 (%)"
                type="number"
                step="0.1"
                min="0"
                value={form.profit_rate_cap}
                onChange={(e) => setField("profit_rate_cap", e.target.value)}
              />
            </FormRow>
          </FormSection>

          {/* 조건부 적용 규칙 */}
          <FormSection title="조건부 적용 규칙">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              아래 최소 근무일 미만 근로자에게는 해당 보험이 미적용됩니다.
            </div>
            <FormRow>
              <Input
                id="health-insurance-min-days"
                name="healthInsuranceMinDays"
                label="건강보험 최소 근무일 (일)"
                type="number"
                min="0"
                step="1"
                value={String(form.health_insurance_min_days)}
                onChange={(e) =>
                  setField(
                    "health_insurance_min_days",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
              />
              <Input
                id="pension-min-days"
                name="pensionMinDays"
                label="국민연금 최소 근무일 (일)"
                type="number"
                min="0"
                step="1"
                value={String(form.pension_min_days)}
                onChange={(e) =>
                  setField("pension_min_days", parseInt(e.target.value, 10) || 0)
                }
              />
            </FormRow>
            <FormRow>
              <Input
                id="longterm-care-min-days"
                name="longtermCareMinDays"
                label="장기요양 최소 근무일 (일)"
                type="number"
                min="0"
                step="1"
                value={String(form.longterm_care_min_days)}
                onChange={(e) =>
                  setField(
                    "longterm_care_min_days",
                    parseInt(e.target.value, 10) || 0,
                  )
                }
              />
            </FormRow>
          </FormSection>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={() => void handleCreateRate()}
              loading={isSubmitting}
            >
              요율 등록
            </Button>
          </div>
        </div>
      </Modal>

      {/* Activate Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingActivate)}
        onClose={() => setPendingActivate(null)}
        onConfirm={() => void handleActivateRate()}
        title={`${pendingActivate?.label ?? ""} 요율을 활성화할까요?`}
        description="활성화 즉시 현재 사용 중인 요율이 비활성화되고 이 요율이 모든 원가 계산에 적용됩니다. 이미 작성된 견적에는 영향을 주지 않아요."
        confirmLabel="활성화"
        variant="default"
        loading={isActivating}
      />
    </AdminLayout>
  );
}
