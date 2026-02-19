"use client";

import type { ReactNode } from "react";
import { RouteTransitionShell } from "@sigongon/ui";

export default function Template({ children }: { children: ReactNode }) {
  return <RouteTransitionShell>{children}</RouteTransitionShell>;
}
