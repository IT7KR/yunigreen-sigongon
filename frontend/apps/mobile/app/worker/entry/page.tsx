"use client"

import { Button, Card, CardContent } from "@yunigreen/ui"
import { Droplets, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { api } from "@/lib/api"

export default function WorkerEntryPage() {
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequest = async () => {
    setIsSubmitting(true)
    const response = await api.requestWorkerAccess(phone)
    if (response.success) {
      setMessage("인증번호를 전송했어요.")
    } else {
      setMessage("요청에 실패했어요. 다시 시도해 주세요.")
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500 text-white">
            <Droplets className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">시공ON 현장</h2>
          <p className="mt-2 text-slate-500">
            초대받은 링크나 전화번호로<br />간편하게 시작하세요.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">휴대폰 번호</label>
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-lg placeholder:text-slate-300 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <Button fullWidth size="lg" className="h-12 text-lg" onClick={handleRequest} disabled={isSubmitting}>
            인증번호 받기
          </Button>
          {message && <p className="text-center text-sm text-slate-500">{message}</p>}
        </div>

        <div className="text-center text-xs text-slate-400">
          이용약관 및 개인정보처리방침에 동의합니다.
        </div>
      </div>
    </div>
  )
}
