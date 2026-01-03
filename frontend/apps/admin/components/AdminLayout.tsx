"use client"

import { type ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  FileSpreadsheet,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Droplets,
} from "lucide-react"
import { cn, Button } from "@yunigreen/ui"

interface AdminLayoutProps {
  children: ReactNode
}

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "대시보드" },
  { href: "/projects", icon: FolderKanban, label: "프로젝트" },
  { href: "/estimates", icon: FileText, label: "견적서" },
  { href: "/pricebooks", icon: FileSpreadsheet, label: "단가표" },
  { href: "/users", icon: Users, label: "사용자" },
  { href: "/settings", icon: Settings, label: "설정" },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
            <Droplets className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-900">유니그린</span>
        </Link>

        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform lg:translate-x-0 lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
              <Droplets className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900">유니그린 관리자</span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <Button variant="ghost" fullWidth className="justify-start gap-3">
            <LogOut className="h-5 w-5" />
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
