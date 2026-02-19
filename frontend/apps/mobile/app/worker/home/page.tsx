"use client";

import Link from "next/link";
import { Bell, CreditCard, FileText } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import {
  Card,
  CardContent,
  InteractiveCard,
  PageTransition,
} from "@sigongon/ui";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type WorkerContract = {
  id: string;
  project_name: string;
  work_date: string;
  role: string;
  daily_rate: number;
  status: "pending" | "signed";
};

type WorkerPaystub = {
  id: string;
  month: string;
  amount: number;
  status: "sent" | "confirmed";
  date: string;
};

type Notification = {
  id: string;
  type: "contract" | "paystub" | "notice";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export default function WorkerHomePage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<WorkerContract[]>([]);
  const [paystubs, setPaystubs] = useState<WorkerPaystub[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [workerName, setWorkerName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [profileRes, contractsRes, paystubsRes, notificationsRes] =
        await Promise.all([
          (api as unknown as { getWorkerProfile: (id: string) => Promise<{ success: boolean; data: { name: string } | null }> }).getWorkerProfile(user?.id ?? ""),
          (api as unknown as { getWorkerContracts: (id: string) => Promise<{ success: boolean; data: WorkerContract[] | null }> }).getWorkerContracts(user?.id ?? ""),
          (api as unknown as { getWorkerPaystubs: (id: string) => Promise<{ success: boolean; data: WorkerPaystub[] | null }> }).getWorkerPaystubs(user?.id ?? ""),
          (api as unknown as { getNotifications: () => Promise<{ success: boolean; data: Notification[] | null }> }).getNotifications(),
        ]);

      if (profileRes.success && profileRes.data) {
        setWorkerName(profileRes.data.name);
      }
      if (contractsRes.success && contractsRes.data) {
        setContracts(contractsRes.data);
      }
      if (paystubsRes.success && paystubsRes.data) {
        setPaystubs(paystubsRes.data);
      }
      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
      }
      setIsLoading(false);
    };

    void fetchData();
  }, []);

  const pendingContracts = contracts.filter((c) => c.status === "pending");
  const latestContract = contracts[0] ?? null;
  const latestPaystub = paystubs[0] ?? null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <MobileLayout>
      <PageTransition>
        <div className="space-y-6 p-4">
          {/* 환영 메시지 */}
          <div className="pt-4">
            <h1 className="text-2xl font-bold text-slate-900">
              안녕하세요{workerName ? `, ${workerName}님` : ""}!
            </h1>
            <p className="mt-1 text-slate-500">오늘도 수고 많으세요</p>
          </div>

          {/* 빠른 현황 */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                {isLoading ? (
                  <div className="h-7 w-8 animate-pulse rounded bg-slate-200" />
                ) : (
                  <p className="text-2xl font-bold text-brand-point-600">
                    {contracts.length}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">전체 계약</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                {isLoading ? (
                  <div className="h-7 w-8 animate-pulse rounded bg-slate-200" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">
                    {pendingContracts.length}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">서명 대기</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                {isLoading ? (
                  <div className="h-7 w-8 animate-pulse rounded bg-slate-200" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {unreadCount}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">미확인 알림</p>
              </CardContent>
            </Card>
          </div>

          {/* 최근 근로계약 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">최근 근로계약서</h2>
              <Link
                href={`/worker/contracts?workerId=${user?.id ?? ""}`}
                className="text-sm text-brand-point-600"
              >
                전체보기
              </Link>
            </div>
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                  </div>
                </CardContent>
              </Card>
            ) : latestContract ? (
              <Link
                href={`/worker/contracts/${latestContract.id}?workerId=${user?.id ?? ""}`}
              >
                <InteractiveCard className="hover:border-brand-point-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-100">
                          <FileText className="h-5 w-5 text-brand-point-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {latestContract.project_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {latestContract.work_date} · {latestContract.role}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          latestContract.status === "signed"
                            ? "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                            : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        }
                      >
                        {latestContract.status === "signed"
                          ? "서명 완료"
                          : "서명 대기"}
                      </span>
                    </div>
                  </CardContent>
                </InteractiveCard>
              </Link>
            ) : (
              <Card>
                <CardContent className="p-4 text-center text-sm text-slate-400">
                  근로계약서가 없습니다.
                </CardContent>
              </Card>
            )}
          </div>

          {/* 최근 지급명세서 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">최근 지급명세서</h2>
              <Link
                href={`/worker/paystubs?workerId=${user?.id ?? ""}`}
                className="text-sm text-brand-point-600"
              >
                전체보기
              </Link>
            </div>
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                  </div>
                </CardContent>
              </Card>
            ) : latestPaystub ? (
              <Link
                href={`/worker/paystubs/${latestPaystub.id}?workerId=${user?.id ?? ""}`}
              >
                <InteractiveCard className="hover:border-brand-primary-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-100">
                          <CreditCard className="h-5 w-5 text-brand-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {latestPaystub.month} 급여
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            지급일: {latestPaystub.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brand-point-600">
                          {latestPaystub.amount.toLocaleString()}원
                        </p>
                        {latestPaystub.status === "confirmed" ? (
                          <p className="text-xs font-medium text-green-600">
                            수령 확인됨
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">미확인</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </InteractiveCard>
              </Link>
            ) : (
              <Card>
                <CardContent className="p-4 text-center text-sm text-slate-400">
                  지급명세서가 없습니다.
                </CardContent>
              </Card>
            )}
          </div>

          {/* 알림 미리보기 */}
          {!isLoading && unreadCount > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">읽지 않은 알림</h2>
                <Link href="/notifications" className="text-sm text-brand-point-600">
                  전체보기
                </Link>
              </div>
              <div className="space-y-2">
                {notifications
                  .filter((n) => !n.read)
                  .slice(0, 2)
                  .map((notification) => (
                    <Link key={notification.id} href="/notifications">
                      <InteractiveCard>
                        <CardContent className="flex items-start gap-3 p-3">
                          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-point-100">
                            <Bell className="h-4 w-4 text-brand-point-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {notification.message}
                            </p>
                          </div>
                        </CardContent>
                      </InteractiveCard>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    </MobileLayout>
  );
}
