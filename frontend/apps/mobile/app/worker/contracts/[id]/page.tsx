"use client"

import { use, useEffect, useState } from "react"
import { Button, Badge } from "@yunigreen/ui"
import { ArrowLeft, CheckCircle, PenTool } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

export default function WorkerContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [contract, setContract] = useState<{
    id: string
    project_name: string
    work_date: string
    role: string
    daily_rate: number
    status: "pending" | "signed"
    content: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const response = await api.getWorkerContract(id)
      if (response.success && response.data) {
        setContract(response.data)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [id])

  const handleSign = async () => {
    if (!contract || contract.status === "signed") return
    await api.signWorkerContract(id, "signed")
    const response = await api.getWorkerContract(id)
    if (response.success && response.data) {
      setContract(response.data)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/worker/profile" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">근로계약서 확인</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold">일용직 근로계약서</h2>
            <Badge variant={contract?.status === "signed" ? "success" : "warning"}>
              {contract?.status === "signed" ? "서명 완료" : "서명 대기"}
            </Badge>
          </div>
          
          <div className="space-y-4 text-sm text-slate-600">
             {isLoading ? (
               <div className="text-sm text-slate-400">불러오는 중...</div>
             ) : contract ? (
               <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-400">현장명</p>
                  <p className="font-medium text-slate-900">{contract.project_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">일급</p>
                  <p className="font-medium text-slate-900">
                    {contract.daily_rate.toLocaleString()}원
                  </p>
                </div>
                <div>
                   <p className="text-xs text-slate-400">근로일자</p>
                   <p className="font-medium text-slate-900">{contract.work_date}</p>
                </div>
                <div>
                   <p className="text-xs text-slate-400">직종</p>
                   <p className="font-medium text-slate-900">{contract.role}</p>
                </div>
              </div>
             ) : (
               <div className="text-sm text-slate-400">계약 정보를 찾을 수 없습니다.</div>
             )}

             <div className="h-64 overflow-y-auto rounded border border-slate-200 p-4 text-xs leading-relaxed">
                <p className="font-bold">제1조 (목적)</p>
                <p>{contract?.content || "계약 내용을 불러오는 중입니다."}</p>
                <br />
                <p className="font-bold">제2조 (근로조건)</p>
                <p>1. 근로시간은 ...</p>
                <br />
                <p>(이하 계약 내용 생략)</p>
             </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
        <Button fullWidth size="lg" onClick={handleSign} disabled={contract?.status === "signed"}>
          <PenTool className="mr-2 h-4 w-4" />
          {contract?.status === "signed" ? "서명 완료" : "서명하기"}
        </Button>
      </div>
    </div>
  )
}
