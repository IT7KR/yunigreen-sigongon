"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ConstructionPhaseRead, LaborPlanRead, MaterialPlanRead } from "@sigongcore/types";
import { cn } from "@sigongcore/ui";

interface Props {
  phases: ConstructionPhaseRead[];
  labors: LaborPlanRead[];
  materials: MaterialPlanRead[];
}

function getMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

export function SimpleGanttChart({ phases, labors, materials }: Props) {
  const [showLabors, setShowLabors] = useState(true);
  const [showMaterials, setShowMaterials] = useState(true);

  const hasAnyData = phases.length > 0 || labors.length > 0 || materials.length > 0;
  if (!hasAnyData) return null;

  const today = new Date();

  // Collect all dates from all groups
  const allDates: Date[] = [];
  phases.forEach((p) => {
    allDates.push(new Date(p.planned_start), new Date(p.planned_end));
  });
  labors.forEach((l) => {
    allDates.push(new Date(l.start_date), new Date(l.end_date));
  });
  materials.forEach((m) => {
    allDates.push(new Date(m.start_date), new Date(m.end_date));
  });

  if (allDates.length === 0) return null;

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const paddingMs = 7 * 24 * 60 * 60 * 1000;
  const effectiveMinDate = new Date(minDate.getTime() - paddingMs);
  const effectiveMaxDate = new Date(maxDate.getTime() + paddingMs);

  const getPercent = (d: Date) => {
    const total = effectiveMaxDate.getTime() - effectiveMinDate.getTime();
    return ((d.getTime() - effectiveMinDate.getTime()) / total) * 100;
  };

  const todayPct = getPercent(today);
  const isTodayVisible = todayPct >= 0 && todayPct <= 100;
  const todayFormatted = `${today.getMonth() + 1}월 ${today.getDate()}일`;

  // Generate month labels
  const months: { label: string; pct: number }[] = [];
  const cur = new Date(effectiveMinDate.getFullYear(), effectiveMinDate.getMonth(), 1);
  while (cur <= effectiveMaxDate) {
    months.push({ label: getMonthLabel(cur), pct: getPercent(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-400",
    in_progress: "bg-blue-400",
    pending: "bg-slate-300",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
            통합 타임라인
          </h3>
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-100">
            오늘 {todayFormatted}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" /> 공정
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-orange-500 shadow-sm" /> 인력
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm" /> 자재
          </div>
        </div>
      </div>

      <div className="relative max-h-[300px] overflow-y-auto overflow-x-auto scrollbar-hide py-4">
        <div className="min-w-[850px] relative">

          {/* Unified Header Row */}
          <div className="relative flex border-b border-slate-100 pb-4 mb-2">
            <div className="sticky left-0 z-30 w-32 sm:w-36 shrink-0 bg-white border-r border-slate-100 flex items-end justify-end pr-5">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-1">PLAN</span>
            </div>
            <div className="relative flex-1 h-10">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute border-l border-slate-200 pl-2 h-full flex flex-col justify-end"
                  style={{ left: `${m.pct}%` }}
                >
                  <span className="text-[12px] font-bold text-slate-900 tracking-tight whitespace-nowrap">
                    {m.label}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">1일</span>
                </div>
              ))}
            </div>
          </div>

          {/* Background Grid */}
          <div className="absolute inset-x-0 top-14 bottom-0 z-0 pointer-events-none">
            <div className="ml-32 sm:ml-36 relative h-full">
              <div className="absolute inset-0 flex justify-between">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} className="h-full border-r border-slate-50/50" />
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col">

            {/* Phase Group */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 border-b border-blue-100/50">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">공정계획</span>
              <span className="text-[10px] text-blue-400 font-medium">{phases.length}개</span>
            </div>
            {phases.length === 0 ? (
              <div className="flex items-stretch">
                <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-3 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                  <span className="text-[11px] text-slate-300 italic">항목 없음</span>
                </div>
                <div className="flex-1" />
              </div>
            ) : (
              phases.map((phase) => {
                const startPct = getPercent(new Date(phase.planned_start));
                const endPct = getPercent(new Date(phase.planned_end));
                const widthPct = endPct - startPct;
                const isActuallyDelayed =
                  phase.is_delayed ||
                  (phase.status !== "completed" &&
                    new Date(phase.planned_end).getTime() < new Date().setHours(0, 0, 0, 0));
                const color = isActuallyDelayed
                  ? "from-red-400 to-red-600 shadow-red-100"
                  : statusColors[phase.status] === "bg-green-400"
                    ? "from-green-400 to-green-600 shadow-green-100"
                    : statusColors[phase.status] === "bg-blue-400"
                      ? "from-blue-400 to-blue-600 shadow-blue-100"
                      : "from-slate-200 to-slate-200 shadow-slate-50";

                return (
                  <div key={phase.id} className="group/row flex items-stretch hover:bg-slate-50 transition-colors">
                    <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-3 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                      <span className="text-[12px] font-bold text-slate-600 group-hover/row:text-primary-600 transition-colors truncate">
                        {phase.name}
                      </span>
                    </div>
                    <div className="flex-1 px-4 py-3 relative">
                      <div className="h-6 w-full rounded-md relative">
                        <div
                          className={cn(
                            "h-full rounded-md bg-gradient-to-r shadow-sm transition-all duration-300 cursor-help",
                            color
                          )}
                          style={{
                            marginLeft: `${startPct}%`,
                            width: `${Math.max(widthPct, 2.5)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Labor Group */}
            <button
              onClick={() => setShowLabors(!showLabors)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50/50 border-y border-orange-100/50 hover:bg-orange-50 transition-colors w-full text-left"
            >
              {showLabors ? <ChevronDown className="h-3 w-3 text-orange-500" /> : <ChevronRight className="h-3 w-3 text-orange-500" />}
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-[11px] font-black text-orange-700 uppercase tracking-wider">인력계획</span>
              <span className="text-[10px] text-orange-400 font-medium">{labors.length}개</span>
            </button>
            {showLabors && (
              labors.length === 0 ? (
                <div className="flex items-stretch">
                  <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-3 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                    <span className="text-[11px] text-slate-300 italic">항목 없음</span>
                  </div>
                  <div className="flex-1" />
                </div>
              ) : (
                labors.map((labor) => {
                  const startPct = getPercent(new Date(labor.start_date));
                  const endPct = getPercent(new Date(labor.end_date));
                  const widthPct = endPct - startPct;
                  return (
                    <div key={labor.id} className="group/row flex items-stretch hover:bg-orange-50/30 transition-colors">
                      <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-3 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                        <span className="text-[12px] font-bold text-slate-600 truncate">
                          {labor.job_title}
                          <span className="ml-1 text-[10px] text-orange-500 font-medium">{labor.headcount}명</span>
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-3 relative">
                        <div className="h-6 w-full rounded-md relative">
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-orange-400 to-orange-500 shadow-sm shadow-orange-100 cursor-help"
                            style={{
                              marginLeft: `${startPct}%`,
                              width: `${Math.max(widthPct, 2.5)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}

            {/* Material Group */}
            <button
              onClick={() => setShowMaterials(!showMaterials)}
              className="flex items-center gap-2 px-4 py-2 bg-green-50/50 border-y border-green-100/50 hover:bg-green-50 transition-colors w-full text-left"
            >
              {showMaterials ? <ChevronDown className="h-3 w-3 text-green-500" /> : <ChevronRight className="h-3 w-3 text-green-500" />}
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[11px] font-black text-green-700 uppercase tracking-wider">자재투입</span>
              <span className="text-[10px] text-green-400 font-medium">{materials.length}개</span>
            </button>
            {showMaterials && (
              materials.length === 0 ? (
                <div className="flex items-stretch">
                  <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-3 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                    <span className="text-[11px] text-slate-300 italic">항목 없음</span>
                  </div>
                  <div className="flex-1" />
                </div>
              ) : (
                materials.map((material) => {
                  const startPct = getPercent(new Date(material.start_date));
                  const endPct = getPercent(new Date(material.end_date));
                  const widthPct = endPct - startPct;
                  return (
                    <div key={material.id} className="group/row flex items-stretch hover:bg-green-50/30 transition-colors">
                      <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-3 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                        <span className="text-[12px] font-bold text-slate-600 truncate">
                          {material.material_name}
                          <span className="ml-1 text-[10px] text-green-500 font-medium">{material.quantity}</span>
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-3 relative">
                        <div className="h-6 w-full rounded-md relative">
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-green-400 to-green-500 shadow-sm shadow-green-100 cursor-help"
                            style={{
                              marginLeft: `${startPct}%`,
                              width: `${Math.max(widthPct, 2.5)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Current day indicator */}
          {isTodayVisible && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-0 border-l border-red-500/40 border-dashed"
              style={{ left: `calc(${todayPct}% + 144px)` }}
            >
              <div className="absolute top-0 left-0 -translate-x-1/2">
                <span className="whitespace-nowrap rounded-b-md bg-red-500 px-2 py-0.5 text-[9px] font-black text-white shadow-md">
                  오늘
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
