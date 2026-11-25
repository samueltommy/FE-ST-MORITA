export type ShippingMethod = 'OWN_VEHICLE' | 'CUSTOMER_PICKUP' | 'THIRD_PARTY_FORWARDER';

export type TrackingStage =
  | 'WAITING_FOR_MATERIAL'
  | 'ON_PROCESS'
  | 'QC_INSPECTION'
  | 'WAREHOUSE_READY'
  | 'PREPARING_LOADING'
  | 'ON_DELIVERY'
  | 'DELIVERED'
  | 'HOLD_ISSUE';

export type StockMovementType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'STOCK_OPNAME' | 'RM_TRANSFER';

export interface LogisticsDashboardSummary {
  deliveryPlansTotal: number;
  deliveryPlansActive: number;
  rdoPendingCount: number;
  doTotal: number;
  doPreparing: number;
  doOnTheWay: number;
  doDelivered: number;
  trackingEventsTotal: number;
  rmItemsTotal: number;
  rmLowStockCount: number;
  rmOutOfStockCount: number;
  stockAdjustmentsCount: number;
  rmTransfersCount: number;
}

export interface DeliveryPlanItem {
  id?: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  plannedQty: number;
  lotNumber?: string | null;
  notes?: string | null;
}

export interface DeliveryPlan {
  id: string;
  planNumber: string;
  planDate: string;
  customerId?: string | null;
  customerName?: string | null;
  incomingOrderId?: string | null;
  ioNumber?: string | null;
  deliveryRequestId?: string | null;
  requestNumber?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  shippingMethod: ShippingMethod | string;
  destinationAddress?: string | null;
  zoning?: string | null;
  estimatedDepartureTime?: string | null;
  priority: 'NORMAL' | 'URGENT' | string;
  status: string;
  plannedBy?: string | null;
  notes?: string | null;
  items: DeliveryPlanItem[];
  createdAt?: string | null;
}

export interface DeliveryRequestItem {
  id?: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  qtyToShip: number;
}

export interface DeliveryRequest {
  id: string;
  requestNumber: string;
  incomingOrderId?: string | null;
  ioNumber?: string | null;
  customerPoId?: string | null;
  poNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  requestDate: string;
  requestedDeliveryDate?: string | null;
  deliverTo?: string | null;
  poDeliveryNote?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  status: string;
  notes?: string | null;
  items: DeliveryRequestItem[];
  createdAt?: string | null;
}

export interface DeliveryOrderItem {
  id?: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  stockInventoryId?: string | null;
  qtyShipped: number;
  lotNumber?: string;
  notes?: string | null;
}

export interface DeliveryOrderRecord {
  id: string;
  doNumber: string;
  deliveryRequestId?: string | null;
  requestNumber?: string | null;
  deliveryPlanId?: string | null;
  planNumber?: string | null;
  incomingOrderId?: string | null;
  ioNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  doDate: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  shippingMethod?: string | null;
  customsDocType?: string | null;
  customsDocNumber?: string | null;
  deliverTo?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  coaNumber?: string | null;
  oqcInspectionId?: string | null;
  podFileUrl?: string | null;
  deliveredAt?: string | null;
  issuedBy?: string | null;
  status: string;
  notes?: string | null;
  items: DeliveryOrderItem[];
  createdAt?: string | null;
}

export interface TrackingEvent {
  id: string;
  trackingCode: string;
  incomingOrderId?: string | null;
  ioNumber?: string | null;
  customerPoId?: string | null;
  deliveryOrderId?: string | null;
  doNumber?: string | null;
  productionPlanId?: string | null;
  customerName?: string | null;
  referenceNumber?: string | null;
  stage: TrackingStage | string;
  location?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  notes?: string | null;
  photoUrl?: string | null;
  updatedBy?: string | null;
  eventTime?: string | null;
}

export interface RMStockItemSummary {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  minStock: number;
  availableQty: number;
  holdQty: number;
  totalQty: number;
  batchCount: number;
  isLowStock: boolean;
  shortageQty: number;
  stockHealth: 'SAFE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface StockMovement {
  id: string;
  movementNumber: string;
  movementType: StockMovementType;
  movementDate: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  stockInventoryId?: string | null;
  targetStockInventoryId?: string | null;
  lotNumber?: string | null;
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  fromRack?: string | null;
  toRack?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  referenceNumber?: string | null;
  reason?: string | null;
  notes?: string | null;
  performedBy?: string | null;
  createdAt?: string | null;
}
