"use client";

import Link from "next/link";
import { use, useMemo, useState, type ComponentType } from "react";
import {
  Plus,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
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
  PrimitiveSelect,
  Textarea,
  cn,
  toast,
} from "@sigongcore/ui";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type {
  MaterialMaster,
  MaterialOrder,
  MaterialOrderStatus,
} from "@sigongcore/types";

export const dynamic = 'force-dynamic';

type StatusBadgeMeta = {
  icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
};

const STATUS_META: Record<string, StatusBadgeMeta> = {
  draft: {
    icon: Clock,
    color: "bg-slate-100 text-slate-700",
    label: "임시 저장",
  },
  requested: {
    icon: AlertCircle,
    color: "bg-blue-100 text-blue-700",
    label: "발주 요청",
  },
  invoice_received: {
    icon: ShieldCheck,
    color: "bg-emerald-100 text-emerald-700",
    label: "관리자 확인",
  },
  payment_completed: {
    icon: CheckCircle,
    color: "bg-violet-100 text-violet-700",
    label: "외부 입금",
  },
  shipped: {
    icon: CheckCircle,
    color: "bg-cyan-100 text-cyan-700",
    label: "외부 배송",
  },
  delivered: {
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-700",
    label: "현장 수령",
  },
  closed: {
    icon: CheckCircle,
    color: "bg-green-100 text-green-700",
    label: "종료",
  },
  cancelled: {
    icon: AlertCircle,
    color: "bg-red-100 text-red-700",
    label: "취소",
  },
  confirmed: {
    icon: ShieldCheck,
    color: "bg-emerald-100 text-emerald-700",
    label: "관리자 확인(구버전)",
  },
};

const NEXT_STATUS_BY_CURRENT: Partial<
  Record<MaterialOrderStatus, MaterialOrderStatus>
> = {
  draft: "requested",
  requested: "invoice_received",
};

const NEXT_LABEL_BY_STATUS: Partial<Record<MaterialOrderStatus, string>> = {
  draft: "발주 요청",
  requested: "최고 관리자 확인",
  confirmed: "최고 관리자 확인",
};

const SITE_MANAGER_ALLOWED_TARGETS = new Set<MaterialOrderStatus>([
  "requested",
]);

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

function nextStatusFor(
  status: MaterialOrderStatus,
): MaterialOrderStatus | null {
  return NEXT_STATUS_BY_CURRENT[normalizeStatus(status)] || null;
}

function nextLabelFor(status: MaterialOrderStatus): string {
  return NEXT_LABEL_BY_STATUS[normalizeStatus(status)] || "다음 단계";
}

function canAdvanceByRole(status: MaterialOrderStatus, role?: string): boolean {
  const next = nextStatusFor(status);
  if (!next) return false;
  if (next === "invoice_received") {
    return role === "super_admin";
  }
  if (role === "site_manager") {
    return SITE_MANAGER_ALLOWED_TARGETS.has(next);
  }
  return role === "company_admin" || role === "super_admin";
}

export default function MaterialOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const canViewAmount = user?.role !== "site_manager";
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["material-orders", projectId],
    queryFn: () => api.getMaterialOrders(projectId),
  });
  const { data: materialMastersResponse, isLoading: isMaterialMastersLoading } =
    useQuery({
      queryKey: ["material-masters"],
      queryFn: () => api.getMaterialMasters(),
    });

  const orders = (
    ordersResponse?.success ? ordersResponse.data : []
  ) as MaterialOrder[];
  const materialMasters = (
    materialMastersResponse?.success ? materialMastersResponse.data : []
  ) as MaterialMaster[];

  const { data: selectedOrderResponse } = useQuery({
    queryKey: ["material-order", selectedOrderId],
    queryFn: () => api.getMaterialOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const selectedOrder = (
    selectedOrderResponse?.success ? selectedOrderResponse.data : null
  ) as MaterialOrder | null;

  const updateStatusMutation = useMutation({
    mutationFn: (payload: {
      orderId: string;
      status: MaterialOrderStatus;
      reason?: string;
    }) =>
      api.updateMaterialOrderStatus(payload.orderId, {
        status: payload.status,
        reason: payload.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["material-orders", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["material-orders-mobile", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["material-order", selectedOrderId],
      });
      toast.success("발주 상태를 업데이트했습니다.");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "발주 상태 업데이트에 실패했습니다.";
      toast.error(message);
    },
  });

  const orderedCounts = useMemo(() => {
    return {
      active: orders.filter(
        (o) => !["closed", "cancelled"].includes(normalizeStatus(o.status)),
      ).length,
      done: orders.filter((o) =>
        ["closed", "cancelled"].includes(normalizeStatus(o.status)),
      ).length,
    };
  }, [orders]);

  const handleAdvance = (order: MaterialOrder) => {
    const next = nextStatusFor(order.status);
    if (!next) return;
    if (!canAdvanceByRole(order.status, user?.role)) {
      toast.info("이 단계는 관리자 권한이 필요합니다.");
      return;
    }

    const payload: {
      orderId: string;
      status: MaterialOrderStatus;
    } = {
      orderId: order.id,
      status: next,
    };

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
            자재 마스터 기준으로 품목을 선택하고, 요청 후 최고 관리자가
            확인합니다.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />새 발주
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-[320px]">
        <Card className="p-3">
          <p className="text-xs text-slate-500">진행 중</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {orderedCounts.active}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-500">종결</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {orderedCounts.done}
          </p>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50/70 p-4">
        <p className="text-sm font-medium text-blue-900">
          발주 요청 후 최고 관리자가 확인하며, 이후 처리 단계는 우선 플랫폼
          외부에서 진행합니다.
        </p>
        {materialMasters.length === 0 && !isMaterialMastersLoading && (
          <p className="mt-2 text-sm text-blue-800">
            등록된 자재 마스터가 없습니다.{" "}
            {user?.role === "super_admin" ? (
              <>
                <Link
                  href="/sa/material-masters"
                  className="font-semibold underline underline-offset-2"
                >
                  자재 마스터 관리
                </Link>
                에서 품목을 먼저 등록해 주세요.
              </>
            ) : (
              "최고 관리자에게 자재 마스터 등록을 요청해 주세요."
            )}
          </p>
        )}
      </Card>

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
                    <p className="text-sm font-semibold text-slate-900">
                      {order.order_number}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      품목 {order.items?.length || 0}개
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {canViewAmount
                        ? `${(order.total_amount || 0).toLocaleString()}원`
                        : "비공개"}
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
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>{order.items?.length || 0}개</TableCell>
                    <TableCell>
                      {canViewAmount
                        ? `${(order.total_amount || 0).toLocaleString()}원`
                        : "비공개"}
                    </TableCell>
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
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            발주 내역이 없습니다
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            새 발주를 생성하여 자재를 주문하세요.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />새 발주
          </Button>
        </Card>
      )}

      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          title={`발주 상세: ${selectedOrder.order_number}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">상태</label>
              {statusBadge(selectedOrder.status)}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                발주 품목
              </label>
              <div className="mt-2 space-y-2">
                {selectedOrder.items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900">
                            {item.description}
                          </h4>
                          {item.material_master_id && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              마스터 품목
                            </Badge>
                          )}
                        </div>
                        {item.specification && (
                          <p className="text-sm text-slate-600">
                            {item.specification}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} {item.unit}
                          {canViewAmount
                            ? ` × ${(item.unit_price || 0).toLocaleString()}원`
                            : ""}
                        </p>
                        {item.price_source === "manual_override" &&
                          item.override_reason && (
                            <p className="mt-1 text-xs text-amber-600">
                              수동 사유: {item.override_reason}
                            </p>
                          )}
                      </div>
                      <p className="font-semibold text-slate-900">
                        {canViewAmount
                          ? `${(item.amount || 0).toLocaleString()}원`
                          : "비공개"}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-semibold text-slate-900">총 금액</span>
              <span className="text-xl font-bold text-brand-point-600">
                {canViewAmount
                  ? `${(selectedOrder.total_amount || 0).toLocaleString()}원`
                  : "비공개"}
              </span>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                진행 상황
              </label>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {selectedOrder.created_at && (
                  <p>
                    생성: {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                )}
                {selectedOrder.requested_at && (
                  <p>
                    발주 요청:{" "}
                    {new Date(selectedOrder.requested_at).toLocaleString()}
                  </p>
                )}
                {selectedOrder.confirmed_at && (
                  <p>
                    최고 관리자 확인:{" "}
                    {new Date(selectedOrder.confirmed_at).toLocaleString()}
                  </p>
                )}
                {selectedOrder.payment_at && (
                  <p>
                    입금 완료:{" "}
                    {new Date(selectedOrder.payment_at).toLocaleString()}
                  </p>
                )}
                {selectedOrder.shipped_at && (
                  <p>
                    배송 시작:{" "}
                    {new Date(selectedOrder.shipped_at).toLocaleString()}
                  </p>
                )}
                {selectedOrder.delivered_at && (
                  <p>
                    수령 완료:{" "}
                    {new Date(selectedOrder.delivered_at).toLocaleString()}
                  </p>
                )}
                {selectedOrder.closed_at && (
                  <p>
                    종료: {new Date(selectedOrder.closed_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {normalizeStatus(selectedOrder.status) === "invoice_received" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                최고 관리자 확인이 완료되었습니다. 이후 발주 진행은 현재 플랫폼
                외부에서 처리합니다.
              </div>
            )}

            {selectedOrder.notes && (
              <div>
                <label className="text-sm font-medium text-slate-700">
                  메모
                </label>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            {(selectedOrder.order_date || selectedOrder.arrival_date || selectedOrder.delivery_address || selectedOrder.delivery_terms || selectedOrder.payment_terms || selectedOrder.site_manager_name) && (
              <div>
                <label className="text-sm font-medium text-slate-700">발주 상세 정보</label>
                <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
                  {selectedOrder.order_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">발주일자</span>
                      <span>{selectedOrder.order_date}</span>
                    </div>
                  )}
                  {selectedOrder.arrival_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">도착예정</span>
                      <span>{selectedOrder.arrival_date}{selectedOrder.arrival_time ? ` ${selectedOrder.arrival_time}` : ""}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_address && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">납품주소</span>
                      <span className="text-right max-w-[60%]">{selectedOrder.delivery_address}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_terms && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">인도조건</span>
                      <span>{selectedOrder.delivery_terms}</span>
                    </div>
                  )}
                  {selectedOrder.payment_terms && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">대금조건</span>
                      <span className="text-right max-w-[60%]">{selectedOrder.payment_terms}</span>
                    </div>
                  )}
                  {selectedOrder.site_manager_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">현장담당</span>
                      <span>{selectedOrder.site_manager_name}{selectedOrder.site_manager_phone ? ` (${selectedOrder.site_manager_phone})` : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="secondary"
                onClick={() => setSelectedOrderId(null)}
              >
                닫기
              </Button>
              {!["closed", "cancelled"].includes(
                normalizeStatus(selectedOrder.status),
              ) && (
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
                  disabled={
                    updateStatusMutation.isPending ||
                    !canAdvanceByRole(selectedOrder.status, user?.role)
                  }
                >
                  {canAdvanceByRole(selectedOrder.status, user?.role)
                    ? nextLabelFor(selectedOrder.status)
                    : "관리자 권한 필요"}
                </Button>
              )}
            </div>

            {user?.role === "site_manager" && (
              <p className="text-xs text-slate-500">
                현장소장은 발주 요청 단계만 수행할 수 있습니다.
              </p>
            )}
          </div>
        </Modal>
      )}

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        materialMasters={materialMasters}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({
            queryKey: ["material-orders", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["material-orders-mobile", projectId],
          });
          toast.success("발주를 생성했습니다.");
        }}
      />
    </div>
  );
}

type CreateItem = {
  material_master_id: string;
  quantity: number;
};

function isItemSubmittable(item: CreateItem): boolean {
  return Boolean(item.material_master_id && item.quantity > 0);
}

function CreateOrderModal({
  isOpen,
  onClose,
  projectId,
  materialMasters,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  materialMasters: MaterialMaster[];
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<CreateItem[]>([
    {
      material_master_id: "",
      quantity: 1,
    },
  ]);
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("")
  const [siteManagerName, setSiteManagerName] = useState("");
  const [siteManagerPhone, setSiteManagerPhone] = useState("");
  const materialMasterMap = useMemo(
    () =>
      new Map(
        materialMasters.map((materialMaster) => [materialMaster.id, materialMaster]),
      ),
    [materialMasters],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      api.createMaterialOrder(projectId, {
        items: items.map((item) => ({
          material_master_id: item.material_master_id || undefined,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
        order_date: orderDate || null,
        arrival_date: arrivalDate || null,
        arrival_time: arrivalTime || null,
        delivery_address: deliveryAddress || null,
        delivery_terms: deliveryTerms || null,
        payment_terms: paymentTerms || null,
        site_manager_name: siteManagerName || null,
        site_manager_phone: siteManagerPhone || null,
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
        material_master_id: "",
        quantity: 1,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof CreateItem,
    value: string | number,
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalAmount = items.reduce(
    (sum, item) =>
      sum + item.quantity * (materialMasterMap.get(item.material_master_id)?.unit_price || 0),
    0,
  );

  const canSubmit =
    materialMasters.length > 0 && items.length > 0 && items.every(isItemSubmittable);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 발주 만들기" size="xl">
      <div className="space-y-6">
        {materialMasters.length === 0 ? (
          <Card className="border-dashed border-slate-300 p-6 text-center">
            <h4 className="text-base font-semibold text-slate-900">
              등록된 자재 마스터가 없습니다
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              자재 발주를 만들려면 최고 관리자가 품목명, 단위, 단가를 먼저
              등록해야 합니다.
            </p>
            {user?.role === "super_admin" && (
              <Button className="mt-4" asChild>
                <Link href="/sa/material-masters">자재 마스터 관리로 이동</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const selectedMaterialMaster = materialMasterMap.get(
                item.material_master_id,
              );

              return (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-900">
                        품목 {index + 1}
                      </h4>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          삭제
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        자재 품목
                      </label>
                      <PrimitiveSelect
                        value={item.material_master_id}
                        onChange={(e) =>
                          updateItem(index, "material_master_id", e.target.value)
                        }
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                      >
                        <option value="">품목을 선택해 주세요</option>
                        {materialMasters.map((materialMaster) => (
                          <option
                            key={materialMaster.id}
                            value={materialMaster.id}
                          >
                            {materialMaster.name} / {materialMaster.unit} /{" "}
                            {materialMaster.unit_price.toLocaleString()}원
                          </option>
                        ))}
                      </PrimitiveSelect>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">단위</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {selectedMaterialMaster?.unit || "-"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">단가</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {selectedMaterialMaster
                            ? `${selectedMaterialMaster.unit_price.toLocaleString()}원`
                            : "-"}
                        </p>
                      </div>
                      <Input
                        label="수량"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value) || 1)
                        }
                      />
                    </div>

                    <div className="text-right text-sm">
                      <span className="text-slate-600">금액: </span>
                      <span className="font-semibold text-slate-900">
                        {selectedMaterialMaster
                          ? (
                              item.quantity * selectedMaterialMaster.unit_price
                            ).toLocaleString()
                          : "0"}
                        원
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Button
          variant="secondary"
          onClick={addItem}
          fullWidth
          disabled={materialMasters.length === 0}
        >
          + 품목 추가
        </Button>

        <Textarea
          label="메모 (선택)"
          rows={3}
          placeholder="특이사항이 있으면 입력하세요"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* 발주 상세 정보 */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">발주 상세 정보</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">발주일자</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">도착일자</label>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">도착시간</label>
              <input
                type="time"
                placeholder="07:00"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">인도조건</label>
              <PrimitiveSelect
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              >
                <option value="">선택</option>
                <option value="현장인수">현장인수</option>
                <option value="공장인수">공장인수</option>
                <option value="배달">배달</option>
              </PrimitiveSelect>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">도착(납품)주소</label>
            <input
              type="text"
              placeholder="서울시 ..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">대금조건</label>
            <input
              type="text"
              placeholder="세금계산서 발주(발주일날 입금 원칙)"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">현장 담당자</label>
              <input
                type="text"
                placeholder="홍길동"
                value={siteManagerName}
                onChange={(e) => setSiteManagerName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">전화번호</label>
              <input
                type="text"
                placeholder="010-0000-0000"
                value={siteManagerPhone}
                onChange={(e) => setSiteManagerPhone(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
              />
            </div>
          </div>
        </div>

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
