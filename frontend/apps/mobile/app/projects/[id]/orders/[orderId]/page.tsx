"use client";

import { use } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { useMaterialOrder, useUpdateMaterialOrderStatus } from "@/hooks";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, Button, Badge, toast } from "@sigongon/ui";
import { Loader2 } from "lucide-react";
import type { MaterialOrder, MaterialOrderStatus } from "@sigongon/types";

interface MobileMaterialOrderDetailPageProps {
  params: Promise<{ id: string; orderId: string }>;
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

const NEXT_STATUS_BY_CURRENT: Partial<Record<MaterialOrderStatus, MaterialOrderStatus>> = {
  draft: "requested",
  requested: "invoice_received",
  invoice_received: "payment_completed",
  payment_completed: "shipped",
  shipped: "delivered",
  delivered: "closed",
  confirmed: "payment_completed",
};

const NEXT_LABELS: Partial<Record<MaterialOrderStatus, string>> = {
  draft: "발주 요청",
  requested: "계산서 접수",
  invoice_received: "입금 완료",
  payment_completed: "배송 시작",
  shipped: "수령 확인",
  delivered: "발주 종료",
  confirmed: "입금 완료",
};

const SITE_MANAGER_ALLOWED = new Set<MaterialOrderStatus>(["requested", "delivered"]);

function normalizeStatus(status: MaterialOrderStatus): MaterialOrderStatus {
  if (status === "confirmed") return "invoice_received";
  return status;
}

function nextStatusFor(status: MaterialOrderStatus): MaterialOrderStatus | null {
  return NEXT_STATUS_BY_CURRENT[normalizeStatus(status)] || null;
}

export default function MobileMaterialOrderDetailPage({
  params,
}: MobileMaterialOrderDetailPageProps) {
  const { id: projectId, orderId } = use(params);
  const { user } = useAuth();
  const { data, isLoading } = useMaterialOrder(orderId);
  const updateStatus = useUpdateMaterialOrderStatus(projectId, orderId);

  const order = (data?.success ? data.data : null) as MaterialOrder | null;

  const handleAdvance = () => {
    if (!order) return;
    const nextStatus = nextStatusFor(order.status);
    if (!nextStatus) return;

    if (user?.role === "site_manager" && !SITE_MANAGER_ALLOWED.has(nextStatus)) {
      toast.info("이 단계는 관리자 웹에서 처리합니다.");
      return;
    }

    updateStatus.mutate(
      {
        orderId: order.id,
        status: nextStatus,
      },
      {
        onSuccess: () => toast.success("상태를 업데이트했습니다."),
        onError: (error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "상태 업데이트에 실패했습니다.";
          toast.error(message);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <MobileLayout title="발주 상세" showBack>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!order) {
    return (
      <MobileLayout title="발주 상세" showBack>
        <div className="p-4">
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              발주를 찾을 수 없습니다.
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  const normalizedStatus = normalizeStatus(order.status);
  const label = STATUS_LABELS[normalizedStatus] || normalizedStatus;
  const color = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.draft;
  const nextStatus = nextStatusFor(order.status);
  const nextLabel = nextStatus ? NEXT_LABELS[normalizeStatus(order.status)] || "다음 단계" : null;
  const isSiteManager = user?.role === "site_manager";
  const canAdvance =
    Boolean(nextStatus) &&
    (!isSiteManager || (nextStatus ? SITE_MANAGER_ALLOWED.has(nextStatus) : false));

  return (
    <MobileLayout title={order.order_number} showBack>
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">상태</p>
              <Badge className={color}>{label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">총 금액</p>
              <p className="font-semibold text-slate-900">
                {(order.total_amount || 0).toLocaleString()}원
              </p>
            </div>
            {order.requested_at && (
              <p className="text-xs text-slate-500">
                요청일 {new Date(order.requested_at).toLocaleString()}
              </p>
            )}
            {order.delivered_at && (
              <p className="text-xs text-slate-500">
                수령일 {new Date(order.delivered_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium text-slate-700">품목</p>
            {order.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{item.description}</p>
                {item.specification && (
                  <p className="mt-0.5 text-xs text-slate-500">{item.specification}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {item.quantity} {item.unit} × {(item.unit_price || 0).toLocaleString()}원
                </p>
                {item.price_source === "manual_override" && item.override_reason && (
                  <p className="mt-1 text-xs text-amber-600">수동 사유: {item.override_reason}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {(order.invoice_number || order.invoice_amount || order.invoice_file_url) && (
          <Card>
            <CardContent className="space-y-2 p-4 text-xs text-slate-600">
              <p className="text-sm font-medium text-slate-700">계산서 정보</p>
              {order.invoice_number && <p>번호: {order.invoice_number}</p>}
              {typeof order.invoice_amount === "number" && (
                <p>금액: {order.invoice_amount.toLocaleString()}원</p>
              )}
              {order.invoice_file_url && <p className="truncate">파일: {order.invoice_file_url}</p>}
            </CardContent>
          </Card>
        )}

        {nextLabel && (
          <Button
            fullWidth
            onClick={handleAdvance}
            loading={updateStatus.isPending}
            disabled={updateStatus.isPending || !canAdvance}
          >
            {isSiteManager && !canAdvance ? "관리자 웹에서 처리" : nextLabel}
          </Button>
        )}

        {isSiteManager && (
          <p className="text-xs text-slate-500">
            현장소장은 `발주 요청`과 `수령 확인` 단계만 모바일에서 처리할 수 있습니다.
          </p>
        )}
      </div>
    </MobileLayout>
  );
}
