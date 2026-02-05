"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  toast,
} from "@sigongon/ui";
import { Save, RefreshCw, Calendar, Percent, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LaborInsuranceRates } from "@sigongon/types";

export default function LaborSettingsPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [rates, setRates] = useState<LaborInsuranceRates | null>(null);
  const [previousYearRates, setPreviousYearRates] = useState<LaborInsuranceRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [incomeDeduction, setIncomeDeduction] = useState("150000");
  const [simplifiedTaxRate, setSimplifiedTaxRate] = useState("2.7");
  const [localTaxRate, setLocalTaxRate] = useState("10");
  const [employmentInsuranceRate, setEmploymentInsuranceRate] = useState("0.9");
  const [healthInsuranceRate, setHealthInsuranceRate] = useState("3.595");
  const [longtermCareRate, setLongtermCareRate] = useState("13.14");
  const [nationalPensionRate, setNationalPensionRate] = useState("4.5");
  const [pensionUpperLimit, setPensionUpperLimit] = useState("6170000");
  const [pensionLowerLimit, setPensionLowerLimit] = useState("390000");
  const [healthPremiumUpper, setHealthPremiumUpper] = useState("7822560");
  const [healthPremiumLower, setHealthPremiumLower] = useState("19780");

  const availableYears = [2025, 2026];

  useEffect(() => {
    loadRates(selectedYear);
    if (selectedYear > 2025) {
      loadPreviousYearRates(selectedYear - 1);
    }
  }, [selectedYear]);

  const loadRates = async (year: number) => {
    setIsLoading(true);
    try {
      const res = await api.getInsuranceRates(year);
      if (res.success && res.data && res.data.length > 0) {
        const rateData = res.data[0];
        setRates(rateData);
        populateForm(rateData);
      } else {
        setRates(null);
        resetForm();
      }
    } catch (error) {
      toast.error("보험요율 정보를 불러오는데 실패했습니다.");
    }
    setIsLoading(false);
  };

  const loadPreviousYearRates = async (year: number) => {
    try {
      const res = await api.getInsuranceRates(year);
      if (res.success && res.data && res.data.length > 0) {
        setPreviousYearRates(res.data[0]);
      } else {
        setPreviousYearRates(null);
      }
    } catch {
      setPreviousYearRates(null);
    }
  };

  const populateForm = (data: LaborInsuranceRates) => {
    setIncomeDeduction(data.income_deduction.toString());
    setSimplifiedTaxRate((data.simplified_tax_rate * 100).toFixed(3));
    setLocalTaxRate((data.local_tax_rate * 100).toFixed(1));
    setEmploymentInsuranceRate((data.employment_insurance_rate * 100).toFixed(2));
    setHealthInsuranceRate((data.health_insurance_rate * 100).toFixed(3));
    setLongtermCareRate((data.longterm_care_rate * 100).toFixed(2));
    setNationalPensionRate((data.national_pension_rate * 100).toFixed(1));
    setPensionUpperLimit(data.pension_upper_limit.toString());
    setPensionLowerLimit(data.pension_lower_limit.toString());
    setHealthPremiumUpper(data.health_premium_upper.toString());
    setHealthPremiumLower(data.health_premium_lower.toString());
  };

  const resetForm = () => {
    setIncomeDeduction("150000");
    setSimplifiedTaxRate("2.7");
    setLocalTaxRate("10");
    setEmploymentInsuranceRate("0.9");
    setHealthInsuranceRate("3.595");
    setLongtermCareRate("13.14");
    setNationalPensionRate("4.5");
    setPensionUpperLimit("6170000");
    setPensionLowerLimit("390000");
    setHealthPremiumUpper("7822560");
    setHealthPremiumLower("19780");
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const validatePositiveNumber = (value: string, field: string, label: string) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        newErrors[field] = `${label}은(는) 0 이상의 숫자여야 합니다`;
      }
    };

    validatePositiveNumber(incomeDeduction, "incomeDeduction", "소득공제금액");
    validatePositiveNumber(simplifiedTaxRate, "simplifiedTaxRate", "속산세율");
    validatePositiveNumber(localTaxRate, "localTaxRate", "지방소득세율");
    validatePositiveNumber(employmentInsuranceRate, "employmentInsuranceRate", "고용보험 근로자");
    validatePositiveNumber(healthInsuranceRate, "healthInsuranceRate", "건강보험");
    validatePositiveNumber(longtermCareRate, "longtermCareRate", "장기요양보험");
    validatePositiveNumber(nationalPensionRate, "nationalPensionRate", "국민연금");
    validatePositiveNumber(pensionUpperLimit, "pensionUpperLimit", "국민연금 상한");
    validatePositiveNumber(pensionLowerLimit, "pensionLowerLimit", "국민연금 하한");
    validatePositiveNumber(healthPremiumUpper, "healthPremiumUpper", "건강보험 상한");
    validatePositiveNumber(healthPremiumLower, "healthPremiumLower", "건강보험 하한");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("입력 값을 확인해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        effective_year: selectedYear,
        income_deduction: parseFloat(incomeDeduction),
        simplified_tax_rate: parseFloat(simplifiedTaxRate) / 100,
        local_tax_rate: parseFloat(localTaxRate) / 100,
        employment_insurance_rate: parseFloat(employmentInsuranceRate) / 100,
        health_insurance_rate: parseFloat(healthInsuranceRate) / 100,
        longterm_care_rate: parseFloat(longtermCareRate) / 100,
        national_pension_rate: parseFloat(nationalPensionRate) / 100,
        pension_upper_limit: parseFloat(pensionUpperLimit),
        pension_lower_limit: parseFloat(pensionLowerLimit),
        health_premium_upper: parseFloat(healthPremiumUpper),
        health_premium_lower: parseFloat(healthPremiumLower),
      };

      if (rates) {
        await api.updateInsuranceRates(rates.id, data);
        toast.success("보험요율 설정이 업데이트되었습니다.");
      } else {
        await api.createInsuranceRates(data);
        toast.success("보험요율 설정이 등록되었습니다.");
      }

      loadRates(selectedYear);
    } catch (error) {
      toast.error("보험요율 저장에 실패했습니다.");
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    if (rates) {
      populateForm(rates);
    } else {
      resetForm();
    }
    setErrors({});
    toast.success("초기화되었습니다.");
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("ko-KR").format(num);
  };

  const getChangeIndicator = (currentValue: string, previousValue?: number) => {
    if (!previousValue || !previousYearRates) return null;

    const current = parseFloat(currentValue);
    if (isNaN(current) || current === previousValue) return null;

    const diff = current - previousValue;
    const isIncrease = diff > 0;

    return (
      <span className={`ml-2 text-xs font-medium ${isIncrease ? "text-red-600" : "text-green-600"}`}>
        {isIncrease ? "↑" : "↓"} {Math.abs(diff).toFixed(2)}
      </span>
    );
  };

  const getChangeIndicatorPercent = (currentValue: string, previousValue?: number) => {
    if (!previousValue || !previousYearRates) return null;

    const current = parseFloat(currentValue);
    const previous = previousValue * 100;
    if (isNaN(current) || current === previous) return null;

    const diff = current - previous;
    const isIncrease = diff > 0;

    return (
      <span className={`ml-2 text-xs font-medium ${isIncrease ? "text-red-600" : "text-green-600"}`}>
        {isIncrease ? "↑" : "↓"} {Math.abs(diff).toFixed(3)}%
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">보험요율 설정</h1>
            <p className="mt-1 text-sm text-slate-600">
              플랫폼 전체에 적용되는 4대보험 요율과 세율을 관리합니다. 변경 시 모든 고객사에 자동 적용됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-point-500"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-400">
              불러오는 중...
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>현재 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 소득세 설정 */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">소득세 설정</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        소득공제금액 (원)
                        {previousYearRates && getChangeIndicator(incomeDeduction, previousYearRates.income_deduction)}
                      </label>
                      <Input
                        type="text"
                        value={formatCurrency(incomeDeduction)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "");
                          setIncomeDeduction(value);
                          setErrors({ ...errors, incomeDeduction: "" });
                        }}
                        error={errors.incomeDeduction}
                        placeholder="150,000"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        속산세율 (%)
                        {previousYearRates && getChangeIndicatorPercent(simplifiedTaxRate, previousYearRates.simplified_tax_rate)}
                      </label>
                      <Input
                        type="text"
                        value={simplifiedTaxRate}
                        onChange={(e) => {
                          setSimplifiedTaxRate(e.target.value);
                          setErrors({ ...errors, simplifiedTaxRate: "" });
                        }}
                        error={errors.simplifiedTaxRate}
                        placeholder="2.7"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        지방소득세율 (%)
                        {previousYearRates && getChangeIndicatorPercent(localTaxRate, previousYearRates.local_tax_rate)}
                      </label>
                      <Input
                        type="text"
                        value={localTaxRate}
                        onChange={(e) => {
                          setLocalTaxRate(e.target.value);
                          setErrors({ ...errors, localTaxRate: "" });
                        }}
                        error={errors.localTaxRate}
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                {/* 4대보험 요율 */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">4대보험 요율 (%)</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        고용보험 근로자
                        {previousYearRates && getChangeIndicatorPercent(employmentInsuranceRate, previousYearRates.employment_insurance_rate)}
                      </label>
                      <Input
                        type="text"
                        value={employmentInsuranceRate}
                        onChange={(e) => {
                          setEmploymentInsuranceRate(e.target.value);
                          setErrors({ ...errors, employmentInsuranceRate: "" });
                        }}
                        error={errors.employmentInsuranceRate}
                        placeholder="0.9"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        건강보험
                        {previousYearRates && getChangeIndicatorPercent(healthInsuranceRate, previousYearRates.health_insurance_rate)}
                      </label>
                      <Input
                        type="text"
                        value={healthInsuranceRate}
                        onChange={(e) => {
                          setHealthInsuranceRate(e.target.value);
                          setErrors({ ...errors, healthInsuranceRate: "" });
                        }}
                        error={errors.healthInsuranceRate}
                        placeholder="3.595"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        장기요양보험
                        {previousYearRates && getChangeIndicatorPercent(longtermCareRate, previousYearRates.longterm_care_rate)}
                      </label>
                      <Input
                        type="text"
                        value={longtermCareRate}
                        onChange={(e) => {
                          setLongtermCareRate(e.target.value);
                          setErrors({ ...errors, longtermCareRate: "" });
                        }}
                        error={errors.longtermCareRate}
                        placeholder="13.14"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        국민연금
                        {previousYearRates && getChangeIndicatorPercent(nationalPensionRate, previousYearRates.national_pension_rate)}
                      </label>
                      <Input
                        type="text"
                        value={nationalPensionRate}
                        onChange={(e) => {
                          setNationalPensionRate(e.target.value);
                          setErrors({ ...errors, nationalPensionRate: "" });
                        }}
                        error={errors.nationalPensionRate}
                        placeholder="4.5"
                      />
                    </div>
                  </div>
                </div>

                {/* 국민연금 기준소득월액 */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">국민연금 기준소득월액 (원)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        상한
                        {previousYearRates && getChangeIndicator(pensionUpperLimit, previousYearRates.pension_upper_limit)}
                      </label>
                      <Input
                        type="text"
                        value={formatCurrency(pensionUpperLimit)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "");
                          setPensionUpperLimit(value);
                          setErrors({ ...errors, pensionUpperLimit: "" });
                        }}
                        error={errors.pensionUpperLimit}
                        placeholder="6,170,000"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        하한
                        {previousYearRates && getChangeIndicator(pensionLowerLimit, previousYearRates.pension_lower_limit)}
                      </label>
                      <Input
                        type="text"
                        value={formatCurrency(pensionLowerLimit)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "");
                          setPensionLowerLimit(value);
                          setErrors({ ...errors, pensionLowerLimit: "" });
                        }}
                        error={errors.pensionLowerLimit}
                        placeholder="390,000"
                      />
                    </div>
                  </div>
                </div>

                {/* 건강보험 납부한도 */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">건강보험 납부한도 (원)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        상한
                        {previousYearRates && getChangeIndicator(healthPremiumUpper, previousYearRates.health_premium_upper)}
                      </label>
                      <Input
                        type="text"
                        value={formatCurrency(healthPremiumUpper)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "");
                          setHealthPremiumUpper(value);
                          setErrors({ ...errors, healthPremiumUpper: "" });
                        }}
                        error={errors.healthPremiumUpper}
                        placeholder="7,822,560"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        하한
                        {previousYearRates && getChangeIndicator(healthPremiumLower, previousYearRates.health_premium_lower)}
                      </label>
                      <Input
                        type="text"
                        value={formatCurrency(healthPremiumLower)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "");
                          setHealthPremiumLower(value);
                          setErrors({ ...errors, healthPremiumLower: "" });
                        }}
                        error={errors.healthPremiumLower}
                        placeholder="19,780"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button variant="secondary" onClick={handleReset} disabled={isSaving}>
                    <RefreshCw className="h-4 w-4" />
                    초기화
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>처리중...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        저장
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Year Comparison */}
            {previousYearRates && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-slate-400" />
                    연도별 비교: {selectedYear - 1}년 vs {selectedYear}년
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="pb-3 font-medium text-slate-900">항목</th>
                          <th className="pb-3 font-medium text-slate-600 text-right">{selectedYear - 1}년</th>
                          <th className="pb-3 font-medium text-slate-600 text-center">
                            <ArrowRight className="h-4 w-4 inline" />
                          </th>
                          <th className="pb-3 font-medium text-slate-900 text-right">{selectedYear}년</th>
                          <th className="pb-3 font-medium text-slate-600 text-right">변동</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-3 text-slate-700">소득공제금액</td>
                          <td className="py-3 text-right text-slate-600">{formatCurrency(previousYearRates.income_deduction.toString())}원</td>
                          <td></td>
                          <td className="py-3 text-right font-medium">{formatCurrency(incomeDeduction)}원</td>
                          <td className="py-3 text-right">
                            {getChangeIndicator(incomeDeduction, previousYearRates.income_deduction)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-700">속산세율</td>
                          <td className="py-3 text-right text-slate-600">{(previousYearRates.simplified_tax_rate * 100).toFixed(3)}%</td>
                          <td></td>
                          <td className="py-3 text-right font-medium">{simplifiedTaxRate}%</td>
                          <td className="py-3 text-right">
                            {getChangeIndicatorPercent(simplifiedTaxRate, previousYearRates.simplified_tax_rate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-700">고용보험</td>
                          <td className="py-3 text-right text-slate-600">{(previousYearRates.employment_insurance_rate * 100).toFixed(2)}%</td>
                          <td></td>
                          <td className="py-3 text-right font-medium">{employmentInsuranceRate}%</td>
                          <td className="py-3 text-right">
                            {getChangeIndicatorPercent(employmentInsuranceRate, previousYearRates.employment_insurance_rate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-700">건강보험</td>
                          <td className="py-3 text-right text-slate-600">{(previousYearRates.health_insurance_rate * 100).toFixed(3)}%</td>
                          <td></td>
                          <td className="py-3 text-right font-medium">{healthInsuranceRate}%</td>
                          <td className="py-3 text-right">
                            {getChangeIndicatorPercent(healthInsuranceRate, previousYearRates.health_insurance_rate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-700">장기요양보험</td>
                          <td className="py-3 text-right text-slate-600">{(previousYearRates.longterm_care_rate * 100).toFixed(2)}%</td>
                          <td></td>
                          <td className="py-3 text-right font-medium">{longtermCareRate}%</td>
                          <td className="py-3 text-right">
                            {getChangeIndicatorPercent(longtermCareRate, previousYearRates.longterm_care_rate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-700">국민연금</td>
                          <td className="py-3 text-right text-slate-600">{(previousYearRates.national_pension_rate * 100).toFixed(1)}%</td>
                          <td></td>
                          <td className="py-3 text-right font-medium">{nationalPensionRate}%</td>
                          <td className="py-3 text-right">
                            {getChangeIndicatorPercent(nationalPensionRate, previousYearRates.national_pension_rate)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
