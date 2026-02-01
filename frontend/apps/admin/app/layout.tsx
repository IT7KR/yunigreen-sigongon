import type { Metadata } from "next"
import { Providers } from "@/lib/providers"
import { Toaster } from "@sigongon/ui"
import "./globals.css"

export const metadata: Metadata = {
  title: "시공ON 관리자",
  description: "AI 누수진단 관리 시스템",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
