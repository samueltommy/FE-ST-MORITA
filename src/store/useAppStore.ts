import { useState, useEffect } from 'react';
import {
  AuditLog,
  BusinessUnit,
  DeliveryOrder,
  EximDocument,
  MasterItem,
  ProcurementOrder,
  QcInspectionRecord,
  Quotation,
  SalesOutdoorVisit,
  SalesTrackingOrder,
  UserProfile,
  UserRole,
  VehicleBooking,
} from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';
import { createAuditLog } from '../utils/cryptoAudit';

// Predefined Demo & Initial Users covering all 4 Tiers (Level 0, Level 1, Level 2, Level 3)
export const DEMO_USERS: Record<UserRole, UserProfile> = {
  // Level 0: System Admin
  SUPER_ADMIN: {
    id: 'USR-001',
    nik: 'NIK-2018-001',
    name: 'Ir. Budi Hendrawan, M.T.',
    email: 'budi.hendrawan@stmorita.co.id',
    role: 'SUPER_ADMIN',
    tier: 0,
    department: 'Executive IT & Systems',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    permissions: ['*'],
    plantLocation: 'Cikarang Main Plant - Group HQ',
    status: 'ACTIVE',
    joinedDate: '2018-01-15',
    phoneNumber: '+62 811-9283-001',
  },

  // Level 1: Direksi & Board of Directors (C-Level / Pemilik)
  DIREKSI: {
    id: 'USR-000',
    nik: 'NIK-2015-001',
    name: 'Ir. Hendra Morita, M.B.A.',
    email: 'hendra.morita@stmorita.co.id',
    role: 'DIREKSI',
    tier: 1,
    department: 'Board of Directors & Executive Office',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    permissions: ['*'],
    plantLocation: 'Cikarang Main Plant - Executive Suite',
    status: 'ACTIVE',
    joinedDate: '2015-05-10',
    phoneNumber: '+62 811-1000-001',
  },

  // Level 2: Admin Bidang / Manager Departemen
  HRD_MANAGER: {
    id: 'USR-002',
    nik: 'NIK-2019-014',
    name: 'Siti Rahmadani, S.Psi., M.M.',
    email: 'siti.rahmadani@stmorita.co.id',
    role: 'HRD_MANAGER',
    tier: 2,
    department: 'Human Resources & General Affairs',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.HRD_MANAGER.permissions,
    plantLocation: 'Cikarang Plant 1 - Administration Wing',
    status: 'ACTIVE',
    joinedDate: '2019-03-01',
    phoneNumber: '+62 812-4455-6677',
  },
  PPIC_MANAGER: {
    id: 'USR-003',
    nik: 'NIK-2020-022',
    name: 'Agus Santoso, S.T.',
    email: 'agus.santoso@stmorita.co.id',
    role: 'PPIC_MANAGER',
    tier: 2,
    department: 'PPIC & Production Control',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.PPIC_MANAGER.permissions,
    plantLocation: 'Cikarang Plant 1 - Production Floor',
    status: 'ACTIVE',
    joinedDate: '2020-02-15',
    phoneNumber: '+62 813-8899-0011',
  },
  PURCHASING_MANAGER: {
    id: 'USR-004',
    nik: 'NIK-2019-033',
    name: 'Dewi Lestari, S.E.',
    email: 'dewi.lestari@stmorita.co.id',
    role: 'PURCHASING_MANAGER',
    tier: 2,
    department: 'Procurement & Bea Cukai (EXIM)',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.PURCHASING_MANAGER.permissions,
    plantLocation: 'Cikarang Plant 2 - Supply Chain Office',
    status: 'ACTIVE',
    joinedDate: '2019-08-20',
    phoneNumber: '+62 815-1234-5678',
  },
  QC_MANAGER: {
    id: 'USR-006',
    nik: 'NIK-2017-008',
    name: 'Dr. Hendra Wijaya, S.Si.',
    email: 'hendra.wijaya@stmorita.co.id',
    role: 'QC_MANAGER',
    tier: 2,
    department: 'Quality Assurance & QC Lab',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.QC_MANAGER.permissions,
    plantLocation: 'Cikarang Main Plant - QA Headquarters',
    status: 'ACTIVE',
    joinedDate: '2017-09-01',
    phoneNumber: '+62 811-9876-5432',
  },
  SALES_MANAGER: {
    id: 'USR-008A',
    nik: 'NIK-2018-045',
    name: 'Ir. Anton Budiman',
    email: 'anton.budiman@stmorita.co.id',
    role: 'SALES_MANAGER',
    tier: 2,
    department: 'Commercial Sales & Business Development',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.SALES_MANAGER.permissions,
    plantLocation: 'Jakarta Representative & Cikarang Base',
    status: 'ACTIVE',
    joinedDate: '2018-04-12',
    phoneNumber: '+62 812-3344-5566',
  },
  COST_CONTROL: {
    id: 'USR-007',
    nik: 'NIK-2020-058',
    name: 'Lestari Wulandari, Ak., CA',
    email: 'lestari.wulandari@stmorita.co.id',
    role: 'COST_CONTROL',
    tier: 2,
    department: 'Finance & Cost Accounting',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.COST_CONTROL.permissions,
    plantLocation: 'Cikarang Main Plant - Finance Dept',
    status: 'ACTIVE',
    joinedDate: '2020-07-01',
    phoneNumber: '+62 818-7788-9900',
  },
  WAREHOUSE_MANAGER: {
    id: 'USR-009',
    nik: 'NIK-2018-062',
    name: 'Eko Prasetyo',
    email: 'eko.prasetyo@stmorita.co.id',
    role: 'WAREHOUSE_MANAGER',
    tier: 2,
    department: 'Logistics & Raw Material Warehouse',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.WAREHOUSE_MANAGER.permissions,
    plantLocation: 'Cikarang Warehouse Bay 4',
    status: 'ACTIVE',
    joinedDate: '2018-11-10',
    phoneNumber: '+62 813-2233-4455',
  },
  FINANCE_MANAGER: {
    id: 'USR-010',
    nik: 'NIK-2017-019',
    name: 'Melinda Kusuma, S.E., M.Ak.',
    email: 'melinda.kusuma@stmorita.co.id',
    role: 'FINANCE_MANAGER',
    tier: 2,
    department: 'Finance, Tax & AR/AP Accounting',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.FINANCE_MANAGER.permissions,
    plantLocation: 'Cikarang Main Plant - Finance Dept',
    status: 'ACTIVE',
    joinedDate: '2017-06-15',
    phoneNumber: '+62 811-3322-1100',
  },

  // Level 3: Staff / Operator / User Biasa
  OPERATOR_PROD: {
    id: 'USR-011',
    nik: 'NIK-2022-105',
    name: 'Wahyu Hidayat',
    email: 'wahyu.hidayat@stmorita.co.id',
    role: 'OPERATOR_PROD',
    tier: 3,
    department: 'Produksi Slitting & Coating Line 2',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.OPERATOR_PROD.permissions,
    plantLocation: 'Cikarang Plant 1 - Workshop Mesin',
    status: 'ACTIVE',
    joinedDate: '2022-03-10',
    phoneNumber: '+62 856-1234-9988',
  },
  QC_INSPECTOR: {
    id: 'USR-005',
    nik: 'NIK-2021-078',
    name: 'Rian Pratama',
    email: 'rian.pratama@stmorita.co.id',
    role: 'QC_INSPECTOR',
    tier: 3,
    department: 'Quality Assurance & QC Lab',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.QC_INSPECTOR.permissions,
    plantLocation: 'Cikarang Plant 1 - QC Testing Bay',
    status: 'ACTIVE',
    joinedDate: '2021-04-18',
    phoneNumber: '+62 857-8899-7766',
  },
  SALES_EXEC: {
    id: 'USR-008',
    nik: 'NIK-2021-091',
    name: 'Dimas Aditya',
    email: 'dimas.aditya@stmorita.co.id',
    role: 'SALES_EXEC',
    tier: 3,
    department: 'Commercial Sales & Business Development',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.SALES_EXEC.permissions,
    plantLocation: 'Jakarta Representative & Cikarang Base',
    status: 'ACTIVE',
    joinedDate: '2021-08-01',
    phoneNumber: '+62 812-9988-7766',
  },
  WAREHOUSE: {
    id: 'USR-009B',
    nik: 'NIK-2022-118',
    name: 'Joko Susanto',
    email: 'joko.susanto@stmorita.co.id',
    role: 'WAREHOUSE',
    tier: 3,
    department: 'Logistics & Receiving Dock',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.WAREHOUSE.permissions,
    plantLocation: 'Cikarang Warehouse Gate 2',
    status: 'ACTIVE',
    joinedDate: '2022-06-20',
    phoneNumber: '+62 878-1122-3344',
  },
  FINANCE_ACCT: {
    id: 'USR-010B',
    nik: 'NIK-2022-132',
    name: 'Indah Permata, S.Ak.',
    email: 'indah.permata@stmorita.co.id',
    role: 'FINANCE_ACCT',
    tier: 3,
    department: 'Billing & AR/AP Accounting',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.FINANCE_ACCT.permissions,
    plantLocation: 'Cikarang Main Plant - Finance Dept',
    status: 'ACTIVE',
    joinedDate: '2022-09-01',
    phoneNumber: '+62 813-7766-5544',
  },
  PURCHASING: {
    id: 'USR-004B',
    nik: 'NIK-2023-150',
    name: 'Bella Safitri',
    email: 'bella.safitri@stmorita.co.id',
    role: 'PURCHASING',
    tier: 3,
    department: 'Procurement Administration',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.PURCHASING.permissions,
    plantLocation: 'Cikarang Plant 2 - Supply Chain Office',
    status: 'ACTIVE',
    joinedDate: '2023-01-10',
    phoneNumber: '+62 821-4433-2211',
  },
  HRD_STAFF: {
    id: 'USR-002B',
    nik: 'NIK-2023-162',
    name: 'Dedi Kurniawan',
    email: 'dedi.kurniawan@stmorita.co.id',
    role: 'HRD_STAFF',
    tier: 3,
    department: 'HRD & Employee Relations',
    avatar: 'https://images.unsplash.com/photo-1480429370139-e0132c086e2a?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.HRD_STAFF.permissions,
    plantLocation: 'Cikarang Plant 1 - Administration Wing',
    status: 'ACTIVE',
    joinedDate: '2023-03-15',
    phoneNumber: '+62 857-3322-1199',
  },
  PPIC_PLANNER: {
    id: 'USR-003B',
    nik: 'NIK-2023-175',
    name: 'Tri Mulyono',
    email: 'tri.mulyono@stmorita.co.id',
    role: 'PPIC_PLANNER',
    tier: 3,
    department: 'PPIC Planning Staff',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_DEFINITIONS.PPIC_PLANNER.permissions,
    plantLocation: 'Cikarang Plant 1 - Production Planning',
    status: 'ACTIVE',
    joinedDate: '2023-05-02',
    phoneNumber: '+62 813-5566-7788',
  },
};

export const INITIAL_REGISTERED_USERS: UserProfile[] = Object.values(DEMO_USERS);

// Initial Master Items for ST. Morita Industries (Adhesive Tapes)
const INITIAL_ITEMS: MasterItem[] = [
  {
    id: 'ITM-IND-001',
    code: 'SM-JMB-BOPP48',
    name: 'Jumbo Roll BOPP Clear Adhesive Film 1280mm x 4000m',
    unit: 'Roll',
    category: 'Jumbo Roll Tape',
    businessUnit: 'INDUSTRIES',
    stockQty: 84,
    minStock: 25,
    unitCost: 14200000,
    sellingPrice: 18900000,
    grossMarginPercent: 24.8,
    lotNumber: 'LOT-IND-202609-01',
    barcode: '899341200101',
    locationRack: 'GUDANG-A-RACK-04',
    status: 'ACTIVE',
  },
  {
    id: 'ITM-IND-002',
    code: 'SM-MSK-KFT24',
    name: 'Automotive Masking Tape High-Temp 150°C 24mm x 50m',
    unit: 'Carton',
    category: 'Slit Tape',
    businessUnit: 'INDUSTRIES',
    stockQty: 420,
    minStock: 100,
    unitCost: 480000,
    sellingPrice: 650000,
    grossMarginPercent: 26.1,
    lotNumber: 'LOT-IND-202609-04',
    barcode: '899341200104',
    locationRack: 'GUDANG-B-SLIT-02',
    status: 'ACTIVE',
  },
  {
    id: 'ITM-IND-003',
    code: 'SM-RAW-ACR92',
    name: 'Water-Based Pressure Sensitive Acrylic Polymer Emulsion',
    unit: 'Drum (200kg)',
    category: 'Raw Material',
    businessUnit: 'INDUSTRIES',
    stockQty: 18,
    minStock: 30,
    unitCost: 5600000,
    sellingPrice: 7200000,
    grossMarginPercent: 22.2,
    lotNumber: 'LOT-IND-202609-08',
    barcode: '899341200108',
    locationRack: 'CHEMICAL-CHAMBER-C1',
    status: 'LOW_STOCK',
  },
  {
    id: 'ITM-IND-004',
    code: 'SM-DCT-IND50',
    name: 'Heavy Duty Industrial Cloth Duct Tape Silver 50mm x 25m',
    unit: 'Carton',
    category: 'Slit Tape',
    businessUnit: 'INDUSTRIES',
    stockQty: 310,
    minStock: 80,
    unitCost: 750000,
    sellingPrice: 1020000,
    grossMarginPercent: 26.5,
    lotNumber: 'LOT-IND-202609-12',
    barcode: '899341200112',
    locationRack: 'GUDANG-B-SLIT-08',
    status: 'ACTIVE',
  },
  {
    id: 'ITM-IND-005',
    code: 'SM-OPP-CLR48',
    name: 'OPP Packaging Tape Clear 48mm x 90m (Box 72 Rolls)',
    unit: 'Carton',
    category: 'Slit Tape',
    businessUnit: 'INDUSTRIES',
    stockQty: 540,
    minStock: 120,
    unitCost: 320000,
    sellingPrice: 420000,
    grossMarginPercent: 23.8,
    lotNumber: 'LOT-IND-202609-15',
    barcode: '899341200201',
    locationRack: 'GUDANG-B-SLIT-11',
    status: 'ACTIVE',
  },
  {
    id: 'ITM-IND-006',
    code: 'SM-DST-TIS12',
    name: 'Double Sided Tissue Tape High Tack 12mm x 50m',
    unit: 'Carton',
    category: 'Slit Tape',
    businessUnit: 'INDUSTRIES',
    stockQty: 260,
    minStock: 60,
    unitCost: 510000,
    sellingPrice: 680000,
    grossMarginPercent: 25.0,
    lotNumber: 'LOT-IND-202609-18',
    barcode: '899341200205',
    locationRack: 'GUDANG-B-SLIT-14',
    status: 'ACTIVE',
  },
  {
    id: 'ITM-IND-007',
    code: 'SM-FMA-EVA24',
    name: 'Black EVA Foam Mounting Tape 24mm x 10m High Bond',
    unit: 'Carton',
    category: 'Slit Tape',
    businessUnit: 'INDUSTRIES',
    stockQty: 180,
    minStock: 50,
    unitCost: 620000,
    sellingPrice: 840000,
    grossMarginPercent: 26.2,
    lotNumber: 'LOT-IND-202609-21',
    barcode: '899341200209',
    locationRack: 'GUDANG-B-SLIT-16',
    status: 'ACTIVE',
  },
];

// Initial QC Inspection Records
const INITIAL_QC_RECORDS: QcInspectionRecord[] = [
  {
    id: 'QC-2026-001',
    lotNumber: 'LOT-IND-202609-01',
    itemCode: 'SM-JMB-BOPP48',
    itemName: 'Jumbo Roll BOPP Clear Adhesive Film 1280mm x 4000m',
    batchSize: 12,
    unit: 'Rolls',
    businessUnit: 'INDUSTRIES',
    status: 'PASS',
    inspectionDate: '2026-09-08 09:30',
    inspectorName: 'Rian Pratama',
    inspectorRole: 'QC Inspector (Shift A)',
    testedParameters: [
      { name: '180° Peel Adhesion (N/25mm)', standard: '≥ 6.8 N', actual: '7.2 N', result: 'OK' },
      { name: 'Tensile Strength MD (MPa)', standard: '≥ 140 MPa', actual: '152 MPa', result: 'OK' },
      { name: 'Adhesive Coating Thickness (µm)', standard: '18 ± 2 µm', actual: '18.4 µm', result: 'OK' },
    ],
    coaNumber: 'COA/SM-IND/2026/09/0812',
  },
  {
    id: 'QC-2026-002',
    lotNumber: 'LOT-IND-202609-08',
    itemCode: 'SM-RAW-ACR92',
    itemName: 'Water-Based Pressure Sensitive Acrylic Polymer Emulsion',
    batchSize: 18,
    unit: 'Drums',
    businessUnit: 'INDUSTRIES',
    status: 'HOLD',
    inspectionDate: '2026-09-09 14:15',
    inspectorName: 'Rian Pratama',
    inspectorRole: 'QC Inspector (Shift A)',
    defectReason: 'Viskositas Brookfield terukur 5,450 mPa.s (Standar maks: 4,800 mPa.s). Berpotensi mengakibatkan cacat coating thickness saat slitting kecepatan tinggi.',
    holdTimestamp: '2026-09-09T14:15:00Z',
    testedParameters: [
      { name: 'Brookfield Viscosity (Spindle 3, 30rpm)', standard: '3,800 - 4,800 mPa.s', actual: '5,450 mPa.s', result: 'OUT_OF_SPEC' },
      { name: 'Solid Content (%)', standard: '55 ± 1 %', actual: '55.3 %', result: 'OK' },
      { name: 'pH Value (25°C)', standard: '7.0 - 8.5', actual: '7.4', result: 'OK' },
    ],
  },
  {
    id: 'QC-2026-003',
    lotNumber: 'LOT-IND-202609-15',
    itemCode: 'SM-OPP-CLR48',
    itemName: 'OPP Packaging Tape Clear 48mm x 90m',
    batchSize: 120,
    unit: 'Cartons',
    businessUnit: 'INDUSTRIES',
    status: 'PASS',
    inspectionDate: '2026-09-09 10:00',
    inspectorName: 'Dr. Hendra Wijaya',
    inspectorRole: 'QC Manager',
    testedParameters: [
      { name: 'Peel Adhesion on Stainless Steel', standard: '≥ 6.5 N/25mm', actual: '7.1 N/25mm', result: 'OK' },
      { name: 'Holding Power / Shear', standard: '≥ 24 Hours', actual: '> 36 Hours', result: 'OK' },
      { name: 'Unwind Force', standard: '< 3.0 N/25mm', actual: '2.4 N/25mm', result: 'OK' },
    ],
    coaNumber: 'COA/SM-IND/2026/09/0833',
  },
  {
    id: 'QC-2026-004',
    lotNumber: 'LOT-IND-202609-18',
    itemCode: 'SM-DST-TIS12',
    itemName: 'Double Sided Tissue Tape High Tack 12mm x 50m',
    batchSize: 60,
    unit: 'Cartons',
    businessUnit: 'INDUSTRIES',
    status: 'REWORK',
    inspectionDate: '2026-09-10 11:20',
    inspectorName: 'Rian Pratama',
    inspectorRole: 'QC Inspector',
    defectReason: 'Toleransi ketebalan liner pelepasan silikon menyimpang 5% pada roll ke-3; proses rewinding ulang di lini slitting 3.',
    holdTimestamp: '2026-09-10T11:20:00Z',
    testedParameters: [
      { name: 'Total Tape Thickness', standard: '120 ± 5 µm', actual: '122 µm', result: 'OK' },
      { name: 'Adhesion Level', standard: '≥ 12 N/25mm', actual: '13.2 N/25mm', result: 'OK' },
      { name: 'Release Liner Uniformity', standard: 'Zero wrinkle', actual: 'Minor wrinkle detected', result: 'OUT_OF_SPEC' },
    ],
  },
];

// Initial Procurement Orders
const INITIAL_PROCUREMENTS: ProcurementOrder[] = [
  {
    id: 'PR-2026-081',
    prNumber: 'PR/PPIC/2026/09/0081',
    poNumber: 'PO/PUR/2026/09/0142',
    vendorName: 'Nippon Polymer & Chemical Corp Tokyo',
    businessUnit: 'INDUSTRIES',
    itemsCount: 3,
    totalAmount: 485000000,
    stage: 'IQC',
    stageProgress: 80,
    lastUpdate: '2026-09-10 08:30',
    estimatedArrival: '2026-09-11',
  },
  {
    id: 'PR-2026-082',
    prNumber: 'PR/PPIC/2026/09/0085',
    poNumber: 'PO/PUR/2026/09/0149',
    vendorName: 'PT Asahimas Chemical Cilegon',
    businessUnit: 'INDUSTRIES',
    itemsCount: 5,
    totalAmount: 162500000,
    stage: 'PO',
    stageProgress: 40,
    lastUpdate: '2026-09-09 16:45',
    estimatedArrival: '2026-09-14',
  },
  {
    id: 'PR-2026-083',
    prNumber: 'PR/PPIC/2026/09/0089',
    poNumber: 'PO/PUR/2026/09/0155',
    vendorName: 'Toray Advanced Materials & Film Tokyo',
    businessUnit: 'INDUSTRIES',
    itemsCount: 4,
    totalAmount: 318000000,
    stage: 'PR',
    stageProgress: 20,
    lastUpdate: '2026-09-10 13:00',
    estimatedArrival: '2026-09-18',
  },
];

// Initial EXIM Customs Documents
const INITIAL_EXIM_DOCS: EximDocument[] = [
  {
    id: 'EXIM-BC23-001',
    docType: 'BC 2.3',
    referenceNumber: '008129/BC23/KPU-TP/2026',
    registrationDate: '2026-09-07',
    status: 'VERIFIED',
    fileName: 'BC_2_3_Nippon_Polymer_TanjungPriok.pdf',
    fileSize: '3.4 MB',
    notes: 'Impor Bahan Baku Polimer Akrilat Kawasan Berikat ST. Morita Industries Cikarang.',
    businessUnit: 'INDUSTRIES',
  },
  {
    id: 'EXIM-BC27-002',
    docType: 'BC 2.7',
    referenceNumber: '001452/BC27/KB-CKR/2026',
    registrationDate: '2026-09-08',
    status: 'VERIFIED',
    fileName: 'BC_2_7_Subcontract_Slitting_Transfer.pdf',
    fileSize: '2.1 MB',
    notes: 'Transfer Subkontrak Slitting Jumbo Roll antar Kawasan Berikat MM2100.',
    businessUnit: 'INDUSTRIES',
  },
  {
    id: 'EXIM-BC40-003',
    docType: 'BC 4.0',
    referenceNumber: '003921/BC40/KB-CKR/2026',
    registrationDate: '2026-09-09',
    status: 'PENDING_CUSTOMS',
    fileName: 'BC_4_0_Local_Corrugated_Box.pdf',
    fileSize: '1.8 MB',
    notes: 'Pemasukan barang kemasan karton lokal dari TLDDP ke Kawasan Berikat Cikarang.',
    businessUnit: 'INDUSTRIES',
  },
];

// Initial Delivery Orders (Multi-DO Multi-Item)
const INITIAL_DOS: DeliveryOrder[] = [
  {
    id: 'DO-2026-0901',
    doNumber: 'DO/SMI/2026/09/0112',
    customerName: 'PT Astra Daihatsu Motor (Plant Sunter)',
    customerAddress: 'Jl. Danau Sunter Selatan Blok O5, Tanjung Priok, Jakarta',
    dispatchDate: '2026-09-08',
    truckArmada: 'Truk Box Isuzu Giga (B 9128 UXT) - Driver: Pak Sutrisno',
    items: [
      {
        itemCode: 'SM-MSK-KFT24',
        itemName: 'Automotive Masking Tape High-Temp 150°C 24mm x 50m',
        quantity: 120,
        unit: 'Carton',
        lotNumber: 'LOT-IND-202609-04',
        unitPrice: 650000,
      },
      {
        itemCode: 'SM-DCT-IND50',
        itemName: 'Heavy Duty Industrial Cloth Duct Tape Silver 50mm x 25m',
        quantity: 40,
        unit: 'Carton',
        lotNumber: 'LOT-IND-202609-12',
        unitPrice: 1020000,
      },
    ],
    totalGrossValue: 118800000,
    selectedForInvoice: true,
    businessUnit: 'INDUSTRIES',
  },
  {
    id: 'DO-2026-0902',
    doNumber: 'DO/SMI/2026/09/0118',
    customerName: 'PT Astra Daihatsu Motor (Plant Sunter)',
    customerAddress: 'Jl. Danau Sunter Selatan Blok O5, Tanjung Priok, Jakarta',
    dispatchDate: '2026-09-09',
    truckArmada: 'Truk Engkel Colt Diesel (B 9481 FBC) - Driver: Pak Hendro',
    items: [
      {
        itemCode: 'SM-MSK-KFT24',
        itemName: 'Automotive Masking Tape High-Temp 150°C 24mm x 50m',
        quantity: 80,
        unit: 'Carton',
        lotNumber: 'LOT-IND-202609-04',
        unitPrice: 650000,
      },
    ],
    totalGrossValue: 52000000,
    selectedForInvoice: true,
    businessUnit: 'INDUSTRIES',
  },
  {
    id: 'DO-2026-0903',
    doNumber: 'DO/SMI/2026/09/0125',
    customerName: 'PT Toyota Motor Manufacturing Indonesia (Plant Karawang)',
    customerAddress: 'Kawasan Industri KIIC Lot DD 1, Telukjambe Barat, Karawang',
    dispatchDate: '2026-09-09',
    truckArmada: 'Wingbox Fuso Super Great (B 9302 JYT) - Driver: Pak Danang',
    items: [
      {
        itemCode: 'SM-JMB-BOPP48',
        itemName: 'Jumbo Roll BOPP Clear Adhesive Film 1280mm x 4000m',
        quantity: 8,
        unit: 'Roll',
        lotNumber: 'LOT-IND-202609-01',
        unitPrice: 18900000,
      },
    ],
    totalGrossValue: 151200000,
    selectedForInvoice: false,
    businessUnit: 'INDUSTRIES',
  },
];

// Initial Quotations (With 2-Stage Gating)
const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'QTE-2026-001',
    quotationNumber: 'QTE/SMI/2026/09/0045',
    customerName: 'PT Yamaha Indonesia Motor Mfg (Pulo Gadung)',
    productName: 'Automotive High-Temp Masking Tape 18mm x 50m',
    quantity: 500,
    unit: 'Carton',
    currency: 'IDR',
    targetPrice: 590000,
    hppUnitCost: 447000,
    grossMarginPercent: 24.2, // Above 18% -> Allowed
    status: 'APPROVED',
    createdDate: '2026-09-08',
    salesRepresentative: 'Dimas Aditya',
    costControlNotes: 'Margin 24.2% memenuhi ketentuan batas minimal HPP (standar internal >18%). Disetujui.',
    businessUnit: 'INDUSTRIES',
  },
  {
    id: 'QTE-2026-002',
    quotationNumber: 'QTE/SMI/2026/09/0049',
    customerName: 'PT Samsung Electronics Indonesia (Cikarang)',
    productName: 'Electronic Flame-Retardant Polyimide Tape 25mm x 33m',
    quantity: 300,
    unit: 'Roll',
    currency: 'IDR',
    targetPrice: 165000,
    hppUnitCost: 142000,
    grossMarginPercent: 13.9, // Below 18% floor! -> GATED PENDING COST CONTROL
    status: 'PENDING_COST_CONTROL',
    createdDate: '2026-09-09',
    salesRepresentative: 'Dimas Aditya',
    costControlNotes: 'PERHATIAN: Gross margin 13.9% berada di bawah ambang batas minimal 18.0%. Memerlukan otorisasi Cost Control / Direksi.',
    businessUnit: 'INDUSTRIES',
  },
];

// Initial Sales Tracking Orders
const INITIAL_SALES_TRACKING: SalesTrackingOrder[] = [
  {
    id: 'TRK-2026-001',
    ioNumber: 'IO/SMI/2026/09/0231',
    customerName: 'PT Astra Daihatsu Motor (Plant Sunter)',
    poCustomerRef: 'PO-ADM-2026-8910',
    orderDate: '2026-09-08',
    currentStage: 'IN_TRANSIT',
    timeline: [
      { stage: 'Order Masuk & Verifikasi IO', timestamp: '2026-09-08 08:30', location: 'Sales Office Cikarang', operator: 'Dimas Aditya', completed: true },
      { stage: 'Slitting & Konversi Selesai', timestamp: '2026-09-08 15:45', location: 'Lini Slitting 2 Pabrik Cikarang', operator: 'Wahyu Hidayat', completed: true },
      { stage: 'Inspeksi Kualitas (COA Issued)', timestamp: '2026-09-09 09:00', location: 'QC Testing Bay', operator: 'Rian Pratama', completed: true },
      { stage: 'Armada Berangkat Menuju Site', timestamp: '2026-09-09 13:30', location: 'Gate 2 Warehouse Cikarang', operator: 'Eko Prasetyo', completed: true },
      { stage: 'Konfirmasi Serah Terima (POD)', timestamp: 'Dalam Perjalanan (Est: 16:30)', location: 'Tol Jakarta-Cikampek KM 19', operator: 'Pak Sutrisno (Driver)', completed: false },
    ],
    truckNumber: 'B 9128 UXT',
    driverName: 'Pak Sutrisno',
    driverPhone: '+62 812-3456-7890',
    eta: 'Hari ini, 16:30 WIB',
    businessUnit: 'INDUSTRIES',
  },
];

// Initial Vehicles
const INITIAL_VEHICLES: VehicleBooking[] = [
  {
    id: 'VB-001',
    vehicleName: 'Isuzu Giga Wingbox (B 9128 UXT)',
    licensePlate: 'B 9128 UXT',
    destination: 'PT Astra Daihatsu Motor (Sunter, Jakarta Utara)',
    driverName: 'Pak Sutrisno',
    departureTime: '2026-09-10 13:30',
    purpose: 'Pengiriman Delivery Order DO/SMI/2026/09/0112',
    status: 'APPROVED',
  },
  {
    id: 'VB-002',
    vehicleName: 'Toyota Avanza Dinas Sales (B 2419 KFA)',
    licensePlate: 'B 2419 KFA',
    destination: 'Kawasan Industri KIIC Karawang & Surya Cipta',
    driverName: 'Dimas Aditya (Self Drive)',
    departureTime: '2026-09-11 08:00',
    purpose: 'Kunjungan Teknis Spesifikasi Masking Tape ke PT Toyota Karawang',
    status: 'PENDING',
  },
];

// Initial Sales Visits
const INITIAL_SALES_VISITS: SalesOutdoorVisit[] = [
  {
    id: 'VISIT-001',
    salesName: 'Dimas Aditya',
    clientName: 'PT Yamaha Indonesia Motor Mfg',
    clientAddress: 'Jl. Dr. KRT Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur',
    checkInTime: '2026-09-09 10:15 WIB',
    coordinates: { lat: -6.1895, lng: 106.9248 },
    purpose: 'Uji Coba Sampel Automotive Masking Tape 150°C pada oven cat pabrik',
    resultNotes: 'Sampel lulus uji baking 150°C tanpa residu lem. Klien meminta penawaran harga 500 karton.',
  },
  {
    id: 'VISIT-002',
    salesName: 'Dimas Aditya',
    clientName: 'PT Samsung Electronics Indonesia',
    clientAddress: 'Kawasan Industri Jababeka Tahap 2 Blok C-1, Cikarang, Bekasi',
    checkInTime: '2026-09-10 14:00 WIB',
    coordinates: { lat: -6.3142, lng: 107.1478 },
    purpose: 'Klarifikasi margin Quotation QTE-2026-002 bersama tim purchasing Samsung',
    resultNotes: 'Klien meminta diskon volume 5%; diajukan ke Cost Control & Direksi untuk dispensasi margin.',
  },
];

// Initial Audit Logs (Cryptographically hashed)
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  createAuditLog(
    'Dr. Hendra Wijaya, S.Si.',
    'QC_MANAGER',
    'APPROVE',
    'QC_INSPECTION',
    'QC-2026-003',
    'Penerbitan resmi COA/SM-IND/2026/09/0833 untuk Lot OPP Packaging Tape Clear di ST. Morita Industries.'
  ),
  createAuditLog(
    'Rian Pratama',
    'QC_INSPECTOR',
    'CREATE',
    'QC_INSPECTION',
    'QC-2026-002',
    'Aktivasi QC HOLD pada LOT-IND-202609-08 akibat viskositas akrilik melampaui 5,200 mPa.s.'
  ),
  createAuditLog(
    'Lestari Wulandari, Ak.',
    'COST_CONTROL',
    'APPROVE',
    'QUOTATION',
    'QTE-2026-001',
    'Approval margin 24.2% untuk PO Yamaha Motor Manufacturing West Java.'
  ),
  createAuditLog(
    'Ir. Hendra Morita, M.B.A.',
    'DIREKSI',
    'LOGIN',
    'AUTH',
    'USR-000',
    'Sesi login Direksi PT ST. Morita Industries diverifikasi dengan SHA-256 integrity token.'
  ),
];

export interface AppState {
  isAuthenticated: boolean;
  currentBusinessUnit: BusinessUnit;
  themeMode: 'light' | 'dark';
  isHighDensity: boolean;
  activeModule: 'hrd' | 'master_data' | 'procurement' | 'qc' | 'sales' | 'finance' | 'users' | 'audit' | 'scanner';
  currentUser: UserProfile;
  isBarcodeModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  isAuditLogsOpen: boolean;
  
  // Datasets
  users: UserProfile[];
  items: MasterItem[];
  qcRecords: QcInspectionRecord[];
  procurementOrders: ProcurementOrder[];
  eximDocs: EximDocument[];
  deliveryOrders: DeliveryOrder[];
  quotations: Quotation[];
  salesTrackingOrders: SalesTrackingOrder[];
  vehicleBookings: VehicleBooking[];
  salesVisits: SalesOutdoorVisit[];
  auditLogs: AuditLog[];
}

// Global mutable store singleton
let globalState: AppState = {
  isAuthenticated: true, // Default authenticated to Director so user sees app immediately, but can test login/logout anytime
  currentBusinessUnit: 'INDUSTRIES',
  themeMode: 'dark',
  isHighDensity: false,
  activeModule: 'finance', // Start on financial dashboard
  currentUser: DEMO_USERS.DIREKSI, // Default to Direksi (Level 1) for comprehensive overview
  isBarcodeModalOpen: false,
  isCommandPaletteOpen: false,
  isKeyboardShortcutsOpen: false,
  isAuditLogsOpen: false,
  users: INITIAL_REGISTERED_USERS,
  items: INITIAL_ITEMS,
  qcRecords: INITIAL_QC_RECORDS,
  procurementOrders: INITIAL_PROCUREMENTS,
  eximDocs: INITIAL_EXIM_DOCS,
  deliveryOrders: INITIAL_DOS,
  quotations: INITIAL_QUOTATIONS,
  salesTrackingOrders: INITIAL_SALES_TRACKING,
  vehicleBookings: INITIAL_VEHICLES,
  salesVisits: INITIAL_SALES_VISITS,
  auditLogs: INITIAL_AUDIT_LOGS,
};

const listeners = new Set<() => void>();

function getGlobalState(): AppState {
  return globalState;
}

function updateGlobalState(updater: (prev: AppState) => AppState) {
  globalState = updater(globalState);
  listeners.forEach((l) => l());
}

// Custom Hook / Central State Manager
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const [state, setState] = useState<AppState>(() => getGlobalState());

  useEffect(() => {
    const listener = () => setState(getGlobalState());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return selector(state);
}

// Exportable store action dispatchers
export const appStore = {
  getState: () => globalState,

  // Authentication & Session
  login: (user: UserProfile) => {
    updateGlobalState((prev) => {
      const log = createAuditLog(
        user.name,
        user.role,
        'LOGIN',
        'AUTH',
        user.id,
        `Pengguna ${user.name} (${ROLE_DEFINITIONS[user.role].label} - Tier L${user.tier}) berhasil login ke sistem ST. Morita Industries.`
      );
      return {
        ...prev,
        isAuthenticated: true,
        currentUser: user,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  },

  logout: () => {
    updateGlobalState((prev) => {
      const log = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'LOGOUT',
        'AUTH',
        prev.currentUser.id,
        `Pengguna ${prev.currentUser.name} telah logout secara aman dari portal ERP.`
      );
      return {
        ...prev,
        isAuthenticated: false,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
  },

  setBusinessUnit: (unit: BusinessUnit) => {
    updateGlobalState((prev) => {
      const newLog = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'UPDATE',
        'SYSTEM',
        unit,
        `Peralihan entitas bisnis portal grup ke: ST. Morita Industries`
      );
      return {
        ...prev,
        currentBusinessUnit: unit,
        auditLogs: [newLog, ...prev.auditLogs],
      };
    });
  },

  setThemeMode: (mode: 'light' | 'dark') => {
    updateGlobalState((prev) => {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { ...prev, themeMode: mode };
    });
  },

  toggleThemeMode: () => {
    const current = globalState.themeMode;
    const next = current === 'dark' ? 'light' : 'dark';
    appStore.setThemeMode(next);
  },

  setHighDensity: (dense: boolean) => {
    updateGlobalState((prev) => ({ ...prev, isHighDensity: dense }));
  },

  setActiveModule: (module: AppState['activeModule']) => {
    updateGlobalState((prev) => ({ ...prev, activeModule: module }));
  },

  setCurrentUserRole: (role: UserRole) => {
    const user = DEMO_USERS[role];
    if (!user) return;
    updateGlobalState((prev) => {
      const newLog = createAuditLog(
        user.name,
        role,
        'LOGIN',
        'AUTH',
        user.id,
        `Sesi aktif berganti role ke: ${ROLE_DEFINITIONS[role].label} (Tier L${user.tier})`
      );
      return {
        ...prev,
        currentUser: user,
        auditLogs: [newLog, ...prev.auditLogs],
      };
    });
  },

  // User & Employee Account Management (Admin & HRD)
  createUser: (newUserData: Omit<UserProfile, 'id'>) => {
    const newId = `USR-${String(globalState.users.length + 1).padStart(3, '0')}`;
    const newUser: UserProfile = {
      ...newUserData,
      id: newId,
    };

    updateGlobalState((prev) => {
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'CREATE_USER',
        'USER_ACCOUNT',
        newId,
        `Admin membuat akun pegawai baru: ${newUser.name} (NIK: ${newUser.nik}, Role: ${ROLE_DEFINITIONS[newUser.role]?.label || newUser.role}, Tier L${newUser.tier}).`
      );
      return {
        ...prev,
        users: [newUser, ...prev.users],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });

    return newUser;
  },

  updateUser: (userId: string, updates: Partial<UserProfile>) => {
    updateGlobalState((prev) => {
      const updatedUsers = prev.users.map((u) => (u.id === userId ? { ...u, ...updates } : u));
      const target = prev.users.find((u) => u.id === userId);
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'UPDATE',
        'USER_ACCOUNT',
        userId,
        `Pembaruan data akun pegawai: ${target?.name} (${userId}).`
      );
      return {
        ...prev,
        users: updatedUsers,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  toggleUserStatus: (userId: string) => {
    updateGlobalState((prev) => {
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
          return { ...u, status: nextStatus as 'ACTIVE' | 'SUSPENDED' };
        }
        return u;
      });
      const target = prev.users.find((u) => u.id === userId);
      const newStatus = target?.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'UPDATE',
        'USER_ACCOUNT',
        userId,
        `Pengubahan status akun pegawai ${target?.name} menjadi: ${newStatus}.`
      );
      return {
        ...prev,
        users: updatedUsers,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  resetUserPassword: (userId: string) => {
    updateGlobalState((prev) => {
      const target = prev.users.find((u) => u.id === userId);
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'PASSWORD_RESET',
        'USER_ACCOUNT',
        userId,
        `Reset password sementara untuk pegawai ${target?.name} (${userId}). Token keamanan dikirimkan ke email terdaftar.`
      );
      return {
        ...prev,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  deleteUser: (userId: string) => {
    updateGlobalState((prev) => {
      const target = prev.users.find((u) => u.id === userId);
      const filtered = prev.users.filter((u) => u.id !== userId);
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'DELETE',
        'USER_ACCOUNT',
        userId,
        `Penghapusan akun pegawai: ${target?.name} (${userId}).`
      );
      return {
        ...prev,
        users: filtered,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  setBarcodeModalOpen: (open: boolean) => {
    updateGlobalState((prev) => ({ ...prev, isBarcodeModalOpen: open }));
  },

  setCommandPaletteOpen: (open: boolean) => {
    updateGlobalState((prev) => ({ ...prev, isCommandPaletteOpen: open }));
  },

  setKeyboardShortcutsOpen: (open: boolean) => {
    updateGlobalState((prev) => ({ ...prev, isKeyboardShortcutsOpen: open }));
  },

  setAuditLogsOpen: (open: boolean) => {
    updateGlobalState((prev) => ({ ...prev, isAuditLogsOpen: open }));
  },

  // QC Actions
  overrideQcHold: (recordId: string, supervisorReason: string) => {
    updateGlobalState((prev) => {
      const updatedRecords = prev.qcRecords.map((rec) => {
        if (rec.id === recordId) {
          return {
            ...rec,
            status: 'PASS' as const,
            overrideBy: prev.currentUser.name,
            overrideReason: supervisorReason,
            overrideTimestamp: new Date().toISOString(),
          };
        }
        return rec;
      });

      const target = prev.qcRecords.find((r) => r.id === recordId);
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'OVERRIDE_HOLD',
        'QC_INSPECTION',
        recordId,
        `OVERRIDE RELEASE QC HOLD pada Lot ${target?.lotNumber} (${target?.itemName}). Alasan Otorisasi: "${supervisorReason}"`
      );

      return {
        ...prev,
        qcRecords: updatedRecords,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  lockQcHold: (recordId: string, defectReason: string) => {
    updateGlobalState((prev) => {
      const updatedRecords = prev.qcRecords.map((rec) => {
        if (rec.id === recordId) {
          return {
            ...rec,
            status: 'HOLD' as const,
            defectReason,
            holdTimestamp: new Date().toISOString(),
          };
        }
        return rec;
      });

      const target = prev.qcRecords.find((r) => r.id === recordId);
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'UPDATE',
        'QC_INSPECTION',
        recordId,
        `AKTIVASI QC HOLD pada Lot ${target?.lotNumber}: ${defectReason}`
      );

      return {
        ...prev,
        qcRecords: updatedRecords,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  // Quotation Cost Control Action
  approveQuotation: (quoteId: string, notes?: string) => {
    updateGlobalState((prev) => {
      const updatedQuotes = prev.quotations.map((q) => {
        if (q.id === quoteId) {
          return {
            ...q,
            status: 'APPROVED' as const,
            costControlNotes: notes || 'Telah diverifikasi sesuai standar batas minimum gross margin.',
          };
        }
        return q;
      });

      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'APPROVE',
        'QUOTATION',
        quoteId,
        `Persetujuan resmi Cost Control untuk Quotation ${quoteId} oleh ${prev.currentUser.name}.`
      );

      return {
        ...prev,
        quotations: updatedQuotes,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  },

  // Multi-DO Selection toggle
  toggleDoSelection: (doId: string) => {
    updateGlobalState((prev) => {
      const updated = prev.deliveryOrders.map((item) =>
        item.id === doId ? { ...item, selectedForInvoice: !item.selectedForInvoice } : item
      );
      return { ...prev, deliveryOrders: updated };
    });
  },

  // Select all DOs for a customer
  selectAllDos: (selected: boolean) => {
    updateGlobalState((prev) => {
      const updated = prev.deliveryOrders.map((item) => ({
        ...item,
        selectedForInvoice: selected,
      }));
      return { ...prev, deliveryOrders: updated };
    });
  },

  // Vehicle Approval
  approveVehicleBooking: (bookingId: string) => {
    updateGlobalState((prev) => {
      const updated = prev.vehicleBookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'APPROVED' as const } : b
      );
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'APPROVE',
        'SYSTEM',
        bookingId,
        `Persetujuan penggunaan armada pabrik Cikarang ID: ${bookingId}`
      );
      return { ...prev, vehicleBookings: updated, auditLogs: [audit, ...prev.auditLogs] };
    });
  },

  // Add Item to Master Data
  addMasterItem: (item: MasterItem) => {
    updateGlobalState((prev) => {
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'CREATE',
        'SYSTEM',
        item.code,
        `Penambahan item master baru: ${item.name} (${item.code}) Lot: ${item.lotNumber}`
      );
      return { ...prev, items: [item, ...prev.items], auditLogs: [audit, ...prev.auditLogs] };
    });
  },

  // Add Customs Document
  addEximDoc: (doc: EximDocument) => {
    updateGlobalState((prev) => {
      const audit = createAuditLog(
        prev.currentUser.name,
        prev.currentUser.role,
        'CREATE',
        'EXIM_DOC',
        doc.referenceNumber,
        `Upload dokumen kepabeanan pabean ${doc.docType} No: ${doc.referenceNumber}`
      );
      return { ...prev, eximDocs: [doc, ...prev.eximDocs], auditLogs: [audit, ...prev.auditLogs] };
    });
  },
};
