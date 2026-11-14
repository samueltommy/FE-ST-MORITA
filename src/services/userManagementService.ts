import { apiClient } from '../lib/apiClient';

export interface UserAccountRecord {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  department?: string;
  userLevel?: string;
  roleId?: string;
  roleName?: string;
  allowedDivisions?: string[];
  customPermissions?: string[];
  isActive?: boolean;
  employeeId?: string;
  employeeNik?: string;
  createdAt?: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
}

export interface ListUsersParams {
  search?: string;
  department?: string;
  userLevel?: string;
  isActive?: boolean | string;
  page?: number;
  pageSize?: number;
}

export async function getUserManagementUsersApi(
  params?: ListUsersParams
): Promise<{ data: UserAccountRecord[]; meta?: any }> {
  const query: Record<string, any> = {};
  if (params?.search) query.search = params.search;
  if (params?.department && params.department !== 'ALL') query.department = params.department;
  if (params?.userLevel && params.userLevel !== 'ALL') query.user_level = params.userLevel;
  if (params?.isActive !== undefined && params.isActive !== 'ALL' && params.isActive !== '') {
    query.is_active = params.isActive;
  }
  if (params?.page) query.page = params.page;
  if (params?.pageSize) query.page_size = params.pageSize;

  const res = await apiClient.get('/user-management/users', { params: query });
  const payload = res.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : [];
  return { data: list, meta: payload?.meta };
}

export interface CreateUserAccountPayload {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  department?: string;
  userLevel: string;
  roleId?: string;
  allowedDivisions?: string[];
  customPermissions?: string[];
  employeeId?: string;
}

export async function createUserManagementUserApi(
  payload: CreateUserAccountPayload
): Promise<UserAccountRecord> {
  const res = await apiClient.post('/user-management/users', payload);
  return res.data?.data || res.data;
}

export interface UpdateUserAccessPayload {
  department?: string;
  userLevel?: string;
  roleId?: string;
  allowedDivisions?: string[];
  customPermissions?: string[];
}

export async function updateUserAccessApi(
  userId: string,
  payload: UpdateUserAccessPayload
): Promise<UserAccountRecord> {
  const res = await apiClient.patch(`/user-management/users/${userId}/access`, payload);
  return res.data?.data || res.data;
}

export async function updateUserStatusApi(
  userId: string,
  isActive: boolean
): Promise<UserAccountRecord> {
  const res = await apiClient.patch(`/user-management/users/${userId}/status`, {
    isActive,
  });
  return res.data?.data || res.data;
}

export async function getUserManagementRolesApi(): Promise<RoleRecord[]> {
  const res = await apiClient.get('/user-management/roles');
  const payload = res.data;
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];
}

export interface RoleMutationPayload {
  name: string;
  description?: string;
  permissions: string[];
}

export async function createUserManagementRoleApi(
  payload: RoleMutationPayload
): Promise<RoleRecord> {
  const res = await apiClient.post('/user-management/roles', payload);
  return res.data?.data || res.data;
}

export async function updateUserManagementRoleApi(
  roleId: string,
  payload: Partial<RoleMutationPayload>
): Promise<RoleRecord> {
  const res = await apiClient.patch(`/user-management/roles/${roleId}`, payload);
  return res.data?.data || res.data;
}

