"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CountUp,
  Skeleton,
} from "@sigongon/ui";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";


interface DashboardStats {
  total_tenants: number;
  total_users: number;
  monthly_revenue: number;
  new_signups: number;
  tenants_growth: number;
  users_growth: number;
  revenue_growth: number;
  signups_growth: number;
}

interface RecentActivity {
  id: string;
  type: "tenant" | "payment" | "inquiry";
  title: string;
  description: string;
  timestamp: string;
}

interface MonthlyRevenue {
  month: string;
  amount: number;
}

interface PlanDistribution {
  plan: string;
  count: number;
  percentage: number;
}

export default function SADashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_tenants: 0,
    total_users: 0,
    monthly_revenue: 0,
    new_signups: 0,
    tenants_growth: 0,
    users_growth: 0,
    revenue_growth: 0,
    signups_growth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      const response = await api.getSADashboard();
      if (response.success && response.data) {
        setStats(response.data.stats);
        setRecentActivity(response.data.recent_activity);
        setMonthlyRevenue(response.data.monthly_revenue);
        setPlanDistribution(response.data.plan_distribution);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.amount));

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            최고관리자 대시보드
          </h1>
          <p className="mt-1 text-slate-500">전체 시스템 현황을 확인하세요</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">전체 고객사</p>
                      <CountUp
                        end={stats.total_tenants}
                        className="mt-1 text-3xl font-bold text-slate-900"
                      />
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <ArrowUp className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {stats.tenants_growth}%
                        </span>
                        <span className="text-slate-500">vs 지난달</span>
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">활성 사용자</p>
                      <CountUp
                        end={stats.total_users}
                        className="mt-1 text-3xl font-bold text-slate-900"
                      />
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <ArrowUp className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {stats.users_growth}%
                        </span>
                        <span className="text-slate-500">vs 지난달</span>
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">이번달 매출</p>
                      <div className="mt-1 text-3xl font-bold text-slate-900">
                        {(stats.monthly_revenue / 10000).toFixed(0)}만원
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <ArrowUp className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {stats.revenue_growth}%
                        </span>
                        <span className="text-slate-500">vs 지난달</span>
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">신규 가입</p>
                      <CountUp
                        end={stats.new_signups}
                        className="mt-1 text-3xl font-bold text-slate-900"
                      />
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <ArrowUp className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {stats.signups_growth}%
                        </span>
                        <span className="text-slate-500">vs 지난달</span>
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>월별 매출 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthlyRevenue.map((item) => (
                      <div key={item.month}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-600">{item.month}</span>
                          <span className="font-medium text-slate-900">
                            {(item.amount / 10000).toFixed(0)}만원
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-brand-point-500"
                            style={{
                              width: `${(item.amount / maxRevenue) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>요금제별 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {planDistribution.map((item, idx) => (
                      <div key={item.plan}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                idx === 0
                                  ? "bg-slate-400"
                                  : idx === 1
                                    ? "bg-blue-500"
                                    : "bg-purple-600"
                              }`}
                            />
                            <span className="text-sm font-medium text-slate-900">
                              {item.plan}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">
                              {item.count}개
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${
                              idx === 0
                                ? "bg-slate-400"
                                : idx === 1
                                  ? "bg-blue-500"
                                  : "bg-purple-600"
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 rounded-lg border border-slate-100 p-4"
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                            activity.type === "tenant"
                              ? "bg-blue-100"
                              : activity.type === "payment"
                                ? "bg-green-100"
                                : "bg-amber-100"
                          }`}
                        >
                          {activity.type === "tenant" && (
                            <Building2
                              className={`h-5 w-5 ${
                                activity.type === "tenant"
                                  ? "text-blue-600"
                                  : ""
                              }`}
                            />
                          )}
                          {activity.type === "payment" && (
                            <DollarSign className="h-5 w-5 text-green-600" />
                          )}
                          {activity.type === "inquiry" && (
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {activity.title}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-600">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-sm text-slate-500">
                          {activity.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    최근 활동이 없어요
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
