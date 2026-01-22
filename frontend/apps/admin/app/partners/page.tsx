"use client"

import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@yunigreen/ui"
import { Plus, Upload, Search } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export default function PartnersPage() {
  const [partners, setPartners] = useState<
    Array<{
      id: string
      name: string
      biz_no: string
      owner: string
      is_female_owned: boolean
      license: string
      status: "active" | "inactive"
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const response = await api.getPartners()
      if (response.success && response.data) {
        setPartners(response.data)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">협력사 관리</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            협력사 등록
          </Button>
        </div>

        <div className="flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="업체명, 사업자번호 검색" 
                    className="w-full rounded-lg border border-slate-200 pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
            </div>
            <select className="rounded-lg border border-slate-200 px-4 py-2">
                <option>전체 상태</option>
                <option>정상</option>
                <option>정지</option>
            </select>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">업체명</th>
                  <th className="px-6 py-3 font-medium">대표자</th>
                  <th className="px-6 py-3 font-medium">사업자번호</th>
                  <th className="px-6 py-3 font-medium">면허</th>
                  <th className="px-6 py-3 font-medium">여성기업</th>
                  <th className="px-6 py-3 font-medium">상태</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-400">
                      불러오는 중...
                    </td>
                  </tr>
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-slate-400">
                      등록된 협력사가 없습니다.
                    </td>
                  </tr>
                ) : (
                  partners.map((partner) => (
                    <tr key={partner.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{partner.name}</td>
                      <td className="px-6 py-4 text-slate-500">{partner.owner}</td>
                      <td className="px-6 py-4 text-slate-500">{partner.biz_no}</td>
                      <td className="px-6 py-4 text-slate-500">{partner.license}</td>
                      <td className="px-6 py-4">
                        {partner.is_female_owned && (
                          <span className="inline-flex items-center rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800">
                            여성기업
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={partner.status === "active" ? "success" : "default"}>
                          {partner.status === "active" ? "정상" : "정지"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="ghost">수정</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
