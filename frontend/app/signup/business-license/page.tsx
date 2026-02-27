"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route - redirects to new signup flow
 * This page exists for backward compatibility
 */
export default function BusinessLicensePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signup/business");
  }, [router]);

  return null;
}
