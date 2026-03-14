"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@sigongcore/ui";
import type { ConstructionPlanRead } from "@sigongcore/types";

interface Props {
  projectId: string;
  plan: ConstructionPlanRead;
}

type OtherTab = "safety" | "equipment" | "waste";

const tabConfig: { key: OtherTab; label: string; field: "safety_plan" | "equipment_plan" | "waste_plan"; placeholder: string }[] = [
  { key: "safety", label: "안전/환경 관리", field: "safety_plan", placeholder: "안전관리 계획, 환경관리 사항을 작성해주세요.\n\n예시:\n- 안전모, 안전화 착용 의무\n- 작업 전 안전교육 실시\n- 소음/분진 관리 대책" },
  { key: "equipment", label: "장비 투입", field: "equipment_plan", placeholder: "장비 투입 계획을 작성해주세요.\n\n예시:\n- 굴착기 (0.7m3) x 1대: 4/1 ~ 4/5\n- 양수기 x 2대: 4/1 ~ 4/30\n- 크레인 (25톤) x 1대: 4/10 ~ 4/15" },
  { key: "waste", label: "폐기물 처리", field: "waste_plan", placeholder: "폐기물 처리 계획을 작성해주세요.\n\n예시:\n- 건설폐기물 분리배출 계획\n- 허가업체 위탁 처리\n- 폐기물 적치장 위치 및 관리" },
];

function AutoSaveTextarea({
  value: initialValue,
  field,
  placeholder,
  projectId,
}: {
  value: string;
  field: string;
  placeholder: string;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(initialValue);

  // Sync when external data changes
  useEffect(() => {
    if (initialValue !== initialRef.current) {
      setValue(initialValue);
      initialRef.current = initialValue;
    }
  }, [initialValue]);

  const mutation = useMutation({
    mutationFn: (newValue: string) =>
      api.updateConstructionPlan(projectId, { [field]: newValue }),
    onSuccess: () => {
      setSaveStatus("saved");
      setLastSaved(new Date());
      initialRef.current = value;
      queryClient.invalidateQueries({ queryKey: ["construction-plan", projectId] });
    },
    onError: () => {
      setSaveStatus("idle");
    },
  });

  const debouncedSave = useCallback(
    (newValue: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (newValue !== initialRef.current) {
          setSaveStatus("saving");
          mutation.mutate(newValue);
        }
      }, 1500);
    },
    [mutation],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setSaveStatus("idle");
    debouncedSave(newValue);
  };

  const getStatusText = () => {
    if (saveStatus === "saving") return "저장 중...";
    if (saveStatus === "saved" && lastSaved) {
      const diff = Math.round((Date.now() - lastSaved.getTime()) / 1000);
      if (diff < 60) return "저장 완료";
      const minutes = Math.floor(diff / 60);
      return `마지막 저장: ${minutes}분 전`;
    }
    return null;
  };

  // Refresh status text periodically
  const [, setTick] = useState(0);
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [saveStatus]);

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={12}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-primary-400 focus:ring-4 focus:ring-primary-50 resize-y min-h-[200px]"
      />
      <div className="flex justify-end px-1">
        <span
          className={cn(
            "text-xs font-medium transition-opacity",
            saveStatus === "saving" ? "text-amber-500" : "text-green-500",
            saveStatus === "idle" ? "opacity-0" : "opacity-100",
          )}
        >
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}

export function OthersSection({ projectId, plan }: Props) {
  const [activeTab, setActiveTab] = useState<OtherTab>("safety");

  const current = tabConfig.find((t) => t.key === activeTab)!;
  const currentValue = (plan[current.field] as string) ?? "";

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-all",
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <AutoSaveTextarea
        key={current.field}
        value={currentValue}
        field={current.field}
        placeholder={current.placeholder}
        projectId={projectId}
      />
    </div>
  );
}
