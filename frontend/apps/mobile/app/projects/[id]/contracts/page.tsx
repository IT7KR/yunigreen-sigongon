"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  FileSignature, 
  Plus, 
  Clock, 
  Send, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  Calendar
} from "lucide-react"
import { MobileLayout } from "@/components/MobileLayout"
import { 
  Card, 
  CardContent, 
  Button, 
  Badge,
  formatCurrency,
  formatDate
} from "@yunigreen/ui"
import { useContracts, useProject } from "@/hooks"
import type { ContractStatus } from "@yunigreen/types"

interface ContractsPageProps {
  params: Promise<{ id: string }>
}

const statusConfig: Record<ContractStatus, { 
  label: string
  icon: React.ReactNode
  variant: "default" | "success" | "warning" | "error" | "info"
}> = {
  draft: {
    label: "초안",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
  },
  sent: {
    label: "서명 대기",
    icon: <Send className="h-4 w-4" />,
    variant: "info",
  },
  signed: {
    label: "서명 완료",
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: "success",
  },
  active: {
    label: "진행중",
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: "success",
  },
  completed: {
    label: "완료",
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: "default",
  },
  cancelled: {
    label: "취소됨",
    icon: <XCircle className="h-4 w-4" />,
    variant: "error",
  },
}

export default function ContractsPage({ params }: ContractsPageProps) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const { data: projectData } = useProject(projectId)
  const { data: contractsData, isLoading } = useContracts(projectId)

  const project = projectData?.data
  const contracts = contractsData?.data || []

  if (isLoading) {
    return (
      <MobileLayout title="계약 관리" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout 
      title="계약 관리" 
      showBack
      rightAction={
        <Link href={`/projects/${projectId}/contracts/new`}>
          <Button size="sm" variant="ghost">
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
      }
    >
      <div className="space-y-4 p-4">
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <FileSignature className="h-12 w-12 text-slate-300" />
              <div className="text-center">
                <p className="font-medium text-slate-900">아직 계약서가 없어요</p>
                <p className="mt-1 text-sm text-slate-500">
                  견적서를 발행한 후 계약서를 만들 수 있어요
                </p>
              </div>
              {project?.estimates && project.estimates.some(e => e.status === "issued") && (
                <Link href={`/projects/${projectId}/contracts/new`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    계약서 만들기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          contracts.map((contract) => {
            const statusInfo = statusConfig[contract.status]
            return (
              <Link key={contract.id} href={`/contracts/${contract.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {contract.contract_number || "계약서"}
                          </span>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-teal-600">
                          {formatCurrency(Number(contract.contract_amount))}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(contract.created_at)}
                          </span>
                          {contract.start_date && (
                            <span>
                              공사: {formatDate(contract.start_date)}
                              {contract.expected_end_date && ` ~ ${formatDate(contract.expected_end_date)}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </MobileLayout>
  )
}
