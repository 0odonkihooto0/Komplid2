// Типы и константы для карточки заказа поставщику

export type SupplierOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DeliveryCondition = 'NONE' | 'EXW' | 'FOB' | 'CIF' | 'DAP';

export interface SupplierOrderItemData {
  id: string;
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  discount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  weight: number | null;
  volume: number | null;
  basis: string | null;
  nomenclatureId: string | null;
  nomenclature: { id: string; name: string; unit: string | null } | null;
}

export interface ApprovalStepData {
  id: string;
  stepIndex: number;
  role: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string | null;
  userId: string | null;
  user: { id: string; firstName: string; lastName: string } | null;
}

export interface ApprovalRouteData {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESET';
  currentStepIdx: number;
  steps: ApprovalStepData[];
}

export interface WarehouseMovementRef {
  id: string;
  number: string;
  movementType: string;
  status: string;
  movementDate: string | null;
}

export interface SupplierOrderCardData {
  id: string;
  number: string;
  status: SupplierOrderStatus;
  totalAmount: number | null;
  deliveryDate: string | null;
  notes: string | null;
  // Стороны
  supplierOrgId: string | null;
  customerOrgId: string | null;
  // Склад
  warehouseId: string | null;
  // Расширенные поля ЦУС
  externalNumber: string | null;
  expectedReadyDate: string | null;
  expectedArrivalDate: string | null;
  readinessCorrectionDate: string | null;
  underdeliveryDate: string | null;
  readinessThrough: string | null;
  deliveryConditions: string | null;
  contractType: string | null;
  constructionObject: string | null;
  // Заявка-основание
  requestId: string | null;
  request: { id: string; number: string; status: string } | null;
  // Согласование
  approvalRoute: ApprovalRouteData | null;
  // Метаданные
  createdAt: string;
  updatedAt: string;
  // Связи
  items: SupplierOrderItemData[];
  movements: WarehouseMovementRef[];
  supplierOrg: { id: string; name: string } | null;
  customerOrg: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string } | null;
}

export interface WarehouseOption {
  id: string;
  name: string;
  location: string | null;
  isDefault: boolean;
}

export type UpdateOrderBody = Partial<{
  supplierOrgId: string | null;
  customerOrgId: string | null;
  warehouseId: string | null;
  deliveryDate: string | null;
  notes: string | null;
  externalNumber: string | null;
  expectedReadyDate: string | null;
  expectedArrivalDate: string | null;
  readinessCorrectionDate: string | null;
  underdeliveryDate: string | null;
  readinessThrough: string | null;
  deliveryConditions: string | null;
  contractType: string | null;
  constructionObject: string | null;
}>;

export type UpdateItemData = Partial<{
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  discount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  weight: number | null;
  volume: number | null;
  basis: string | null;
}>;

// ─── Метки статусов ──────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  DRAFT: 'Черновик',
  SENT: 'Отправлен',
  CONFIRMED: 'Подтверждён',
  DELIVERED: 'Доставлен',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

export const ORDER_STATUS_VARIANTS: Record<
  SupplierOrderStatus,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  SENT: 'default',
  CONFIRMED: 'default',
  DELIVERED: 'outline',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

export const DELIVERY_CONDITION_LABELS: Record<DeliveryCondition, string> = {
  NONE: 'Не указано',
  EXW: 'EXW (Самовывоз)',
  FOB: 'FOB (Франко-борт)',
  CIF: 'CIF (Стоимость, страховка, фрахт)',
  DAP: 'DAP (Поставка до места)',
};
