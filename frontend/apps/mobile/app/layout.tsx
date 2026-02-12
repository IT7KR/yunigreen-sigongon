import type { Metadata, Viewport } from "next";
import { AppRootLayout } from "@sigongon/features";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "시공ON 현장",
  description: "AI 누수진단 현장 앱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "시공ON",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#14b8a6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppRootLayout Providers={Providers}>{children}</AppRootLayout>;
}
