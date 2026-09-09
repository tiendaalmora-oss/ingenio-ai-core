import { create } from 'zustand';

const DEFAULT_TENANT = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
const DEFAULT_API_KEY = 'admin-dev-secret';

interface AuthState {
  tenantId: string | null;
  adminApiKey: string | null;
  role: 'agency_admin' | 'client' | null;
  tenantName: string | null;
  name: string | null;
  setCredentials: (
    tenantId: string,
    adminApiKey: string,
    role?: 'agency_admin' | 'client',
    tenantName?: string,
    name?: string,
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const isBrowser = typeof window !== 'undefined';
  const storedTenant = isBrowser ? localStorage.getItem('tenant_id') || DEFAULT_TENANT : DEFAULT_TENANT;
  const storedKey = isBrowser ? localStorage.getItem('admin_api_key') || DEFAULT_API_KEY : DEFAULT_API_KEY;
  const storedRole = isBrowser ? (localStorage.getItem('user_role') as any) || 'agency_admin' : 'agency_admin';
  const storedTenantName = isBrowser ? localStorage.getItem('tenant_name') : null;
  const storedName = isBrowser ? localStorage.getItem('user_name') : null;

  return {
    tenantId: storedTenant,
    adminApiKey: storedKey,
    role: storedRole,
    tenantName: storedTenantName,
    name: storedName,
    setCredentials: (tenantId, adminApiKey, role = 'client', tenantName, name) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant_id', tenantId);
        localStorage.setItem('admin_api_key', adminApiKey);
        localStorage.setItem('user_role', role);
        if (tenantName) localStorage.setItem('tenant_name', tenantName);
        if (name) localStorage.setItem('user_name', name);
        localStorage.setItem('crm_authenticated', 'true');
      }
      set({ tenantId, adminApiKey, role, tenantName, name });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('admin_api_key');
        localStorage.removeItem('user_role');
        localStorage.removeItem('tenant_name');
        localStorage.removeItem('user_name');
        localStorage.removeItem('crm_authenticated');
      }
      set({ tenantId: null, adminApiKey: null, role: null, tenantName: null, name: null });
    },
  };
});

