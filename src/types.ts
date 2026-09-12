// ==========================================
// ST. MORITA INDUSTRIES - ENTERPRISE ERP TYPES
// ==========================================

export type BusinessUnit = 'INDUSTRIES' | 'FARMA';

export type RoleTier = 0 | 1 | 2 | 3;

export type UserRole =
  // Level 0: System Admin
  | 'SUPER_ADMIN'
  // Level 1: Direksi & Board of Directors (C-Level / Pemilik)
  | 'DIREKSI'
  // Level 2: Admin Bidang / Manager Departemen
  | 'HRD_MANAGER'
  | 'PPIC_MANAGER'
  | 'PURCHASING_MANAGER'
  | 'QC_MANAGER'
  | 'SALES_MANAGER'
  | 'COST_CONTROL'
  | 'WAREHOUSE_MANAGER'
  | 'FINANCE_MANAGER'
  // Level 3: Staff / Operator / User Biasa
  | 'OPERATOR_PROD'
  | 'QC_INSPECTOR'
  | 'SALES_EXEC'
  | 'WAREHOUSE'
  | 'FINANCE_ACCT'
  | 'PURCHASING'
  | 'HRD_STAFF'
  | 'PPIC_PLANNER';

export type PermissionClaim =
  | '*'
  // Admin & User Management
  | 'admin:users:manage'
  | 'admin:roles:assign'
  | 'admin:settings:write'
  | 'audit:logs:read'
  | 'audit:logs:export'
  // Direksi & Executive
  | 'executive:dashboard:read'
  | 'executive:financial:read'
  | 'executive:approval:override'
  | 'executive:production:read'
  // HRD & GA
  | 'hrd:employee:read'
  | 'hrd:employee:write'
  | 'hrd:employee:create'
  | 'hrd:attendance:manage'
  | 'hrd:attendance:write'
  | 'hrd:leave:approve'
  | 'hrd:vehicle:approve'
  | 'sales:visit:read'
  // Master Data & Inventory
  | 'master:item:read'
  | 'master:item:write'
  | 'master:hpp:read'
  | 'master:barcode:print'
  | 'inventory:stock:read'
  // PPIC & Production Scheduling
  | 'ppic:pr:create'
  | 'ppic:pr:approve'
  | 'ppic:spk:release'
  | 'ppic:spk:schedule'
  // Procurement & EXIM
  | 'procurement:pr:create'
  | 'procurement:po:create'
  | 'procurement:po:approve'
  | 'exim:bc_doc:upload'
  | 'exim:bc_doc:approve'
  | 'vendor:read'
  // QC
  | 'qc:inspection:write'
  | 'qc:hold:lock'
  | 'qc:hold:override'
  | 'qc:coa:generate'
  | 'qc:coa:approve'
  | 'qc:calibration:approve'
  // Cost Control
  | 'sales:quotation:validate'
  | 'cost_control:margin:approve'
  // Sales
  | 'sales:quotation:draft'
  | 'sales:quotation:approve'
  | 'sales:io:create'
  | 'sales:sda:write'
  // Warehouse
  | 'warehouse:log:receive'
  | 'warehouse:log:approve'
  | 'warehouse:do:dispatch'
  | 'warehouse:do:approve'
  | 'barcode:scan'
  // Finance
  | 'finance:invoice:create'
  | 'finance:invoice:post'
  | 'finance:ar:reconcile'
  | 'finance:ap:pay'
  | 'finance:cost:read';

export interface UserProfile {
  id: string;
  nik: string; // Nomor Induk Karyawan
  name: string;
  email: string;
  role: UserRole;
  tier: RoleTier; // 0: Super Admin, 1: Direksi, 2: Manager/Admin Bidang, 3: Staff/Operator
  department: string;
  avatar: string;
  permissions: PermissionClaim[];
  plantLocation: string;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate?: string;
  phoneNumber?: string;
}

export type ItemCategory =
  | 'Raw Material'
  | 'Jumbo Roll Tape'
  | 'Slit Tape'
  | 'Cosmetics Chemical'
  | 'Packaging'
  | 'Finished Goods';

export interface MasterItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: ItemCategory;
  businessUnit: BusinessUnit;
  stockQty: number;
  minStock: number;
  unitCost: number; // HPP (Restricted to Level 0, Level 1, Finance, Cost Control)
  sellingPrice: number;
  grossMarginPercent: number; // Restricted to Level 0, Level 1, Finance, Cost Control
  lotNumber: string;
  barcode: string;
  locationRack: string;
  status: 'ACTIVE' | 'DISCONTINUED' | 'LOW_STOCK';
}

export type QcStatus = 'PASS' | 'HOLD' | 'REWORK';

export interface QcInspectionRecord {
  id: string;
  lotNumber: string;
  itemCode: string;
  itemName: string;
  batchSize: number;
  unit: string;
  businessUnit: BusinessUnit;
  status: QcStatus;
  inspectionDate: string;
  inspectorName: string;
  inspectorRole: string;
  defectReason?: string;
  holdTimestamp?: string;
  overrideBy?: string;
  overrideReason?: string;
  overrideTimestamp?: string;
  testedParameters: {
    name: string;
    standard: string;
    actual: string;
    result: 'OK' | 'OUT_OF_SPEC';
  }[];
  coaNumber?: string;
}

export type ProcurementStage = 'PR' | 'PO' | 'LOG' | 'IQC' | 'AP';

export interface ProcurementOrder {
  id: string;
  prNumber: string;
  poNumber: string;
  vendorName: string;
  businessUnit: BusinessUnit;
  itemsCount: number;
  totalAmount: number;
  stage: ProcurementStage;
  stageProgress: number; // 20, 40, 60, 80, 100
  lastUpdate: string;
  estimatedArrival: string;
  etaDate?: string;
  status?: string;
  bcDocumentType?: string;
  bcDocStatus?: string;
}

export type EximDocType = 'BC 2.3' | 'BC 2.7' | 'BC 4.0' | 'SPPB Gate-Pass';

export interface EximDocument {
  id: string;
  docType: EximDocType;
  referenceNumber: string;
  referenceNo?: string;
  registrationDate: string;
  submissionDate?: string;
  status: 'VERIFIED' | 'PENDING_CUSTOMS' | 'REJECTED';
  fileName: string;
  fileSize: string;
  notes: string;
  businessUnit: BusinessUnit;
}

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING_COST_CONTROL'
  | 'APPROVED'
  | 'APPROVED_OFFICIAL'
  | 'REJECTED';

export interface Quotation {
  id: string;
  quotationNumber: string;
  quoteNumber?: string;
  customerName: string;
  productName: string;
  itemSummary?: string;
  quantity: number;
  unit: string;
  currency: 'IDR' | 'USD';
  targetPrice: number;
  hppUnitCost: number; // Masked for Staff
  grossMarginPercent: number; // Masked for Staff
  totalValue?: number;
  status: QuotationStatus;
  createdDate: string;
  submittedAt?: string;
  salesRepresentative: string;
  salesRep?: string;
  approvedBy?: string;
  costControlNotes?: string;
  businessUnit: BusinessUnit;
}

export interface SalesTrackingOrder {
  id: string;
  ioNumber: string;
  customerName: string;
  poCustomerRef: string;
  orderDate: string;
  currentStage: 'PRODUCTION' | 'STAGING' | 'QC_OUT' | 'IN_TRANSIT' | 'DELIVERED';
  timeline: {
    stage: string;
    timestamp: string;
    location: string;
    operator: string;
    completed: boolean;
  }[];
  truckNumber: string;
  driverName: string;
  driverPhone: string;
  eta: string;
  businessUnit: BusinessUnit;
}

export interface DeliveryOrder {
  id: string;
  doNumber: string;
  customerName: string;
  customerAddress: string;
  dispatchDate: string;
  deliveryDate?: string;
  truckArmada: string;
  truckPlate?: string;
  items: {
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
    lotNumber: string;
    unitPrice: number;
  }[];
  totalGrossValue: number;
  totalBeforeTax?: number;
  selectedForInvoice: boolean;
  businessUnit: BusinessUnit;
  itemName?: string;
  qtyDelivered?: number;
  unit?: string;
  unitPrice?: number;
}

export interface VehicleBooking {
  id: string;
  vehicleName: string;
  vehicleModel?: string;
  licensePlate: string;
  vehiclePlate?: string;
  destination: string;
  driverName: string;
  requestedBy?: string;
  departureTime: string;
  departureDate?: string;
  returnDate?: string;
  purpose: string;
  status: 'APPROVED' | 'PENDING' | 'PENDING_HRD' | 'COMPLETED';
}

export interface SalesOutdoorVisit {
  id: string;
  salesName: string;
  salesRep?: string;
  clientName: string;
  clientCompany?: string;
  clientAddress: string;
  locationArea?: string;
  checkInTime: string;
  coordinates: { lat: number; lng: number };
  gpsCoords?: string;
  purpose: string;
  resultNotes: string;
  notes?: string;
  status?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'OVERRIDE_HOLD' | 'CREATE_USER' | 'PASSWORD_RESET';
  entityType?: 'AUTH' | 'USER_ACCOUNT' | 'QC_INSPECTION' | 'QUOTATION' | 'EXIM_DOC' | 'INVOICE' | 'SYSTEM';
  entity: string;
  entityId: string;
  details: string;
  sha256Hash: string;
  ipAddress?: string;
  stateBefore?: Record<string, unknown>;
  stateAfter?: Record<string, unknown>;
}

// 13-Formula Invoicing Types
export type InvoiceFormulaId =
  | 'FORMULA_1_STANDARD_NET'
  | 'FORMULA_2_FREIGHT_ADDED'
  | 'FORMULA_3_FREIGHT_INCLUSIVE'
  | 'FORMULA_4_PPN_PPH23'
  | 'FORMULA_5_DP_DEDUCTION'
  | 'FORMULA_6_RETENTION_GUARANTEE'
  | 'FORMULA_7_EXPORT_EXEMPT_0'
  | 'FORMULA_8_PROGRESSIVE_REBATE'
  | 'FORMULA_9_MULTI_DO_CONSOLIDATED'
  | 'FORMULA_10_SUBSIDIZED_TRANSPORT'
  | 'FORMULA_11_COST_CONTROL_SAFEGUARD'
  | 'FORMULA_12_FOREX_CURRENCY'
  | 'FORMULA_13_RETURN_NOTE_OFFSET'
  | (string & {})
  | number;

export interface InvoiceCalculationResult {
  formulaId: InvoiceFormulaId;
  formulaName: string;
  formulaDescription?: string;
  subtotalGoods: number;
  freightAmount: number;
  discountOrRebate: number;
  downPaymentDeduction: number;
  retentionWithheld: number;
  taxableBaseDpp: number;
  ppnAmount: number;
  pph23Amount: number;
  returnCreditOffset: number;
  finalPayableAmount: number;
  marginCheckPassed: boolean;
  estimatedMarginPercent: number;
  currency: string;
  exchangeRate: number;
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  dpp?: number;
  ppnRate?: number;
  pph22Rate?: number;
  pph22Amount?: number;
  pph23Rate?: number;
  beacukaiImportDuty?: number;
  freightCost?: number;
  insuranceCost?: number;
  grandTotal?: number;
  breakdownNote?: string;
}
