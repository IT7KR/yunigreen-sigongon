import type { ComponentType, ReactNode } from "react";
import { Toaster } from "@sigongon/ui";

export interface AppRootLayoutProps {
  children: ReactNode;
  Providers: ComponentType<{ children: ReactNode }>;
  lang?: string;
  bodyClassName?: string;
  fontStylesheetHref?: string;
}

const PRETENDARD_FONT_STYLESHEET =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export function AppRootLayout({
  children,
  Providers,
  lang = "ko",
  bodyClassName = "antialiased",
  fontStylesheetHref = PRETENDARD_FONT_STYLESHEET,
}: AppRootLayoutProps) {
  return (
    <html lang={lang}>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href={fontStylesheetHref}
        />
      </head>
      <body className={bodyClassName}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
