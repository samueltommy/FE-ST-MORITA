import { apiClient } from '../lib/apiClient';
import type {
  Employee,
  EmployeeListResponse,
  LeaveRequestApi,
  SalesVisitApi,
  GenericResponse,
} from '../lib/schemas';

// ─── HRD Service Functions ───────────────────────────────────

/**
 * Get paginated list of employees.
 * Note: Backend auto-censors `basic_salary` for L3_STAFF level users.
 */
export async function getEmployeesApi(
  page: number = 1,
  limit: number = 10
): Promise<EmployeeListResponse> {
  const response = await apiClient.get('/hrd/employees', {
    params: { page, limit },
  });
  return response.data as EmployeeListResponse;
}

/**
 * Create a new employee.
 * Backend will automatically:
 * - Create a Keycloak account
 * - Assign Role (based on user_level / role_id)
 * - Assign Group (based on department)
 */
export interface CreateEmployeePayload {
  nik: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  employmentStatus: string;
  joinDate: string;
  department: string;
  userLevel: string;
  username: string;
  password: string;
  roleId: string;
  identityCardNumber: string;
  basicSalary: number;
  bankName?: string;
  bankAccountNumber?: string;
}

export async function createEmployeeApi(
  data: CreateEmployeePayload
): Promise<Employee> {
  const response = await apiClient.post('/hrd/employees', data);
  return response.data as Employee;
}

/**
 * Submit a leave/time-off request (by staff).
 */
export interface SubmitLeavePayload {
  requestType: string; // 'CUTI' | 'IZIN' | 'SAKIT'
  startDate: string;   // ISO datetime
  endDate: string;     // ISO datetime
  reason: string;
}

export async function submitLeaveRequestApi(
  data: SubmitLeavePayload
): Promise<LeaveRequestApi> {
  const response = await apiClient.post('/hrd/requests', data);
  return response.data as LeaveRequestApi;
}

/**
 * Approve or reject a leave request (by manager).
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
 * Submit a sales outdoor visit with GPS coordinates.
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
