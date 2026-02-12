"use client";

import { useState } from "react";
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Database,
  Key,
  Save,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PrimitiveButton, PrimitiveInput, PrimitiveSelect } from "@sigongon/ui";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("organization");

  const sections = [
    { id: "organization", label: "조직 정보", icon: Building2 },
    { id: "notifications", label: "알림 설정", icon: Bell },
    { id: "security", label: "보안", icon: Shield },
    { id: "appearance", label: "외관", icon: Palette },
    { id: "integrations", label: "연동", icon: Database },
    { id: "api", label: "API 키", icon: Key },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">설정</h1>
          <p className="mt-1 text-slate-500">시스템 설정을 관리합니다</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-1">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <PrimitiveButton
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-point-50 text-brand-point-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {section.label}
                    </PrimitiveButton>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-3">
            {activeSection === "organization" && (
              <Card>
                <CardHeader>
                  <CardTitle>조직 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input label="회사명" defaultValue="시공ON" />
                  <Input label="사업자등록번호" defaultValue="123-45-67890" />
                  <Input label="대표자" defaultValue="홍길동" />
                  <Input
                    label="주소"
                    defaultValue="서울시 강남구 테헤란로 123"
                  />
                  <Input label="대표전화" defaultValue="02-1234-5678" />
                  <Input
                    label="이메일"
                    type="email"
                    defaultValue="info@sigongon.com"
                  />
                  <div className="flex justify-end pt-4">
                    <Button>
                      <Save className="h-4 w-4" />
                      저장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>알림 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        새 프로젝트 알림
                      </p>
                      <p className="text-sm text-slate-500">
                        새 프로젝트가 생성되면 알림을 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <PrimitiveInput
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-point-500 peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        진단 완료 알림
                      </p>
                      <p className="text-sm text-slate-500">
                        AI 진단이 완료되면 알림을 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <PrimitiveInput
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-point-500 peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        계약 체결 알림
                      </p>
                      <p className="text-sm text-slate-500">
                        계약이 체결되면 알림을 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <PrimitiveInput
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-point-500 peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">이메일 알림</p>
                      <p className="text-sm text-slate-500">
                        중요 알림을 이메일로도 받습니다
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <PrimitiveInput type="checkbox" className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-point-500 peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle>보안 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium text-slate-900">
                      비밀번호 정책
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <PrimitiveInput
                          type="checkbox"
                          defaultChecked
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-600">
                          최소 8자 이상
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PrimitiveInput
                          type="checkbox"
                          defaultChecked
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-600">
                          대소문자 포함
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PrimitiveInput
                          type="checkbox"
                          defaultChecked
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-600">
                          숫자 포함
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PrimitiveInput
                          type="checkbox"
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-600">
                          특수문자 포함
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">세션 설정</h3>
                    <div className="mt-3">
                      <label className="text-sm text-slate-600">
                        자동 로그아웃 시간
                      </label>
                      <PrimitiveSelect className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                        <option value="30">30분</option>
                        <option value="60">1시간</option>
                        <option value="120">2시간</option>
                        <option value="480">8시간</option>
                      </PrimitiveSelect>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button>
                      <Save className="h-4 w-4" />
                      저장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "api" && (
              <Card>
                <CardHeader>
                  <CardTitle>API 키 관리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Gemini API 키
                    </label>
                    <div className="mt-1 flex gap-2">
                      <PrimitiveInput
                        type="password"
                        defaultValue="AIza..."
                        className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      />
                      <Button variant="secondary">표시</Button>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      AI 진단에 사용되는 Google Gemini API 키
                    </p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button>
                      <Save className="h-4 w-4" />
                      저장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(activeSection === "appearance" ||
              activeSection === "integrations") && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500">준비 중입니다</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
