"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, type ComponentType } from "react";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if ((error as { status?: number }).status === 401) return false;
          if ((error as { status?: number }).status === 403) return false;
          if ((error as { status?: number }).status === 404) return false;
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return createQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}

export function createProviders(
  AuthProvider: ComponentType<{ children: ReactNode }>,
) {
  return function Providers({ children }: { children: ReactNode }) {
    const queryClient = getQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}
