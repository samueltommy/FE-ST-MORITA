import { z } from 'zod';

// ─── Auth Schemas ────────────────────────────────────────────

/** Response from POST /auth/login */
export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string().optional(),
  message: z.string().optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/** Response from POST /auth/activate */
export const ActivateResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string().optional(),
  message: z.string().optional(),
});
export type ActivateResponse = z.infer<typeof ActivateResponseSchema>;

/** Response from GET /auth/me */
export const UserMeSchema = z.object({
  id: z.string().optional(),
  username: z.string(),
  email: z.string().optional().nullable(),
  fullName: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  userLevel: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional().default([]),
  nik: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  employmentStatus: z.string().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  keycloakId: z.string().optional().nullable(),
});
export type UserMe = z.infer<typeof UserMeSchema>;

/** Error response shape from backend */
export const ApiErrorSchema = z.object({
  detail: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ─── HRD Schemas ─────────────────────────────────────────────

/** Single employee record from GET /hrd/employees */
export const EmployeeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  nik: z.string().optional().nullable(),
  fullName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  employmentStatus: z.string().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  userLevel: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  identityCardNumber: z.string().optional().nullable(),
  basicSalary: z.number().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  keycloakUserId: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

/** Paginated employee list response */
export const EmployeeListResponseSchema = z.object({
  data: z.array(EmployeeSchema).optional().default([]),
  employees: z.array(EmployeeSchema).optional().default([]),
  total: z.number().optional().default(0),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  message: z.string().optional(),
});
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>;

/** Leave/time-off request */
export const LeaveRequestApiSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  employeeId: z.union([z.string(), z.number()]).optional().nullable(),
  employeeName: z.string().optional().nullable(),
  employeeNik: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  requestType: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
  approvalNotes: z.string().optional().nullable(),
});
export type LeaveRequestApi = z.infer<typeof LeaveRequestApiSchema>;

/** Sales visit record */
export const SalesVisitApiSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  customerId: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  locationAddress: z.string().optional().nullable(),
  visitNotes: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
});
export type SalesVisitApi = z.infer<typeof SalesVisitApiSchema>;

// ─── Generic API Response ────────────────────────────────────

export const GenericResponseSchema = z.object({
  message: z.string().optional(),
  detail: z.string().optional(),
  success: z.boolean().optional(),
});
export type GenericResponse = z.infer<typeof GenericResponseSchema>;
