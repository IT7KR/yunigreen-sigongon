"use client";

import { use } from "react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { useMaterialOrdersMobile } from "@/hooks";
import { Card, CardContent, Badge } from "@sigongon/ui";
import { ChevronRight, Loader2, Package } from "lucide-react";
import type { MaterialOrderStatus } from "@sigongon/types";

interface MobileMaterialOrdersPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  requested: "발주 요청",
  invoice_received: "계산서 접수",
  payment_completed: "입금 완료",
  shipped: "배송 중",
  delivered: "수령 완료",
  closed: "종료",
  cancelled: "취소",
  confirmed: "계산서 접수",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  requested: "bg-blue-100 text-blue-700",
  invoice_received: "bg-amber-100 text-amber-700",
  payment_completed: "bg-violet-100 text-violet-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  closed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  confirmed: "bg-amber-100 text-amber-700",
};

function normalizeStatus(status: MaterialOrderStatus): MaterialOrderStatus {
  if (status === "confirmed") return "invoice_received";
  return status;
}

export default function MobileMaterialOrdersPage({
  params,
}: MobileMaterialOrdersPageProps) {
  const { id: projectId } = use(params);
  const { data, isLoading } = useMaterialOrdersMobile(projectId);
  const orders = data?.success && data.data ? data.data : [];

  if (isLoading) {
    return (
      <MobileLayout title="자재발주" showBack>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="자재발주" showBack>
      <div className="space-y-3 p-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">등록된 발주가 없습니다.</p>
              <p className="mt-1 text-xs text-slate-400">
                발주 생성과 정산 상세는 관리자 웹에서 진행합니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const normalized = normalizeStatus(order.status);
            const label = STATUS_LABELS[normalized] || normalized;
            const color = STATUS_COLORS[normalized] || STATUS_COLORS.draft;
            return (
              <Link
                key={order.id}
                href={`/projects/${projectId}/orders/${order.id}`}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{order.order_number}</p>
                        <p className="mt-0.5 text-xs text-slate-500">품목 {order.item_count}개</p>
                        {typeof order.summary_amount === "number" && (
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {order.summary_amount.toLocaleString()}원
                          </p>
                        )}
                        {order.requested_at && (
                          <p className="mt-1 text-xs text-slate-500">
                            요청일 {new Date(order.requested_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={color}>{label}</Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}
