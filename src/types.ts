// ==========================================
// ST. MORITA INDUSTRIES - ENTERPRISE ERP TYPES
// ==========================================


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
  userLevel?: string;
  employmentStatus?: string;
}

export type ItemCategory =
  | 'Raw Material'
  | 'Jumbo Roll Tape'
  | 'Slit Tape'
  | 'Cosmetics Chemical'
  | 'Packaging'
  | 'Finished Goods'
  | string;

export interface MasterItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: ItemCategory;
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
  itemName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
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
}

export interface SalesTrackingOrder {
  id: string;
  ioNumber: string;
  soNumber?: string;
  barcode?: string;
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
  steps?: {
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

// -------------------------------------------------------------
// Extended Domain Interfaces based on SRS & ERD Database Schemas
// -------------------------------------------------------------

export interface CustomerMaster {
  id: string;
  customerCode: string;
  companyName: string;
  customerStatus: 'NEW' | 'OLD';
  businessType: string;
  taxTransactionCode: '01' | '02' | '03' | '04' | '07' | '08' | '09'; // PPh/PPN tax codes
  npwp: string;
  nik?: string;
  billingAddress: string;
  shippingAddress: string;
  paymentTerm: string;
  creditLimit: number;
  contactPerson: string;
  phone: string;
  email: string;
  kontak_pic?: ContactPIC[];
  createdAt: string;
}

export interface SupplierMaster {
  id: string;
  supplierCode: string;
  supplierName: string;
  npwp: string;
  address: string;
  phone: string;
  email: string;
  kontak_pic?: ContactPIC[];
  contactPerson: string;
  paymentTerm: string;
  bankName: string;
  bankAccountNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  requestedBy: string;
  department: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  requiredDate: string;
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  status: 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'PO_CREATED';
  purpose: string;
  createdAt: string;
}

export interface GoodsReceiptLog {
  id: string;
  logNumber: string;
  poNumber: string;
  supplierName: string;
  deliveryNoteNumber: string; // No Surat Jalan Vendor
  vendorTruckPlate: string;
  driverName: string;
  receiptDate: string;
  receivedBy: string;
  itemCode: string;
  itemName: string;
  lotNumber: string;
  qtyDelivered: number;
  unit: string;
  isIqcTriggered: boolean;
  iqcStatus: 'PENDING' | 'PASS' | 'HOLD';
}

export interface WorkOrderSpk {
  id: string;
  spkNumber: string;
  customerIoRef?: string;
  itemCode: string;
  itemName: string;
  targetQuantity: number;
  producedGoodQty: number;
  producedNgQty: number;
  unit: string;
  targetWidthMm: number;
  targetLengthM: number;
  targetMicron?: number;
  productionLine: string;
  operatorName: string;
  spkStatus: 'QUEUED' | 'ON_PROCESS' | 'COMPLETED' | 'HOLD_BLOCKED';
  startDate: string;
  dueDate: string;
  rawMaterialLotChecked: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeNik: string;
  department: string;
  leaveType: 'CUTI_TAHUNAN' | 'SAKIT_SURAT_DOKTER' | 'IZIN_KEPERLUAN_KHUSUS' | 'CUTI_MELAHIRKAN';
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface WasteRecord {
  id: string;
  ticketNumber: string;
  wasteType: 'RAW_MATERIAL_WASTE' | 'FINISHED_PRODUCT_WASTE';
  itemCode: string;
  itemName: string;
  lotNumber: string;
  quantity: number;
  unit: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  reportedBy: string;
  dateReported: string;
}

export interface EComplaintTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  deliveryOrderNumber: string;
  invoiceNumber: string;
  complaintType:
    | 'UNSUITABLE_DOCUMENT'
    | 'UNSUITABLE_ITEM'
    | 'UNSUITABLE_QUANTITY'
    | 'UNSUITABLE_COLOR'
    | 'UNSUITABLE_PRODUCT_SIZE'
    | 'DELIVERY_DELAY'
    | 'UNSUITABLE_QUALITY_NG'
    | 'OTHER';
  correctiveActionRequested:
    | 'REPLACEMENT_OF_GOODS'
    | 'REPLACEMENT_OF_DOCUMENTS'
    | 'DEBIT_NOTE_CLAIM'
    | 'SCHEDULE_MEETING';
  description: string;
  targetDepartment: 'QC' | 'MARKETING' | 'R&D' | 'LOGISTICS';
  photoEvidenceUrl?: string;
  qcReinspectionStatus: 'PENDING_INSPECTION' | 'INSPECTED_NG_CONFIRMED' | 'INSPECTED_REJECTED';
  rmaNumber?: string;
  debitNoteNumber?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: string;
}

export interface VendorInvoiceAp {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  taxAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  paymentTerm: string;
}

export interface ArPaymentRecord {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  customerName: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: 'BCA_VIRTUAL_ACCOUNT' | 'MANDIRI_GIRO' | 'BANK_TRANSFER_PERMATA';
  bankRef: string;
  reconciled: boolean;
  notes: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  shift: string;
  checkIn: string;
  checkOut: string;
  status: 'HADIR' | 'TERLAMBAT' | 'CUTI' | 'SAKIT' | 'IZIN' | 'ALPHA';
  notes?: string;
}

// -------------------------------------------------------------
// FDD Payload Interfaces for Backend Connectivity
// -------------------------------------------------------------

export interface LeaveRequestPayload {
  request_type: 'LEAVE_CUTI' | 'VEHICLE_BOOKING' | 'SALES_VISIT' | string;
  start_date: string;
  end_date: string;
  reason: string;
  // Field Khusus Kendaraan
  vehicle_id?: string;
  start_km?: number;
  end_km?: number;
  fuel_indicator_e_f?: string; // e.g., "E", "1/4", "1/2", "3/4", "F"
  booking_purpose?: string;    // "Dinas Kantor" / "Pribadi"
  destination?: string;
}

export interface PRItem {
  item_id: string;
  requested_qty: number;
  uom_id: string;
  estimated_unit_price: number;
  // Tambahan FDD
  forecast_marketing?: number;
  average_consume?: number;
  end_stock?: number;
  otw_qty?: number;
  eta_warehouse?: string; // YYYY-MM-DD
}

export interface POCreatePayload {
  pr_id: string;
  supplier_id: string;
  po_date: string;
  // Tambahan FDD
  po_category?: string;     // "PO Baru" | "Pajak"
  ship_to_address?: string; // Alamat Gudang Pengiriman
  payment_term?: string;
  delivery_term?: string;
  delivery_time?: string;
  purpose?: string;
}

export interface GoodsReceiptPayload {
  po_id: string;
  delivery_note_number: string;
  // Tambahan FDD Kontainer & Surat
  container_no?: string;
  seal_no?: string;
  packing_list_no?: string;
  items: Array<{
    item_id: string;
    received_qty: number;
    warehouse_location: string;
    // Tambahan Ukuran Fisik Real-time
    size_overall?: string;
    size_usable?: string;
  }>;
}

export interface QCInspectionPayload {
  qc_type: 'IQC' | 'PQC' | 'OQC';
  stock_batch_id: string;
  item_id: string;
  // Tambahan Pengujian Fisik (Angka)
  lebar_mm?: number;
  panjang_m?: number;
  micron?: number;
  // Tambahan Pengujian Visual (Boolean/Checkbox)
  teleskoping?: boolean;
  kotor?: boolean;
  penyog?: boolean;
  berongga?: boolean;
  berkerut?: boolean;
  sambungan?: boolean;
}

export interface ComplaintPayload {
  sales_invoice_id: string;
  complaint_description: string;
  // Tambahan Analisis Masalah
  discovered_where?: string;
  symptom?: string;
  root_cause?: string;
  preventive_action?: string;
  corrective_action?: string;
  reject_qty?: number;
  percent_reject?: number;
}

export interface SupplierCreatePayload {
  supplier_code: string;
  supplier_name: string;
  // Checklist 14 Dokumen Legalitas
  legal_documents_checklist?: Record<string, boolean>; 
  // Scoring
  score_quality?: number;
  score_cost?: number;
  score_delivery?: number;
}

// -------------------------------------------------------------
// FDD Phase 2: Form Payload Interfaces & New Schemas
// -------------------------------------------------------------

export interface EmployeeLeaveQuota {
  hak_cuti_tahunan?: number;
  cuti_terpakai?: number;
  sisa_cuti_aktif?: number;
  periode_berlaku_cuti?: string;
}

export interface ContactPIC {
  nama_pic: string;
  jabatan_pic: string;
  departemen_pic?: string;
  no_hp_whatsapp: string;
  email_pic?: string;
  status_pic_utama: boolean;
}

export interface TaxAddress {
  nama_npwp?: string;
  alamat_pajak_lengkap?: string;
  rt_rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  kota?: string;
  kode_pos?: string;
}

export interface UomConversion {
  base_uom?: string;
  purchasing_uom?: string;
  sales_uom?: string;
  conversion_factor_purchase?: number;
  conversion_factor_sales?: number;
}

export interface WarehouseLocationDetail {
  kode_gudang?: string;
  lorong_aisle?: string;
  rak_rack?: string;
  tingkat_bin?: string;
}

export interface RMConsumptionCreate {
  kode_bahan_baku: string;
  nomor_batch_terpakai: string;
  qty_standar_bom: number;
  qty_aktual_terpakai: number;
  qty_selisih_variance?: number;
  keterangan_selisih?: string;
}

export interface DowntimeCreate {
  waktu_mulai_stop: string;
  waktu_selesai_stop: string;
  total_menit_downtime: number;
  kategori_downtime: string;
  keterangan_teknis?: string;
}

export interface TaxInvoiceDetail {
  no_seri_faktur_pajak_nsfp?: string;
  tanggal_faktur_pajak?: string;
  masa_pajak_bulan?: string;
  masa_pajak_tahun?: string;
}

// BOM
export interface BOMItemCreate {
  item_id: string;
  qty_komposisi_per_base_fg: number;
  uom: string;
  keterangan?: string;
}

export interface BOMCreate {
  fg_item_id: string;
  versi_bom: string;
  persentase_scrap_allowance?: number;
  komponen: BOMItemCreate[];
  approval_status?: string;
}

// Stock Opname
export interface StockOpnameItemCreate {
  item_id: string;
  qty_sistem_book: number;
  qty_fisik_aktual: number;
  qty_selisih_variance: number;
  alasan_selisih?: string;
}

export interface StockOpnameCreate {
  tanggal_opname: string;
  kode_gudang: string;
  pic_opname: string;
  items: StockOpnameItemCreate[];
  status_approval?: string;
}

// Petty Cash
export interface PettyCashItemCreate {
  coa_id: string;
  deskripsi: string;
  nominal: number;
}

export interface PettyCashCreate {
  no_bkk: string;
  entitas_tujuan: string;
  items: PettyCashItemCreate[];
  upload_bukti_nota?: string;
  total_amount: number;
  status_approval?: string;
}
