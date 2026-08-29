import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (isOpen) => set({ mobileMenuOpen: isOpen }),
}));
