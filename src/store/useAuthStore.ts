import { create } from 'zustand';
import { loginApi, activateApi, getMeApi, completeProfileApi } from '../services/authService';
import type { DivisionCode, PermissionClaim, RoleTier, UserRole } from '../types';
import { OFFICIAL_DIVISIONS } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';

// ─── Auth Store Types ────────────────────────────────────────

export interface AuthUser {
  // Core identity (from backend /auth/login & /auth/me)
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string;          // Canonical 8 division code: 'SALES' | 'DELIVERY' | 'WAREHOUSE_PPIC' | 'PRODUKSI_QC' | 'PURCHASING' | 'FINANCE' | 'RND' | 'HRD'
  allowedDivisions: string[];  // Array of allowed division codes from backend `allowed_divisions`
  userLevel: string;           // 'L0_SUPER_ADMIN' | 'L1_DIREKSI' | 'L2_MANAGER' | 'L3_STAFF' | 'L4_EXTERNAL'
  roleId: string;              // e.g. 'SUPER_ADMIN', 'DIREKSI', 'HRD_MANAGER'
  permissions: string[];
  nik: string;
  phoneNumber: string;
  keycloakId: string;

  // Derived fields for RBAC compatibility with existing useRBAC hook
  role: UserRole;
  tier: RoleTier;
  name: string;
  avatar: string;
  plantLocation: string;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate?: string;
}

export type LoginResult =
  | { success: true }
  | { success: false; requiresActivation: boolean; requiresProfileVerification: boolean; errorMessage: string };

export interface AuthState {
  // State
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // true once initial auth check is done

  // Actions
  login: (username: string, password: string) => Promise<LoginResult>;
  activate: (username: string, tempPassword: string, newPassword: string) => Promise<{ success: boolean; errorMessage?: string }>;
  completeProfile: (payload: { username: string; password?: string; email: string; firstName: string; lastName: string }) => Promise<{ success: boolean; errorMessage?: string }>;
  fetchMe: (loginUserFallback?: Record<string, unknown>) => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
}

/**
 * Normalizes any department/division string into one of the 8 official DivisionCode values
 */
export function normalizeDivisionCode(raw?: string | null): DivisionCode | string {
  if (!raw) return '';
  const s = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if ((OFFICIAL_DIVISIONS as string[]).includes(s)) {
    return s as DivisionCode;
  }
  if (s.includes('WAREHOUSE') || s.includes('PPIC') || s.includes('GUDANG')) return 'WAREHOUSE_PPIC';
  if (s.includes('PRODUKSI') || s.includes('PRODUCTION') || s.includes('QC') || s.includes('QUALITY')) return 'PRODUKSI_QC';
  if (s.includes('PURCHASING') || s.includes('PROCUREMENT') || s.includes('PEMBELIAN') || s.includes('EXIM')) return 'PURCHASING';
  if (s.includes('DELIVERY') || s.includes('LOGISTIK') || s.includes('LOGISTICS') || s.includes('PENGIRIMAN')) return 'DELIVERY';
  if (s.includes('FINANCE') || s.includes('COST') || s.includes('ACCOUNTING') || s.includes('AKUNTANSI')) return 'FINANCE';
  if (s.includes('RND') || s.includes('R&D') || s.includes('RESEARCH')) return 'RND';
  if (s.includes('HRD') || s.includes('HR') || s.includes('GA') || s.includes('SDM')) return 'HRD';
  if (s.includes('SALES') || s.includes('MARKETING') || s.includes('COMMERCIAL')) return 'SALES';
  return s;
}

// ─── Helper: Normalize userLevel string → canonical 'L0_SUPER_ADMIN' format ───
export function normalizeUserLevel(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/-/g, '_');

  // Already canonical: L0_SUPER_ADMIN, L1_DIREKSI, L2_MANAGER, L3_STAFF, L4_EXTERNAL
  if (/^L[0-4]_/.test(s)) return s;

  // Map common Keycloak role names → canonical level
  if (s === 'SUPER_ADMIN' || s === 'SUPERADMIN' || s === 'SYSTEM_ADMIN' || s === 'IT_ADMIN' || s === 'ADMIN') return 'L0_SUPER_ADMIN';
  if (s === 'DIREKSI' || s === 'DIRECTOR' || s === 'EXECUTIVE' || s === 'CEO' || s === 'OWNER') return 'L1_DIREKSI';
  if (s === 'MANAGER' || s === 'ADMIN_BIDANG' || s === 'L2') return 'L2_MANAGER';
  if (s === 'STAFF' || s === 'OPERATOR' || s === 'USER' || s === 'L3') return 'L3_STAFF';
  if (s === 'EXTERNAL' || s === 'L4') return 'L4_EXTERNAL';

  return raw; // Return raw if no match
}

// ─── Helper: Map user_level string to numeric tier ───────────
function parseTier(userLevel: string | null | undefined): RoleTier {
  if (!userLevel) return 3;
  const normalized = normalizeUserLevel(userLevel);
  const lvl = normalized.toUpperCase();
  if (lvl.startsWith('L0') || lvl === 'SUPER_ADMIN' || lvl === 'SUPERADMIN' || lvl === 'IT_ADMIN') return 0;
  if (lvl.startsWith('L1') || lvl === 'DIREKSI' || lvl === 'DIRECTOR' || lvl === 'EXECUTIVE') return 1;
  if (lvl.startsWith('L2') || lvl === 'MANAGER') return 2;
  if (lvl.startsWith('L3') || lvl === 'STAFF' || lvl === 'OPERATOR') return 3;
  return 3;
}

// ─── Helper: Map backend role_id/user_level/department to frontend UserRole ─
function parseRole(roleId: string | null | undefined, userLevel: string | null | undefined, department: string | null | undefined): UserRole {
  const normalized = normalizeUserLevel(userLevel || '').toUpperCase();
  if (normalized.startsWith('L0') || normalized === 'SUPER_ADMIN' || normalized === 'IT_ADMIN') return 'SUPER_ADMIN';
  if (normalized.startsWith('L1') || normalized === 'DIREKSI') return 'DIREKSI';

  // Try exact match with roleId first (case-insensitive)
  if (roleId) {
    const upperRoleId = roleId.toUpperCase().trim();
    if (upperRoleId in ROLE_DEFINITIONS) return upperRoleId as UserRole;
    const stripped = upperRoleId.replace(/^L\d_/, '');
    if (stripped in ROLE_DEFINITIONS) return stripped as UserRole;
  }

  const isManager = normalized.startsWith('L2') || normalized === 'MANAGER';
  const div = normalizeDivisionCode(department);

  switch (div) {
    case 'SALES':
      return isManager ? 'SALES_MANAGER' : 'SALES_EXEC';
    case 'DELIVERY':
      return isManager ? 'WAREHOUSE_MANAGER' : 'WAREHOUSE';
    case 'WAREHOUSE_PPIC':
      return isManager ? 'PPIC_MANAGER' : 'PPIC_PLANNER';
    case 'PRODUKSI_QC':
      return isManager ? 'QC_MANAGER' : 'QC_INSPECTOR';
    case 'PURCHASING':
      return isManager ? 'PURCHASING_MANAGER' : 'PURCHASING';
    case 'FINANCE':
      return isManager ? 'FINANCE_MANAGER' : 'FINANCE_ACCT';
    case 'RND':
      return isManager ? 'QC_MANAGER' : 'QC_INSPECTOR';
    case 'HRD':
      return isManager ? 'HRD_MANAGER' : 'HRD_STAFF';
    default:
      return isManager ? 'HRD_MANAGER' : 'HRD_STAFF';
  }
}

// ─── Helper: Map backend permissions to frontend PermissionClaim ─
function parsePermissions(perms: string[] | null | undefined): PermissionClaim[] {
  if (!perms || perms.length === 0) return [];
  return perms as PermissionClaim[];
}

// ─── Helper: Convert backend /auth/me response to AuthUser ───
function mapMeToAuthUser(me: Record<string, unknown>, tokenRoles: string[] = [], tokenDept: string = ''): AuthUser {
  const rawUserLevel =
    (me.user_level as string) ||
    (me.userLevel as string) ||
    (me.usergroup as string) ||
    '';
  const rawRoleId =
    (me.role_id as string) ||
    (me.roleId as string) ||
    '';
  const rawFullName =
    (me.full_name as string) ||
    (me.fullName as string) ||
    (me.name as string) ||
    (me.username as string) ||
    '';

  let userLevel = rawUserLevel ? normalizeUserLevel(rawUserLevel) : '';
  let roleId = rawRoleId;

  if (tokenRoles.length > 0) {
    for (const r of tokenRoles) {
      const rUp = r.toUpperCase().replace(/-/g, '_');
      const normalized = normalizeUserLevel(rUp);

      if (!userLevel && /^L[0-4]_/.test(normalized)) {
        userLevel = normalized;
      }

      const stripped = rUp.replace(/^L\d_/, '');
      if (stripped in ROLE_DEFINITIONS && !roleId) {
        roleId = stripped;
        if (!userLevel) {
          const tier = ROLE_DEFINITIONS[stripped as UserRole]?.tier ?? 3;
          userLevel = `L${tier}_${stripped}`;
        }
      }

      if (!userLevel) {
        if (rUp === 'SUPER_ADMIN' || rUp === 'IT_ADMIN' || rUp === 'ADMIN' || rUp === 'SUPERADMIN') {
          userLevel = 'L0_SUPER_ADMIN';
          if (!roleId) roleId = 'SUPER_ADMIN';
        } else if (rUp === 'DIREKSI' || rUp === 'DIRECTOR' || rUp === 'EXECUTIVE') {
          userLevel = 'L1_DIREKSI';
          if (!roleId) roleId = 'DIREKSI';
        }
      }
    }
  }

  const tier = parseTier(userLevel);

  const rawDept = String(me.department || me.division || '').trim();
  const candidateDept =
    rawDept && rawDept.toUpperCase() !== 'UMUM' && rawDept.toUpperCase() !== 'TIDAK ADA'
      ? rawDept
      : tokenDept || rawDept;

  const normalizedDept = normalizeDivisionCode(candidateDept);
  const role = parseRole(roleId, userLevel, normalizedDept || (me.user_level as string));

  // Resolve allowed_divisions from backend response or derive based on user_level + department
  const rawAllowedDivisions = (me.allowedDivisions || me.allowed_divisions) as string[] | undefined;
  let allowedDivisions: string[] = [];

  if (tier <= 1 || userLevel === 'L0_SUPER_ADMIN' || userLevel === 'L1_DIREKSI') {
    allowedDivisions = [...OFFICIAL_DIVISIONS];
  } else if (Array.isArray(rawAllowedDivisions) && rawAllowedDivisions.length > 0) {
    allowedDivisions = rawAllowedDivisions.map((d) => normalizeDivisionCode(d)).filter(Boolean);
  } else if (normalizedDept && (OFFICIAL_DIVISIONS as string[]).includes(normalizedDept)) {
    allowedDivisions = [normalizedDept];
  }

  const rawPerms = parsePermissions(me.permissions as string[]);
  const finalPerms: PermissionClaim[] = tier <= 1
    ? ['*']
    : rawPerms.length > 0
      ? rawPerms
      : (ROLE_DEFINITIONS[role]?.permissions || []);

  const ultimateDept =
    normalizedDept ||
    (allowedDivisions.length === 1 ? allowedDivisions[0] : '') ||
    (tier === 0 ? 'HRD' : tier === 1 ? 'FINANCE' : 'SALES');

  return {
    id: String(me.id || me.keycloakId || me.keycloak_id || me.keycloak_user_id || ''),
    username: String(me.username || ''),
    email: String(me.email || ''),
    fullName: rawFullName,
    department: ultimateDept,
    allowedDivisions,
    userLevel: userLevel || (tier === 0 ? 'L0_SUPER_ADMIN' : tier === 1 ? 'L1_DIREKSI' : tier === 2 ? 'L2_MANAGER' : 'L3_STAFF'),
    roleId,
    permissions: finalPerms,
    nik: String(me.nik || ''),
    phoneNumber: String(me.phoneNumber || me.phone_number || ''),
    keycloakId: String(me.keycloakId || me.keycloak_id || me.keycloakUserId || me.keycloak_user_id || ''),

    // Derived for RBAC hook compat
    role,
    tier,
    name: rawFullName,
    avatar: '',
    plantLocation: ultimateDept || 'Main Plant',
    status: 'ACTIVE',
    joinedDate: String(me.joinDate || me.join_date || ''),
  };
}

// ─── Token persistence key ───────────────────────────────────
const TOKEN_KEY = 'samhance_access_token';

// ─── Zustand Store ───────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  login: async (username: string, password: string): Promise<LoginResult> => {
    set({ isLoading: true });
    try {
      const data = await loginApi(username, password);
      const token = data.accessToken || (data as any).access_token;
      if (!token) {
        set({ isLoading: false });
        return { success: false, requiresActivation: false, requiresProfileVerification: false, errorMessage: 'Server tidak mengembalikan token akses.' };
      }

      // Persist token
      localStorage.setItem(TOKEN_KEY, token);
      set({ token });

      // Pass user object returned from POST /auth/login (if any) into fetchMe
      const loginUserObj = (data.user || (data as any).user) as Record<string, unknown> | undefined;
      const fetched = await get().fetchMe(loginUserObj);
      set({ isLoading: false });

      if (fetched) {
        return { success: true };
      }
      return { success: false, requiresActivation: false, requiresProfileVerification: false, errorMessage: 'Gagal memuat profil pengguna.' };
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { code?: string; detail?: string; message?: string }; status?: number }; message?: string };
      const errorData = err?.response?.data;
      const code = errorData?.code || (errorData?.detail as any)?.code || '';

      let detailStr = 'Login gagal. Periksa username dan password.';
      if (errorData?.detail) {
        detailStr = typeof errorData.detail === 'string'
          ? errorData.detail
          : (errorData.detail as any).message || JSON.stringify(errorData.detail);
      } else if (errorData?.message) {
        detailStr = typeof errorData.message === 'string'
          ? errorData.message
          : JSON.stringify(errorData.message);
      } else if (err?.message) {
        detailStr = err.message;
      }

      const detail = detailStr;

      const isActivationRequired =
        code === 'KEYCLOAK_AUTH_ERROR' ||
        code === 'ACCOUNT_NOT_ACTIVATED' ||
        err?.response?.status === 400 ||
        detail.toLowerCase().includes('update_password');

      const isProfileVerificationRequired =
        code === 'PROFILE_NOT_VERIFIED' ||
        (detail.toLowerCase().includes('account is not fully set up') && !isActivationRequired);

      if (isProfileVerificationRequired) {
        return { success: false, requiresActivation: false, requiresProfileVerification: true, errorMessage: detail };
      }

      if (isActivationRequired) {
        return { success: false, requiresActivation: true, requiresProfileVerification: false, errorMessage: detail };
      }

      return { success: false, requiresActivation: false, requiresProfileVerification: false, errorMessage: detail };
    }
  },

  activate: async (username, tempPassword, newPassword) => {
    set({ isLoading: true });
    try {
      await activateApi(username, tempPassword, newPassword);
      set({ isLoading: false });
      return { success: true };
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { detail?: string | { message?: string }; message?: string } }; message?: string };
      const errorData = err?.response?.data;

      let detailStr = 'Aktivasi gagal.';
      if (errorData?.detail) {
        detailStr = typeof errorData.detail === 'string'
          ? errorData.detail
          : (errorData.detail as any).message || JSON.stringify(errorData.detail);
      } else if (errorData?.message) {
        detailStr = typeof errorData.message === 'string'
          ? errorData.message
          : JSON.stringify(errorData.message);
      } else if (err?.message) {
        detailStr = err.message;
      }

      return { success: false, errorMessage: detailStr };
    }
  },

  completeProfile: async (payload) => {
    set({ isLoading: true });
    try {
      await completeProfileApi(payload);
      set({ isLoading: false });
      return { success: true };
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { detail?: string | { message?: string }; message?: string } }; message?: string };
      const errorData = err?.response?.data;

      let detailStr = 'Gagal menyimpan profil.';
      if (errorData?.detail) {
        detailStr = typeof errorData.detail === 'string'
          ? errorData.detail
          : (errorData.detail as any).message || JSON.stringify(errorData.detail);
      } else if (errorData?.message) {
        detailStr = typeof errorData.message === 'string'
          ? errorData.message
          : JSON.stringify(errorData.message);
      } else if (err?.message) {
        detailStr = err.message;
      }

      return { success: false, errorMessage: detailStr };
    }
  },

  fetchMe: async (loginUserFallback?: Record<string, unknown>): Promise<boolean> => {
    const currentToken = get().token;
    try {
      const meRaw = await getMeApi();
      // Merge loginUserFallback (if backend returned user inside login response) with /auth/me
      const me = {
        ...(loginUserFallback || {}),
        ...(meRaw as unknown as Record<string, unknown>),
        ...((meRaw as any)?.user || {}),
      };
      const token = get().token;
      let tokenRoles: string[] = [];
      let tokenDept = '';
      if (token) {
        try {
          const payloadStr = atob(token.split('.')[1]);
          const payload = JSON.parse(payloadStr);
          tokenRoles = payload.realm_access?.roles || [];
          const rawDept = payload.department || payload.division;
          tokenDept = Array.isArray(rawDept) ? (rawDept[0] || '') : (rawDept || '');

          if (!me.username && payload.preferred_username) me.username = payload.preferred_username;
          if (!me.fullName && !me.full_name && payload.name) me.fullName = payload.name;
          if (!me.email && payload.email) me.email = payload.email;
        } catch (e) {
          console.warn('Failed to decode token', e);
        }
      }

      const authUser = mapMeToAuthUser(me, tokenRoles, tokenDept);
      set({ user: authUser, isAuthenticated: true });
      return true;
    } catch {
      if (loginUserFallback) {
        const authUser = mapMeToAuthUser(loginUserFallback);
        set({ user: authUser, isAuthenticated: true });
        return true;
      }
      if (get().token === currentToken) {
        localStorage.removeItem(TOKEN_KEY);
        set({ token: null, user: null, isAuthenticated: false });
      }
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      set({ token: storedToken, isLoading: true });
      await get().fetchMe();
      set({ isLoading: false, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },
}));
