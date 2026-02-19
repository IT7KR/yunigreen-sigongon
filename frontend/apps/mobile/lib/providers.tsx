"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createProviders } from "@sigongon/platform";
import {
  ConfirmDialogProvider,
  NavigationProgress,
  NavigationProgressProvider,
  useNavigationProgress,
} from "@sigongon/ui";
import { MobileAppShell } from "@/components/MobileLayout";
import { AuthProvider } from "./auth";

const BaseProviders = createProviders(AuthProvider);

function shouldUseMobileShell(pathname: string): boolean {
  if (pathname.startsWith("/login")) {
    return false;
  }

  if (pathname.startsWith("/api")) {
    return false;
  }

  if (
    pathname === "/worker/consent" ||
    pathname.startsWith("/worker/consent/") ||
    pathname === "/worker/entry" ||
    pathname.startsWith("/worker/entry/")
  ) {
    return false;
  }

  if (/^\/worker\/contracts\/[^/]+$/.test(pathname)) {
    return false;
  }

  return true;
}

function MobileShellRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!shouldUseMobileShell(pathname)) {
    return <>{children}</>;
  }

  return <MobileAppShell>{children}</MobileAppShell>;
}

function NavigationProgressRouteSync() {
  const pathname = usePathname();
  const { done } = useNavigationProgress();

  useEffect(() => {
    done();
  }, [done, pathname]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BaseProviders>
      <ConfirmDialogProvider>
        <NavigationProgressProvider>
          <NavigationProgress />
          <NavigationProgressRouteSync />
          <MobileShellRouter>{children}</MobileShellRouter>
        </NavigationProgressProvider>
      </ConfirmDialogProvider>
    </BaseProviders>
  );
}
