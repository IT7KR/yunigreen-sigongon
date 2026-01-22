"use client"

import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@yunigreen/ui"
import { CreditCard, Users, CheckCircle, Plus } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export default function BillingPage() {
  const [overview, setOverview] = useState({
    plan: "",
    interval: "monthly" as "monthly" | "yearly",
    next_billing_at: "",
    seats_used: 0,
    seats_total: 0,
    payment_method: null as null | {
      brand: string
      last4: string
      expires: string
    },
    history: [] as Array<{
      id: string
      date: string
      description: string
      amount: number
      status: "paid" | "failed"
    }>,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const response = await api.getBillingOverview()
      if (response.success && response.data) {
        setOverview(response.data)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">결제 및 구독</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>현재 플랜</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {overview.plan || "Pro Plan"}
                  </span>
                  <span className="text-slate-500">/ {overview.interval === "yearly" ? "연" : "월"}</span>
                </div>
                <p className="mt-1 text-slate-500">
                  다음 결제일: {overview.next_billing_at || "-"}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>사용자 좌석</span>
                  <span className="font-medium">
                    {overview.seats_used} / {overview.seats_total}석
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-teal-500"
                    style={{
                      width:
                        overview.seats_total === 0
                          ? "0%"
                          : `${Math.min(100, Math.round((overview.seats_used / overview.seats_total) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button>플랜 변경</Button>
                <Button variant="secondary">좌석 추가</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>결제 수단</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {overview.payment_method ? (
                <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <CreditCard className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {overview.payment_method.brand} ({overview.payment_method.last4})
                    </p>
                    <p className="text-sm text-slate-500">만료일: {overview.payment_method.expires}</p>
                  </div>
                  <Badge variant="success">기본</Badge>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                  등록된 결제 수단이 없습니다.
                </div>
              )}

              <Button variant="secondary" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                카드 추가
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>결제 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">일시</th>
                    <th className="pb-3 font-medium">내용</th>
                    <th className="pb-3 font-medium">금액</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">영수증</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                        불러오는 중...
                      </td>
                    </tr>
                  ) : overview.history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                        결제 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    overview.history.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-4 text-slate-500">{item.date}</td>
                        <td className="py-4 text-slate-900">{item.description}</td>
                        <td className="py-4 text-slate-900">{item.amount.toLocaleString()}원</td>
                        <td className="py-4">
                          <span
                            className={`flex items-center gap-1 text-sm font-medium ${
                              item.status === "paid" ? "text-teal-600" : "text-red-600"
                            }`}
                          >
                            <CheckCircle className="h-3 w-3" />
                            {item.status === "paid" ? "결제 성공" : "결제 실패"}
                          </span>
                        </td>
                        <td className="py-4">
                          <Button size="sm" variant="ghost">보기</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
