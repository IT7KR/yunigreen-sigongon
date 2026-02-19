"use client";

import { useEffect, useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(query.matches);

    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <SonnerToaster
      position={isMobile ? "top-center" : "bottom-right"}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "bg-white border-slate-200 border-l-4 shadow-lg rounded-lg p-4",
          success: "border-l-brand-point-500",
          error: "border-l-red-500",
          warning: "border-l-yellow-500",
          info: "border-l-blue-500",
          title: "text-slate-900 font-semibold text-sm",
          description: "text-slate-600 text-sm",
        },
      }}
      richColors
      expand={false}
      visibleToasts={3}
    />
  );
}

export { toast } from "sonner";
