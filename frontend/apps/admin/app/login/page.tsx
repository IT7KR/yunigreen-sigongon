"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { BlurText, Button, Card, CardContent, Input, PrimitiveButton } from "@sigongon/ui";
import { useAuth } from "@/lib/auth";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [authLoading, isAuthenticated, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      router.push(redirectTo);
    } else {
      setError(result.error || "로그인에 실패했어요");
    }

    setIsLoading(false);
  };

  const handleQuickLogin = async (testUsername: string) => {
    setError(null);
    setIsLoading(true);
    const result = await login(testUsername, "test1234");
    if (result.success) {
      router.push(redirectTo);
    } else {
      setError(result.error || "로그인에 실패했어요");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/logo-sq.png"
          alt="시공ON 로고"
          width={80}
          height={80}
          className="object-contain"
        />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          <BlurText text="시공ON 관리자" />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          관리자 계정으로 로그인하세요
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              type="text"
              label="아이디"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
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
              <PrimitiveButton
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
              </PrimitiveButton>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-slate-500 hover:text-brand-primary-600"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !username || !password}
            >
              로그인
            </Button>

            <div className="mt-4 text-center text-sm text-slate-600">
              아직 계정이 없으신가요?{" "}
              <Link href="/signup" className="font-medium text-brand-primary-600 hover:text-brand-primary-700">
                회원가입
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 w-full max-w-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">테스트 계정</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PrimitiveButton
            type="button"
            onClick={() => handleQuickLogin("superadmin")}
            disabled={isLoading}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            <div className="font-medium text-red-700">최고관리자 (SA)</div>
            <div className="mt-0.5 text-red-600">유니그린 관리자</div>
          </PrimitiveButton>
          <PrimitiveButton
            type="button"
            onClick={() => handleQuickLogin("ceo_lee")}
            disabled={isLoading}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs transition-colors hover:bg-blue-100 disabled:opacity-50"
          >
            <div className="font-medium text-blue-700">대표 (회사관리자)</div>
            <div className="mt-0.5 text-blue-600">이중호</div>
          </PrimitiveButton>
          <PrimitiveButton
            type="button"
            onClick={() => handleQuickLogin("site_kim")}
            disabled={isLoading}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-left text-xs transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            <div className="font-medium text-green-700">현장소장</div>
            <div className="mt-0.5 text-green-600">김소장</div>
          </PrimitiveButton>
          <PrimitiveButton
            type="button"
            onClick={() => handleQuickLogin("worker_hong")}
            disabled={isLoading}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            <div className="font-medium text-amber-700">근로자</div>
            <div className="mt-0.5 text-amber-600">홍길동</div>
          </PrimitiveButton>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        © 2026 시공ON. All rights reserved.
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-500 text-white shadow-lg">
          <Image
            src="/logo.png"
            alt="시공ON 로고"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          시공ON 관리자
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          관리자 계정으로 로그인하세요
        </p>
      </div>
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 rounded bg-slate-200" />
            <div className="h-10 rounded bg-slate-200" />
            <div className="h-10 rounded bg-brand-primary-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
