import { create } from 'zustand';

const DEFAULT_TENANT = 'default';
const DEFAULT_API_KEY = 'admin-dev-secret';

// Pre-populate localStorage so the api interceptor always has values on first load
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('tenant_id'))   localStorage.setItem('tenant_id',   DEFAULT_TENANT);
  if (!localStorage.getItem('admin_api_key')) localStorage.setItem('admin_api_key', DEFAULT_API_KEY);
}

interface AuthState {
  tenantId: string | null;
  adminApiKey: string | null;
  setCredentials: (tenantId: string, adminApiKey: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Defaults for dev env — must match backend tenant and AdminApiKeyGuard
  tenantId: DEFAULT_TENANT,
  adminApiKey: DEFAULT_API_KEY,
  setCredentials: (tenantId, adminApiKey) => {
    localStorage.setItem('tenant_id', tenantId);
    localStorage.setItem('admin_api_key', adminApiKey);
    set({ tenantId, adminApiKey });
  },
  logout: () => {
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('admin_api_key');
    set({ tenantId: null, adminApiKey: null });
  },
}));

