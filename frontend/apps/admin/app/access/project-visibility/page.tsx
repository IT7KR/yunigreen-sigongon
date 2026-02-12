"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, PrimitiveButton } from "@sigongon/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { Check } from "lucide-react";

// Mock data
const projects = [
  { id: 1, name: "강남구 역삼동 인테리어 공사", visible: true },
  { id: 2, name: "서초구 반포동 아파트 리모델링", visible: false },
  { id: 3, name: "송파구 잠실동 상가 철거", visible: false },
];

export default function ProjectVisibilityPage() {
  const [projectList, setProjectList] = useState(projects);

  const toggleVisibility = (id: number) => {
    setProjectList(
      projectList.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          프로젝트 가시성 설정
        </h1>
        <p className="mt-1 text-slate-600">
          소장은 선택된 프로젝트만 볼 수 있습니다.
        </p>
      </div>

      <Card className="max-w-2xl overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm font-medium text-slate-500">
            <div>프로젝트명</div>
            <div>소장 공개 여부</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {projectList.map((project) => (
            <div
              key={project.id}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-900">{project.name}</div>
              <PrimitiveButton
                onClick={() => toggleVisibility(project.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-point-500 focus:ring-offset-2 ${
                  project.visible ? "bg-brand-point-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    project.visible ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </PrimitiveButton>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-200 p-6">
          <Link href="/projects">
            <Button size="lg">저장</Button>
          </Link>
        </div>
      </Card>
    </AdminLayout>
  );
}
