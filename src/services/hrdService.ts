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
  | 'training_certificate';

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

// ─── HRD Service Functions ───────────────────────────────────

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

export async function deleteEmployeeApi(
  employeeId: string
): Promise<void> {
  await apiClient.delete(`/hrd/employees/${employeeId}`);
}

export async function suspendEmployeeApi(
  employeeId: string,
  isActive: boolean
): Promise<void> {
  await apiClient.patch(`/hrd/employees/${employeeId}/status`, { is_active: isActive });
}

export async function resetPasswordApi(
  employeeId: string,
  newPassword: string
): Promise<void> {
  await apiClient.post(`/hrd/employees/${employeeId}/reset-password`, { new_password: newPassword });
}

/**
 * Cara A — Upload per file saat memilih file di form (`POST /api/v1/hrd/upload-document`)
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
 * Cara B — Upload & langsung lampirkan ke karyawan (`POST /api/v1/hrd/employees/{employee_id}/documents`)
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
