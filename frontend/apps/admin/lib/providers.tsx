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
import { AdminAppShell } from "@/components/AdminLayout";
import { AuthProvider } from "./auth";

const BaseProviders = createProviders(AuthProvider);

const ADMIN_PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/accept-invite",
  "/onboarding/worker",
  "/403",
];

function isAdminPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return ADMIN_PUBLIC_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function AdminShellRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isAdminPublicPath(pathname)) {
    return <>{children}</>;
  }

  return <AdminAppShell>{children}</AdminAppShell>;
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
          <AdminShellRouter>{children}</AdminShellRouter>
        </NavigationProgressProvider>
      </ConfirmDialogProvider>
    </BaseProviders>
  );
}
