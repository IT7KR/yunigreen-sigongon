"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Droplets } from "lucide-react"
import { Card, CardContent, Button, Input } from "@yunigreen/ui"
import { useAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get("redirect") || "/"

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(redirectTo)
    }
  }, [authLoading, isAuthenticated, router, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      router.push(redirectTo)
    } else {
      setError(result.error || "로그인에 실패했어요")
    }
    
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white p-4">
      {/* 로고 */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lg">
          <Droplets className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">유니그린</h1>
        <p className="mt-1 text-sm text-slate-500">AI 누수진단 시스템</p>
      </div>

      {/* 로그인 폼 */}
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              type="email"
              label="이메일"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                label="비밀번호"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !email || !password}
            >
              로그인
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-slate-400">
        © 2026 유니그린. All rights reserved.
      </p>
    </div>
  )
}
