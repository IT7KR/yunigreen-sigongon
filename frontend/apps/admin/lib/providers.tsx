"use client";

import { createProviders } from "@sigongon/platform";
import { AuthProvider } from "./auth";

export const Providers = createProviders(AuthProvider);
