"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
} from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import {
  Card,
  CardContent,
  Button,
  formatDate,
} from "@yunigreen/ui"
import type { UserRole } from "@yunigreen/types"

const mockUsers = [
  {
    id: "u1",
    name: "김관리",
    email: "admin@yunigreen.com",
    phone: "010-1111-1111",
    role: "admin" as UserRole,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_login_at: "2026-01-04T09:30:00Z",
  },
  {
    id: "u2",
    name: "이매니저",
    email: "manager@yunigreen.com",
    phone: "010-2222-2222",
    role: "manager" as UserRole,
    is_active: true,
    created_at: "2025-03-15T00:00:00Z",
    last_login_at: "2026-01-04T08:15:00Z",
  },
  {
    id: "u3",
    name: "박기술",
    email: "tech1@yunigreen.com",
    phone: "010-3333-3333",
    role: "technician" as UserRole,
    is_active: true,
    created_at: "2025-06-01T00:00:00Z",
    last_login_at: "2026-01-03T17:45:00Z",
  },
  {
    id: "u4",
    name: "최기술",
    email: "tech2@yunigreen.com",
    phone: "010-4444-4444",
    role: "technician" as UserRole,
    is_active: false,
    created_at: "2025-08-20T00:00:00Z",
    last_login_at: "2025-12-15T14:30:00Z",
  },
]

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "관리자", color: "bg-purple-100 text-purple-700" },
  manager: { label: "매니저", color: "bg-blue-100 text-blue-700" },
  technician: { label: "기술자", color: "bg-slate-100 text-slate-700" },
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.includes(searchQuery) ||
      user.email.includes(searchQuery) ||
      user.phone.includes(searchQuery)
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">사용자 관리</h1>
            <p className="mt-1 text-slate-500">
              전체 {mockUsers.length}명 · 활성 {mockUsers.filter((u) => u.is_active).length}명
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4" />
            사용자 추가
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="이름, 이메일, 전화번호로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                    <th className="px-6 py-4 font-medium">사용자</th>
                    <th className="px-6 py-4 font-medium">역할</th>
                    <th className="px-6 py-4 font-medium">상태</th>
                    <th className="px-6 py-4 font-medium">마지막 로그인</th>
                    <th className="px-6 py-4 font-medium">가입일</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const role = roleConfig[user.role]
                    
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600">
                              {user.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {user.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {user.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${role.color}`}>
                            <Shield className="h-3.5 w-3.5" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                              <UserCheck className="h-4 w-4" />
                              활성
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                              <UserX className="h-4 w-4" />
                              비활성
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {user.last_login_at ? formatDate(user.last_login_at) : "-"}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
                              <Edit2 className="h-4 w-4 text-slate-400" />
                            </button>
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50">
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
