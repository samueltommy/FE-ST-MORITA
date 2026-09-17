/// <reference types="vite/client" />
import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';

/**
 * Axios API Client for SAMHANCE ERP Backend
 * - Auto-injects Bearer token from localStorage
 * - Auto-converts camelCase (React) ↔ snake_case (FastAPI/Python)
 * - Auto-logout on 401 Unauthorized
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
  // Inject Bearer token
  const token = localStorage.getItem('samhance_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Convert camelCase (React) → snake_case (FastAPI) automatically
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
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
    // Convert snake_case (FastAPI) → camelCase (React) automatically
    if (response.data && typeof response.data === 'object') {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid → clear and redirect to login
      localStorage.removeItem('samhance_access_token');
      // We don't import the store here to avoid circular deps.
      // The auth store will detect the missing token on next check.
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
