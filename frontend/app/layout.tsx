import type { Metadata, Viewport } from "next";
import { Toaster } from "@sigongcore/ui";
import { Providers } from "@/lib/providers";
import "./globals.css";

const PRETENDARD_FONT_STYLESHEET =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

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
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href={PRETENDARD_FONT_STYLESHEET}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster />
        <div id="modal-root" />
      </body>
    </html>
  );
}
