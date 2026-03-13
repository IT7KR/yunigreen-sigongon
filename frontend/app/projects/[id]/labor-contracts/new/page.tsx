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

  const addWorkerRow = () =>
    setWorkers([...workers, { name: "", phone: "", work_type: "", daily_rate: 0 }]);

  const removeWorkerRow = (idx: number) =>
    setWorkers(workers.filter((_, i) => i !== idx));

  const updateWorker = (idx: number, field: keyof SelectedWorker, value: string | number) =>
    setWorkers(workers.map((w, i) => (i === idx ? { ...w, [field]: value } : w)));

  const addDate = () => {
    if (!dateInput || workDates.includes(dateInput)) return;
    setWorkDates([...workDates, dateInput].sort());
    setDateInput("");
  };

  const removeDate = (d: string) => setWorkDates(workDates.filter((x) => x !== d));

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

      // 발송 요청인 경우 생성된 계약 모두 send
      if (status === "send") {
        const sendPromises = results
          .filter((r) => r.success)
          .map((r) => api.sendLaborContractForSignature(r.data!.id));
        await Promise.all(sendPromises);
      }
    },
    onSuccess: (_, status) => {
      toast.success(status === "draft" ? "임시저장했어요." : "계약서를 발송했어요.");
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
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDate()}
                  />
                  <Button variant="secondary" onClick={addDate}>추가</Button>
                </div>
                {workDates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {workDates.map((d) => (
                      <button
                        key={d}
                        onClick={() => removeDate(d)}
                        className="flex items-center gap-1 rounded-full bg-brand-point-100 px-3 py-1 text-sm text-brand-point-700 hover:bg-brand-point-200"
                      >
                        {d} <X className="h-3 w-3" />
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
