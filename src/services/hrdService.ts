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
 * - Create a Keycloak user account
 * - Assign Role to Keycloak (based on role_id = Keycloak role name like 'SUPER_ADMIN')
 * - Assign Group to Keycloak (based on department)
 *
 * NOTE: All fields MUST be snake_case to match the FastAPI EmployeeCreate schema.
 */
export interface CreateEmployeePayload {
  // Required fields — exact snake_case as per BE EmployeeCreate schema
  nik: string;                  // Pattern: ^EMP-\d{4}-\d{3,4}$
  full_name: string;            // minLength: 2, maxLength: 200
  email: string;                // format: email
  phone_number: string;         // maxLength: 20
  employment_status: 'PERMANENT' | 'CONTRACT' | 'PROBATION' | 'INTERNSHIP' | 'RESIGNED';
  join_date: string;            // format: date (YYYY-MM-DD)
  username: string;             // minLength: 3, maxLength: 100
  password: string;             // minLength: 8
  role_id: string;              // Keycloak role name e.g. 'SUPER_ADMIN', 'HRD_MANAGER'
  user_level: 'L0_SUPER_ADMIN' | 'L1_DIREKSI' | 'L2_MANAGER' | 'L3_STAFF' | 'L4_EXTERNAL';
  identity_card_number: string; // exactly 16 chars (KTP/NIK KTP)
  basic_salary: number;         // > 0, IDR

  // Optional fields
  department?: string | null;
  bank_name?: string | null;         // maxLength: 50
  bank_account_number?: string | null; // maxLength: 30
}

export async function createEmployeeApi(
  data: CreateEmployeePayload
): Promise<Employee> {
  // Data is already in snake_case — send directly
  const response = await apiClient.post('/hrd/employees', data);
  // Handle both {data: ...} and direct response formats
  return (response.data?.data || response.data) as Employee;
}

/**
 * Get list of leave requests.
 * Backend filters automatically based on user role/level.
 */
export async function getLeaveRequestsApi(): Promise<LeaveRequestApi[]> {
  const response = await apiClient.get('/hrd/requests');
  // Handle both {data: [...]} and direct array responses
  return (response.data?.data || response.data) as LeaveRequestApi[];
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
