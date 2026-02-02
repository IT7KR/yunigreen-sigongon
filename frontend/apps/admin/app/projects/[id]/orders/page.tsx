"use client";

import { use, useState } from "react";
import { Plus, Package, CheckCircle, Clock, Truck, AlertCircle } from "lucide-react";
import { Card, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Input, cn } from "@sigongon/ui";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function MaterialOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["material-orders", projectId],
    queryFn: () => api.getMaterialOrders(projectId),
  });

  const orders = (ordersResponse?.success ? ordersResponse.data : []) as Array<{
    id: string;
    order_number: string;
    status: string;
    items: Array<{
      id: string;
      description: string;
      specification?: string;
      unit: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }>;
    total_amount: number;
    requested_at?: string;
    confirmed_at?: string;
    delivered_at?: string;
    notes?: string;
    created_at: string;
  }>;

  const { data: selectedOrderResponse } = useQuery({
    queryKey: ["material-order", selectedOrderId],
    queryFn: () => api.getMaterialOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const selectedOrder = (selectedOrderResponse?.success ? selectedOrderResponse.data : null) as {
    id: string;
    project_id: string;
    order_number: string;
    status: string;
    items: Array<{
      id: string;
      description: string;
      specification?: string;
      unit: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }>;
    total_amount: number;
    requested_at?: string;
    confirmed_at?: string;
    delivered_at?: string;
    notes?: string;
    created_at: string;
  } | null;

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.updateMaterialOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-orders", projectId] });
      queryClient.invalidateQueries({ queryKey: ["material-order", selectedOrderId] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { icon: Clock, color: "bg-slate-100 text-slate-700" },
      requested: { icon: AlertCircle, color: "bg-blue-100 text-blue-700" },
      confirmed: { icon: CheckCircle, color: "bg-green-100 text-green-700" },
      shipped: { icon: Truck, color: "bg-purple-100 text-purple-700" },
      delivered: { icon: CheckCircle, color: "bg-green-100 text-green-700" },
      cancelled: { icon: AlertCircle, color: "bg-red-100 text-red-700" },
    };

    const variant = variants[status as keyof typeof variants] || variants.draft;
    const Icon = variant.icon;

    const labels = {
      draft: "초안",
      requested: "발주 요청",
      confirmed: "발주 확인",
      shipped: "배송 중",
      delivered: "배송 완료",
      cancelled: "취소",
    };

    return (
      <Badge className={cn("inline-flex items-center gap-1", variant.color)}>
        <Icon className="h-3 w-3" />
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getNextStatus = (currentStatus: string) => {
    const workflow = {
      draft: "requested",
      requested: "confirmed",
      confirmed: "shipped",
      shipped: "delivered",
    };
    return workflow[currentStatus as keyof typeof workflow];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels = {
      draft: "발주 요청",
      requested: "발주 확인",
      confirmed: "배송 시작",
      shipped: "배송 완료",
    };
    return labels[currentStatus as keyof typeof labels];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">자재 발주</h2>
          <p className="mt-1 text-sm text-slate-600">
            프로젝트에 필요한 자재를 발주하고 관리합니다
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 발주
        </Button>
      </div>

      {/* Orders List */}
      {orders && orders.length > 0 ? (
        <Card className="overflow-hidden">
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
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.items?.length || 0}개</TableCell>
                  <TableCell>
                    {order.total_amount?.toLocaleString()}원
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
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            발주 내역이 없습니다
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            새 발주를 생성하여 자재를 주문하세요
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            새 발주
          </Button>
        </Card>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          title={`발주 상세: ${selectedOrder.order_number}`}
        >
          <div className="space-y-6">
            {/* Status */}
            <div>
              <label className="text-sm font-medium text-slate-700">상태</label>
              <div className="mt-2">{getStatusBadge(selectedOrder.status)}</div>
            </div>

            {/* Items */}
            <div>
              <label className="text-sm font-medium text-slate-700">발주 품목</label>
              <div className="mt-2 space-y-2">
                {selectedOrder.items.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">
                          {item.description}
                        </h4>
                        {item.specification && (
                          <p className="text-sm text-slate-600">{item.specification}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} {item.unit} × {item.unit_price.toLocaleString()}
                          원
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {item.amount.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-semibold text-slate-900">총 금액</span>
              <span className="text-xl font-bold text-brand-point-600">
                {selectedOrder.total_amount.toLocaleString()}원
              </span>
            </div>

            {/* Timeline */}
            <div>
              <label className="text-sm font-medium text-slate-700">진행 상황</label>
              <div className="mt-2 space-y-2 text-sm">
                {selectedOrder.created_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-slate-600">
                      생성: {new Date(selectedOrder.created_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedOrder.requested_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-slate-600">
                      발주 요청: {new Date(selectedOrder.requested_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedOrder.confirmed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-slate-600">
                      발주 확인: {new Date(selectedOrder.confirmed_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedOrder.delivered_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-slate-600">
                      배송 완료: {new Date(selectedOrder.delivered_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div>
                <label className="text-sm font-medium text-slate-700">메모</label>
                <p className="mt-2 text-sm text-slate-600">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button variant="secondary" onClick={() => setSelectedOrderId(null)}>
                닫기
              </Button>
              {selectedOrder.status !== "delivered" &&
                selectedOrder.status !== "cancelled" &&
                getNextStatus(selectedOrder.status) && (
                  <Button
                    onClick={() => {
                      updateStatusMutation.mutate({
                        orderId: selectedOrder.id,
                        status: getNextStatus(selectedOrder.status),
                      });
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    {getNextStatusLabel(selectedOrder.status)}
                  </Button>
                )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["material-orders", projectId] });
        }}
      />
    </div>
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
  const [items, setItems] = useState([
    {
      description: "",
      specification: "",
      unit: "개",
      quantity: 1,
      unit_price: 0,
    },
  ]);
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.createMaterialOrder(projectId, {
        items,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      onSuccess();
      // Reset form
      setItems([
        {
          description: "",
          specification: "",
          unit: "개",
          quantity: 1,
          unit_price: 0,
        },
      ]);
      setNotes("");
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "",
        specification: "",
        unit: "개",
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const canSubmit = items.some(
    (item) => item.description && item.quantity > 0 && item.unit_price > 0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 발주 만들기">
      <div className="space-y-6">
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900">품목 {index + 1}</h4>
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

                <Input
                  label="품목명"
                  placeholder="예: 방수 시트"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                />

                <Input
                  label="규격 (선택)"
                  placeholder="예: 1.5mm 두께"
                  value={item.specification}
                  onChange={(e) =>
                    updateItem(index, "specification", e.target.value)
                  }
                />

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="수량"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                  <Input
                    label="단위"
                    placeholder="개"
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                  />
                  <Input
                    label="단가"
                    type="number"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(index, "unit_price", parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="text-right text-sm">
                  <span className="text-slate-600">금액: </span>
                  <span className="font-semibold text-slate-900">
                    {(item.quantity * item.unit_price).toLocaleString()}원
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button variant="secondary" onClick={addItem} fullWidth>
          + 품목 추가
        </Button>

        <div>
          <label className="text-sm font-medium text-slate-700">메모 (선택)</label>
          <textarea
            className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-point-500 focus:outline-none focus:ring-1 focus:ring-brand-point-500"
            rows={3}
            placeholder="특이사항이 있으면 입력하세요"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
