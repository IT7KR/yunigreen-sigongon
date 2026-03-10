import type { Metadata, Viewport } from "next";
import { AppRootLayout } from "@sigongcore/features";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "시공코어",
  description: "AI 누수진단 관리 시스템",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppRootLayout Providers={Providers}>{children}</AppRootLayout>;
}
