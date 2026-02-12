import type { Metadata } from "next";
import { AppRootLayout } from "@sigongon/features";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "시공ON 관리자",
  description: "AI 누수진단 관리 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppRootLayout Providers={Providers}>{children}</AppRootLayout>;
}
