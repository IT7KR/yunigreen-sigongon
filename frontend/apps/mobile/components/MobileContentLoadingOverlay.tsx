"use client";

import { Skeleton } from "@sigongon/ui";

export function MobileContentLoadingOverlay() {
  return (
    <div className="h-full bg-slate-50/85 p-4 backdrop-blur-[1px]">
      <div className="space-y-4 pt-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
