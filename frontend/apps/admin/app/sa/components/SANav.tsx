"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@sigongon/ui";

const saNavItems = [
  { href: "/sa", label: "대시보드", exact: true },
  { href: "/sa/tenants", label: "고객사 관리" },
  { href: "/sa/users", label: "전체 사용자" },
  { href: "/sa/pricebooks", label: "적산 자료" },
  { href: "/sa/labor", label: "노무 관리" },
];

export function SANav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 border-b border-slate-200 pb-4">
      {saNavItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-purple-100 text-purple-700"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
