"use client";

import { createAuthModule, type AuthAPI, type AuthUserBase } from "@sigongon/platform";
import type { UserRole } from "@sigongon/types";
import { api } from "./api";

interface AuthUser extends AuthUserBase {
  username: string;
  email?: string;
  role: UserRole;
}

const authModule = createAuthModule<AuthUser>({
  api: api as unknown as AuthAPI<AuthUser>,
  loginPath: "/login",
});

export const AuthProvider = authModule.AuthProvider;
export const useAuth = authModule.useAuth;
export const useRequireAuth = authModule.useRequireAuth;
