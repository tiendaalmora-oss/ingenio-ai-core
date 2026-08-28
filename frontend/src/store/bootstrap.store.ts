import { create } from 'zustand';

interface BootstrapState {
  isLoaded: boolean;
  data: any | null;
  error: Error | null;
  setBootstrapData: (data: any) => void;
  setError: (error: Error) => void;
}

export const useBootstrapStore = create<BootstrapState>((set) => ({
  isLoaded: false,
  data: null,
  error: null,
  setBootstrapData: (data) => set({ data, isLoaded: true, error: null }),
  setError: (error) => set({ error, isLoaded: true }),
}));
