import { apiClient } from '../lib/apiClient';
import type { LoginResponse, ActivateResponse, UserMe, GenericResponse } from '../lib/schemas';

// ─── Auth Service Functions ──────────────────────────────────
// All auth endpoints communicate with the headless Keycloak backend.
// Frontend NEVER redirects to or interacts with the Keycloak UI directly.

/**
 * Login with username & password.
 * If the backend returns KEYCLOAK_AUTH_ERROR, the password is temporary
 * and the user must be redirected to the activation/first-login page.
 */
export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post('/auth/login', { username, password });
  return (response.data?.data || response.data) as LoginResponse;
}

/**
 * Activate account (first-time password change for new employees).
 * Backend validates temp password, forces Keycloak admin reset,
 * and returns a Bearer token (auto-login).
 */
export async function activateApi(
  username: string,
  tempPassword: string,
  newPassword: string
): Promise<ActivateResponse> {
  const response = await apiClient.post('/auth/activate', {
    username,
    tempPassword,
    newPassword,
  });
  return (response.data?.data || response.data) as ActivateResponse;
}

/**
 * Get current user profile + permissions.
 * Called after login to hydrate the auth store with role, department, permissions.
 */
export async function getMeApi(): Promise<UserMe> {
  const response = await apiClient.get('/auth/me');
  return (response.data?.data || response.data) as UserMe;
}

/**
 * Complete profile for accounts that lack mandatory fields (email, firstName, lastName).
 * The backend will use these to update the profile and then login the user.
 */
export async function completeProfileApi(
  payload: { username: string; password?: string; email: string; firstName: string; lastName: string }
): Promise<LoginResponse> {
  const response = await apiClient.post('/auth/complete-profile', payload, {
    headers: {
      'X-Skip-Snake-Case': 'true'
    }
  });
  return (response.data?.data || response.data) as LoginResponse;
}

/**
 * Change password from the profile page (authenticated user).
 */
export async function changePasswordApi(
  oldPassword: string,
  newPassword: string
): Promise<GenericResponse> {
  const response = await apiClient.post('/auth/change-password', {
    oldPassword,
    newPassword,
  });
  return response.data as GenericResponse;
}

/**
 * Request password reset via email (unauthenticated).
 */
export async function forgotPasswordApi(email: string): Promise<GenericResponse> {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data as GenericResponse;
}

/**
 * Reset password using a reset token (from email link).
 */
export async function resetPasswordApi(
  resetToken: string,
  newPassword: string
): Promise<GenericResponse> {
  const response = await apiClient.post('/auth/reset-password', {
    resetToken,
    newPassword,
  });
  return response.data as GenericResponse;
}
