"use client"

import { use, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@yunigreen/ui"
import { FileText, RefreshCw, Upload } from "lucide-react"
import { api } from "@/lib/api"

export default function TaxInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [summary, setSummary] = useState({
    total_amount: 0,
    success_count: 0,
    failed_count: 0,
  })
  const [invoices, setInvoices] = useState<
    Array<{
      id: string
      type: "매출" | "매입"
      amount: number
      status: "published" | "failed"
      date: string
      customer: string
      failure_reason?: string
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    const response = await api.getTaxInvoice(id)
    if (response.success && response.data) {
      setSummary(response.data.summary)
      setInvoices(response.data.items)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleIssue = async () => {
    await api.issueTaxInvoice(id)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">세금계산서 관리</h2>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Upload className="mr-2 h-4 w-4" />
            대체 서류 업로드
          </Button>
          <Button onClick={handleIssue}>
            <FileText className="mr-2 h-4 w-4" />
            세금계산서 발행
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>발행 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500">총 발행 금액</span>
                <span className="font-medium">{summary.total_amount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">발행 성공</span>
                <span className="font-medium text-teal-600">{summary.success_count}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">발행 실패</span>
                <span className="font-medium text-red-600">{summary.failed_count}건</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>발행 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <th className="pb-3 font-medium">발행일</th>
                  <th className="pb-3 font-medium">유형</th>
                  <th className="pb-3 font-medium">공급받는자</th>
                  <th className="pb-3 font-medium">공급가액</th>
                  <th className="pb-3 font-medium">상태</th>
                  <th className="pb-3 font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                      불러오는 중...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                      발행 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 text-slate-900">{invoice.date}</td>
                      <td className="py-4 text-slate-900">{invoice.type}</td>
                      <td className="py-4 text-slate-900">{invoice.customer}</td>
                      <td className="py-4 text-slate-900">
                        {invoice.amount.toLocaleString()}원
                      </td>
                      <td className="py-4">
                        <Badge variant={invoice.status === "published" ? "success" : "error"}>
                          {invoice.status === "published" ? "발행 완료" : "발행 실패"}
                        </Badge>
                        {invoice.status === "failed" && (
                          <p className="mt-1 text-xs text-red-500">{invoice.failure_reason}</p>
                        )}
                      </td>
                      <td className="py-4">
                        {invoice.status === "failed" && (
                          <Button size="sm" variant="secondary">
                            <RefreshCw className="mr-2 h-3 w-3" />
                            재시도
                          </Button>
                        )}
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
  )
}
