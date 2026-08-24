import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
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
