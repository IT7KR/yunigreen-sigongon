"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Plus,
  Calendar,
  MessageSquare,
  ChevronRight
} from "lucide-react"
import { MobileLayout } from "@/components/MobileLayout"
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  Button, 
  Badge,
  Input,
  formatDate
} from "@yunigreen/ui"
import { useWarrantyInfo, useCreateASRequest, useProject } from "@/hooks"

interface WarrantyPageProps {
  params: Promise<{ id: string }>
}

export default function WarrantyPage({ params }: WarrantyPageProps) {
  const { id: projectId } = use(params)
  const router = useRouter()
  
  const { data: projectData } = useProject(projectId)
  const { data: warrantyData, isLoading } = useWarrantyInfo(projectId)
  const createASRequest = useCreateASRequest(projectId)

  const [showASForm, setShowASForm] = useState(false)
  const [asDescription, setASDescription] = useState("")

  const project = projectData?.data
  const warranty = warrantyData?.data

  const handleCreateASRequest = async () => {
    if (!asDescription.trim()) return
    
    await createASRequest.mutateAsync({
      description: asDescription,
    })
    
    setASDescription("")
    setShowASForm(false)
  }

  if (isLoading) {
    return (
      <MobileLayout title="하자보증" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </MobileLayout>
    )
  }

  if (!warranty) {
    return (
      <MobileLayout title="하자보증" showBack>
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <Shield className="h-12 w-12 text-slate-300" />
          <p className="text-slate-500">하자보증 정보가 없어요</p>
          <p className="text-sm text-slate-400">
            공사가 완료되면 하자보증이 시작됩니다
          </p>
        </div>
      </MobileLayout>
    )
  }

  const isExpired = warranty.is_expired
  const daysRemaining = warranty.days_remaining

  return (
    <MobileLayout 
      title="하자보증" 
      showBack
      rightAction={
        !isExpired && (
          <Button size="sm" variant="ghost" onClick={() => setShowASForm(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        )
      }
    >
      <div className="space-y-4 p-4">
        <Card className={isExpired ? "border-red-200 bg-red-50" : "border-teal-200 bg-teal-50"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-3 ${isExpired ? "bg-red-100" : "bg-teal-100"}`}>
                <Shield className={`h-6 w-6 ${isExpired ? "text-red-600" : "text-teal-600"}`} />
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isExpired ? "text-red-900" : "text-teal-900"}`}>
                  {isExpired ? "하자보증 기간이 만료됐어요" : "하자보증 기간"}
                </p>
                {!isExpired && (
                  <p className="text-sm text-teal-700">
                    남은 기간: <strong>{daysRemaining}일</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-white p-3">
              <span className="text-sm text-slate-500">만료일</span>
              <span className="font-medium text-slate-900">
                {formatDate(warranty.warranty_expires_at)}
              </span>
            </div>
            {!isExpired && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div 
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 1095) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-xs text-teal-600">
                  3년 중 {Math.round((1095 - daysRemaining) / 365 * 10) / 10}년 경과
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {showASForm && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                AS 요청
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <textarea
                className="w-full rounded-lg border border-amber-200 bg-white p-3 text-sm focus:border-amber-400 focus:outline-none"
                rows={4}
                placeholder="하자 내용을 자세히 설명해 주세요"
                value={asDescription}
                onChange={(e) => setASDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowASForm(false)}>
                  취소
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreateASRequest}
                  loading={createASRequest.isPending}
                  disabled={!asDescription.trim()}
                >
                  AS 요청하기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-teal-600" />
              AS 요청 내역
            </CardTitle>
            <span className="text-sm text-slate-500">
              {warranty.as_requests.length}건
            </span>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {warranty.as_requests.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-300" />
                <p className="mt-2 text-slate-500">AS 요청 내역이 없어요</p>
                <p className="text-sm text-slate-400">하자가 발생하면 요청해 주세요</p>
              </div>
            ) : (
              warranty.as_requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            request.status === "resolved" ? "success" :
                            request.status === "in_progress" ? "info" : "warning"
                          }
                        >
                          {request.status === "resolved" ? "해결됨" :
                           request.status === "in_progress" ? "처리중" : "대기중"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{request.description}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(request.created_at)}
                        {request.resolved_at && ` → ${formatDate(request.resolved_at)} 해결`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {!isExpired && (
          <div className="rounded-lg bg-slate-100 p-4">
            <h3 className="font-medium text-slate-900">하자보증 안내</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>• 시공 완료일로부터 3년간 하자보증이 제공됩니다</li>
              <li>• 사용자 과실로 인한 하자는 보증 대상에서 제외됩니다</li>
              <li>• AS 요청 시 현장 확인 후 처리 여부가 결정됩니다</li>
            </ul>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
