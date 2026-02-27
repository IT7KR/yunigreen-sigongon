"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Info,
  Lock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Target,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PrimitiveButton,
  PrimitiveInput,
  toast,
} from "@sigongcore/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CostCalculation {
  id: string;
  estimate_id: string;
  rate_id: string;
  // Input aggregates
  direct_material_cost: string;
  direct_labor_cost: string;
  equipment_cost: string;
  // Manual inputs
  indirect_material_cost: string;
  material_scrap: string;
  waste_disposal_fee: string;
  // Rate overrides
  override_indirect_labor_rate?: string;
  override_other_expense_rate?: string;
  override_general_admin_rate?: string;
  override_profit_rate?: string;
  // Conditions
  construction_days: number;
  enable_subcontract_guarantee: boolean;
  enable_equipment_guarantee: boolean;
  // Profit
  profit_adjustment: string;
  target_contract_amount?: string;
  // Results
  material_subtotal: string;
  indirect_labor_amount: string;
  labor_subtotal: string;
  accident_insurance: string;
  employment_insurance: string;
  health_insurance: string;
  national_pension: string;
  longterm_care: string;
  safety_management: string;
  environmental_fee: string;
  other_expense: string;
  subcontract_guarantee: string;
  equipment_guarantee: string;
  expense_subtotal: string;
  net_construction_cost: string;
  general_admin_fee: string;
  profit_amount: string;
  supply_amount: string;
  vat_amount: string;
  contract_amount: string;
  is_visible: boolean;
  rate?: {
    label: string;
    indirect_labor_rate: string;
    general_admin_rate: string;
    profit_rate_cap: string;
    industrial_accident_rate: string;
    employment_insurance_rate: string;
    health_insurance_rate: string;
    national_pension_rate: string;
    longterm_care_rate: string;
    safety_management_rate: string;
    environmental_rate: string;
    other_expense_rate: string;
    subcontract_guarantee_rate: string;
    equipment_guarantee_rate: string;
    health_insurance_min_days: number;
    pension_min_days: number;
    longterm_care_min_days: number;
  };
}

interface CostCalculationSheetProps {
  estimateId: string;
  calc: CostCalculation | null;
  onCreateCalc: () => Promise<void>;
  onUpdateCalc: (data: Partial<CostCalculation>) => Promise<void>;
  onRecalculate: () => Promise<void>;
  onExportCalc: () => void;
  onExportCombined: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function num(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function won(val: string | number | undefined | null): string {
  return num(val).toLocaleString("ko-KR") + "원";
}

function pct(val: string | number | undefined | null): string {
  const n = num(val);
  if (n === 0) return "-";
  return n.toFixed(2) + "%";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Inline editable currency cell */
function EditableAmount({
  value,
  onSave,
  disabled = false,
}: {
  value: string;
  onSave: (val: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (disabled) {
    return <span className="tabular-nums">{won(value)}</span>;
  }

  if (!editing) {
    return (
      <PrimitiveButton
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 tabular-nums transition-colors hover:bg-brand-point-50"
      >
        {won(value)}
        <Pencil className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </PrimitiveButton>
    );
  }

  function commit() {
    const cleaned = draft.replace(/[^0-9.\-]/g, "");
    onSave(cleaned || "0");
    setEditing(false);
  }

  return (
    <div className="inline-flex items-center gap-1">
      <PrimitiveInput
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="!h-7 !w-32 !rounded !border-brand-point-300 !px-2 !text-right !text-sm tabular-nums !ring-brand-point-200"
      />
      <span className="text-xs text-slate-400">원</span>
    </div>
  );
}

/** Inline editable rate cell */
function EditableRate({
  value,
  baseRate,
  onSave,
  disabled = false,
}: {
  value: string | undefined;
  baseRate: string;
  onSave: (val: string) => void;
  disabled?: boolean;
}) {
  const isOverridden = value !== undefined && value !== "";
  const displayVal = isOverridden ? value : baseRate;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayVal || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(isOverridden ? value! : baseRate);
  }, [value, baseRate, isOverridden]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
        <Lock className="h-3 w-3 text-slate-400" />
        {pct(displayVal)}
      </span>
    );
  }

  if (!editing) {
    return (
      <PrimitiveButton
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 tabular-nums transition-colors hover:bg-brand-point-50"
      >
        {pct(displayVal)}
        {isOverridden && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        )}
        <Pencil className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </PrimitiveButton>
    );
  }

  function commit() {
    const cleaned = draft.replace(/[^0-9.]/g, "");
    onSave(cleaned || baseRate);
    setEditing(false);
  }

  return (
    <div className="inline-flex items-center gap-1">
      <PrimitiveInput
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(isOverridden ? value! : baseRate);
            setEditing(false);
          }
        }}
        className="!h-7 !w-20 !rounded !border-brand-point-300 !px-2 !text-right !text-sm tabular-nums !ring-brand-point-200"
      />
      <span className="text-xs text-slate-400">%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CostCalculationSheet({
  estimateId,
  calc,
  onCreateCalc,
  onUpdateCalc,
  onRecalculate,
  onExportCalc,
  onExportCombined,
}: CostCalculationSheetProps) {
  const [creating, setCreating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [rateOverrideOpen, setRateOverrideOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState(
    calc?.target_contract_amount || "",
  );
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportRef.current &&
        !exportRef.current.contains(e.target as Node)
      ) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      setCreating(true);
      await onCreateCalc();
      toast.success("원가계산서를 생성했습니다");
    } catch {
      toast.error("원가계산서 생성에 실패했습니다");
    } finally {
      setCreating(false);
    }
  }, [onCreateCalc]);

  const handleRecalculate = useCallback(async () => {
    try {
      setRecalculating(true);
      await onRecalculate();
      toast.success("재계산을 완료했습니다");
    } catch {
      toast.error("재계산에 실패했습니다");
    } finally {
      setRecalculating(false);
    }
  }, [onRecalculate]);

  const handleFieldUpdate = useCallback(
    (field: string, value: string | number | boolean) => {
      onUpdateCalc({ [field]: value });
    },
    [onUpdateCalc],
  );

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  if (!calc) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Calculator className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            원가계산서가 없습니다
          </h3>
          <p className="mb-6 max-w-sm text-center text-sm text-slate-500">
            견적 항목을 기반으로 관급 공사 원가계산서를 자동 생성합니다.
            법정요율과 보험료가 자동 적용됩니다.
          </p>
          <Button onClick={handleCreate} loading={creating}>
            <Plus className="h-4 w-4" />
            원가계산서 생성
          </Button>
        </CardContent>
      </Card>
    );
  }

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const rate = calc.rate;
  const healthApplied =
    rate && calc.construction_days >= rate.health_insurance_min_days;
  const pensionApplied =
    rate && calc.construction_days >= rate.pension_min_days;
  const longTermCareApplied =
    rate && calc.construction_days >= rate.longterm_care_min_days;

  // -----------------------------------------------------------------------
  // Table row definitions
  // -----------------------------------------------------------------------

  type RowType = "header" | "item" | "subtotal" | "highlight" | "total";

  interface TableRow {
    type: RowType;
    category?: string;
    label: string;
    basis?: string;
    rate?: React.ReactNode;
    amount: React.ReactNode;
    muted?: boolean;
    muteReason?: string;
    editable?: boolean;
  }

  const rows: TableRow[] = [
    // ---- 재료비 ----
    {
      type: "header",
      category: "재료비",
      label: "재료비",
      amount: "",
    },
    {
      type: "item",
      label: "직접재료비",
      basis: "실적공사비 적산",
      amount: <EditableAmount value={calc.direct_material_cost} onSave={(v) => handleFieldUpdate("direct_material_cost", v)} disabled />,
    },
    {
      type: "item",
      label: "간접재료비",
      basis: "직접재료비 외 부수 자재",
      amount: (
        <EditableAmount
          value={calc.indirect_material_cost}
          onSave={(v) => handleFieldUpdate("indirect_material_cost", v)}
        />
      ),
      editable: true,
    },
    ...(num(calc.material_scrap) > 0
      ? [
          {
            type: "item" as RowType,
            label: "작업설",
            basis: "자재 할증",
            amount: (
              <EditableAmount
                value={calc.material_scrap}
                onSave={(v) => handleFieldUpdate("material_scrap", v)}
              />
            ),
            editable: true,
          },
        ]
      : []),
    {
      type: "subtotal",
      label: "재료비 소계",
      amount: <span className="tabular-nums font-bold">{won(calc.material_subtotal)}</span>,
    },

    // ---- 노무비 ----
    {
      type: "header",
      category: "노무비",
      label: "노무비",
      amount: "",
    },
    {
      type: "item",
      label: "직접노무비",
      basis: "실적공사비 적산",
      amount: <EditableAmount value={calc.direct_labor_cost} onSave={(v) => handleFieldUpdate("direct_labor_cost", v)} disabled />,
    },
    {
      type: "item",
      label: "간접노무비",
      basis: "직접노무비 x 요율",
      rate: (
        <EditableRate
          value={calc.override_indirect_labor_rate}
          baseRate={rate?.indirect_labor_rate || "0"}
          onSave={(v) => handleFieldUpdate("override_indirect_labor_rate", v)}
        />
      ),
      amount: <span className="tabular-nums">{won(calc.indirect_labor_amount)}</span>,
    },
    {
      type: "subtotal",
      label: "노무비 소계",
      amount: <span className="tabular-nums font-bold">{won(calc.labor_subtotal)}</span>,
    },

    // ---- 경비 ----
    {
      type: "header",
      category: "경비",
      label: "경비",
      amount: "",
    },
    {
      type: "item",
      label: "기계경비",
      basis: "실적공사비 적산",
      amount: <EditableAmount value={calc.equipment_cost} onSave={(v) => handleFieldUpdate("equipment_cost", v)} disabled />,
    },
    {
      type: "item",
      label: "산업재해보상보험료",
      basis: "노무비 x 요율",
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.industrial_accident_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.accident_insurance)}</span>,
    },
    {
      type: "item",
      label: "고용보험료",
      basis: "노무비 x 요율",
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.employment_insurance_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.employment_insurance)}</span>,
    },
    {
      type: "item",
      label: "건강보험료",
      basis: `직접노무비 x 요율 (${rate?.health_insurance_min_days || 0}일 이상)`,
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.health_insurance_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.health_insurance)}</span>,
      muted: !healthApplied,
      muteReason: "미적용",
    },
    {
      type: "item",
      label: "국민연금",
      basis: `직접노무비 x 요율 (${rate?.pension_min_days || 0}일 이상)`,
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.national_pension_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.national_pension)}</span>,
      muted: !pensionApplied,
      muteReason: "미적용",
    },
    {
      type: "item",
      label: "장기요양보험료",
      basis: `건강보험료 x 요율 (${rate?.longterm_care_min_days || 0}일 이상)`,
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.longterm_care_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.longterm_care)}</span>,
      muted: !longTermCareApplied,
      muteReason: "미적용",
    },
    {
      type: "item",
      label: "산업안전보건관리비",
      basis: "재+노 x 요율",
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.safety_management_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.safety_management)}</span>,
    },
    {
      type: "item",
      label: "환경보전비",
      basis: "재+노 x 요율",
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          {pct(rate?.environmental_rate)}
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.environmental_fee)}</span>,
    },
    {
      type: "item",
      label: "기타경비",
      basis: "재+노 x 요율",
      rate: (
        <EditableRate
          value={calc.override_other_expense_rate}
          baseRate={rate?.other_expense_rate || "0"}
          onSave={(v) => handleFieldUpdate("override_other_expense_rate", v)}
        />
      ),
      amount: <span className="tabular-nums">{won(calc.other_expense)}</span>,
      editable: true,
    },
    ...(calc.enable_subcontract_guarantee
      ? [
          {
            type: "item" as RowType,
            label: "하도급대금 지급보증서 발급수수료",
            basis: "하도급금액 x 요율",
            rate: (
              <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                <Lock className="h-3 w-3 text-slate-400" />
                {pct(rate?.subcontract_guarantee_rate)}
              </span>
            ),
            amount: <span className="tabular-nums">{won(calc.subcontract_guarantee)}</span>,
          },
        ]
      : []),
    ...(calc.enable_equipment_guarantee
      ? [
          {
            type: "item" as RowType,
            label: "건설기계대여 대금지급 보증서 발급수수료",
            basis: "기계경비 x 요율",
            rate: (
              <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                <Lock className="h-3 w-3 text-slate-400" />
                {pct(rate?.equipment_guarantee_rate)}
              </span>
            ),
            amount: <span className="tabular-nums">{won(calc.equipment_guarantee)}</span>,
          },
        ]
      : []),
    {
      type: "subtotal",
      label: "경비 소계",
      amount: <span className="tabular-nums font-bold">{won(calc.expense_subtotal)}</span>,
    },

    // ---- 순공사원가 ----
    {
      type: "highlight",
      label: "순공사원가",
      basis: "재료비 + 노무비 + 경비",
      amount: <span className="tabular-nums font-bold text-slate-900">{won(calc.net_construction_cost)}</span>,
    },

    // ---- 일반관리비 ----
    {
      type: "item",
      label: "일반관리비",
      basis: "재+노 x 요율",
      rate: (
        <EditableRate
          value={calc.override_general_admin_rate}
          baseRate={rate?.general_admin_rate || "0"}
          onSave={(v) => handleFieldUpdate("override_general_admin_rate", v)}
        />
      ),
      amount: <span className="tabular-nums">{won(calc.general_admin_fee)}</span>,
      editable: true,
    },

    // ---- 폐기물처리비 ----
    ...(num(calc.waste_disposal_fee) > 0
      ? [
          {
            type: "item" as RowType,
            label: "폐기물처리비",
            basis: "별도 산정",
            amount: (
              <EditableAmount
                value={calc.waste_disposal_fee}
                onSave={(v) => handleFieldUpdate("waste_disposal_fee", v)}
              />
            ),
            editable: true,
          },
        ]
      : []),

    // ---- 이윤 ----
    {
      type: "item",
      label: "이윤",
      basis: `(노+경+일반) x 요율 (상한 ${pct(rate?.profit_rate_cap)})`,
      rate: (
        <EditableRate
          value={calc.override_profit_rate}
          baseRate={rate?.profit_rate_cap || "0"}
          onSave={(v) => handleFieldUpdate("override_profit_rate", v)}
        />
      ),
      amount: <span className="tabular-nums">{won(calc.profit_amount)}</span>,
      editable: true,
    },

    // ---- Totals ----
    {
      type: "total",
      label: "공급가액",
      amount: <span className="tabular-nums text-lg font-bold text-slate-900">{won(calc.supply_amount)}</span>,
    },
    {
      type: "item",
      label: "부가가치세",
      basis: "공급가액 x 10%",
      rate: (
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Lock className="h-3 w-3 text-slate-400" />
          10.00%
        </span>
      ),
      amount: <span className="tabular-nums">{won(calc.vat_amount)}</span>,
    },
    {
      type: "total",
      label: "도급액 합계",
      amount: (
        <span className="tabular-nums text-xl font-extrabold text-brand-point-700">
          {won(calc.contract_amount)}
        </span>
      ),
    },
  ];

  // Row styling
  function getRowClasses(row: TableRow): string {
    const base = "border-b border-slate-100";

    switch (row.type) {
      case "header":
        return `${base} bg-sky-50/80`;
      case "subtotal":
        return `${base} bg-emerald-50/70`;
      case "highlight":
        return `${base} bg-emerald-50 border-y-2 border-emerald-200`;
      case "total":
        return `${base} bg-amber-50/80 border-y border-amber-200`;
      default:
        return `${base} ${row.muted ? "bg-slate-50/50" : "hover:bg-slate-50/50"}`;
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* ---- Top bar ---- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-brand-point-600" />
              원가계산서
            </CardTitle>
            {rate && (
              <Badge variant="info">{rate.label}</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Visibility toggle */}
            <PrimitiveButton
              onClick={() =>
                handleFieldUpdate("is_visible", !calc.is_visible)
              }
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                calc.is_visible
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {calc.is_visible ? (
                <>
                  <Eye className="h-4 w-4" />
                  발주처 공개
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  숨김
                </>
              )}
            </PrimitiveButton>

            {/* Recalculate */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRecalculate}
              loading={recalculating}
            >
              <RefreshCw className="h-4 w-4" />
              재계산
            </Button>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              >
                <Download className="h-4 w-4" />
                다운로드
                <ChevronDown className="h-3 w-3" />
              </Button>
              {exportDropdownOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <PrimitiveButton
                    onClick={() => {
                      onExportCalc();
                      setExportDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    원가계산서만
                  </PrimitiveButton>
                  <PrimitiveButton
                    onClick={() => {
                      onExportCombined();
                      setExportDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    견적서 + 원가계산서 합본
                  </PrimitiveButton>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ---- Settings panel ---- */}
      <Card>
        <CardHeader className="pb-0">
          <PrimitiveButton
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Settings2 className="h-4 w-4 text-slate-500" />
              조건 설정
            </span>
            {settingsOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </PrimitiveButton>
        </CardHeader>
        {settingsOpen && (
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* 공사기간 */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  공사기간
                </label>
                <div className="flex items-center gap-2">
                  <PrimitiveInput
                    type="number"
                    min={1}
                    value={calc.construction_days}
                    onChange={(e) =>
                      handleFieldUpdate(
                        "construction_days",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="!h-9 !w-24 !text-right !text-sm"
                  />
                  <span className="text-sm text-slate-500">일</span>
                </div>
                {rate && (
                  <p className="text-xs text-slate-400">
                    건강보험 {rate.health_insurance_min_days}일 / 국민연금{" "}
                    {rate.pension_min_days}일 / 장기요양{" "}
                    {rate.longterm_care_min_days}일 이상 시 적용
                  </p>
                )}
              </div>

              {/* 간접재료비 */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  간접재료비
                </label>
                <div className="flex items-center gap-2">
                  <PrimitiveInput
                    type="text"
                    value={num(calc.indirect_material_cost).toLocaleString()}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, "");
                      handleFieldUpdate("indirect_material_cost", cleaned);
                    }}
                    className="!h-9 !w-36 !text-right !text-sm"
                  />
                  <span className="text-sm text-slate-500">원</span>
                </div>
              </div>

              {/* 폐기물처리비 */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  폐기물처리비
                </label>
                <div className="flex items-center gap-2">
                  <PrimitiveInput
                    type="text"
                    value={num(calc.waste_disposal_fee).toLocaleString()}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, "");
                      handleFieldUpdate("waste_disposal_fee", cleaned);
                    }}
                    className="!h-9 !w-36 !text-right !text-sm"
                  />
                  <span className="text-sm text-slate-500">원</span>
                </div>
              </div>

              {/* 하도급보증 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <PrimitiveInput
                    type="checkbox"
                    checked={calc.enable_subcontract_guarantee}
                    onChange={(e) =>
                      handleFieldUpdate(
                        "enable_subcontract_guarantee",
                        e.target.checked,
                      )
                    }
                    className="!h-4 !w-4 !rounded !border-slate-300"
                  />
                  하도급보증 적용
                </label>
              </div>

              {/* 건설기계보증 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <PrimitiveInput
                    type="checkbox"
                    checked={calc.enable_equipment_guarantee}
                    onChange={(e) =>
                      handleFieldUpdate(
                        "enable_equipment_guarantee",
                        e.target.checked,
                      )
                    }
                    className="!h-4 !w-4 !rounded !border-slate-300"
                  />
                  건설기계보증 적용
                </label>
              </div>

              {/* 이윤 조정액 */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  이윤 조정액
                  <span className="ml-1 text-xs text-slate-400">
                    (음수 가능)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <PrimitiveInput
                    type="text"
                    value={
                      num(calc.profit_adjustment) < 0
                        ? `-${Math.abs(num(calc.profit_adjustment)).toLocaleString()}`
                        : num(calc.profit_adjustment).toLocaleString()
                    }
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9\-]/g, "");
                      handleFieldUpdate("profit_adjustment", cleaned);
                    }}
                    className="!h-9 !w-36 !text-right !text-sm"
                  />
                  <span className="text-sm text-slate-500">원</span>
                </div>
              </div>
            </div>

            {/* 목표 도급액 역산 */}
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-point-100">
                  <Target className="h-4 w-4 text-brand-point-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    목표 도급액 역산
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    목표 도급액을 입력하면 이윤 조정액을 자동 계산합니다
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <PrimitiveInput
                      type="text"
                      placeholder="목표 도급액"
                      value={targetAmount ? num(targetAmount).toLocaleString() : ""}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, "");
                        setTargetAmount(cleaned);
                      }}
                      className="!h-9 !w-44 !text-right !text-sm"
                    />
                    <span className="text-sm text-slate-500">원</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!targetAmount}
                      onClick={() => {
                        if (targetAmount) {
                          handleFieldUpdate(
                            "target_contract_amount",
                            targetAmount,
                          );
                        }
                      }}
                    >
                      역산 적용
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ---- Rate override panel ---- */}
      <Card>
        <CardHeader className="pb-0">
          <PrimitiveButton
            onClick={() => setRateOverrideOpen(!rateOverrideOpen)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Settings2 className="h-4 w-4 text-amber-500" />
              요율 커스텀
              {(calc.override_indirect_labor_rate ||
                calc.override_other_expense_rate ||
                calc.override_general_admin_rate ||
                calc.override_profit_rate) && (
                <Badge variant="warning">커스텀 적용중</Badge>
              )}
            </span>
            {rateOverrideOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </PrimitiveButton>
        </CardHeader>
        {rateOverrideOpen && (
          <CardContent className="pt-4">
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                기본 요율을 변경하면 재계산 시 커스텀 요율이 우선 적용됩니다.
                기본값으로 되돌리려면 입력값을 지우고 재계산하세요.
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* 간접노무비율 */}
              <RateOverrideField
                label="간접노무비율"
                baseRate={rate?.indirect_labor_rate || "0"}
                overrideRate={calc.override_indirect_labor_rate}
                onSave={(v) =>
                  handleFieldUpdate("override_indirect_labor_rate", v)
                }
                onClear={() =>
                  handleFieldUpdate("override_indirect_labor_rate", "")
                }
              />
              {/* 기타경비율 */}
              <RateOverrideField
                label="기타경비율"
                baseRate={rate?.other_expense_rate || "0"}
                overrideRate={calc.override_other_expense_rate}
                onSave={(v) =>
                  handleFieldUpdate("override_other_expense_rate", v)
                }
                onClear={() =>
                  handleFieldUpdate("override_other_expense_rate", "")
                }
              />
              {/* 일반관리비율 */}
              <RateOverrideField
                label="일반관리비율"
                baseRate={rate?.general_admin_rate || "0"}
                overrideRate={calc.override_general_admin_rate}
                onSave={(v) =>
                  handleFieldUpdate("override_general_admin_rate", v)
                }
                onClear={() =>
                  handleFieldUpdate("override_general_admin_rate", "")
                }
              />
              {/* 이윤율 */}
              <RateOverrideField
                label="이윤율"
                baseRate={rate?.profit_rate_cap || "0"}
                overrideRate={calc.override_profit_rate}
                onSave={(v) =>
                  handleFieldUpdate("override_profit_rate", v)
                }
                onClear={() =>
                  handleFieldUpdate("override_profit_rate", "")
                }
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ---- Main calculation table ---- */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-left">
                  <th className="w-[100px] px-4 py-3 text-center font-semibold text-slate-600">
                    구분
                  </th>
                  <th className="min-w-[200px] px-4 py-3 font-semibold text-slate-600">
                    항목
                  </th>
                  <th className="min-w-[180px] px-4 py-3 font-semibold text-slate-600">
                    산출근거
                  </th>
                  <th className="w-[130px] px-4 py-3 text-right font-semibold text-slate-600">
                    요율(%)
                  </th>
                  <th className="w-[180px] px-4 py-3 text-right font-semibold text-slate-600">
                    금액(원)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={getRowClasses(row)}>
                    {/* 구분 */}
                    <td className="px-4 py-2.5 text-center">
                      {row.type === "header" && (
                        <span className="text-xs font-bold text-sky-700">
                          {row.category}
                        </span>
                      )}
                    </td>
                    {/* 항목 */}
                    <td
                      className={`px-4 py-2.5 ${
                        row.type === "header"
                          ? "font-bold text-sky-800"
                          : row.type === "subtotal"
                            ? "pl-8 font-bold text-emerald-800"
                            : row.type === "highlight"
                              ? "font-bold text-emerald-900"
                              : row.type === "total"
                                ? "font-bold text-amber-900"
                                : row.muted
                                  ? "pl-8 text-slate-400"
                                  : "pl-8 text-slate-700"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {row.label}
                        {row.muted && row.muteReason && (
                          <Badge variant="default" className="text-[10px]">
                            {row.muteReason}
                          </Badge>
                        )}
                      </span>
                    </td>
                    {/* 산출근거 */}
                    <td
                      className={`px-4 py-2.5 text-xs ${
                        row.muted ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {row.basis || ""}
                    </td>
                    {/* 요율 */}
                    <td className="px-4 py-2.5 text-right">
                      {row.rate || ""}
                    </td>
                    {/* 금액 */}
                    <td
                      className={`px-4 py-2.5 text-right ${
                        row.muted ? "text-slate-300" : ""
                      }`}
                    >
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate Override Field (for settings panel)
// ---------------------------------------------------------------------------

function RateOverrideField({
  label,
  baseRate,
  overrideRate,
  onSave,
  onClear,
}: {
  label: string;
  baseRate: string;
  overrideRate?: string;
  onSave: (val: string) => void;
  onClear: () => void;
}) {
  const isOverridden = overrideRate !== undefined && overrideRate !== "";
  const [value, setValue] = useState(isOverridden ? overrideRate! : "");

  useEffect(() => {
    setValue(isOverridden ? overrideRate! : "");
  }, [overrideRate, isOverridden]);

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        <span className="text-xs text-slate-400">
          (기본: {pct(baseRate)})
        </span>
      </label>
      <div className="flex items-center gap-2">
        <PrimitiveInput
          type="text"
          placeholder={baseRate}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value && value !== baseRate) {
              onSave(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value && value !== baseRate) {
              onSave(value);
            }
          }}
          className={`!h-9 !w-24 !text-right !text-sm ${
            isOverridden ? "!border-amber-400 !bg-amber-50" : ""
          }`}
        />
        <span className="text-sm text-slate-500">%</span>
        {isOverridden && (
          <PrimitiveButton
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
            title="기본값으로 되돌리기"
          >
            <X className="h-3.5 w-3.5" />
          </PrimitiveButton>
        )}
      </div>
    </div>
  );
}
