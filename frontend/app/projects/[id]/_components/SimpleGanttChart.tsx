import type { ConstructionPhaseRead } from "@sigongcore/types";
import { cn } from "@sigongcore/ui";

interface Props {
  phases: ConstructionPhaseRead[];
}

function getMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

export function SimpleGanttChart({ phases }: Props) {
  if (phases.length === 0) return null;

  const today = new Date();
  const allDates = phases.flatMap((p) => [
    new Date(p.planned_start),
    new Date(p.planned_end),
  ]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  // Focus range primarily on the data with a small padding (e.g. 7 days)
  const paddingMs = 7 * 24 * 60 * 60 * 1000;
  const effectiveMinDate = new Date(minDate.getTime() - paddingMs);
  const effectiveMaxDate = new Date(maxDate.getTime() + paddingMs);

  const getPercent = (d: Date) => {
    const total = effectiveMaxDate.getTime() - effectiveMinDate.getTime();
    return ((d.getTime() - effectiveMinDate.getTime()) / total) * 100;
  };

  const todayPct = getPercent(today);
  // Show marker only if today is within the relevant project context (plus margin)
  const isTodayVisible = todayPct >= 0 && todayPct <= 100;

  // Formatting today for the legend area
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
            공정 타임라인
          </h3>
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-100">
            오늘 {todayFormatted}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm" /> 완료
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" /> 진행중
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm" /> 지연
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto scrollbar-hide py-4">
        <div className="min-w-[850px] relative">
          
          {/* Unified Header Row */}
          <div className="relative flex border-b border-slate-100 pb-4 mb-2">
            {/* Sticky Header Label Area */}
            <div className="sticky left-0 z-30 w-32 sm:w-36 shrink-0 bg-white border-r border-slate-100 flex items-end justify-end pr-5">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-1">PHASE</span>
            </div>
            
            {/* Timeline Month/Day Markers */}
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

          {/* Background Grid Lines (Behind everything) */}
          <div className="absolute inset-x-0 top-14 bottom-0 z-0 pointer-events-none">
            <div className="ml-32 sm:ml-36 relative h-full">
              <div className="absolute inset-0 flex justify-between">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} className="h-full border-r border-slate-50/50" />
                ))}
              </div>
            </div>
          </div>

          {/* Integrated Construction Phase Rows */}
          <div className="relative z-10 flex flex-col">
            {phases.map((phase) => {
              const startPct = getPercent(new Date(phase.planned_start));
              const endPct = getPercent(new Date(phase.planned_end));
              const widthPct = endPct - startPct;

              const isActuallyDelayed =
                phase.is_delayed ||
                (phase.status !== "completed" &&
                  new Date(phase.planned_end).getTime() < today.setHours(0, 0, 0, 0));

              const color = isActuallyDelayed
                ? "from-red-400 to-red-600 shadow-red-100"
                : statusColors[phase.status] === "bg-green-400"
                  ? "from-green-400 to-green-600 shadow-green-100"
                  : statusColors[phase.status] === "bg-blue-400"
                    ? "from-blue-400 to-blue-600 shadow-blue-100"
                    : "from-slate-200 to-slate-200 shadow-slate-50";

              return (
                <div key={phase.id} className="group/row flex items-stretch hover:bg-slate-50 transition-colors">
                  {/* Sticky Label Column - Clean vertical column feel */}
                  <div className="sticky left-0 z-20 w-32 sm:w-36 shrink-0 py-4 bg-white border-r border-slate-100 pr-5 flex items-center justify-end">
                    <span className="text-[13px] font-bold text-slate-600 group-hover/row:text-primary-600 transition-colors truncate">
                      {phase.name}
                    </span>
                  </div>

                  {/* Bar Content Area */}
                  <div className="flex-1 px-4 py-4 relative">
                    <div className="h-7 w-full rounded-md bg-slate-50/20 relative">
                      <div
                        className={cn(
                          "peer h-full rounded-md bg-gradient-to-r shadow-sm transition-all duration-300 hover:scale-[1.01] hover:brightness-105 cursor-help",
                          color
                        )}
                        style={{
                          marginLeft: `${startPct}%`,
                          width: `${Math.max(widthPct, 2.5)}%`,
                        }}
                      />
                      
                      {/* Detailed Tooltip */}
                      <div
                        className="absolute -top-16 left-0 z-40 hidden group-hover/row:block whitespace-nowrap rounded-lg bg-slate-900 px-4 py-3 text-[11px] text-white shadow-2xl ring-1 ring-white/10"
                        style={{
                          marginLeft: `calc(${startPct}% + ${widthPct / 2}%)`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className="font-bold border-b border-white/10 pb-1.5 mb-1.5 text-xs text-center">
                          {phase.name}
                        </div>
                        <div className="opacity-90 leading-relaxed text-center font-medium">
                          {phase.planned_start} ~ {phase.planned_end}
                          <br />
                          {phase.planned_days}일 소요
                        </div>
                        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current day indicator - Dashed Line and Improved UX */}
          {isTodayVisible && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-0 border-l border-red-500/40 border-dashed"
              style={{ left: `calc(${todayPct}% + ${window.innerWidth < 640 ? 128 : 144}px)` }}
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
