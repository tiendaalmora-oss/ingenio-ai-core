import axios from 'axios';

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NEXT_PUBLIC_CORE_URL && !process.env.NEXT_PUBLIC_CORE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_CORE_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('ingeniodigital.shop') || (!host.includes('localhost') && host !== '127.0.0.1')) {
      return 'https://core.ai.ingeniodigital.shop';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

const rawUrl = getBaseUrl();
const baseURL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Ensure baseURL is updated dynamically in browser runtime
  if (typeof window !== 'undefined') {
    config.baseURL = getBaseUrl();
  }

  const isBrowser = typeof window !== 'undefined';
  const token = (isBrowser ? localStorage.getItem('admin_api_key') : null) || process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'admin-dev-secret';
  const tenantId = isBrowser ? localStorage.getItem('tenant_id') : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  
  return config;
});

export default api;
