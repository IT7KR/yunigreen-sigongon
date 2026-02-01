"use client";

import Link from "next/link";
import { Button, Input, Card } from "@sigongon/ui";

export default function OnboardingInvitePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-2xl p-6 md:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">담당자 및 소장 초대</h1>
          <p className="mt-2 text-slate-600">
            현장 소장은 모바일 앱으로 작업일지/사진을 등록합니다.
          </p>
        </div>

        <form className="space-y-8">
          {/* Manager Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">본사 담당자 (최대 2명)</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Input placeholder="이름" />
              <Input placeholder="이메일" type="email" />
              <Input placeholder="연락처" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input placeholder="이름" />
              <Input placeholder="이메일" type="email" />
              <Input placeholder="연락처" />
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Site Manager Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">현장 소장 계정</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="이메일 (ID로 사용)" type="email" />
              <Input placeholder="연락처" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/" className="flex-1">
              <Button variant="secondary" fullWidth size="lg">
                나중에 하기
              </Button>
            </Link>
            <Link href="/" className="flex-[2]">
              <Button fullWidth size="lg">
                초대 보내기
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
