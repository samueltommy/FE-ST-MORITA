/// <reference types="vite/client" />
import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import { toast } from 'sonner';

const TOKEN_KEY = 'samhance_access_token';
let lastLoginTimestamp = 0;

/**
 * Call immediately when a fresh login token is stored so no stale/race-condition 401
 * can falsely trigger the "Sesi Berakhir" popup right after login.
 */
export function markFreshLoginSession() {
  lastLoginTimestamp = Date.now();
}

export function isJwtExpired(token: string | null | undefined, skewSeconds: number = 10): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return false;
  }
}

function extractRequestBearerToken(config: any): string | null {
  if (!config?.headers) return null;
  const raw =
    (typeof config.headers.get === 'function' ? config.headers.get('Authorization') : null) ||
    config.headers.Authorization ||
    config.headers.authorization;
  if (typeof raw !== 'string') return null;
  return raw.replace(/^Bearer\s+/i, '').trim() || null;
}

/**
 * Axios API Client for SAMHANCE ERP Backend
 * - Auto-injects Bearer token from localStorage
 * - Auto-converts camelCase (React) ↔ snake_case (FastAPI/Python)
 * - Safe 401 session expiry handling (immune to stale-token race conditions on fresh login)
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── Request Interceptor ─────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Convert camelCase (React) → snake_case (FastAPI) automatically
  if (config.headers?.['X-Skip-Snake-Case']) {
    delete config.headers['X-Skip-Snake-Case'];
  } else if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = snakecaseKeys(config.data, { deep: true });
  }

  // Convert query params too
  if (config.params && typeof config.params === 'object') {
    config.params = snakecaseKeys(config.params, { deep: true });
  }

  return config;
});

// ─── Response Interceptor ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');

    if (status === 401) {
      // Never trigger "Sesi Berakhir" popup for auth lifecycle endpoints
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/me') ||
        url.includes('/auth/activate') ||
        url.includes('/auth/forgot-password') ||
        url.includes('/auth/reset-password') ||
        url.includes('/auth/complete-profile');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      const currentToken = localStorage.getItem(TOKEN_KEY);
      const requestToken = extractRequestBearerToken(error.config);

      // Ignore stale requests (no token sent, or sent with an old token different from currentToken)
      if (!currentToken || !requestToken || requestToken !== currentToken) {
        return Promise.reject(error);
      }

      // Grace window: if the user JUST logged in (< 10s ago) and the JWT is not expired,
      // do not kick them out due to a race-condition or transient 401.
      const withinFreshLoginGrace = Date.now() - lastLoginTimestamp < 10_000;
      if (withinFreshLoginGrace && !isJwtExpired(currentToken, 0)) {
        return Promise.reject(error);
      }

      localStorage.removeItem(TOKEN_KEY);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    } else if (error.response && status >= 400) {
      let msg = error.message || 'Terjadi kesalahan sistem';
      if (error.response.data) {
        if (typeof error.response.data.message === 'string') {
          msg = error.response.data.message;
        } else if (typeof error.response.data.detail === 'string') {
          msg = error.response.data.detail;
        } else if (error.response.data.detail && typeof error.response.data.detail.message === 'string') {
          msg = error.response.data.detail.message;
        }
      }
      if (typeof window !== 'undefined' && status !== 403) {
        toast.error(msg, { id: String(msg) });
      }
    }
    return Promise.reject(error);
  }
);
