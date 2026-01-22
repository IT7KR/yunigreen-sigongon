
"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, ArrowRight, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, Button, cn } from "@yunigreen/ui"
import { api } from "@/lib/api"
import { useProject } from "@/hooks"

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: response, isLoading } = useProject(id)
  const project = response?.success ? response.data : null

  if (isLoading || !project) {
    return <div className="h-64 animate-pulse rounded bg-slate-100" />
  }

  const steps = [
    {
      id: "estimate",
      title: "견적 단계",
      description: "현장 방문 후 견적서를 작성하고 고객에게 발송합니다.",
      status: ["consulting", "estimating", "quoted"].includes(project.status) 
        ? "current" 
        : ["contracted", "in_progress", "completed"].includes(project.status) 
          ? "completed" 
          : "pending",
      action: {
        label: "견적서 작성하기",
        href: `/projects/${id}/estimates`,
        primary: true,
      }
    },
    {
      id: "contract",
      title: "계약 단계",
      description: "최종 견적을 바탕으로 공사 도급 계약을 체결합니다.",
      status: project.status === "contracted"
        ? "current"
        : ["in_progress", "completed"].includes(project.status)
          ? "completed"
          : ["consulting", "estimating", "quoted"].includes(project.status)
            ? "pending"
            : "pending",
      action: {
        label: "계약서 생성하기",
        href: `/projects/${id}/contracts`,
        primary: false,
      }
    },
    {
      id: "construction",
      title: "시공 단계",
      description: "착공계를 제출하고 매일 작업일지를 작성합니다.",
      status: project.status === "in_progress"
        ? "current"
        : project.status === "completed"
          ? "completed"
          : "pending",
      action: {
        label: "작업일지 확인",
        href: `/projects/${id}/construction/daily-reports`,
        primary: false,
      }
    },
    {
      id: "completion",
      title: "준공 및 정산",
      description: "공사 완료 후 준공계와 대금청구서를 제출합니다.",
      status: project.status === "completed"
        ? "current"
        : "pending",
      action: {
        label: "준공 서류 작성",
        href: `/projects/${id}/completion/closeout-report`,
        primary: false,
      }
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 진행 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-8 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-200">
            {steps.map((step, index) => {
              const isCompleted = step.status === "completed"
              const isCurrent = step.status === "current"
              
              return (
                <div key={step.id} className="relative">
                  <div
                    className={cn(
                      "absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white",
                      isCompleted ? "border-teal-500 text-teal-500" : 
                      isCurrent ? "border-teal-500 text-teal-500" : "border-slate-300 text-slate-300"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 fill-teal-50" />
                    ) : (
                      <Circle className={cn("h-3 w-3 fill-current", isCurrent ? "text-teal-500" : "text-transparent")} />
                    )}
                  </div>
                  
                  <div className={cn("rounded-lg border p-4 transition-colors", 
                    isCurrent ? "border-teal-200 bg-teal-50/50" : "border-slate-100 bg-white"
                  )}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className={cn("font-semibold", isCurrent ? "text-teal-900" : "text-slate-900")}>
                          {step.title}
                          {isCurrent && <span className="ml-2 inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">진행 중</span>}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                      </div>
                      
                      {step.action && (
                        <Link href={step.action.href}>
                           <Button 
                             variant={step.action.primary && isCurrent ? "primary" : "secondary"}
                             size="sm"
                             className="w-full sm:w-auto"
                           >
                            {step.action.label}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
