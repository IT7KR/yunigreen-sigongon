"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PrimitiveButton, PrimitiveSelect, toast } from "@sigongon/ui";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Save,
  FileSpreadsheet,
  Loader2,
  Calendar,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { APIError } from "@sigongon/api";
import { calculateWorkerDeductions } from "@/lib/labor/calculations";
import type {
  DailyWorker,
  DailyWorkRecord,
  SitePayrollReport,
  LaborInsuranceRates,
  ProjectListItem,
} from "@sigongon/types";

// ============================================
// Helpers
// ============================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = getDayOfWeek(year, month, day);
  return dow === 0 || dow === 6;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("ko-KR");
}

// ============================================
// Main Component
// ============================================

export default function PayrollPage() {
  const now = new Date();

  // Selectors
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Data
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [workers, setWorkers] = useState<DailyWorker[]>([]);
  const [rates, setRates] = useState<LaborInsuranceRates | null>(null);

  // Work records: workerId -> day -> manDays
  const [workRecords, setWorkRecords] = useState<Map<string, Map<number, number>>>(new Map());

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Excel dropdown
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  const daysInMonth = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  // ============================================
  // Data Loading
  // ============================================

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.getProjects({ page: 1, per_page: 100 });
        if (res.data) {
          const activeProjects = res.data.filter(
            (p) => p.status === "in_progress" || p.status === "contracted",
          );
          setProjects(activeProjects);
          if (activeProjects.length > 0 && !selectedProject) {
            setSelectedProject(activeProjects[0].id);
          }
        }
      } catch {
        toast.error("프로젝트 목록을 불러오지 못했습니다.");
      }
    };
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load workers
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await api.getDailyWorkers();
        if (res.success && res.data) {
          setWorkers(res.data as DailyWorker[]);
        }
      } catch {
        toast.error("근로자 목록을 불러오지 못했습니다.");
      }
    };
    fetchWorkers();
  }, []);

  // Load insurance rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.getInsuranceRates(selectedYear);
        if (res.success && res.data && res.data.length > 0) {
          setRates(res.data[0] as LaborInsuranceRates);
        }
      } catch {
        toast.error("보험요율 정보를 불러오지 못했습니다.");
      }
    };
    fetchRates();
  }, [selectedYear]);

  // Load work records when project/year/month changes
  useEffect(() => {
    if (!selectedProject) return;

    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const res = await api.getWorkRecords(selectedProject, selectedYear, selectedMonth);
        if (res.success && res.data) {
          const records = res.data as DailyWorkRecord[];
          const map = new Map<string, Map<number, number>>();
          for (const rec of records) {
            const d = new Date(rec.work_date);
            const day = d.getDate();
            if (!map.has(rec.worker_id)) {
              map.set(rec.worker_id, new Map());
            }
            map.get(rec.worker_id)!.set(day, rec.man_days);
          }
          setWorkRecords(map);
        }
      } catch {
        toast.error("근무 기록을 불러오지 못했습니다.");
      }
      setIsLoading(false);
    };
    fetchRecords();
  }, [selectedProject, selectedYear, selectedMonth]);

  // Close excel menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setShowExcelMenu(false);
      }
    };
    if (showExcelMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExcelMenu]);

  // ============================================
  // Day Toggle
  // ============================================

  const toggleDay = useCallback(
    (workerId: string, day: number) => {
      setWorkRecords((prev) => {
        const next = new Map(prev);
        const workerMap = new Map(next.get(workerId) || new Map());
        const current = workerMap.get(day) || 0;
        if (current > 0) {
          workerMap.delete(day);
        } else {
          workerMap.set(day, 1);
        }
        next.set(workerId, workerMap);
        return next;
      });
    },
    [],
  );

  // ============================================
  // Calculations
  // ============================================

  const getWorkerCalc = useCallback(
    (worker: DailyWorker) => {
      if (!rates) {
        return {
          totalDays: 0,
          totalManDays: 0,
          totalLaborCost: 0,
          income_tax: 0,
          resident_tax: 0,
          health_insurance: 0,
          longterm_care: 0,
          national_pension: 0,
          employment_insurance: 0,
          total_deductions: 0,
          net_pay: 0,
        };
      }

      const dayMap = workRecords.get(worker.id);
      if (!dayMap || dayMap.size === 0) {
        return {
          totalDays: 0,
          totalManDays: 0,
          totalLaborCost: 0,
          income_tax: 0,
          resident_tax: 0,
          health_insurance: 0,
          longterm_care: 0,
          national_pension: 0,
          employment_insurance: 0,
          total_deductions: 0,
          net_pay: 0,
        };
      }

      let totalManDays = 0;
      const uniqueDays = new Set<number>();
      dayMap.forEach((manDays, day) => {
        totalManDays += manDays;
        uniqueDays.add(day);
      });
      const totalDays = uniqueDays.size;
      const totalLaborCost = worker.daily_rate * totalManDays;

      const referenceDate = new Date(selectedYear, selectedMonth - 1, 15);
      const deductions = calculateWorkerDeductions(
        worker,
        totalManDays,
        totalDays,
        rates,
        referenceDate,
      );

      return {
        totalDays,
        totalManDays,
        totalLaborCost,
        ...deductions,
      };
    },
    [workRecords, rates, selectedYear, selectedMonth],
  );

  // ============================================
  // Totals
  // ============================================

  const totals = useMemo(() => {
    let totalLaborCost = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    for (const worker of workers) {
      const calc = getWorkerCalc(worker);
      totalLaborCost += calc.totalLaborCost;
      totalDeductions += calc.total_deductions;
      totalNetPay += calc.net_pay;
    }

    return { totalLaborCost, totalDeductions, totalNetPay };
  }, [workers, getWorkerCalc]);

  // ============================================
  // Save
  // ============================================

  const saveWorkRecords = async () => {
    if (!selectedProject) {
      toast.error("프로젝트를 선택하세요.");
      return;
    }
    setIsSaving(true);
    try {
      const records: Array<{
        worker_id: string;
        project_id: string;
        work_date: string;
        man_days: number;
      }> = [];

      workRecords.forEach((dayMap, workerId) => {
        dayMap.forEach((manDays, day) => {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          records.push({
            worker_id: workerId,
            project_id: selectedProject,
            work_date: dateStr,
            man_days: manDays,
          });
        });
      });

      const result = await api.upsertWorkRecords(records);
      if (!result.success) {
        toast.error(result.error?.message || "근무 기록 저장에 실패했습니다.");
        return;
      }
      toast.success("근무 기록이 저장되었습니다.");
    } catch (error) {
      if (error instanceof APIError && error.status === 422) {
        const details = error.details as
          | {
              blocked_workers?: Array<{
                worker_name?: string;
                missing_requirements?: string[];
              }>;
            }
          | undefined;
        const blockedWorkers = details?.blocked_workers ?? [];
        if (blockedWorkers.length > 0) {
          const blockedNames = blockedWorkers
            .map((item) => item.worker_name)
            .filter(Boolean)
            .join(", ");
          toast.error(
            blockedNames
              ? `필수서류/동의 미완료로 저장할 수 없어요: ${blockedNames}`
              : "필수서류/동의 미완료 근로자가 있어 저장할 수 없어요.",
          );
          return;
        }
      }
      toast.error(error instanceof Error ? error.message : "근무 기록 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // Excel Downloads
  // ============================================

  const handleExcelDownload = async (type: "site" | "consolidated" | "kwdi" | "tax") => {
    if (!selectedProject && type !== "consolidated") {
      toast.error("프로젝트를 선택하세요.");
      return;
    }
    setIsExporting(true);
    setShowExcelMenu(false);
    try {
      const excelModule = await import("@/lib/labor/excelExport");

      if (type === "site") {
        const res = await api.generateSiteReport(selectedProject, selectedYear, selectedMonth);
        if (res.success && res.data) {
          await excelModule.generateSitePayrollExcel(res.data as SitePayrollReport);
          toast.success("현장별 일용신고명세서가 다운로드되었습니다.");
        }
      } else if (type === "consolidated") {
        const res = await api.generateConsolidatedReport(selectedYear, selectedMonth);
        if (res.success && res.data) {
          await excelModule.generateConsolidatedExcel(res.data);
          toast.success("월별 통합본이 다운로드되었습니다.");
        }
      } else if (type === "kwdi") {
        const res = await api.generateSiteReport(selectedProject, selectedYear, selectedMonth);
        if (res.success && res.data) {
          await excelModule.generateKWDIReportExcel(res.data as SitePayrollReport);
          toast.success("근로복지공단 양식이 다운로드되었습니다.");
        }
      } else if (type === "tax") {
        const res = await api.generateSiteReport(selectedProject, selectedYear, selectedMonth);
        if (res.success && res.data) {
          await excelModule.generateNationalTaxExcel(res.data as SitePayrollReport);
          toast.success("국세청 양식이 다운로드되었습니다.");
        }
      }
    } catch {
      toast.error("엑셀 파일 생성에 실패했습니다.");
    }
    setIsExporting(false);
  };

  // ============================================
  // Month Navigation
  // ============================================

  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-slate-500" />
            <h1 className="text-2xl font-bold text-slate-900">급여/근무 관리</h1>
          </div>
        </div>

        {/* Controls bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Project selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">현장</label>
                <PrimitiveSelect
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">현장 선택</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </PrimitiveSelect>
              </div>

              {/* Year selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">연도</label>
                <PrimitiveSelect
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </PrimitiveSelect>
              </div>

              {/* Month selector with navigation */}
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap mr-1">월</label>
                <PrimitiveButton
                  onClick={goToPrevMonth}
                  className="rounded-md p-1.5 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-500" />
                </PrimitiveButton>
                <span className="min-w-[3rem] text-center text-sm font-semibold text-slate-900">
                  {selectedMonth}월
                </span>
                <PrimitiveButton
                  onClick={goToNextMonth}
                  className="rounded-md p-1.5 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </PrimitiveButton>
              </div>

              <div className="flex-1" />

              {/* Save button */}
              <Button onClick={saveWorkRecords} disabled={isSaving || !selectedProject}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                저장
              </Button>

              {/* Excel dropdown */}
              <div className="relative" ref={excelMenuRef}>
                <Button
                  variant="secondary"
                  onClick={() => setShowExcelMenu(!showExcelMenu)}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  엑셀 다운로드
                  <Download className="ml-2 h-3 w-3" />
                </Button>
                {showExcelMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
                    <PrimitiveButton
                      onClick={() => handleExcelDownload("site")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      현장별 일용신고명세서
                    </PrimitiveButton>
                    <PrimitiveButton
                      onClick={() => handleExcelDownload("consolidated")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      월별 통합본
                    </PrimitiveButton>
                    <PrimitiveButton
                      onClick={() => handleExcelDownload("kwdi")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      근로복지공단 양식
                    </PrimitiveButton>
                    <PrimitiveButton
                      onClick={() => handleExcelDownload("tax")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      국세청 양식
                    </PrimitiveButton>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Grid Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              근무 현황표 &mdash; {selectedYear}년 {selectedMonth}월
              {workers.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {workers.length}명
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-3 text-sm text-slate-500">근무 기록을 불러오는 중...</span>
              </div>
            ) : workers.length === 0 ? (
              <div className="py-20 text-center text-sm text-slate-400">
                등록된 일용 근로자가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-50">
                      {/* Sticky columns */}
                      <th className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 w-10">
                        No.
                      </th>
                      <th className="sticky left-[40px] z-20 bg-slate-50 border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 w-16">
                        성명
                      </th>
                      <th className="sticky left-[104px] z-20 bg-slate-50 border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 w-16">
                        직종
                      </th>
                      {/* Day columns */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const weekend = isWeekend(selectedYear, selectedMonth, day);
                        return (
                          <th
                            key={`day-${day}`}
                            className={`border-r border-slate-200 px-1 py-2 text-center font-medium w-8 ${
                              weekend ? "bg-blue-50 text-blue-600" : "text-slate-500"
                            }`}
                          >
                            {day}
                          </th>
                        );
                      })}
                      {/* Summary columns */}
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">출력일수</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600">공수</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600">단가</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600">노무비</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600">갑근세</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600">주민세</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">건강보험</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">요양보험</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">국민연금</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">고용보험</th>
                      <th className="border-r border-slate-200 px-2 py-2 text-center font-semibold text-slate-600">공제계</th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">차감지급액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((worker, idx) => {
                      const calc = getWorkerCalc(worker);
                      const workerDayMap = workRecords.get(worker.id);
                      return (
                        <tr
                          key={worker.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Sticky columns */}
                          <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-2 py-2 text-center text-slate-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="sticky left-[40px] z-10 bg-white border-r border-slate-200 px-2 py-2 text-center font-medium text-slate-900 whitespace-nowrap">
                            {worker.name}
                          </td>
                          <td className="sticky left-[104px] z-10 bg-white border-r border-slate-200 px-2 py-2 text-center text-slate-500 whitespace-nowrap">
                            {worker.job_type}
                          </td>
                          {/* Day cells */}
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                            const manDays = workerDayMap?.get(day) || 0;
                            const weekend = isWeekend(selectedYear, selectedMonth, day);
                            return (
                              <td
                                key={`${worker.id}-${day}`}
                                onClick={() => toggleDay(worker.id, day)}
                                className={`border-r border-slate-100 px-1 py-2 text-center cursor-pointer select-none transition-colors ${
                                  weekend ? "bg-blue-50/50" : ""
                                } ${manDays > 0 ? "text-blue-700 font-bold" : "text-slate-300"} hover:bg-blue-100`}
                              >
                                {manDays > 0 ? "1" : ""}
                              </td>
                            );
                          })}
                          {/* Summary columns */}
                          <td className="border-r border-slate-200 px-2 py-2 text-center font-medium text-slate-700">
                            {calc.totalDays || ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-center font-medium text-slate-700">
                            {calc.totalManDays || ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(worker.daily_rate)}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-slate-900 font-medium whitespace-nowrap">
                            {calc.totalLaborCost > 0 ? formatCurrency(calc.totalLaborCost) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {calc.income_tax > 0 ? formatCurrency(calc.income_tax) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {calc.resident_tax > 0 ? formatCurrency(calc.resident_tax) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {calc.health_insurance > 0 ? formatCurrency(calc.health_insurance) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {calc.longterm_care > 0 ? formatCurrency(calc.longterm_care) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {calc.national_pension > 0 ? formatCurrency(calc.national_pension) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {calc.employment_insurance > 0 ? formatCurrency(calc.employment_insurance) : ""}
                          </td>
                          <td className="border-r border-slate-200 px-2 py-2 text-right font-mono text-red-700 font-medium whitespace-nowrap">
                            {calc.total_deductions > 0 ? formatCurrency(calc.total_deductions) : ""}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-blue-700 font-bold whitespace-nowrap">
                            {calc.net_pay > 0 ? formatCurrency(calc.net_pay) : ""}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Totals row */}
                    {workers.length > 0 && (
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <td
                          colSpan={3}
                          className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-2 py-3 text-center text-slate-700"
                        >
                          합계
                        </td>
                        {/* Empty day columns */}
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <td key={`total-day-${i}`} className="border-r border-slate-100" />
                        ))}
                        {/* Empty: 출력일수, 공수, 단가 */}
                        <td className="border-r border-slate-200" />
                        <td className="border-r border-slate-200" />
                        <td className="border-r border-slate-200" />
                        {/* 노무비 total */}
                        <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-slate-900 whitespace-nowrap">
                          {formatCurrency(totals.totalLaborCost)}
                        </td>
                        {/* Deduction detail totals */}
                        {(() => {
                          let tIncome = 0;
                          let tResident = 0;
                          let tHealth = 0;
                          let tLongterm = 0;
                          let tPension = 0;
                          let tEmployment = 0;
                          for (const w of workers) {
                            const c = getWorkerCalc(w);
                            tIncome += c.income_tax;
                            tResident += c.resident_tax;
                            tHealth += c.health_insurance;
                            tLongterm += c.longterm_care;
                            tPension += c.national_pension;
                            tEmployment += c.employment_insurance;
                          }
                          return (
                            <>
                              <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-600 whitespace-nowrap">
                                {tIncome > 0 ? formatCurrency(tIncome) : ""}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-600 whitespace-nowrap">
                                {tResident > 0 ? formatCurrency(tResident) : ""}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-600 whitespace-nowrap">
                                {tHealth > 0 ? formatCurrency(tHealth) : ""}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-600 whitespace-nowrap">
                                {tLongterm > 0 ? formatCurrency(tLongterm) : ""}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-600 whitespace-nowrap">
                                {tPension > 0 ? formatCurrency(tPension) : ""}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-600 whitespace-nowrap">
                                {tEmployment > 0 ? formatCurrency(tEmployment) : ""}
                              </td>
                            </>
                          );
                        })()}
                        {/* 공제계 total */}
                        <td className="border-r border-slate-200 px-2 py-3 text-right font-mono text-red-700 whitespace-nowrap">
                          {formatCurrency(totals.totalDeductions)}
                        </td>
                        {/* 차감지급액 total */}
                        <td className="px-2 py-3 text-right font-mono text-blue-700 whitespace-nowrap">
                          {formatCurrency(totals.totalNetPay)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                총 노무비
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(totals.totalLaborCost)}원
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {workers.length}명 합산
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                총 공제
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.totalDeductions)}원
              </div>
              <p className="text-xs text-slate-400 mt-1">
                세금 + 4대보험
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">
                총 지급액
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(totals.totalNetPay)}원
              </div>
              <p className="text-xs text-slate-400 mt-1">
                노무비 - 공제
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
