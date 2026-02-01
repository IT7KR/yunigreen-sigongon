"use client";

import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button } from "@sigongon/ui";
import { Camera, Check, Upload, User, AlertCircle } from "lucide-react";

export default function WorkerRegisterPage() {
  return (
    <MobileLayout title="일용직 근로자 등록" showBack>
      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">
            신분증/안전교육증 촬영
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="h-32 flex-col gap-2 border-dashed"
            >
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">신분증 촬영</span>
            </Button>
            <Button
              variant="secondary"
              className="h-32 flex-col gap-2 border-dashed"
            >
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">안전교육이수증</span>
            </Button>
          </div>
          <p className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            주민등록번호 뒷자리는 마스킹되며, 법령에 따라 관리됩니다.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-900">이름</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">
              주민등록번호
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="000000"
              />
              <span className="text-slate-400">-</span>
              <div className="mt-1 w-full flex gap-1">
                <input
                  type="text"
                  className="w-8 rounded-lg border border-slate-200 px-2 py-2 text-center"
                  placeholder="1"
                  maxLength={1}
                />
                <span className="flex-1 rounded-lg bg-slate-100 py-2 text-slate-400 px-2">
                  ******
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">주소</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="주소 입력"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="residence"
                className="h-4 w-4 rounded border-slate-300 text-brand-point-600 focus:ring-brand-point-500"
              />
              <label htmlFor="residence" className="text-sm text-slate-600">
                실거주 확인
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">
              계좌번호
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <select className="rounded-lg border border-slate-200 px-3 py-2">
                <option>은행 선택</option>
                <option>농협</option>
                <option>국민</option>
              </select>
              <input
                type="text"
                className="col-span-2 rounded-lg border border-slate-200 px-3 py-2"
                placeholder="계좌번호 입력"
              />
            </div>
          </div>
        </div>

        <div className="fixed bottom-20 left-4 right-4">
          <Button fullWidth size="lg">
            등록하기
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
