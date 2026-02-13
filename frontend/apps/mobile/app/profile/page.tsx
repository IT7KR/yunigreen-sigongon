"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Building2,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogIn,
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button } from "@sigongon/ui";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MobileLayout title="내 정보">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-point-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!user) {
    return (
      <MobileLayout title="내 정보">
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <p className="text-slate-500">로그인이 필요해요</p>
          <Button onClick={() => router.push("/login")}>
            <LogIn className="h-4 w-4" />로그인
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const menuItems = [
    { icon: Bell, label: "알림함", href: "/notifications" },
    { icon: Shield, label: "비밀번호 재설정", href: "/login/reset-password" },
    { icon: HelpCircle, label: "프로젝트 둘러보기", href: "/projects" },
    { icon: FileText, label: "이용약관 샘플", href: "/api/sample-files?path=README.md" },
  ];

  return (
    <MobileLayout title="내 정보">
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary-100">
                <User className="h-8 w-8 text-brand-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">
                  {user.role === "company_admin" || user.role === "super_admin" ? "관리자" : user.role === "site_manager" ? "현장소장" : "현장기사"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            <div className="flex items-center gap-3 p-4">
              <Mail className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">이메일</p>
                <p className="font-medium text-slate-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Phone className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">연락처</p>
                <p className="font-medium text-slate-900">
                  {user.phone || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm text-slate-500">소속</p>
                <p className="font-medium text-slate-900">
                  {user.organization?.name || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
              >
                <item.icon className="h-5 w-5 text-slate-400" />
                <span className="flex-1 font-medium text-slate-900">
                  {item.label}
                </span>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Button
          variant="secondary"
          fullWidth
          className="text-red-600 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          로그아웃
        </Button>

        <p className="text-center text-sm text-slate-400">시공ON v1.0.0</p>
      </div>
    </MobileLayout>
  );
}
