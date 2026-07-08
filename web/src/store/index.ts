import { create } from 'zustand';
import type { Item, Location, Settings } from '../types';
import { getAllItems, getAllLocations, getAllSettings, setSetting, getAllFavorites } from '../database/db';

interface AppState {
  items: Item[];
  locations: Location[];
  settings: Settings;
  favorites: string[];
  isLoading: boolean;
  currentPage: 'home' | 'items' | 'location' | 'profile';
  
  loadItems: () => Promise<void>;
  loadLocations: () => Promise<void>;
  loadSettings: () => Promise<void>;
  loadFavorites: () => Promise<void>;
  
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  setCurrentPage: (page: 'home' | 'items' | 'location' | 'profile') => void;
  refreshData: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  items: [],
  locations: [],
  settings: { language: 'zh', themeMode: 'light', colorScheme: 'ocean' },
  favorites: [],
  isLoading: true,
  currentPage: 'home',

  loadItems: async () => {
    const items = await getAllItems();
    set({ items });
  },

  loadLocations: async () => {
    const locations = await getAllLocations();
    set({ locations });
  },

  loadSettings: async () => {
    const settings = await getAllSettings();
    set({ settings });
  },

  loadFavorites: async () => {
    const favorites = await getAllFavorites();
    set({ favorites });
  },

  updateSettings: async (updates) => {
    set((state) => ({ settings: { ...state.settings, ...updates } }));
    if (updates.language) await setSetting('language', updates.language);
    if (updates.themeMode) await setSetting('themeMode', updates.themeMode);
    if (updates.colorScheme) await setSetting('colorScheme', updates.colorScheme);
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  refreshData: async () => {
    set({ isLoading: true });
    await Promise.all([
      getAllItems().then(items => set({ items })),
      getAllLocations().then(locations => set({ locations })),
      getAllFavorites().then(favorites => set({ favorites })),
    ]);
    set({ isLoading: false });
  },
}));
