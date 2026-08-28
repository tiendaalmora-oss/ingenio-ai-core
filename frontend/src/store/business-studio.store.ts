import { create } from 'zustand';

interface BusinessStudioState {
  selectedSection: string | null;
  setSelectedSection: (section: string) => void;
  currentVersion: number | null;
  setCurrentVersion: (v: number) => void;
}

export const useBusinessStudioStore = create<BusinessStudioState>((set) => ({
  selectedSection: null,
  setSelectedSection: (section) => set({ selectedSection: section }),
  currentVersion: null,
  setCurrentVersion: (v) => set({ currentVersion: v }),
}));
