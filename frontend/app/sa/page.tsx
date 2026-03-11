"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MotionNumber,
  Skeleton,
  formatDate,
  StatCard,
} from "@sigongcore/ui";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";

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

interface ExpiringSubscription {
  id: string;
  company_name: string;
  plan: string;
  expires_at: string;
  days_remaining: number;
}
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-8">
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <StatCard key={i} title="로딩 중..." value={0} loading color="brand" />
      ))}
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl border border-slate-100 p-4"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

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
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<
    ExpiringSubscription[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      const [dashRes, expiringRes] = await Promise.all([
        api.getSADashboard(),
        api.getExpiringSubscriptions(30),
      ]);
      if (dashRes.success && dashRes.data) {
        setStats(dashRes.data.stats);
        setRecentActivity(dashRes.data.recent_activity);
        setMonthlyRevenue(dashRes.data.monthly_revenue);
        setPlanDistribution(dashRes.data.plan_distribution);
      }
      if (expiringRes.success && expiringRes.data) {
        setExpiringSubscriptions(expiringRes.data.items);
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
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard
                title="전체 고객사"
                value={stats.total_tenants}
                icon={Building2}
                color="blue"
                trend={{ value: stats.tenants_growth, direction: "up" }}
              />

              <StatCard
                title="활성 사용자"
                value={stats.total_users}
                icon={Users}
                color="purple"
                trend={{ value: stats.users_growth, direction: "up" }}
              />

              <StatCard
                title="이번달 매출"
                value={Math.round(stats.monthly_revenue / 10000)}
                suffix="만원"
                icon={DollarSign}
                color="green"
                trend={{ value: stats.revenue_growth, direction: "up" }}
              />

              <StatCard
                title="신규 가입"
                value={stats.new_signups}
                icon={TrendingUp}
                color="amber"
                trend={{ value: stats.signups_growth, direction: "up" }}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
                <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
                  <CardTitle>월별 매출 추이</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 md:border-0 md:p-0">
                    {monthlyRevenue.map((item) => (
                      <div key={item.month}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-600">{item.month}</span>
                          <span className="font-bold text-slate-900">
                            {(item.amount / 10000).toFixed(0)}만원
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-brand-point-500"
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

              <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
                <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
                  <CardTitle>요금제별 분포</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
                  <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 md:border-0 md:p-0">
                    {planDistribution.map((item, idx) => (
                      <div key={item.plan}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${
                                idx === 0
                                  ? "bg-slate-400"
                                  : idx === 1
                                    ? "bg-blue-500"
                                    : "bg-purple-600"
                              }`}
                            />
                            <span className="text-sm font-semibold text-slate-900">
                              {item.plan}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {item.count}개
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className={`h-1.5 rounded-full ${
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

            {/* Expiring Subscriptions Alert */}
            {expiringSubscriptions.length > 0 && (
              <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
                <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    구독 만료 임박 업체
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
                  <div className="space-y-3">
                    {expiringSubscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className={`flex items-center justify-between rounded-lg p-3 ${
                          sub.days_remaining <= 3
                            ? "bg-red-50 border border-red-200"
                            : sub.days_remaining <= 7
                              ? "bg-amber-50 border border-amber-200"
                              : "bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              sub.days_remaining <= 3
                                ? "bg-red-100"
                                : sub.days_remaining <= 7
                                  ? "bg-amber-100"
                                  : "bg-slate-100"
                            }`}
                          >
                            <Calendar
                              className={`h-4 w-4 ${
                                sub.days_remaining <= 3
                                  ? "text-red-600"
                                  : sub.days_remaining <= 7
                                    ? "text-amber-600"
                                    : "text-slate-600"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {sub.company_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {sub.plan} 플랜 · 만료일: {sub.expires_at}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            sub.days_remaining <= 3
                              ? "text-red-700"
                              : sub.days_remaining <= 7
                                ? "text-amber-700"
                                : "text-slate-700"
                          }`}
                        >
                          D-{sub.days_remaining}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-none bg-transparent md:border md:border-slate-100 md:bg-white md:shadow-sm">
              <CardHeader className="px-1 pt-0 md:px-4 md:pt-4">
                <CardTitle>최근 활동</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 md:px-4 md:pb-4">
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
                        <span className="text-xs text-slate-500">
                          {formatDate(activity.timestamp)}
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
