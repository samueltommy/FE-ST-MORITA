export type StockStatus = 'AVAILABLE' | 'HOLD' | 'QUARANTINE' | 'REJECTED';
export type QCType = 'IQC' | 'PQC' | 'OQC';
export type QCVerdict = 'PASSED' | 'FAILED' | 'REWORK' | 'HOLD';
export type WasteType = 'RM_WASTE' | 'PRODUCT_WASTE';
export type WasteSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface ProductionQCSummary {
  plansTotal: number;
  plansPlanned: number;
  spkActive: number;
  spkCompleted: number;
  stockAvailableBatches: number;
  stockHoldBatches: number;
  qcTotal: number;
  qcIqcCount: number;
  qcPqcCount: number;
  qcOqcCount: number;
  qcPassRatePct: number;
  reworkOpen: number;
  reworkPassed: number;
  reworkScrapped: number;
  rmWasteQty: number;
  productWasteQty: number;
  productWasteCriticalCount: number;
  rndProjectsTotal: number;
  rndPendingApproval: number;
  rndApproved: number;
}

export interface StockBatch {
  id: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  itemCategory?: string | null;
  unit?: string | null;
  lotNumber: string;
  rackNumber?: string | null;
  qty: number;
  expiredDate?: string | null;
  stockStatus: StockStatus;
  holdReason?: string | null;
  releasedBy?: string | null;
  releasedAt?: string | null;
}

export interface BOMAllocationItem {
  stockInventoryId: string;
  itemId?: string | null;
  lotNumber?: string | null;
  requiredQty: number;
}

export interface ProductionPlan {
  id: string;
  planNumber?: string | null;
  spkNumber: string;
  incomingOrderItemId?: string | null;
  itemId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  targetQty: number;
  accumulatedGoodQty: number;
  accumulatedNgQty: number;
  planDate: string;
  scheduledEndDate?: string | null;
  machineLine?: string | null;
  operatorId?: string | null;
  operatorName?: string | null;
  bomAllocations: BOMAllocationItem[];
  spkIssued: boolean;
  spkIssuedBy?: string | null;
  spkIssuedAt?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: string | null;
}

export interface RMConsumptionItem {
  stockInventoryId: string;
  lotNumber?: string;
  qtyUsed: number;
  notes?: string;
}

export interface ProductionOutputRecord {
  id: string;
  productionPlanId: string;
  spkNumber?: string | null;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  operatorId?: string | null;
  operatorName?: string | null;
  shiftNumber: number;
  machineLine?: string | null;
  goodQty: number;
  ngQty: number;
  reworkQty: number;
  wasteQty: number;
  lotNumber: string;
  rmConsumptions: RMConsumptionItem[];
  defectReason?: string | null;
  downtimeMinutes: number;
  notes?: string | null;
  completedAt?: string | null;
}

export interface ProductDevelopment {
  id: string;
  projectCode: string;
  category: string;
  productName: string;
  sizeSpec?: string | null;
  targetPrice: number;
  monthlyQtyEstimate: number;
  customerId?: string | null;
  customerName?: string | null;
  requestedById?: string | null;
  requestedByName?: string | null;
  specDocumentUrl?: string | null;
  specVersion: string;
  specNotes?: string | null;
  trialNotes?: string | null;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  createdAt?: string | null;
}

export interface QCInspectionRecord {
  id: string;
  inspectionNumber?: string | null;
  qcType: QCType;
  referenceType: string;
  referenceId: string;
  itemId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  stockInventoryId?: string | null;
  productionPlanId?: string | null;
  spkNumber?: string | null;
  lotNumber?: string | null;
  checkedBy: string;
  inspectorName?: string | null;
  sampleSizeQty: number;
  passQty: number;
  failQty: number;
  status: QCVerdict | string;
  coaNumber?: string | null;
  tdsStandard?: string | null;
  customerName?: string | null;
  routedToRework: boolean;
  inspectionData: Record<string, string | number>;
  notes?: string | null;
  createdAt?: string | null;
}

export interface ReworkOrder {
  id: string;
  reworkNumber: string;
  qualityControlId?: string | null;
  productionPlanId?: string | null;
  spkNumber?: string | null;
  itemId?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  lotNumber?: string | null;
  reworkQty: number;
  goodAfterReworkQty: number;
  scrapAfterReworkQty: number;
  defectDescription: string;
  repairInstruction?: string | null;
  assignedOperatorId?: string | null;
  assignedOperatorName?: string | null;
  status: 'OPEN' | 'IN_REWORK' | 'PASSED' | 'SCRAPPED' | 'CANCELLED' | string;
  reinspectedBy?: string | null;
  reinspectedAt?: string | null;
  reinspectionNotes?: string | null;
  createdAt?: string | null;
}

export interface WasteRecord {
  id: string;
  wasteCode: string;
  type: WasteType;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  unit?: string | null;
  productionPlanId?: string | null;
  stockInventoryId?: string | null;
  wasteDate?: string | null;
  lotNumber?: string | null;
  qty: number;
  severity?: WasteSeverity | null;
  reason?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  reportedBy: string;
  reportedByName?: string | null;
  createdAt?: string | null;
}
