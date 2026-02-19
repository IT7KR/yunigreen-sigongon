import { Skeleton } from "@sigongon/ui";

export default function Loading() {
  return (
    <div className="space-y-4 p-4 pt-3">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
