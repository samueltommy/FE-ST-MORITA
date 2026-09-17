import { create } from 'zustand';
import { loginApi, activateApi, getMeApi } from '../services/authService';
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
  | { success: false; requiresActivation: boolean; errorMessage: string };

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
  fetchMe: () => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
}

// ─── Helper: Map backend user_level string to numeric tier ───
function parseTier(userLevel: string | null | undefined): RoleTier {
  if (!userLevel) return 3;
  const lvl = userLevel.toUpperCase();
  if (lvl.includes('L0') || lvl === 'SUPER_ADMIN') return 0;
  if (lvl.includes('L1') || lvl === 'DIREKSI') return 1;
  if (lvl.includes('L2') || lvl === 'MANAGER') return 2;
  if (lvl.includes('L3') || lvl === 'STAFF') return 3;
  return 3;
}

// ─── Helper: Map backend role_id/user_level to frontend UserRole ─
function parseRole(roleId: string | null | undefined, userLevel: string | null | undefined): UserRole {
  // Try exact match with roleId first
  if (roleId && roleId in ROLE_DEFINITIONS) {
    return roleId as UserRole;
  }
  // Fallback based on userLevel
  const lvl = (userLevel || '').toUpperCase();
  if (lvl.includes('L0') || lvl === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (lvl.includes('L1') || lvl === 'DIREKSI') return 'DIREKSI';
  // For L2/L3, we need the roleId to be more specific, fallback to generic
  if (roleId) {
    // Try cleaning the roleId (e.g. 'L2_MANAGER' -> see if a matching role exists)
    const cleaned = roleId.replace(/^L\d_/, '').toUpperCase();
    if (cleaned in ROLE_DEFINITIONS) return cleaned as UserRole;
  }
  return 'HRD_STAFF'; // safe default
}

// ─── Helper: Map backend permissions to frontend PermissionClaim ─
function parsePermissions(perms: string[] | null | undefined): PermissionClaim[] {
  if (!perms || perms.length === 0) {
    return [];
  }
  return perms as PermissionClaim[];
}

// ─── Helper: Convert backend /auth/me response to AuthUser ───
function mapMeToAuthUser(me: Record<string, unknown>): AuthUser {
  const userLevel = (me.userLevel as string) || (me.user_level as string) || '';
  const roleId = (me.roleId as string) || (me.role_id as string) || '';
  const tier = parseTier(userLevel);
  const role = parseRole(roleId, userLevel);
  const perms = parsePermissions(me.permissions as string[]);

  // For L0/L1, grant wildcard
  const finalPerms: PermissionClaim[] = tier <= 1 ? ['*'] : perms;

  return {
    id: String(me.id || me.keycloakId || me.keycloak_id || ''),
    username: String(me.username || ''),
    email: String(me.email || ''),
    fullName: String(me.fullName || me.full_name || me.username || ''),
    department: String(me.department || ''),
    userLevel,
    roleId,
    permissions: finalPerms,
    nik: String(me.nik || ''),
    phoneNumber: String(me.phoneNumber || me.phone_number || ''),
    keycloakId: String(me.keycloakId || me.keycloak_id || me.keycloakUserId || ''),

    // Derived for RBAC hook compat
    role,
    tier,
    name: String(me.fullName || me.full_name || me.username || ''),
    avatar: '', // Backend doesn't serve avatars — leave blank
    plantLocation: String(me.department || 'Main Plant'),
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
        return { success: false, requiresActivation: false, errorMessage: 'Server tidak mengembalikan token akses.' };
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
      return { success: false, requiresActivation: false, errorMessage: 'Gagal memuat profil pengguna.' };
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { code?: string; detail?: string; message?: string }; status?: number } };
      const errorData = err?.response?.data;
      const code = errorData?.code || '';
      
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
      if (code === 'KEYCLOAK_AUTH_ERROR' || err?.response?.status === 400) {
        return { success: false, requiresActivation: true, errorMessage: detail };
      }

      return { success: false, requiresActivation: false, errorMessage: detail };
    }
  },

  /**
   * Activate account: first-time password change.
   * On success: auto-login with returned token.
   */
  activate: async (username, tempPassword, newPassword) => {
    set({ isLoading: true });
    try {
      const data = await activateApi(username, tempPassword, newPassword);
      const token = data.accessToken;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        set({ token });
        await get().fetchMe();
      }
      set({ isLoading: false });
      return { success: true };
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { detail?: string; message?: string } } };
      const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Aktivasi gagal.';
      return { success: false, errorMessage: detail };
    }
  },

  /**
   * Fetch /auth/me to hydrate user profile & permissions.
   * Returns true if successful.
   */
  fetchMe: async (): Promise<boolean> => {
    try {
      const me = await getMeApi();
      const authUser = mapMeToAuthUser(me as unknown as Record<string, unknown>);
      set({ user: authUser, isAuthenticated: true });
      return true;
    } catch {
      // Token invalid or expired
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, isAuthenticated: false });
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
