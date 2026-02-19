"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LaborPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/labor/workers");
  }, [router]);

  return (
    <div className="py-8 text-sm text-slate-500">
      노무관리 화면으로 이동 중입니다...
    </div>
  );
}
