"use client"

import { use, useEffect, useState } from "react"
import { Button } from "@yunigreen/ui"
import { ArrowLeft, CheckCircle, Download } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

export default function WorkerPaystubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const workerId = "worker_1"
  const [paystub, setPaystub] = useState<{
    id: string
    title: string
    total_amount: number
    deductions: number
    net_amount: number
    items: Array<{ label: string; amount: number }>
    status: "sent" | "confirmed"
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const response = await api.getWorkerPaystub(workerId, id)
      if (response.success && response.data) {
        setPaystub(response.data)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [id])

  const handleConfirm = async () => {
    if (!paystub || paystub.status === "confirmed") return
    setIsConfirming(true)
    const response = await api.ackWorkerPaystub(workerId, id)
    if (response.success) {
      setPaystub({ ...paystub, status: "confirmed" })
    }
    setIsConfirming(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/worker/paystubs" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">지급명세서 상세</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          {isLoading ? (
            <div className="text-center text-sm text-slate-400">불러오는 중...</div>
          ) : paystub ? (
            <>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-6">{paystub.title}</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">지급총액</span>
                    <span className="font-bold">{paystub.total_amount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">공제총액</span>
                    <span className="font-bold text-red-500">-{paystub.deductions.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-lg font-bold text-slate-900">실수령액</span>
                    <span className="text-lg font-bold text-teal-600">{paystub.net_amount.toLocaleString()}원</span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
                  <p className="font-bold mb-2">상세 내역</p>
                  {paystub.items.map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-slate-500">{item.label}</span>
                      <span>{item.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-slate-400">지급명세서를 찾을 수 없습니다.</div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 flex gap-3">
        <Button variant="secondary" className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          다운로드
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={isConfirming || paystub?.status === "confirmed"}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {paystub?.status === "confirmed" ? "수령 확인 완료" : "수령 확인"}
        </Button>
      </div>
    </div>
  )
}
