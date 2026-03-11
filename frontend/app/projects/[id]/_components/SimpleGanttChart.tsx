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
  const allDates = phases.flatMap((p) => [new Date(p.planned_start), new Date(p.planned_end)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  // Extend range slightly
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  const getPercent = (d: Date) =>
    ((d.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;

  const todayPct = Math.max(0, Math.min(100, getPercent(today)));

  // Generate month labels
  const months: { label: string; pct: number }[] = [];
  const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cur <= maxDate) {
    months.push({ label: getMonthLabel(cur), pct: getPercent(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-400",
    in_progress: "bg-blue-400",
    pending: "bg-slate-300",
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-600">간트 차트</h3>
      <div className="relative">
        {/* Month labels */}
        <div className="relative mb-2 h-5">
          {months.map((m, i) => (
            <span
              key={i}
              className="absolute text-xs text-slate-400"
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Phase bars */}
        <div className="space-y-2">
          {phases.map((phase) => {
            const startPct = getPercent(new Date(phase.planned_start));
            const endPct = getPercent(new Date(phase.planned_end));
            const widthPct = endPct - startPct;
            const color = phase.is_delayed
              ? "bg-red-400"
              : statusColors[phase.status] || "bg-slate-300";

            return (
              <div key={phase.id} className="flex items-center gap-3">
                <div className="w-24 shrink-0 truncate text-right text-xs text-slate-500">
                  {phase.name}
                </div>
                <div className="relative flex-1">
                  <div className="h-5 w-full rounded bg-slate-50">
                    <div
                      className={cn("h-full rounded text-xs leading-5 text-white", color)}
                      style={{
                        marginLeft: `${startPct}%`,
                        width: `${Math.max(widthPct, 1)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Today marker */}
        <div
          className="pointer-events-none absolute bottom-0 top-6 w-px bg-red-400"
          style={{ left: `calc(${todayPct}% + 96px + 12px)` }}
        >
          <div className="absolute -top-1 left-1 text-xs font-bold text-red-400">오늘</div>
        </div>
      </div>
    </div>
  );
}
