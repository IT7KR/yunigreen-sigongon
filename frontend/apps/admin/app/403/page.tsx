"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@sigongon/ui";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <h1 className="mt-6 text-4xl font-bold text-slate-900">
          접근 권한 없음
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          이 페이지에 접근할 권한이 없습니다.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          최고관리자 권한이 필요한 페이지입니다.
        </p>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button>대시보드로 돌아가기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
