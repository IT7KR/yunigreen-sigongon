"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@yunigreen/ui"
import type { UserRole } from "@yunigreen/types"

interface UserData {
  id?: string
  name: string
  email: string
  phone?: string
  role: UserRole
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: UserData & { password?: string }) => Promise<void>
  user?: UserData | null
}

export function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<UserRole>("technician")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!user

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPhone(user.phone || "")
      setRole(user.role)
      setPassword("")
    } else {
      setName("")
      setEmail("")
      setPhone("")
      setRole("technician")
      setPassword("")
    }
    setError(null)
  }, [user, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!name.trim() || !email.trim()) {
      setError("이름과 이메일은 필수입니다")
      return
    }
    
    if (!isEditMode && !password.trim()) {
      setError("비밀번호를 입력해주세요")
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await onSave({
        id: user?.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        password: password || undefined,
      })
      
      onClose()
    } catch (err) {
      setError("저장에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditMode ? "사용자 수정" : "사용자 추가"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              이메일 *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEditMode}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-100"
              placeholder="user@example.com"
            />
          </div>

          {!isEditMode && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                비밀번호 *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                placeholder="••••••••"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              전화번호
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="010-1234-5678"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              역할
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              <option value="technician">기술자</option>
              <option value="manager">매니저</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isEditMode ? "수정" : "추가"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
