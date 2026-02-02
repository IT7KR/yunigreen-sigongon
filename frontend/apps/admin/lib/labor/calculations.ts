import type { LaborInsuranceRates, DailyWorker, SitePayrollWorkerEntry, DailyWorkRecord } from "@sigongon/types";

/**
 * 일용근로자 세금/보험 계산 엔진
 *
 * 클라이언트 엑셀 "기본사항" 시트의 공식을 정확히 재현
 */

// ============================================
// 나이 계산
// ============================================

/**
 * 주민번호로 만 나이 계산
 * 7번째 자리: 1,2 = 1900년대 / 3,4 = 2000년대
 */
export function calculateAge(ssn: string, referenceDate: Date = new Date()): number {
  const cleaned = ssn.replace(/-/g, "");
  if (cleaned.length < 7) return 0;

  const yearPrefix = cleaned[6];
  let birthYear: number;
  const twoDigitYear = parseInt(cleaned.slice(0, 2), 10);

  if (yearPrefix === "1" || yearPrefix === "2" || yearPrefix === "5" || yearPrefix === "6") {
    birthYear = 1900 + twoDigitYear;
  } else if (yearPrefix === "3" || yearPrefix === "4" || yearPrefix === "7" || yearPrefix === "8") {
    birthYear = 2000 + twoDigitYear;
  } else {
    birthYear = 1900 + twoDigitYear;
  }

  const birthMonth = parseInt(cleaned.slice(2, 4), 10);
  const birthDay = parseInt(cleaned.slice(4, 6), 10);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - birthYear;
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age--;
  }

  return age;
}

// ============================================
// 면제 판별
// ============================================

export type InsuranceType = "employment" | "health" | "national_pension" | "longterm_care";

/**
 * 보험 면제 여부 판별
 *
 * - 만65세 이상 → 고용보험 면제
 * - 만60세 이상 → 국민연금 면제
 * - 월 8일 미만 근무 → 건강보험/국민연금 면제
 * - 외국인 비자 유형별 별도 규정 (간소화: 외국인은 건강보험/국민연금 면제)
 */
export function isInsuranceExempt(
  type: InsuranceType,
  age: number,
  workDays: number,
  isForeign: boolean,
  _visaStatus?: string,
): boolean {
  switch (type) {
    case "employment":
      // 만 65세 이상 면제
      return age >= 65;

    case "national_pension":
      // 만 60세 이상 또는 월 8일 미만
      if (age >= 60) return true;
      if (workDays < 8) return true;
      if (isForeign) return true;
      return false;

    case "health":
      // 월 8일 미만 또는 외국인
      if (workDays < 8) return true;
      if (isForeign) return true;
      return false;

    case "longterm_care":
      // 건강보험과 동일 기준
      if (workDays < 8) return true;
      if (isForeign) return true;
      return false;

    default:
      return false;
  }
}

// ============================================
// 상하한 적용
// ============================================

export function clampToLimit(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

// ============================================
// ROUNDDOWN 유틸 (엑셀의 ROUNDDOWN 재현)
// ============================================

/**
 * 엑셀 ROUNDDOWN(value, -1) → 10원 미만 절사
 * ROUNDDOWN(value, -10) → 일반적으로 10원 단위 절사
 */
export function roundDown10(value: number): number {
  return Math.floor(value / 10) * 10;
}

// ============================================
// 핵심 계산 함수
// ============================================

export interface DeductionResult {
  income_tax: number;        // 갑근세
  resident_tax: number;      // 주민세 (지방소득세)
  health_insurance: number;  // 건강보험
  longterm_care: number;     // 요양보험 (장기요양)
  national_pension: number;  // 국민연금
  employment_insurance: number; // 고용보험
  total_deductions: number;  // 공제 합계
  net_pay: number;           // 차감지급액
}

/**
 * 근로자별 월간 공제 계산
 *
 * 계산 공식 (기본사항 시트 기준):
 * - 갑근세 = ROUNDDOWN((일당 - 150,000) × 2.7%, -10) × 일수
 * - 주민세 = ROUNDDOWN(갑근세 × 10%, -10)
 * - 건강보험 = ROUNDDOWN(월소득 × 3.595% ÷ 2, -10)  // 근로자 부담분
 * - 요양보험 = ROUNDDOWN(건강보험 × 13.14%, -10)
 * - 국민연금 = ROUNDDOWN(기준소득월액 × 4.5% ÷ 2, -10) // 상하한 적용
 * - 고용보험 = 일당 × 0.9% × 일수
 */
export function calculateWorkerDeductions(
  worker: Pick<DailyWorker, "daily_rate" | "ssn" | "is_foreign" | "visa_status">,
  totalManDays: number,
  totalWorkDays: number,
  rates: LaborInsuranceRates,
  referenceDate: Date = new Date(),
): DeductionResult {
  const dailyRate = worker.daily_rate;
  const totalLaborCost = dailyRate * totalManDays;
  const age = calculateAge(worker.ssn, referenceDate);

  // === 갑근세 (소득세) ===
  // (일당 - 소득공제금액) × 속산세율 → 10원 미만 절사 → × 일수
  const taxablePerDay = Math.max(0, dailyRate - rates.income_deduction);
  const dailyTax = roundDown10(taxablePerDay * rates.simplified_tax_rate);
  const income_tax = dailyTax * totalManDays;

  // === 주민세 (지방소득세) ===
  // 갑근세 × 10% → 10원 미만 절사
  const resident_tax = roundDown10(income_tax * rates.local_tax_rate);

  // === 건강보험 ===
  let health_insurance = 0;
  if (!isInsuranceExempt("health", age, totalWorkDays, worker.is_foreign, worker.visa_status)) {
    // 월소득 × 건강보험요율 / 2 (근로자 부담분)
    health_insurance = roundDown10(totalLaborCost * rates.health_insurance_rate / 2);
    // 상하한 적용
    health_insurance = clampToLimit(health_insurance, rates.health_premium_lower, rates.health_premium_upper);
  }

  // === 요양보험 (장기요양) ===
  let longterm_care = 0;
  if (!isInsuranceExempt("longterm_care", age, totalWorkDays, worker.is_foreign, worker.visa_status)) {
    longterm_care = roundDown10(health_insurance * rates.longterm_care_rate);
  }

  // === 국민연금 ===
  let national_pension = 0;
  if (!isInsuranceExempt("national_pension", age, totalWorkDays, worker.is_foreign, worker.visa_status)) {
    // 기준소득월액에 상하한 적용 후 요율 적용
    const standardMonthlyIncome = clampToLimit(totalLaborCost, rates.pension_lower_limit, rates.pension_upper_limit);
    national_pension = roundDown10(standardMonthlyIncome * rates.national_pension_rate / 2);
  }

  // === 고용보험 ===
  let employment_insurance = 0;
  if (!isInsuranceExempt("employment", age, totalWorkDays, worker.is_foreign, worker.visa_status)) {
    employment_insurance = roundDown10(dailyRate * rates.employment_insurance_rate * totalManDays);
  }

  const total_deductions = income_tax + resident_tax + health_insurance + longterm_care + national_pension + employment_insurance;
  const net_pay = totalLaborCost - total_deductions;

  return {
    income_tax,
    resident_tax,
    health_insurance,
    longterm_care,
    national_pension,
    employment_insurance,
    total_deductions,
    net_pay,
  };
}

// ============================================
// 보고서 생성 헬퍼
// ============================================

/**
 * 근로 기록에서 근로자별 월간 항목 생성
 */
export function buildWorkerEntry(
  worker: DailyWorker,
  records: DailyWorkRecord[],
  rates: LaborInsuranceRates,
  year: number,
  month: number,
): SitePayrollWorkerEntry {
  // 일자별 공수 집계
  const workDays: Record<number, number> = {};
  let totalManDays = 0;
  const uniqueDays = new Set<number>();

  for (const record of records) {
    const d = new Date(record.work_date);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate();
      workDays[day] = (workDays[day] || 0) + record.man_days;
      totalManDays += record.man_days;
      uniqueDays.add(day);
    }
  }

  const totalDays = uniqueDays.size;
  const totalLaborCost = worker.daily_rate * totalManDays;

  const referenceDate = new Date(year, month - 1, 15);
  const deductions = calculateWorkerDeductions(
    worker,
    totalManDays,
    totalDays,
    rates,
    referenceDate,
  );

  const ssnMasked = maskSSN(worker.ssn);

  return {
    worker_id: worker.id,
    worker_name: worker.name,
    job_type: worker.job_type,
    team: worker.team,
    ssn_masked: ssnMasked,
    daily_rate: worker.daily_rate,
    work_days: workDays,
    total_days: totalDays,
    total_man_days: totalManDays,
    total_labor_cost: totalLaborCost,
    ...deductions,
  };
}

/**
 * 주민번호 마스킹 (앞6자리-뒤1자리******)
 */
export function maskSSN(ssn: string): string {
  const cleaned = ssn.replace(/-/g, "");
  if (cleaned.length < 7) return ssn;
  return `${cleaned.slice(0, 6)}-${cleaned[6]}******`;
}

// ============================================
// 기본 요율 (2026년 기준)
// ============================================

export const DEFAULT_RATES_2026: Omit<LaborInsuranceRates, "id"> = {
  effective_year: 2026,
  income_deduction: 150000,
  simplified_tax_rate: 0.027,
  local_tax_rate: 0.1,
  employment_insurance_rate: 0.009,
  health_insurance_rate: 0.03595,
  longterm_care_rate: 0.1314,
  national_pension_rate: 0.045,
  pension_upper_limit: 6170000,
  pension_lower_limit: 390000,
  health_premium_upper: 7822560,
  health_premium_lower: 19780,
};

export const DEFAULT_RATES_2025: Omit<LaborInsuranceRates, "id"> = {
  effective_year: 2025,
  income_deduction: 150000,
  simplified_tax_rate: 0.027,
  local_tax_rate: 0.1,
  employment_insurance_rate: 0.009,
  health_insurance_rate: 0.03545,
  longterm_care_rate: 0.1281,
  national_pension_rate: 0.045,
  pension_upper_limit: 5900000,
  pension_lower_limit: 370000,
  health_premium_upper: 7822560,
  health_premium_lower: 19500,
};
