"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
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
      className="md:bottom-right sm:bottom-center"
    />
  );
}

export { toast } from "sonner";
