"use client";

import { use, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Plus,
  Package,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  FileText,
  Receipt,
  CreditCard,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Input,
  Textarea,
  cn,
  toast,
} from "@sigongon/ui";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { MaterialOrder, MaterialOrderStatus } from "@sigongon/types";

type StatusBadgeMeta = {
  icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
};

const STATUS_META: Record<string, StatusBadgeMeta> = {
  draft: { icon: Clock, color: "bg-slate-100 text-slate-700", label: "초안" },
  requested: {
    icon: AlertCircle,
    color: "bg-blue-100 text-blue-700",
    label: "발주 요청",
  },
  invoice_received: {
    icon: FileText,
    color: "bg-amber-100 text-amber-700",
    label: "계산서 접수",
  },
  payment_completed: {
    icon: CreditCard,
    color: "bg-violet-100 text-violet-700",
    label: "입금 완료",
  },
  shipped: { icon: Truck, color: "bg-cyan-100 text-cyan-700", label: "배송 중" },
  delivered: {
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-700",
    label: "수령 완료",
  },
  closed: {
    icon: CheckCircle,
    color: "bg-green-100 text-green-700",
    label: "종료",
  },
  cancelled: { icon: AlertCircle, color: "bg-red-100 text-red-700", label: "취소" },
  confirmed: {
    icon: Receipt,
    color: "bg-amber-100 text-amber-700",
    label: "계산서 접수(구버전)",
  },
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

const NEXT_LABEL_BY_STATUS: Partial<Record<MaterialOrderStatus, string>> = {
  draft: "발주 요청",
  requested: "계산서 접수",
  invoice_received: "입금 완료",
  payment_completed: "배송 시작",
  shipped: "수령 확인",
  delivered: "발주 종료",
  confirmed: "입금 완료",
};

function normalizeStatus(status: MaterialOrderStatus): MaterialOrderStatus {
  if (status === "confirmed") return "invoice_received";
  return status;
}

function statusBadge(status: MaterialOrderStatus) {
  const normalized = normalizeStatus(status);
  const meta = STATUS_META[normalized] || STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <Badge className={cn("inline-flex items-center gap-1", meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function nextStatusFor(status: MaterialOrderStatus): MaterialOrderStatus | null {
  return NEXT_STATUS_BY_CURRENT[normalizeStatus(status)] || null;
}

function nextLabelFor(status: MaterialOrderStatus): string {
  return NEXT_LABEL_BY_STATUS[normalizeStatus(status)] || "다음 단계";
}

export default function MaterialOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [invoiceNumberDraft, setInvoiceNumberDraft] = useState("");
  const [invoiceAmountDraft, setInvoiceAmountDraft] = useState<number | "">("");
  const [invoiceFileUrlDraft, setInvoiceFileUrlDraft] = useState("");

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["material-orders", projectId],
    queryFn: () => api.getMaterialOrders(projectId),
  });

  const orders = (ordersResponse?.success ? ordersResponse.data : []) as MaterialOrder[];

  const { data: selectedOrderResponse } = useQuery({
    queryKey: ["material-order", selectedOrderId],
    queryFn: () => api.getMaterialOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const selectedOrder = (selectedOrderResponse?.success
    ? selectedOrderResponse.data
    : null) as MaterialOrder | null;

  useEffect(() => {
    if (!selectedOrder) return;
    setInvoiceNumberDraft(selectedOrder.invoice_number || "");
    setInvoiceAmountDraft(selectedOrder.invoice_amount ?? "");
    setInvoiceFileUrlDraft(selectedOrder.invoice_file_url || "");
  }, [selectedOrder?.id]);

  const updateStatusMutation = useMutation({
    mutationFn: (payload: {
      orderId: string;
      status: MaterialOrderStatus;
      reason?: string;
      invoice_number?: string;
      invoice_amount?: number;
      invoice_file_url?: string;
    }) =>
      api.updateMaterialOrderStatus(payload.orderId, {
        status: payload.status,
        reason: payload.reason,
        invoice_number: payload.invoice_number,
        invoice_amount: payload.invoice_amount,
        invoice_file_url: payload.invoice_file_url,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-orders", projectId] });
      queryClient.invalidateQueries({ queryKey: ["material-order", selectedOrderId] });
      toast.success("발주 상태를 업데이트했습니다.");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "발주 상태 업데이트에 실패했습니다.";
      toast.error(message);
    },
  });

  const orderedCounts = useMemo(() => {
    return {
      active: orders.filter((o) => !["closed", "cancelled"].includes(normalizeStatus(o.status))).length,
      done: orders.filter((o) => ["closed", "cancelled"].includes(normalizeStatus(o.status))).length,
    };
  }, [orders]);

  const handleAdvance = (order: MaterialOrder) => {
    const next = nextStatusFor(order.status);
    if (!next) return;

    const payload: {
      orderId: string;
      status: MaterialOrderStatus;
      invoice_number?: string;
      invoice_amount?: number;
      invoice_file_url?: string;
    } = {
      orderId: order.id,
      status: next,
    };

    if (next === "invoice_received" || next === "payment_completed") {
      if (invoiceNumberDraft.trim()) payload.invoice_number = invoiceNumberDraft.trim();
      if (typeof invoiceAmountDraft === "number" && invoiceAmountDraft > 0) {
        payload.invoice_amount = invoiceAmountDraft;
      }
      if (invoiceFileUrlDraft.trim()) payload.invoice_file_url = invoiceFileUrlDraft.trim();
    }

    updateStatusMutation.mutate(payload);
  };

  const handleCancel = (order: MaterialOrder) => {
    const reason = window.prompt("발주 취소 사유를 입력해 주세요.");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("취소 사유를 입력해 주세요.");
      return;
    }
    updateStatusMutation.mutate({
      orderId: order.id,
      status: "cancelled",
      reason: reason.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">자재 발주</h2>
          <p className="mt-1 text-sm text-slate-600">
            모바일 현장 요청과 웹 정산 단계를 함께 관리합니다.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 발주
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-[320px]">
        <Card className="p-3">
          <p className="text-xs text-slate-500">진행 중</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{orderedCounts.active}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-500">종결</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{orderedCounts.done}</p>
        </Card>
      </div>

      {orders.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer p-4 transition-colors hover:bg-slate-50"
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{order.order_number}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      품목 {order.items?.length || 0}개
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {(order.total_amount || 0).toLocaleString()}원
                    </p>
                  </div>
                  {statusBadge(order.status)}
                </div>
                {order.requested_at && (
                  <p className="mt-2 text-xs text-slate-500">
                    요청일 {new Date(order.requested_at).toLocaleDateString()}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발주 번호</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>품목 수</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>요청일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>{order.items?.length || 0}개</TableCell>
                    <TableCell>{(order.total_amount || 0).toLocaleString()}원</TableCell>
                    <TableCell>
                      {order.requested_at
                        ? new Date(order.requested_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
                      >
                        상세
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">발주 내역이 없습니다</h3>
          <p className="mt-2 text-sm text-slate-600">새 발주를 생성하여 자재를 주문하세요.</p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            새 발주
          </Button>
        </Card>
      )}

      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          title={`발주 상세: ${selectedOrder.order_number}`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">상태</label>
              {statusBadge(selectedOrder.status)}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">발주 품목</label>
              <div className="mt-2 space-y-2">
                {selectedOrder.items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-slate-900">{item.description}</h4>
                        {item.specification && (
                          <p className="text-sm text-slate-600">{item.specification}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} {item.unit} × {(item.unit_price || 0).toLocaleString()}원
                        </p>
                        {item.price_source === "manual_override" && item.override_reason && (
                          <p className="mt-1 text-xs text-amber-600">수동 사유: {item.override_reason}</p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">
                        {(item.amount || 0).toLocaleString()}원
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="계산서 번호"
                placeholder="예: INV-2026-0001"
                value={invoiceNumberDraft}
                onChange={(e) => setInvoiceNumberDraft(e.target.value)}
              />
              <Input
                label="계산서 금액"
                type="number"
                min="0"
                value={invoiceAmountDraft}
                onChange={(e) =>
                  setInvoiceAmountDraft(e.target.value ? Number(e.target.value) : "")
                }
              />
              <div className="sm:col-span-2">
                <Input
                  label="계산서 파일 URL"
                  placeholder="https://..."
                  value={invoiceFileUrlDraft}
                  onChange={(e) => setInvoiceFileUrlDraft(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-semibold text-slate-900">총 금액</span>
              <span className="text-xl font-bold text-brand-point-600">
                {(selectedOrder.total_amount || 0).toLocaleString()}원
              </span>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">진행 상황</label>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {selectedOrder.created_at && <p>생성: {new Date(selectedOrder.created_at).toLocaleString()}</p>}
                {selectedOrder.requested_at && <p>발주 요청: {new Date(selectedOrder.requested_at).toLocaleString()}</p>}
                {selectedOrder.confirmed_at && <p>계산서 접수: {new Date(selectedOrder.confirmed_at).toLocaleString()}</p>}
                {selectedOrder.payment_at && <p>입금 완료: {new Date(selectedOrder.payment_at).toLocaleString()}</p>}
                {selectedOrder.shipped_at && <p>배송 시작: {new Date(selectedOrder.shipped_at).toLocaleString()}</p>}
                {selectedOrder.delivered_at && <p>수령 완료: {new Date(selectedOrder.delivered_at).toLocaleString()}</p>}
                {selectedOrder.closed_at && <p>종료: {new Date(selectedOrder.closed_at).toLocaleString()}</p>}
              </div>
            </div>

            {selectedOrder.notes && (
              <div>
                <label className="text-sm font-medium text-slate-700">메모</label>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button variant="secondary" onClick={() => setSelectedOrderId(null)}>
                닫기
              </Button>
              {!(["closed", "cancelled"].includes(normalizeStatus(selectedOrder.status))) && (
                <Button
                  variant="secondary"
                  onClick={() => handleCancel(selectedOrder)}
                  disabled={updateStatusMutation.isPending}
                >
                  취소
                </Button>
              )}
              {nextStatusFor(selectedOrder.status) && (
                <Button
                  onClick={() => handleAdvance(selectedOrder)}
                  disabled={updateStatusMutation.isPending}
                >
                  {nextLabelFor(selectedOrder.status)}
                </Button>
              )}
            </div>

            {user?.role === "site_manager" && (
              <p className="text-xs text-slate-500">
                현장소장은 발주 요청/수령 확인 단계만 수행할 수 있습니다.
              </p>
            )}
          </div>
        </Modal>
      )}

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["material-orders", projectId] });
          toast.success("발주를 생성했습니다.");
        }}
      />
    </div>
  );
}

type CreateItem = {
  catalog_item_id: string;
  pricebook_revision_id: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  unit_price: number;
  override_reason: string;
};

function isItemSubmittable(item: CreateItem): boolean {
  if (item.catalog_item_id && item.pricebook_revision_id && item.quantity > 0) {
    return true;
  }
  return Boolean(
    item.description &&
      item.unit &&
      item.quantity > 0 &&
      item.unit_price > 0 &&
      item.override_reason,
  );
}

function CreateOrderModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}) {
  const [vendorId, setVendorId] = useState("");
  const [items, setItems] = useState<CreateItem[]>([
    {
      catalog_item_id: "",
      pricebook_revision_id: "",
      description: "",
      specification: "",
      unit: "개",
      quantity: 1,
      unit_price: 0,
      override_reason: "",
    },
  ]);
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.createMaterialOrder(projectId, {
        vendor_id: vendorId ? Number(vendorId) : undefined,
        items: items.map((item) => ({
          catalog_item_id: item.catalog_item_id || undefined,
          pricebook_revision_id: item.pricebook_revision_id || undefined,
          description: item.description || undefined,
          specification: item.specification || undefined,
          unit: item.unit || undefined,
          quantity: item.quantity,
          unit_price: item.unit_price || undefined,
          override_reason: item.override_reason || undefined,
        })),
        notes: notes || undefined,
      }),
    onSuccess,
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "발주 생성에 실패했습니다.";
      toast.error(message);
    },
  });

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        catalog_item_id: "",
        pricebook_revision_id: "",
        description: "",
        specification: "",
        unit: "개",
        quantity: 1,
        unit_price: 0,
        override_reason: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CreateItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * (item.unit_price || 0),
    0,
  );

  const canSubmit = items.length > 0 && items.every(isItemSubmittable);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 발주 만들기">
      <div className="space-y-6">
        <Input
          label="협력사 ID (선택)"
          placeholder="예: 1001"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
        />

        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900">품목 {index + 1}</h4>
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                      삭제
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="카탈로그 품목 ID"
                    placeholder="선택 시 자동단가"
                    value={item.catalog_item_id}
                    onChange={(e) => updateItem(index, "catalog_item_id", e.target.value)}
                  />
                  <Input
                    label="단가표 Revision ID"
                    placeholder="프로젝트 리비전"
                    value={item.pricebook_revision_id}
                    onChange={(e) =>
                      updateItem(index, "pricebook_revision_id", e.target.value)
                    }
                  />
                </div>

                <Input
                  label="품목명 (수동 입력 시 필수)"
                  placeholder="예: 방수 시트"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                />

                <Input
                  label="규격 (선택)"
                  placeholder="예: 1.5mm 두께"
                  value={item.specification}
                  onChange={(e) => updateItem(index, "specification", e.target.value)}
                />

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="수량"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", Number(e.target.value) || 1)
                    }
                  />
                  <Input
                    label="단위"
                    placeholder="개"
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                  />
                  <Input
                    label="단가 (수동 시)"
                    type="number"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(index, "unit_price", Number(e.target.value) || 0)
                    }
                  />
                </div>

                <Input
                  label="수동 입력 사유"
                  placeholder="카탈로그 외 품목/긴급 대체 등"
                  value={item.override_reason}
                  onChange={(e) => updateItem(index, "override_reason", e.target.value)}
                />

                <div className="text-right text-sm">
                  <span className="text-slate-600">금액: </span>
                  <span className="font-semibold text-slate-900">
                    {(item.quantity * (item.unit_price || 0)).toLocaleString()}원
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button variant="secondary" onClick={addItem} fullWidth>
          + 품목 추가
        </Button>

        <Textarea
          label="메모 (선택)"
          rows={3}
          placeholder="특이사항이 있으면 입력하세요"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="font-semibold text-slate-900">총 금액</span>
          <span className="text-xl font-bold text-brand-point-600">
            {totalAmount.toLocaleString()}원
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? "생성 중..." : "발주 생성"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
