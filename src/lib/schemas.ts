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

// ─── Finance Schemas (Core 6) ────────────────────────────────

export const CalculationBreakdownSchema = z.object({
  totGrossAmount: z.number().optional().nullable(),
  freightCost: z.number().optional().nullable(),
  discountAmount: z.number().optional().nullable(),
  subtotalDpp: z.number().optional().nullable(),
  ppnAmount: z.number().optional().nullable(),
  pphAmount: z.number().optional().nullable(),
  downPaymentDeduction: z.number().optional().nullable(),
  retentionDeduction: z.number().optional().nullable(),
  netInvoiceAmount: z.number().optional().nullable(),
});
export type CalculationBreakdown = z.infer<typeof CalculationBreakdownSchema>;

export const InvoiceCalculateOutSchema = z.object({
  formulaId: z.number(),
  formulaExpression: z.string(),
  calculationBreakdown: CalculationBreakdownSchema,
});
export type InvoiceCalculateOut = z.infer<typeof InvoiceCalculateOutSchema>;

export const InvoiceOutSchema = z.object({
  invoiceId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  taxFactureNumber: z.string().optional().nullable(),
  netInvoiceAmount: z.number().optional(),
  invoiceStatus: z.string().optional(),
});
export type InvoiceOut = z.infer<typeof InvoiceOutSchema>;

export const ARPaymentOutSchema = z.object({
  arId: z.string().optional(),
  paymentAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
});
export type ARPaymentOut = z.infer<typeof ARPaymentOutSchema>;

export const ComplaintOutSchema = z.object({
  complaintId: z.string().optional(),
  ticketNumber: z.string().optional(),
  status: z.string().optional(),
});
export type ComplaintOut = z.infer<typeof ComplaintOutSchema>;

export const RMAResolveOutSchema = z.object({
  complaintId: z.string().optional(),
  creditNoteAmount: z.number().optional(),
  status: z.string().optional(),
});
export type RMAResolveOut = z.infer<typeof RMAResolveOutSchema>;

