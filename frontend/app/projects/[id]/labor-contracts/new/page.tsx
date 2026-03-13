"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Save, Plus, X } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  toast,
} from "@sigongcore/ui";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type SelectedWorker = {
  name: string;
  phone: string;
  work_type: string;
  daily_rate: number;
};

export default function NewProjectLaborContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [workers, setWorkers] = useState<SelectedWorker[]>([
    { name: "", phone: "", work_type: "", daily_rate: 0 },
  ]);
  const [workDates, setWorkDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [workStartTime, setWorkStartTime] = useState("08:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");

  // 연속일 추가 관련 state
  const [dateTab, setDateTab] = useState<"single" | "range">("single");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [excludeWeekend, setExcludeWeekend] = useState(false);

  const addWorkerRow = () =>
    setWorkers([...workers, { name: "", phone: "", work_type: "", daily_rate: 0 }]);

  const removeWorkerRow = (idx: number) =>
    setWorkers(workers.filter((_, i) => i !== idx));

  const updateWorker = (idx: number, field: keyof SelectedWorker, value: string | number) =>
    setWorkers(workers.map((w, i) => (i === idx ? { ...w, [field]: value } : w)));

  const DAYS = ['일','월','화','수','목','금','토'] as const;
  const formatDateTag = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()} (${DAYS[d.getDay()]})`;
  };

  const addDate = () => {
    if (!dateInput || workDates.includes(dateInput)) return;
    setWorkDates([...workDates, dateInput].sort());
    setDateInput("");
  };

  const removeDate = (d: string) => setWorkDates(workDates.filter((x) => x !== d));

  const applyRange = () => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return;
    const result: string[] = [];
    const cur = new Date(rangeStart + 'T00:00:00');
    const end = new Date(rangeEnd + 'T00:00:00');
    while (cur <= end) {
      const day = cur.getDay();
      if (!excludeWeekend || (day !== 0 && day !== 6)) {
        const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        if (!workDates.includes(iso)) result.push(iso);
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (result.length > 0) {
      setWorkDates([...workDates, ...result].sort());
    }
  };

  const createMutation = useMutation({
    mutationFn: async (status: "draft" | "send") => {
      const validWorkers = workers.filter((w) => w.name && w.daily_rate > 0);
      if (validWorkers.length === 0) throw new Error("근로자를 입력해주세요.");
      if (workDates.length === 0) throw new Error("근무일을 선택해주세요.");

      // workers × dates 조합으로 각각 계약 생성
      const promises = validWorkers.flatMap((worker) =>
        workDates.map((date) =>
          api.createLaborContract(projectId, {
            worker_name: worker.name,
            worker_phone: worker.phone,
            work_date: date,
            work_type: worker.work_type,
            daily_rate: String(worker.daily_rate),
          }),
        ),
      );
      const results = await Promise.all(promises);

      // 발송 요청인 경우 batch-send (근로자별 묶음 발송)
      if (status === "send") {
        const contractIds = results
          .filter((r) => r.success)
          .map((r) => r.data!.id);
        if (contractIds.length > 0) {
          await api.batchSendLaborContracts(projectId, contractIds);
        }
      }
    },
    onSuccess: (_, status) => {
      toast.success(
        status === "draft"
          ? "임시저장했어요."
          : `계약서를 발송했어요. 근로자별로 서명 요청 1건씩 전송됩니다.`
      );
      queryClient.invalidateQueries({ queryKey: ["labor-contracts", projectId] });
      router.push(`/projects/${projectId}/labor-contracts`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalCount = workers.filter((w) => w.name).length * workDates.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${projectId}/labor-contracts`}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-semibold text-slate-900">근로계약서 작성</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 근로자 입력 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>근로자</CardTitle>
                <Button size="sm" variant="secondary" onClick={addWorkerRow}>
                  <Plus className="mr-1 h-3 w-3" />추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workers.map((worker, idx) => (
                  <div key={idx} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
                    <Input
                      placeholder="이름"
                      value={worker.name}
                      onChange={(e) => updateWorker(idx, "name", e.target.value)}
                    />
                    <Input
                      placeholder="연락처"
                      value={worker.phone}
                      onChange={(e) => updateWorker(idx, "phone", e.target.value)}
                    />
                    <Input
                      placeholder="직종 (예: 목수)"
                      value={worker.work_type}
                      onChange={(e) => updateWorker(idx, "work_type", e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="일당"
                        value={worker.daily_rate || ""}
                        onChange={(e) => updateWorker(idx, "daily_rate", parseInt(e.target.value) || 0)}
                      />
                      {workers.length > 1 && (
                        <button onClick={() => removeWorkerRow(idx)} className="text-slate-400 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 근무일 */}
          <Card>
            <CardHeader>
              <CardTitle>근무일</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 탭 전환 */}
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setDateTab("single")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      dateTab === "single"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    단건 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateTab("range")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      dateTab === "range"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    연속일 추가
                  </button>
                </div>

                {/* 단건 추가 탭 */}
                {dateTab === "single" && (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDate()}
                    />
                    <Button variant="secondary" onClick={addDate}>추가</Button>
                  </div>
                )}

                {/* 연속일 추가 탭 */}
                {dateTab === "range" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-slate-400 text-sm shrink-0">~</span>
                      <Input
                        type="date"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={excludeWeekend}
                        onChange={(e) => setExcludeWeekend(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      주말 제외 (토·일 자동 제외)
                    </label>
                    <Button variant="secondary" onClick={applyRange} className="w-full">
                      날짜 적용
                    </Button>
                  </div>
                )}

                {/* 선택된 날짜 태그 */}
                {workDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {workDates.map((d) => (
                      <button
                        key={d}
                        onClick={() => removeDate(d)}
                        className="flex items-center gap-1 rounded-full bg-brand-point-100 px-3 py-1 text-sm text-brand-point-700 hover:bg-brand-point-200"
                      >
                        {formatDateTag(d)} <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 근무시간 */}
          <Card>
            <CardHeader><CardTitle>근무시간</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-500">시작</label>
                  <Input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-500">종료</label>
                  <Input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 요약 + 발송 */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>요약</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">근로자 수</span>
                  <span className="font-medium">{workers.filter((w) => w.name).length}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">근무일 수</span>
                  <span className="font-medium">{workDates.length}일</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">근무시간</span>
                  <span className="font-medium">{workStartTime} ~ {workEndTime}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="text-slate-500">총 계약 건수</span>
                  <span className="text-lg font-bold text-brand-point-600">{totalCount}건</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button
              fullWidth
              size="lg"
              onClick={() => createMutation.mutate("send")}
              disabled={createMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "발송 중..." : "계약서 발송"}
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onClick={() => createMutation.mutate("draft")}
              disabled={createMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />임시 저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
