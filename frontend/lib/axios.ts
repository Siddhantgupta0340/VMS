/**
 * Axios API Client
 *
 * Centralizes all HTTP communication with the VMS backend.
 * - Sets the base URL from the environment variable.
 * - Automatically attaches `Content-Type: application/json`.
 * - Request interceptor: reads the JWT from localStorage and attaches it as `Authorization: Bearer <token>`.
 * - Response interceptor: handles 401 Unauthorized by redirecting to login.
 */
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
  withCredentials: true, // send cookies if needed
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Read token from localStorage on every request (supports token refresh)
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('vms_access_token') : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Token expired or unauthorized — clear storage and redirect to login
    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('vms_access_token');
      localStorage.removeItem('vms_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
