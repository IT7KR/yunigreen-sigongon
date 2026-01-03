"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Plus, 
  Send, 
  CheckCircle2, 
  Clock,
  Wallet,
  Calendar,
  Phone,
  ChevronRight,
  AlertCircle
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
  formatCurrency,
  formatDate
} from "@yunigreen/ui"
import { 
  useLaborContracts, 
  useLaborContractsSummary, 
  useCreateLaborContract,
  useSendLaborContractForSignature
} from "@/hooks"
import type { LaborContractStatus } from "@yunigreen/types"

interface LaborPageProps {
  params: Promise<{ id: string }>
}

const statusConfig: Record<LaborContractStatus, { 
  label: string
  icon: React.ReactNode
  variant: "default" | "success" | "warning" | "error" | "info"
}> = {
  draft: {
    label: "초안",
    icon: <Clock className="h-3 w-3" />,
    variant: "default",
  },
  sent: {
    label: "서명 대기",
    icon: <Send className="h-3 w-3" />,
    variant: "info",
  },
  signed: {
    label: "서명 완료",
    icon: <CheckCircle2 className="h-3 w-3" />,
    variant: "success",
  },
  paid: {
    label: "지급 완료",
    icon: <Wallet className="h-3 w-3" />,
    variant: "default",
  },
}

export default function LaborPage({ params }: LaborPageProps) {
  const { id: projectId } = use(params)
  const router = useRouter()
  
  const { data: contractsData, isLoading } = useLaborContracts(projectId)
  const { data: summaryData } = useLaborContractsSummary(projectId)
  const createLaborContract = useCreateLaborContract(projectId)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newContract, setNewContract] = useState({
    worker_name: "",
    worker_phone: "",
    work_date: new Date().toISOString().split("T")[0],
    work_type: "",
    daily_rate: "",
    hours_worked: "8",
  })

  const contracts = contractsData?.data || []
  const summary = summaryData?.data

  const handleAddContract = async () => {
    if (!newContract.worker_name.trim() || !newContract.daily_rate) return
    
    await createLaborContract.mutateAsync({
      worker_name: newContract.worker_name,
      worker_phone: newContract.worker_phone || undefined,
      work_date: newContract.work_date,
      work_type: newContract.work_type || undefined,
      daily_rate: newContract.daily_rate,
      hours_worked: newContract.hours_worked || undefined,
    })
    
    setNewContract({
      worker_name: "",
      worker_phone: "",
      work_date: new Date().toISOString().split("T")[0],
      work_type: "",
      daily_rate: "",
      hours_worked: "8",
    })
    setShowAddForm(false)
  }

  if (isLoading) {
    return (
      <MobileLayout title="노무비 관리" showBack>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout 
      title="노무비 관리" 
      showBack
      rightAction={
        <Button size="sm" variant="ghost" onClick={() => setShowAddForm(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        {summary && (
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600">
            <CardContent className="p-4 text-white">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <span className="font-medium">노무비 현황</span>
              </div>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(Number(summary.total_amount))}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm text-teal-100">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  총 {summary.total_workers}명
                </span>
                {summary.by_status.signed > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    서명 {summary.by_status.signed}건
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {showAddForm && (
          <Card className="border-teal-200 bg-teal-50">
            <CardHeader>
              <CardTitle className="text-base">일용계약서 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Input
                placeholder="근로자 이름"
                value={newContract.worker_name}
                onChange={(e) => setNewContract({ ...newContract, worker_name: e.target.value })}
              />
              <Input
                placeholder="연락처 (선택)"
                value={newContract.worker_phone}
                onChange={(e) => setNewContract({ ...newContract, worker_phone: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={newContract.work_date}
                  onChange={(e) => setNewContract({ ...newContract, work_date: e.target.value })}
                />
                <Input
                  placeholder="직종 (예: 방수공)"
                  value={newContract.work_type}
                  onChange={(e) => setNewContract({ ...newContract, work_type: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="일당"
                  value={newContract.daily_rate}
                  onChange={(e) => setNewContract({ ...newContract, daily_rate: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="근무시간"
                  value={newContract.hours_worked}
                  onChange={(e) => setNewContract({ ...newContract, hours_worked: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  취소
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAddContract}
                  loading={createLaborContract.isPending}
                  disabled={!newContract.worker_name.trim() || !newContract.daily_rate}
                >
                  추가
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-teal-600" />
              일용 계약 목록
            </CardTitle>
            <span className="text-sm text-slate-500">{contracts.length}건</span>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {contracts.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-2 text-slate-500">아직 등록된 일용계약이 없어요</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowAddForm(true)}
                >
                  첫 계약 추가하기
                </Button>
              </div>
            ) : (
              contracts.map((contract) => {
                const statusInfo = statusConfig[contract.status]
                return (
                  <div
                    key={contract.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {contract.worker_name}
                          </span>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1 text-xs">
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </div>
                        {contract.work_type && (
                          <p className="mt-0.5 text-sm text-slate-500">{contract.work_type}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(contract.work_date)}
                          </span>
                          <span className="font-semibold text-teal-600">
                            {formatCurrency(Number(contract.daily_rate))}
                          </span>
                        </div>
                      </div>
                      {contract.status === "draft" && (
                        <Button size="sm" variant="ghost">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {summary && summary.by_work_type && Object.keys(summary.by_work_type).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">직종별 현황</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.entries(summary.by_work_type).map(([workType, data]) => (
                  <div 
                    key={workType}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{workType}</p>
                      <p className="text-sm text-slate-500">{data.count}명</p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(Number(data.amount))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  )
}
