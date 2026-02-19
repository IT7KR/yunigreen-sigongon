"use client";

import type { ReactNode } from "react";
import { createProviders } from "@sigongon/platform";
import { ConfirmDialogProvider } from "@sigongon/ui";
import { AuthProvider } from "./auth";

const BaseProviders = createProviders(AuthProvider);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BaseProviders>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </BaseProviders>
  );
}
