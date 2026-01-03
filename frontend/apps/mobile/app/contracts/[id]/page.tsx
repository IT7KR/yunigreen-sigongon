"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  FileSignature, 
  Send, 
  CheckCircle2, 
  Calendar,
  Building2,
  Phone,
  PenTool,
  AlertCircle,
  Download
} from "lucide-react"
import { MobileLayout } from "@/components/MobileLayout"
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  Button, 
  Badge,
  formatCurrency,
  formatDate
} from "@yunigreen/ui"
import { useContract, useSendContractForSignature, useSignContract } from "@/hooks"
import type { ContractStatus } from "@yunigreen/types"

interface ContractDetailPageProps {
  params: Promise<{ id: string }>
}

const statusConfig: Record<ContractStatus, { 
  label: string
  variant: "default" | "success" | "warning" | "error" | "info"
}> = {
  draft: { label: "초안", variant: "default" },
  sent: { label: "서명 대기", variant: "info" },
  signed: { label: "서명 완료", variant: "success" },
  active: { label: "진행중", variant: "success" },
  completed: { label: "완료", variant: "default" },
  cancelled: { label: "취소됨", variant: "error" },
}

export default function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useContract(id)
  const sendForSignature = useSendContractForSignature(id)
  const signContract = useSignContract(id)

  const [showSignaturePad, setShowSignaturePad] = useState(false)

  const contract = data?.data

  const handleSendForSignature = async () => {
    if (!confirm("계약서를 발주처에게 서명 요청할까요?")) return
    
    const result = await sendForSignature.mutateAsync()
    if (result.success) {
      alert("서명 요청을 보냈어요")
    }
  }

  const handleCompanySign = async () => {
    setShowSignaturePad(true)
  }

  if (isLoading) {
    return (
      <MobileLayout title="계약서" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </MobileLayout>
    )
  }

  if (error || !contract) {
    return (
      <MobileLayout title="계약서" showBack>
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-slate-500">계약서를 찾을 수 없어요</p>
          <Button variant="secondary" onClick={() => router.back()}>
            돌아가기
          </Button>
        </div>
      </MobileLayout>
    )
  }

  const statusInfo = statusConfig[contract.status]
  const isDraft = contract.status === "draft"
  const isSent = contract.status === "sent"
  const isSigned = contract.status === "signed" || contract.status === "active"

  return (
    <MobileLayout 
      title={contract.contract_number || "계약서"}
      showBack
      rightAction={
        <Badge variant={statusInfo.variant}>
          {statusInfo.label}
        </Badge>
      }
    >
      <div className="space-y-4 p-4 pb-32">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-5 w-5 text-teal-600" />
              계약 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <p className="text-sm text-slate-500">프로젝트</p>
              <p className="font-medium text-slate-900">{contract.project_name}</p>
            </div>
            
            {contract.client_name && (
              <div>
                <p className="text-sm text-slate-500">발주처</p>
                <p className="font-medium text-slate-900">{contract.client_name}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-500">계약 금액</p>
              <p className="text-xl font-bold text-teal-600">
                {formatCurrency(Number(contract.contract_amount))}
              </p>
            </div>

            {(contract.start_date || contract.expected_end_date) && (
              <div>
                <p className="text-sm text-slate-500">공사 기간</p>
                <p className="font-medium text-slate-900">
                  {contract.start_date && formatDate(contract.start_date)}
                  {contract.expected_end_date && ` ~ ${formatDate(contract.expected_end_date)}`}
                </p>
              </div>
            )}

            {contract.notes && (
              <div>
                <p className="text-sm text-slate-500">비고</p>
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {contract.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenTool className="h-5 w-5 text-teal-600" />
              서명 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-slate-400" />
                <span className="text-slate-900">자사 서명</span>
              </div>
              {isSigned ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  완료
                </Badge>
              ) : (
                <Badge variant="default">대기</Badge>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-slate-400" />
                <span className="text-slate-900">발주처 서명</span>
              </div>
              {contract.signed_at ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  완료
                </Badge>
              ) : isSent ? (
                <Badge variant="info">요청됨</Badge>
              ) : (
                <Badge variant="default">대기</Badge>
              )}
            </div>

            {contract.signed_at && (
              <p className="text-center text-xs text-slate-500">
                서명 완료: {formatDate(contract.signed_at)}
              </p>
            )}
          </CardContent>
        </Card>

        {showSignaturePad && (
          <Card className="border-teal-200 bg-teal-50">
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-medium text-teal-900">서명해 주세요</p>
              <div className="aspect-[2/1] rounded-lg border-2 border-dashed border-teal-300 bg-white">
                <div className="flex h-full items-center justify-center text-slate-400">
                  서명 영역 (터치하여 서명)
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSignaturePad(false)}
                >
                  취소
                </Button>
                <Button 
                  size="sm"
                  onClick={async () => {
                    await signContract.mutateAsync({
                      signatureData: "base64_signature_data",
                      signerType: "company",
                    })
                    setShowSignaturePad(false)
                  }}
                  loading={signContract.isPending}
                >
                  서명 완료
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 safe-area-bottom">
        {isDraft && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={handleCompanySign}>
              <PenTool className="mr-2 h-4 w-4" />
              자사 서명
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSendForSignature}
              loading={sendForSignature.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              서명 요청
            </Button>
          </div>
        )}

        {isSent && (
          <Button fullWidth variant="secondary" disabled>
            발주처 서명을 기다리고 있어요
          </Button>
        )}

        {isSigned && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              PDF 다운로드
            </Button>
            <Button 
              className="flex-1"
              onClick={() => router.push(`/projects/${contract.project_id}/construction`)}
            >
              공사 시작하기
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
