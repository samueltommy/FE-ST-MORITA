import { create } from 'zustand';
import { loginApi, activateApi, getMeApi, completeProfileApi } from '../services/authService';
import type { PermissionClaim, RoleTier, UserProfile, UserRole } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';

// ─── Auth Store Types ────────────────────────────────────────

export interface AuthUser {
  // Core identity (from backend /auth/me)
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string;
  userLevel: string;   // e.g. 'L0_SUPER_ADMIN', 'L1_DIREKSI', 'L2_MANAGER', 'L3_STAFF'
  roleId: string;      // e.g. 'SUPER_ADMIN', 'DIREKSI', 'HRD_MANAGER'
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
  fetchMe: () => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
}

// ─── Helper: Normalize userLevel string → canonical 'L0_SUPER_ADMIN' format ───
function normalizeUserLevel(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/-/g, '_');

  // Already canonical: L0_SUPER_ADMIN, L1_DIREKSI, L2_MANAGER, L3_STAFF, L4_EXTERNAL
  if (/^L[0-4]_/.test(s)) return s;

  // Map common Keycloak role names → canonical level
  if (s === 'SUPER_ADMIN' || s === 'SUPERADMIN' || s === 'SYSTEM_ADMIN' || s === 'IT_ADMIN' || s === 'ADMIN') return 'L0_SUPER_ADMIN';
  if (s === 'DIREKSI' || s === 'DIRECTOR' || s === 'EXECUTIVE' || s === 'CEO' || s === 'OWNER') return 'L1_DIREKSI';
  if (s === 'MANAGER' || s === 'ADMIN_BIDANG' || s === 'L2') return 'L2_MANAGER';
  if (s === 'STAFF' || s === 'OPERATOR' || s === 'USER' || s === 'L3') return 'L3_STAFF';

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

// ─── Helper: Map backend role_id/user_level to frontend UserRole ─
function parseRole(roleId: string | null | undefined, userLevel: string | null | undefined, department: string | null | undefined): UserRole {
  // Try exact match with roleId first (case-insensitive)
  if (roleId) {
    const upperRoleId = roleId.toUpperCase().trim();
    if (upperRoleId in ROLE_DEFINITIONS) return upperRoleId as UserRole;
    // Strip L-prefix (e.g. 'L2_HRD_MANAGER' → 'HRD_MANAGER')
    const stripped = upperRoleId.replace(/^L\d_/, '');
    if (stripped in ROLE_DEFINITIONS) return stripped as UserRole;
  }

  const normalized = normalizeUserLevel(userLevel || '').toUpperCase();
  const isManager = normalized.startsWith('L2') || normalized === 'MANAGER';

  // Fallback based on department
  const dept = (department || '').toUpperCase();
  if (dept.includes('FINANCE') || dept.includes('AKUNTANSI') || dept.includes('ACCOUNTING') || dept.includes('COST')) {
    return isManager ? 'FINANCE_MANAGER' : 'FINANCE_ACCT';
  }
  if (dept.includes('SALES') || dept.includes('MARKETING') || dept.includes('COMMERCIAL') || dept.includes('EXTERNAL_PORTAL')) {
    return isManager ? 'SALES_MANAGER' : 'SALES_EXEC';
  }
  if (dept.includes('QC') || dept.includes('QA') || dept.includes('QUALITY')) {
    return isManager ? 'QC_MANAGER' : 'QC_INSPECTOR';
  }
  if (dept.includes('PPIC') || dept.includes('PLANNING')) {
    return isManager ? 'PPIC_MANAGER' : 'PPIC_PLANNER';
  }
  if (dept.includes('PROCUREMENT') || dept.includes('PURCHASING') || dept.includes('EXIM') || dept.includes('PEMBELIAN')) {
    return isManager ? 'PURCHASING_MANAGER' : 'PURCHASING';
  }
  if (dept.includes('WAREHOUSE') || dept.includes('GUDANG') || dept.includes('LOGISTIK') || dept.includes('LOGISTICS')) {
    return isManager ? 'WAREHOUSE_MANAGER' : 'WAREHOUSE';
  }
  if (dept.includes('PRODUKSI') || dept.includes('PRODUCTION') || dept.includes('PABRIK') || dept.includes('OPERATOR')) {
    return isManager ? 'PPIC_MANAGER' : 'OPERATOR_PROD';
  }
  if (dept.includes('HRD') || dept.includes('GA') || dept.includes('UMUM') || dept.includes('HR')) {
    return isManager ? 'HRD_MANAGER' : 'HRD_STAFF';
  }

  // Fallback based on normalized userLevel
  if (normalized.startsWith('L0') || normalized === 'SUPER_ADMIN' || normalized === 'IT_ADMIN') return 'SUPER_ADMIN';
  if (normalized.startsWith('L1') || normalized === 'DIREKSI') return 'DIREKSI';

  return 'HRD_STAFF'; // safe fallback for L2/L3 without specific role
}

// ─── Helper: Map backend permissions to frontend PermissionClaim ─
function parsePermissions(perms: string[] | null | undefined): PermissionClaim[] {
  if (!perms || perms.length === 0) return [];
  return perms as PermissionClaim[];
}

// ─── Helper: Convert backend /auth/me response to AuthUser ───
// NOTE: Backend returns snake_case keys: user_level, full_name, role_id
function mapMeToAuthUser(me: Record<string, unknown>, tokenRoles: string[] = [], tokenDept: string = ''): AuthUser {
  // Accept both snake_case (backend) and camelCase (legacy)
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
    (me.full_name as string) ||
    (me.name as string) ||
    (me.username as string) ||
    '';

  // --- Step 1: Try to resolve from backend fields ---
  let userLevel = rawUserLevel ? normalizeUserLevel(rawUserLevel) : '';
  let roleId = rawRoleId;

  // --- Step 2: Supplement from Keycloak JWT realm_access.roles ---
  if (tokenRoles.length > 0) {
    for (const r of tokenRoles) {
      const rUp = r.toUpperCase().replace(/-/g, '_');
      // Prefer the most specific role (e.g. SUPER_ADMIN over L0_SUPER_ADMIN)
      const normalized = normalizeUserLevel(rUp);

      // Check if this token role identifies a level
      if (!userLevel && /^L[0-4]_/.test(normalized)) {
        userLevel = normalized;
      }

      // Check if this token role maps to a specific UserRole definition
      const stripped = rUp.replace(/^L\d_/, '');
      if (stripped in ROLE_DEFINITIONS && !roleId) {
        roleId = stripped;
        if (!userLevel) {
          const tier = ROLE_DEFINITIONS[stripped as UserRole]?.tier ?? 3;
          userLevel = `L${tier}_${stripped}`;
        }
      }

      // Special: detect common IT/admin role names in token
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

  // --- Step 3: Derive tier, department and role ---
  const tier = parseTier(userLevel);

  // Resolve department early so we can use it for role fallback
  const rawDept = String(me.department || '').trim();
  const finalDept =
    rawDept && rawDept.toUpperCase() !== 'UMUM' && rawDept.toUpperCase() !== 'TIDAK ADA'
      ? rawDept
      : tokenDept || rawDept;

  const role = parseRole(roleId, userLevel, finalDept || me.user_level as string);

  // --- Step 4: Resolve permissions ---
  const rawPerms = parsePermissions(me.permissions as string[]);

  // L0 & L1: always wildcard regardless of what backend says
  const finalPerms: PermissionClaim[] = tier <= 1
    ? ['*']
    : rawPerms.length > 0
      ? rawPerms
      : (ROLE_DEFINITIONS[role]?.permissions || []);  // fallback to role definition if backend sends empty

  // Fallback if finalDept is still empty
  const ultimateDept = finalDept || ROLE_DEFINITIONS[role]?.department || 'General';

  return {
    id: String(me.id || me.keycloakId || me.keycloak_id || me.keycloak_user_id || ''),
    username: String(me.username || ''),
    email: String(me.email || ''),
    fullName: rawFullName,
    department: ultimateDept,
    userLevel,
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

  /**
   * Login with username & password.
   * On success: stores token, fetches /auth/me, sets authenticated.
   * On KEYCLOAK_AUTH_ERROR: returns { requiresActivation: true }.
   */
  login: async (username: string, password: string): Promise<LoginResult> => {
    set({ isLoading: true });
    try {
      const data = await loginApi(username, password);
      const token = data.accessToken;
      if (!token) {
        set({ isLoading: false });
        return { success: false, requiresActivation: false, requiresProfileVerification: false, errorMessage: 'Server tidak mengembalikan token akses.' };
      }

      // Persist token
      localStorage.setItem(TOKEN_KEY, token);
      set({ token });

      // Fetch user profile
      const fetched = await get().fetchMe();
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

      // Detect temp password scenario
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

  /**
   * Activate account: first-time password change.
   * On success: auto-login with returned token.
   */
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

  /**
   * Complete user profile and automatically login.
   */
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

  /**
   * Fetch /auth/me to hydrate user profile & permissions.
   * Returns true if successful.
   */
  fetchMe: async (): Promise<boolean> => {
    const currentToken = get().token;
    try {
      const me = await getMeApi();
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
          
          // Fallback username and name from token if /me is sparse
          if (!me.username && payload.preferred_username) me.username = payload.preferred_username;
          if (!me.fullName && payload.name) me.fullName = payload.name;
          if (!me.email && payload.email) me.email = payload.email;
        } catch (e) {
          console.warn('Failed to decode token', e);
        }
      }
      
      const authUser = mapMeToAuthUser(me as unknown as Record<string, unknown>, tokenRoles, tokenDept);
      set({ user: authUser, isAuthenticated: true });
      return true;
    } catch {
      // Token invalid or expired
      if (get().token === currentToken) {
        localStorage.removeItem(TOKEN_KEY);
        set({ token: null, user: null, isAuthenticated: false });
      }
      return false;
    }
  },

  /**
   * Logout: clear everything.
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  /**
   * Initialize: check for persisted token and rehydrate session.
   * Called once on app startup.
   */
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
