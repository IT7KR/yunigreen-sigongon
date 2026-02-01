"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@sigongon/ui";
import { ArrowLeft, Send, Save } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "@sigongon/ui";

type Project = {
  id: string;
  name: string;
};

type Worker = {
  id: string;
  name: string;
  role: string;
  daily_rate_default: number;
};

type SelectedWorker = {
  id: string;
  name: string;
  role: string;
  daily_rate: number;
};

export default function NewLaborContractPage() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedWorkers, setSelectedWorkers] = useState<SelectedWorker[]>([]);
  const [workDates, setWorkDates] = useState<Date[]>([]);
  const [workStartTime, setWorkStartTime] = useState("08:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [sendMethod, setSendMethod] = useState<"sms" | "kakao">("sms");
  const [isSaving, setIsSaving] = useState(false);

  // Mock data
  const projects: Project[] = [
    { id: "proj_1", name: "강남 아파트 리모델링" },
    { id: "proj_2", name: "서초 상가 인테리어" },
  ];

  const workers: Worker[] = [
    { id: "worker_1", name: "김철수", role: "목수", daily_rate_default: 150000 },
    { id: "worker_2", name: "이영희", role: "도배공", daily_rate_default: 140000 },
    { id: "worker_3", name: "박민수", role: "타일공", daily_rate_default: 160000 },
  ];

  const handleAddWorker = (worker: Worker) => {
    if (selectedWorkers.some((w) => w.id === worker.id)) {
      toast.warning("이미 추가된 근로자입니다.");
      return;
    }
    setSelectedWorkers([
      ...selectedWorkers,
      {
        id: worker.id,
        name: worker.name,
        role: worker.role,
        daily_rate: worker.daily_rate_default,
      },
    ]);
  };

  const handleRemoveWorker = (workerId: string) => {
    setSelectedWorkers(selectedWorkers.filter((w) => w.id !== workerId));
  };

  const handleUpdateDailyRate = (workerId: string, rate: number) => {
    setSelectedWorkers(
      selectedWorkers.map((w) =>
        w.id === workerId ? { ...w, daily_rate: rate } : w
      )
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const exists = workDates.some(
      (d) => d.toDateString() === date.toDateString()
    );
    if (exists) {
      setWorkDates(workDates.filter((d) => d.toDateString() !== date.toDateString()));
    } else {
      setWorkDates([...workDates, date]);
    }
  };

  const handleSave = async (status: "draft" | "send") => {
    if (!selectedProject) {
      toast.warning("프로젝트를 선택해주세요.");
      return;
    }
    if (selectedWorkers.length === 0) {
      toast.warning("근로자를 선택해주세요.");
      return;
    }
    if (workDates.length === 0) {
      toast.warning("근무일을 선택해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        status === "draft"
          ? "임시저장되었습니다."
          : "계약서가 발송되었습니다."
      );
      // Redirect to contracts list
      window.location.href = "/labor/contracts";
    } catch (error) {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/labor/contracts"
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            근로계약서 작성
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Form */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="">프로젝트를 선택하세요</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>근로자 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {workers.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {worker.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {worker.role} • 기본 일당:{" "}
                            {worker.daily_rate_default.toLocaleString()}원
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddWorker(worker)}
                          disabled={selectedWorkers.some(
                            (w) => w.id === worker.id
                          )}
                        >
                          {selectedWorkers.some((w) => w.id === worker.id)
                            ? "추가됨"
                            : "추가"}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {selectedWorkers.length > 0 && (
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-medium text-slate-700">
                        선택된 근로자 ({selectedWorkers.length}명)
                      </p>
                      <div className="space-y-3">
                        {selectedWorkers.map((worker) => (
                          <div
                            key={worker.id}
                            className="flex items-center justify-between gap-4"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">
                                {worker.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {worker.role}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={worker.daily_rate}
                                onChange={(e) =>
                                  handleUpdateDailyRate(
                                    worker.id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-32"
                              />
                              <span className="text-sm text-slate-500">원</span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRemoveWorker(worker.id)}
                              >
                                제거
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>근무일 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500">날짜 선택</label>
                    <Input
                      type="date"
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          handleDateSelect(date);
                        }
                      }}
                      className="mt-1"
                    />
                  </div>
                  {workDates.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">
                        선택된 날짜: {workDates.length}일
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {workDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, index) => (
                            <button
                              key={index}
                              onClick={() => handleDateSelect(date)}
                              className="rounded-lg bg-brand-point-100 px-3 py-1.5 text-sm text-brand-point-700 hover:bg-brand-point-200 transition-colors"
                            >
                              {date.toLocaleDateString("ko-KR")}
                              <span className="ml-1 text-xs">×</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>근무시간</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-slate-500">시작 시간</label>
                    <Input
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">종료 시간</label>
                    <Input
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Summary & Send */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>발송 방법</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sendMethod"
                      value="sms"
                      checked={sendMethod === "sms"}
                      onChange={(e) => setSendMethod(e.target.value as "sms")}
                    />
                    <span className="text-sm text-slate-700">SMS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sendMethod"
                      value="kakao"
                      checked={sendMethod === "kakao"}
                      onChange={(e) => setSendMethod(e.target.value as "kakao")}
                    />
                    <span className="text-sm text-slate-700">카카오 알림톡</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">프로젝트</span>
                    <span className="font-medium text-slate-900">
                      {selectedProject
                        ? projects.find((p) => p.id === selectedProject)?.name
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">근로자 수</span>
                    <span className="font-medium text-slate-900">
                      {selectedWorkers.length}명
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">근무일 수</span>
                    <span className="font-medium text-slate-900">
                      {workDates.length}일
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">근무시간</span>
                    <span className="font-medium text-slate-900">
                      {workStartTime} ~ {workEndTime}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">총 계약 건수</span>
                      <span className="text-lg font-bold text-brand-point-600">
                        {selectedWorkers.length * workDates.length}건
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button
                fullWidth
                size="lg"
                onClick={() => handleSave("send")}
                disabled={isSaving}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSaving ? "발송 중..." : "계약서 발송"}
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                임시 저장
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
