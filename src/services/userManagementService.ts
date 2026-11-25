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
  departmentAccess?: string[];
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
  fullName?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  department?: string;
  userLevel: string;
  roleId?: string;
  departmentAccess?: string[];
  allowedDivisions?: string[];
  customPermissions?: string[];
  createEmployeeProfile?: boolean;
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
  departmentAccess?: string[];
  allowedDivisions?: string[];
  customPermissions?: string[];
}

export async function updateUserAccessApi(
  userId: string,
  payload: UpdateUserAccessPayload
): Promise<UserAccountRecord> {
  const res = await apiClient.put(`/user-management/users/${userId}/access`, payload);
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

export async function deleteUserManagementUserApi(userId: string): Promise<void> {
  await apiClient.delete(`/user-management/users/${userId}`);
}

function normalizePermissions(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return String(item.code ?? item.name ?? item.permission ?? item.id ?? '');
        }
        return String(item ?? '');
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'object') {
    const out: string[] = [];
    for (const [k, v] of Object.entries(raw)) {
      if (v === true) {
        out.push(k);
      } else if (Array.isArray(v)) {
        v.forEach((act) => out.push(`${k}:${String(act)}`));
      } else if (v && typeof v === 'object') {
        for (const [subK, subV] of Object.entries(v)) {
          if (subV) out.push(`${k}:${subK}`);
        }
      } else if (typeof v === 'string' && v) {
        out.push(`${k}:${v}`);
      }
    }
    return out;
  }
  return [];
}

function normalizeRoleRecord(raw: any, idx: number): RoleRecord {
  if (typeof raw === 'string') {
    return {
      id: raw,
      name: raw,
      description: '',
      permissions: [],
      isSystem: true,
    };
  }
  const id = String(raw?.id ?? raw?.roleId ?? raw?.name ?? `role-${idx}`);
  const name = String(raw?.name ?? raw?.roleName ?? raw?.code ?? id);
  const description = typeof raw?.description === 'string' ? raw.description : '';
  const permissions = normalizePermissions(raw?.permissions ?? raw?.permissionList ?? raw?.claims);
  const isSystem = Boolean(raw?.isSystem ?? raw?.is_system);
  const rawCount = raw?.userCount ?? raw?.usersCount ?? raw?.user_count;
  const userCount = typeof rawCount === 'number' ? rawCount : undefined;
  return { id, name, description, permissions, isSystem, userCount };
}

export async function getUserManagementRolesApi(): Promise<RoleRecord[]> {
  const res = await apiClient.get('/user-management/roles');
  const payload = res.data;
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.roles)
    ? payload.roles
    : Array.isArray(payload?.data?.roles)
    ? payload.data.roles
    : Array.isArray(payload?.data?.items)
    ? payload.data.items
    : [];
  return rawList.map((r: any, idx: number) => normalizeRoleRecord(r, idx));
}

export interface RoleMutationPayload {
  id?: string;
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
  const res = await apiClient.post('/user-management/roles', { id: roleId, ...payload });
  return res.data?.data || res.data;
}

export async function deleteUserManagementRoleApi(roleId: string): Promise<void> {
  await apiClient.delete(`/user-management/roles/${roleId}`);
}
