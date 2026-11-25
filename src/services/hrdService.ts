import { apiClient } from '../lib/apiClient';
import type { VehicleBooking, SalesOutdoorVisit } from '../types';
import type {
  Employee,
  LeaveRequestApi,
  SalesVisitApi,
  GenericResponse,
} from '../lib/schemas';

export type EmployeeDocType =
  | 'ktp'
  | 'kk'
  | 'npwp'
  | 'ijazah'
  | 'training_certificate'
  | 'medical_note'
  | 'leave_attachment'
  | 'visit_attachment';

export type HrdDocType = EmployeeDocType;

export interface UploadedDocumentData {
  docType: string;
  fileName: string;
  fileUrl: string;
  // snake_case aliases
  doc_type?: string;
  file_name?: string;
  file_url?: string;
}

/**
 * Resolves a relative backend file URL (e.g. "/uploads/employees/...")
 * into a full accessible URL (e.g. "http://127.0.0.1:8000/uploads/employees/...").
 */
export function resolveBackendFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl || !fileUrl.trim()) return null;
  const trimmed = fileUrl.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const baseApi = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const backendOrigin = baseApi.replace(/\/api\/v1\/?$/, '');
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${normalizedPath}`;
}

// HRD Service Functions

/**
 * Get paginated list of employees.
 * Note: Backend auto-censors `basic_salary` for L3_STAFF level users.
 */
export async function getEmployeesApi(
  page: number = 1,
  limit: number = 10,
  search?: string,
  department?: string
) {
  const params: Record<string, unknown> = { page, limit };
  if (search) params.search = search;
  if (department && department !== 'ALL') params.department = department;
  const response = await apiClient.get('/hrd/employees', { params });
  return {
    data: response.data?.data || response.data?.employees || (Array.isArray(response.data) ? response.data : []),
    meta: response.data?.meta || { total_pages: 1, page: 1, total: response.data?.total || 0 },
    summary: response.data?.summary || {},
  };
}

/**
 * Get single employee detail by ID (`GET /api/v1/hrd/employees/{id}`).
 */
export async function getEmployeeByIdApi(employeeId: string): Promise<Employee> {
  const response = await apiClient.get(`/hrd/employees/${employeeId}`);
  return (response.data?.data || response.data) as Employee;
}

export interface EmployeeTrainingPayload {
  name: string;
  organizer: string;
  year: number;
  certificate_url?: string;
}

export interface CreateEmployeePayload {
  // Core fields (snake_case matching FastAPI EmployeeCreate schema)
  nik: string;                  // Example: "EMP-2026-001"
  full_name: string;
  department: string;           // 8 divisions: SALES | DELIVERY | WAREHOUSE_PPIC | PRODUKSI_QC | PURCHASING | FINANCE | RND | HRD
  user_level: 'L0_SUPER_ADMIN' | 'L1_DIREKSI' | 'L2_MANAGER' | 'L3_STAFF' | 'L4_EXTERNAL' | string;
  username: string;
  email: string;
  password: string;
  employment_status: 'PERMANENT' | 'CONTRACT' | 'PROBATION' | 'INTERNSHIP' | 'RESIGNED' | string;
  role_id?: string;

  // Identity & Legal Docs
  identity_card_number: string; // 16 digits KTP
  ktp_photo_url?: string | null;
  kk_photo_url?: string | null;
  npwp_number?: string | null;
  npwp_photo_url?: string | null;

  // Employment & BPJS
  join_date: string;            // YYYY-MM-DD
  bpjs_kesehatan?: string | null;
  bpjs_ketenagakerjaan?: string | null;

  // Personal Data
  place_of_birth?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  religion?: string | null;
  phone_number: string;
  address?: string | null;

  // Emergency Contact
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;

  // Marital Status & Family
  marital_status?: 'SINGLE' | 'MARRIED' | null;
  spouse_name?: string | null;
  children?: { name: string; age: number }[] | null;

  // Education & Trainings
  last_education?: string | null;
  ijazah_photo_url?: string | null;
  trainings?: EmployeeTrainingPayload[] | null;

  // Financial / Payroll
  basic_salary?: number;
  bank_name?: string | null;
  bank_account_number?: string | null;
  permissions?: string[];
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'password'>> & {
  password?: string;
};

export async function createEmployeeApi(
  data: CreateEmployeePayload
): Promise<Employee> {
  const response = await apiClient.post('/hrd/employees', data, {
    headers: { 'X-Skip-Snake-Case': 'true' },
  });
  return (response.data?.data || response.data) as Employee;
}

export async function updateEmployeeApi(
  employeeId: string,
  data: UpdateEmployeePayload
): Promise<Employee> {
  const response = await apiClient.put(`/hrd/employees/${employeeId}`, data, {
    headers: { 'X-Skip-Snake-Case': 'true' },
  });
  return (response.data?.data || response.data) as Employee;
}

export interface EmployeeAccessPayload {
  userLevel?: string;
  department?: string;
  departmentAccess?: string[];
  roleName?: string | null;
  isActive?: boolean;
}

export interface KeycloakSyncResult {
  keycloakSynced: boolean;
  data?: any;
}

export async function updateEmployeeAccessApi(
  employeeId: string,
  payload: EmployeeAccessPayload
): Promise<KeycloakSyncResult> {
  const res = await apiClient.patch(`/hrd/employees/${employeeId}/access`, payload);
  const body = res.data || {};
  const data = body.data || body;
  const synced =
    typeof body.keycloakSynced === 'boolean'
      ? body.keycloakSynced
      : typeof data?.keycloakSynced === 'boolean'
      ? data.keycloakSynced
      : true;
  return { keycloakSynced: synced, data };
}

export async function deleteEmployeeApi(
  employeeId: string
): Promise<KeycloakSyncResult> {
  const res = await apiClient.delete(`/hrd/employees/${employeeId}`);
  const body = res.data || {};
  const synced =
    typeof body.keycloakSynced === 'boolean'
      ? body.keycloakSynced
      : typeof body?.data?.keycloakSynced === 'boolean'
      ? body.data.keycloakSynced
      : true;
  return { keycloakSynced: synced, data: body.data || body };
}

export async function suspendEmployeeApi(
  employeeId: string,
  isActive: boolean
): Promise<KeycloakSyncResult> {
  const res = await apiClient.patch(`/hrd/employees/${employeeId}/status`, { is_active: isActive });
  const body = res.data || {};
  const synced =
    typeof body.keycloakSynced === 'boolean'
      ? body.keycloakSynced
      : typeof body?.data?.keycloakSynced === 'boolean'
      ? body.data.keycloakSynced
      : true;
  return { keycloakSynced: synced, data: body.data || body };
}

export async function resetPasswordApi(
  employeeId: string,
  newPassword: string
): Promise<void> {
  await apiClient.post(`/hrd/employees/${employeeId}/reset-password`, { new_password: newPassword });
}

/**
 * Cara A Ã¢â‚¬â€ Upload per file saat memilih file di form (`POST /api/v1/hrd/upload-document`)
 * Mengirim FormData dengan field `doc_type` dan `file`.
 * Mengembalikan `{ docType, fileName, fileUrl }`.
 */
export async function uploadEmployeeDocumentApi(
  docType: EmployeeDocType,
  file: File
): Promise<UploadedDocumentData> {
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('file', file);

  const response = await apiClient.post('/hrd/upload-document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const rawData = response.data?.data || response.data || {};
  const fileUrl = rawData.fileUrl || rawData.file_url || '';
  const fileName = rawData.fileName || rawData.file_name || file.name;
  const resolvedDocType = rawData.docType || rawData.doc_type || docType;

  return {
    docType: resolvedDocType,
    fileName,
    fileUrl,
    doc_type: resolvedDocType,
    file_name: fileName,
    file_url: fileUrl,
  };
}

/**
 * Cara B Ã¢â‚¬â€ Upload & langsung lampirkan ke karyawan (`POST /api/v1/hrd/employees/{employee_id}/documents`)
 * Mengirim FormData berisi `ktp_photo`, `kk_photo`, `npwp_photo`, `ijazah_photo`,
 * dan/atau `training_certificate` (beserta `training_name`, `training_organizer`, `training_year`).
 */
export interface DirectEmployeeDocumentsUploadInput {
  ktpPhoto?: File | null;
  kkPhoto?: File | null;
  npwpPhoto?: File | null;
  ijazahPhoto?: File | null;
  trainingCertificate?: File | null;
  trainingName?: string;
  trainingOrganizer?: string;
  trainingYear?: number | string;
}

export async function uploadAndAttachEmployeeDocumentsApi(
  employeeId: string,
  input: DirectEmployeeDocumentsUploadInput
): Promise<Employee> {
  const formData = new FormData();
  if (input.ktpPhoto) formData.append('ktp_photo', input.ktpPhoto);
  if (input.kkPhoto) formData.append('kk_photo', input.kkPhoto);
  if (input.npwpPhoto) formData.append('npwp_photo', input.npwpPhoto);
  if (input.ijazahPhoto) formData.append('ijazah_photo', input.ijazahPhoto);
  if (input.trainingCertificate) {
    formData.append('training_certificate', input.trainingCertificate);
    if (input.trainingName) formData.append('training_name', input.trainingName);
    if (input.trainingOrganizer) formData.append('training_organizer', input.trainingOrganizer);
    if (input.trainingYear) formData.append('training_year', String(input.trainingYear));
  }

  const response = await apiClient.post(`/hrd/employees/${employeeId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return (response.data?.data || response.data) as Employee;
}

/**
 * Get list of leave requests (`/hrd/requests`).
 */
export async function getLeaveRequestsApi(page: number = 1, limit: number = 10, search?: string) {
  const params: Record<string, unknown> = { page, limit };
  if (search) params.search = search;
  const response = await apiClient.get('/hrd/requests', { params });
  const rawData = response.data?.data || response.data || [];
  const meta = response.data?.meta || { total_pages: 1, page: 1 };
  const data = (Array.isArray(rawData) ? rawData : []).map((lr: any) => ({
    id: lr.id,
    employeeName: lr.employeeName || lr.employee_name || '-',
    employeeNik: lr.employeeNik || lr.employee_nik || lr.nik || 'EMP-000',
    department: lr.department || 'HRD',
    leaveType: lr.requestType || lr.request_type || lr.leaveType || 'CUTI_TAHUNAN',
    startDate: lr.startDate || lr.start_date,
    endDate: lr.endDate || lr.end_date,
    durationDays: lr.durationDays || lr.duration_days || 1,
    reason: lr.reason || '',
    status: lr.status || 'PENDING_APPROVAL',
    approvedBy: lr.approvedBy || lr.approved_by,
    createdAt: lr.createdAt || lr.created_at || lr.startDate || lr.start_date,
  })) as any[];
  return { data, meta };
}

/**
 * Submit a leave/time-off request (`POST /hrd/requests`).
 */
export interface SubmitLeavePayload {
  requestType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export async function submitLeaveRequestApi(
  data: SubmitLeavePayload
): Promise<LeaveRequestApi> {
  const response = await apiClient.post('/hrd/requests', data);
  return response.data as LeaveRequestApi;
}

/**
 * Approve or reject a leave request (`PATCH /hrd/requests/{id}/approval`).
 */
export async function approveLeaveRequestApi(
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  approvalNotes?: string
): Promise<GenericResponse> {
  const response = await apiClient.patch(`/hrd/requests/${requestId}/approval`, {
    action,
    approvalNotes: approvalNotes || '',
  });
  return response.data as GenericResponse;
}

/**
 * Submit a sales outdoor visit with GPS coordinates (`POST /hrd/sales-visits`).
 */
export interface SubmitSalesVisitPayload {
  customerId: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  visitNotes: string;
}

export async function submitSalesVisitApi(
  data: SubmitSalesVisitPayload
): Promise<SalesVisitApi> {
  const response = await apiClient.post('/hrd/sales-visits', data);
  return response.data as SalesVisitApi;
}

export async function getVehicleBookingsApi(): Promise<VehicleBooking[]> {
  try {
    const response = await apiClient.get('/hrd/vehicle-bookings');
    return (response.data?.data || response.data) as VehicleBooking[];
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn('Endpoint GET /hrd/vehicle-bookings belum siap (404/405). Mengembalikan array kosong.');
      return [];
    }
    throw err;
  }
}

export async function getSalesVisitsApi(page: number = 1, limit: number = 10, search?: string) {
  try {
    const params: Record<string, unknown> = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/hrd/sales-visits', { params });
    const rawData = response.data?.data || response.data || [];
    const meta = response.data?.meta || { total_pages: 1, page: 1 };
    const data = (Array.isArray(rawData) ? rawData : []).map((visit: any) => ({
      id: visit.id,
      salesName: visit.employeeName || visit.employee_name || 'Sales Executive',
      salesRep: visit.employeeName || visit.employee_name || 'Sales Executive',
      clientName: visit.customerName || visit.customer_name || 'Prospect Client',
      clientCompany: visit.customerName || visit.customer_name,
      clientAddress: visit.locationAddress || visit.location_address || 'Tidak ada alamat',
      checkInTime: visit.visitedAt || visit.visited_at || visit.createdAt || '',
      coordinates: {
        lat: visit.latitude || 0,
        lng: visit.longitude || 0,
      },
      purpose: visit.visitPurpose || visit.visit_purpose || visit.visitNotes || '',
      resultNotes: visit.visitResult || visit.visit_result || visit.visitNotes || '',
      status: 'VERIFIED_CHECKIN',
    })) as SalesOutdoorVisit[];
    return { data, meta };
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      console.warn('Endpoint GET /hrd/sales-visits belum siap (404/405). Mengembalikan array kosong.');
      return { data: [], meta: { total_pages: 1, page: 1 } };
    }
    throw err;
  }
}

export async function approveVehicleBookingApi(id: string): Promise<VehicleBooking> {
  const response = await apiClient.post(`/hrd/vehicle-bookings/${id}/approve`);
  return (response.data?.data || response.data) as VehicleBooking;
}

export async function getAttendanceApi(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
  const params: Record<string, unknown> = { page, limit };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response = await apiClient.get('/hrd/attendance', { params });
  const rawData = response.data?.data || response.data || [];
  const meta = response.data?.meta || { total_pages: 1, page: 1 };

  const data = (Array.isArray(rawData) ? rawData : []).map((att: any) => ({
    id: att.id,
    employeeId: att.employee_id || att.employeeId,
    employeeName: att.employee_name || att.employeeName,
    department: att.department,
    date: att.date,
    shift: att.shift,
    checkIn: att.check_in || att.checkIn || '-',
    checkOut: att.check_out || att.checkOut || '-',
    status: att.status,
    notes: att.notes || '',
  }));
  return { data, meta };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CETAK LAPORAN HTML (/print) DENGAN AUTHORIZATION BEARER TOKEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface MyEmployeeProfile {
  id: string;
  nik?: string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  department?: string;
  userLevel?: string;
  roleId?: string;
  employmentStatus?: string;
  joinDate?: string;
  annualLeaveQuota?: number;
  annualLeaveUsed?: number;
  annualLeaveBalance?: number;
  hakCutiTahunan?: number;
  cutiTerpakai?: number;
  sisaCutiAktif?: number;
}

export async function getMyEmployeeProfileApi(): Promise<MyEmployeeProfile | null> {
  try {
    const res = await apiClient.get('/hrd/employees/me');
    return (res.data?.data || res.data || null) as MyEmployeeProfile | null;
  } catch {
    return null;
  }
}

export async function printHrdReport(path: string): Promise<void> {
  const baseUrl = apiClient.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  const token = localStorage.getItem('samhance_access_token');

  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `Gagal mencetak laporan (${response.status})`);
  }

  const html = await response.text();
  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) {
    throw new Error('Popup diblokir browser. Izinkan popup untuk mencetak dokumen.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch {
      // ignore if window was closed
    }
  }, 450);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. PENGAJUAN CUTI (RM-HRD-303) & SAKIT / IZIN LAINNYA (/hrd/leave-requests)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type LeaveRequestGroup = 'CUTI' | 'SAKIT_IZIN';

export type LeaveCategory =
  | 'CUTI_TAHUNAN_PRIBADI'
  | 'PERNIKAHAN_KARYAWAN'
  | 'MENIKAHKAN_ANAK'
  | 'OPNAM_KELUARGA'
  | 'ISTRI_MELAHIRKAN_KEGUGURAN'
  | 'KELUARGA_INTI_MENINGGAL'
  | 'SAUDARA_MENINGGAL'
  | 'URUS_KTP_SIM'
  | 'KHITANAN_PEMBAPTISAN_ANAK'
  | 'SAKIT'
  | 'IZIN_LAINNYA';

export interface HrdLeaveRequestRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeNik?: string;
  department?: string;
  requestDate?: string;
  requestGroup: LeaveRequestGroup;
  leaveCategory: LeaveCategory | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  customDays?: number;
  annualLeaveBalanceBefore?: number;
  annualLeaveBalanceAfter?: number;
  reason: string;
  attachmentUrl?: string;
  status: string;
  supervisorStatus?: string;
  supervisorByName?: string;
  supervisorAt?: string;
  supervisorNotes?: string;
  hrdStatus?: string;
  hrdByName?: string;
  hrdAt?: string;
  hrdNotes?: string;
  returnConfirmed?: boolean;
  returnConfirmedAt?: string;
  returnConfirmedByName?: string;
  createdAt?: string;
}

export interface CreateHrdLeaveRequestPayload {
  employeeId?: string;
  requestGroup: LeaveRequestGroup;
  leaveCategory: LeaveCategory | string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  customDays?: number;
  reason: string;
  attachmentUrl?: string;
}

export interface ApprovalActionPayload {
  action: 'APPROVE' | 'REJECT';
  notes?: string;
}

export async function getHrdLeaveRequestsApi(params?: {
  requestGroup?: LeaveRequestGroup;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<HrdLeaveRequestRecord[]> {
  const query: Record<string, any> = {};
  if (params?.requestGroup) query.request_group = params.requestGroup;
  if (params?.status && params.status !== 'ALL') query.status = params.status;
  if (params?.search) query.search = params.search;
  if (params?.page) query.page = params.page;
  if (params?.pageSize) query.page_size = params.pageSize;

  const res = await apiClient.get('/hrd/leave-requests', { params: query });
  const payload = res.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export async function createHrdLeaveRequestApi(
  payload: CreateHrdLeaveRequestPayload
): Promise<HrdLeaveRequestRecord> {
  const res = await apiClient.post('/hrd/leave-requests', payload);
  return res.data?.data || res.data;
}

export async function updateHrdLeaveRequestApi(
  id: string,
  payload: Partial<CreateHrdLeaveRequestPayload>
): Promise<HrdLeaveRequestRecord> {
  const res = await apiClient.put(`/hrd/leave-requests/${id}`, payload);
  return res.data?.data || res.data;
}

export async function deleteHrdLeaveRequestApi(id: string): Promise<void> {
  await apiClient.delete(`/hrd/leave-requests/${id}`);
}

export async function approveHrdLeaveSupervisorApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<HrdLeaveRequestRecord> {
  const res = await apiClient.patch(`/hrd/leave-requests/${id}/approve-supervisor`, payload);
  return res.data?.data || res.data;
}

export async function approveHrdLeaveHrdApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<HrdLeaveRequestRecord> {
  const res = await apiClient.patch(`/hrd/leave-requests/${id}/approve-hrd`, payload);
  return res.data?.data || res.data;
}

export async function confirmHrdLeaveReturnApi(
  id: string,
  notes?: string
): Promise<HrdLeaveRequestRecord> {
  const res = await apiClient.patch(`/hrd/leave-requests/${id}/confirm-return`, { notes });
  return res.data?.data || res.data;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. SURAT IJIN MENINGGALKAN TEMPAT KERJA (RM-HRD-013) (/hrd/exit-permits)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type ExitPermitType = 'TERLAMBAT' | 'SAAT_JAM_KERJA';

export interface ExitPermitRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeNik?: string;
  department?: string;
  permitDate: string;
  permitType: ExitPermitType | string;
  plannedOutTime?: string;
  plannedReturnTime?: string;
  actualOutTime?: string;
  actualReturnTime?: string;
  reason: string;
  status: string;
  supervisorStatus?: string;
  supervisorByName?: string;
  supervisorAt?: string;
  supervisorNotes?: string;
  hrdStatus?: string;
  hrdByName?: string;
  hrdAt?: string;
  hrdNotes?: string;
  returnConfirmed?: boolean;
  returnConfirmedAt?: string;
  createdAt?: string;
}

export interface CreateExitPermitPayload {
  employeeId?: string;
  permitDate: string;
  permitType: ExitPermitType;
  plannedOutTime?: string;
  plannedReturnTime?: string;
  reason: string;
}

export async function getExitPermitsApi(params?: {
  permitType?: string;
  status?: string;
  search?: string;
}): Promise<ExitPermitRecord[]> {
  const query: Record<string, any> = {};
  if (params?.permitType && params.permitType !== 'ALL') query.permit_type = params.permitType;
  if (params?.status && params.status !== 'ALL') query.status = params.status;
  if (params?.search) query.search = params.search;

  const res = await apiClient.get('/hrd/exit-permits', { params: query });
  const payload = res.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export async function createExitPermitApi(
  payload: CreateExitPermitPayload
): Promise<ExitPermitRecord> {
  const res = await apiClient.post('/hrd/exit-permits', payload);
  return res.data?.data || res.data;
}

export async function updateExitPermitApi(
  id: string,
  payload: Partial<CreateExitPermitPayload>
): Promise<ExitPermitRecord> {
  const res = await apiClient.put(`/hrd/exit-permits/${id}`, payload);
  return res.data?.data || res.data;
}

export async function deleteExitPermitApi(id: string): Promise<void> {
  await apiClient.delete(`/hrd/exit-permits/${id}`);
}

export async function approveExitPermitSupervisorApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<ExitPermitRecord> {
  const res = await apiClient.patch(`/hrd/exit-permits/${id}/approve-supervisor`, payload);
  return res.data?.data || res.data;
}

export async function approveExitPermitHrdApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<ExitPermitRecord> {
  const res = await apiClient.patch(`/hrd/exit-permits/${id}/approve-hrd`, payload);
  return res.data?.data || res.data;
}

export async function confirmExitPermitReturnApi(
  id: string,
  payload: { actualOutTime?: string; actualReturnTime?: string; notes?: string }
): Promise<ExitPermitRecord> {
  const res = await apiClient.patch(`/hrd/exit-permits/${id}/confirm-return`, payload);
  return res.data?.data || res.data;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. MASTER KENDARAAN & PEMINJAMAN KENDARAAN KANTOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type FuelLevel = 'E' | '1/4' | '1/2' | '3/4' | 'F';
export type VehiclePurposeType = 'DINAS_KANTOR' | 'PRIBADI';

export interface VehicleMasterRecord {
  id: string;
  name: string;
  plateNumber: string;
  vehicleType?: string;
  currentKm?: number;
  status?: string;
}

export interface VehicleBookingRecord {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  plateNumber?: string;
  employeeId?: string;
  borrowerName?: string;
  borrowerDepartment?: string;
  borrowerPosition?: string;
  purposeType: VehiclePurposeType | string;
  destination: string;
  departureAt: string;
  returnAt?: string;
  initialKm: number;
  finalKm?: number;
  initialFuel: FuelLevel | string;
  finalFuel?: FuelLevel | string;
  status: string;
  kabagStatus?: string;
  kabagByName?: string;
  kabagAt?: string;
  hrdStatus?: string;
  hrdByName?: string;
  hrdAt?: string;
  financeStatus?: string;
  financeByName?: string;
  financeAt?: string;
  notes?: string;
  createdAt?: string;
}

export async function getVehiclesApi(params?: {
  status?: string;
  search?: string;
}): Promise<VehicleMasterRecord[]> {
  const query: Record<string, any> = {};
  if (params?.status && params.status !== 'ALL') query.status = params.status;
  if (params?.search) query.search = params.search;

  const res = await apiClient.get('/hrd/vehicles', { params: query });
  const payload = res.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export async function createVehicleApi(payload: {
  name: string;
  plateNumber: string;
  vehicleType?: string;
  currentKm?: number;
  status?: string;
}): Promise<VehicleMasterRecord> {
  const res = await apiClient.post('/hrd/vehicles', payload);
  return res.data?.data || res.data;
}

export async function updateVehicleApi(
  id: string,
  payload: Partial<{
    name: string;
    plateNumber: string;
    vehicleType: string;
    currentKm: number;
    status: string;
  }>
): Promise<VehicleMasterRecord> {
  const res = await apiClient.patch(`/hrd/vehicles/${id}`, payload);
  return res.data?.data || res.data;
}

export async function getHrdVehicleBookingsApi(params?: {
  status?: string;
  search?: string;
}): Promise<VehicleBookingRecord[]> {
  const query: Record<string, any> = {};
  if (params?.status && params.status !== 'ALL') query.status = params.status;
  if (params?.search) query.search = params.search;

  const res = await apiClient.get('/hrd/vehicle-bookings', { params: query });
  const payload = res.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export async function createHrdVehicleBookingApi(payload: {
  vehicleId: string;
  employeeId?: string;
  purposeType: VehiclePurposeType;
  destination: string;
  departureAt: string;
  initialKm: number;
  initialFuel: FuelLevel;
  notes?: string;
}): Promise<VehicleBookingRecord> {
  const res = await apiClient.post('/hrd/vehicle-bookings', payload);
  return res.data?.data || res.data;
}

export async function updateHrdVehicleBookingApi(
  id: string,
  payload: Partial<{
    vehicleId: string;
    purposeType: VehiclePurposeType;
    destination: string;
    departureAt: string;
    initialKm: number;
    initialFuel: FuelLevel;
    notes?: string;
  }>
): Promise<VehicleBookingRecord> {
  const res = await apiClient.put(`/hrd/vehicle-bookings/${id}`, payload);
  return res.data?.data || res.data;
}

export async function deleteHrdVehicleBookingApi(id: string): Promise<void> {
  await apiClient.delete(`/hrd/vehicle-bookings/${id}`);
}

export async function approveVehicleKabagApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<VehicleBookingRecord> {
  const res = await apiClient.patch(`/hrd/vehicle-bookings/${id}/approve-kabag`, payload);
  return res.data?.data || res.data;
}

export async function approveVehicleHrdApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<VehicleBookingRecord> {
  const res = await apiClient.patch(`/hrd/vehicle-bookings/${id}/approve-hrd`, payload);
  return res.data?.data || res.data;
}

export async function approveVehicleFinanceApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<VehicleBookingRecord> {
  const res = await apiClient.patch(`/hrd/vehicle-bookings/${id}/approve-finance`, payload);
  return res.data?.data || res.data;
}

export async function returnVehicleBookingApi(
  id: string,
  payload: {
    finalKm: number;
    returnAt: string;
    finalFuel: FuelLevel;
    notes?: string;
  }
): Promise<VehicleBookingRecord> {
  const res = await apiClient.patch(`/hrd/vehicle-bookings/${id}/return`, payload);
  return res.data?.data || res.data;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. PENGAJUAN VISIT LUAR KOTA (/hrd/out-of-town-visits)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface OutOfTownVisitRecord {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeNik?: string;
  department?: string;
  destinationCity: string;
  customerName?: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  transportMode?: string;
  vehicleBookingId?: string;
  transportCost: number;
  lodgingCost: number;
  mealCost: number;
  otherCost: number;
  totalEstimatedCost?: number;
  attachmentUrl?: string;
  notes?: string;
  status: string;
  hrdStatus?: string;
  hrdByName?: string;
  hrdAt?: string;
  hrdNotes?: string;
  financeStatus?: string;
  financeByName?: string;
  financeAt?: string;
  financeNotes?: string;
  createdAt?: string;
}

export async function getOutOfTownVisitsApi(params?: {
  status?: string;
  search?: string;
}): Promise<OutOfTownVisitRecord[]> {
  const query: Record<string, any> = {};
  if (params?.status && params.status !== 'ALL') query.status = params.status;
  if (params?.search) query.search = params.search;

  const res = await apiClient.get('/hrd/out-of-town-visits', { params: query });
  const payload = res.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export interface CreateOutOfTownVisitPayload {
  employeeId?: string;
  destinationCity: string;
  customerName?: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  transportMode?: string;
  vehicleBookingId?: string;
  transportCost: number;
  lodgingCost: number;
  mealCost: number;
  otherCost: number;
  attachmentUrl?: string;
  notes?: string;
}

export async function createOutOfTownVisitApi(
  payload: CreateOutOfTownVisitPayload
): Promise<OutOfTownVisitRecord> {
  const res = await apiClient.post('/hrd/out-of-town-visits', payload);
  return res.data?.data || res.data;
}

export async function updateOutOfTownVisitApi(
  id: string,
  payload: Partial<CreateOutOfTownVisitPayload>
): Promise<OutOfTownVisitRecord> {
  const res = await apiClient.put(`/hrd/out-of-town-visits/${id}`, payload);
  return res.data?.data || res.data;
}

export async function deleteOutOfTownVisitApi(id: string): Promise<void> {
  await apiClient.delete(`/hrd/out-of-town-visits/${id}`);
}

export async function approveVisitHrdApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<OutOfTownVisitRecord> {
  const res = await apiClient.patch(`/hrd/out-of-town-visits/${id}/approve-hrd`, payload);
  return res.data?.data || res.data;
}

export async function approveVisitFinanceApi(
  id: string,
  payload: ApprovalActionPayload
): Promise<OutOfTownVisitRecord> {
  const res = await apiClient.patch(`/hrd/out-of-town-visits/${id}/approve-finance`, payload);
  return res.data?.data || res.data;
}
