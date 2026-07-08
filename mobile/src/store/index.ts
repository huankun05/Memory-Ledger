import { create } from 'zustand';
import { Item, Location, CustomCategory } from '../types';
import {
  createItem as dbCreateItem,
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
  createLocation as dbCreateLocation,
  updateLocation as dbUpdateLocation,
  deleteLocation as dbDeleteLocation,
  addFavorite as dbAddFavorite,
  removeFavorite as dbRemoveFavorite,
  createLocationHistory as dbCreateLocationHistory,
  createCustomCategory as dbCreateCustomCategory,
  updateCustomCategory as dbUpdateCustomCategory,
  deleteCustomCategory as dbDeleteCustomCategory,
  getAllCustomCategories as dbGetAllCustomCategories,
} from '../database/db';

interface AppState {
  items: Item[];
  isLoadingItems: boolean;
  itemsError: string | null;
  
  locations: Location[];
  isLoadingLocations: boolean;
  locationsError: string | null;
  
  favorites: string[];
  
  searchQuery: string;
  searchResults: Item[];
  isSearching: boolean;
  
  selectedCategory: string | null;
  selectedLocationId: string | null;
  
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  moveItem: (id: string, newLocationId: string, notes?: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  setLoadingItems: (loading: boolean) => void;
  setItemsError: (error: string | null) => void;
  
  setLocations: (locations: Location[]) => void;
  addLocation: (location: Omit<Location, 'id' | 'level' | 'createdAt'>) => Promise<void>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  setLoadingLocations: (loading: boolean) => void;
  setLocationsError: (error: string | null) => void;
  
  toggleFavorite: (itemId: string) => Promise<void>;
  setFavorites: (favorites: string[]) => void;
  
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Item[]) => void;
  setIsSearching: (searching: boolean) => void;
  
  setSelectedCategory: (category: string | null) => void;
  setSelectedLocationId: (locationId: string | null) => void;
  
  customCategories: CustomCategory[];
  isLoadingCustomCategories: boolean;
  setCustomCategories: (categories: CustomCategory[]) => void;
  addCustomCategory: (category: Omit<CustomCategory, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomCategory: (id: string, updates: Partial<Omit<CustomCategory, 'id' | 'createdAt'>>) => Promise<void>;
  removeCustomCategory: (id: string) => Promise<void>;
  loadCustomCategories: () => Promise<void>;
  
  reset: () => void;
}

const initialState = {
  items: [],
  isLoadingItems: false,
  itemsError: null,
  locations: [],
  isLoadingLocations: false,
  locationsError: null,
  favorites: [],
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  selectedCategory: null,
  selectedLocationId: null,
  customCategories: [],
  isLoadingCustomCategories: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  
  setItems: (items) => set({ items }),
  
  addItem: async (item) => {
    try {
      await dbCreateItem(item);
      set((state) => ({
        items: [item, ...state.items],
      }));
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  },
  
  updateItem: async (id, updates) => {
    try {
      const updated = await dbUpdateItem(id, updates);
      if (updated) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? updated : item
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  },
  
  moveItem: async (id, newLocationId, notes) => {
    try {
      const existingItem = get().items.find((item) => item.id === id);
      if (!existingItem) return;
      
      const fromLocationId = existingItem.locationId;
      
      if (fromLocationId === newLocationId) return;
      
      const now = new Date().toISOString();
      const updated = await dbUpdateItem(id, { locationId: newLocationId, movedAt: now });
      if (updated) {
        await dbCreateLocationHistory({
          itemId: id,
          fromLocationId,
          toLocationId: newLocationId,
          movedAt: now,
          notes,
        });
        
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? updated : item
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to move item:', error);
      throw error;
    }
  },
  
  removeItem: async (id) => {
    try {
      await dbDeleteItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        favorites: state.favorites.filter((favId) => favId !== id),
      }));
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  },
  
  setLoadingItems: (isLoadingItems) => set({ isLoadingItems }),
  
  setItemsError: (itemsError) => set({ itemsError }),
  
  setLocations: (locations) => set({ locations }),
  
  addLocation: async (location) => {
    try {
      const newLocation = await dbCreateLocation(location);
      set((state) => ({
        locations: [...state.locations, newLocation].sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } catch (error) {
      console.error('Failed to add location:', error);
      throw error;
    }
  },
  
  updateLocation: async (id, updates) => {
    try {
      const updated = await dbUpdateLocation(id, updates);
      if (updated) {
        set((state) => ({
          locations: state.locations
            .map((location) =>
              location.id === id ? updated : location
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        }));
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  },
  
  removeLocation: async (id) => {
    try {
      await dbDeleteLocation(id);
      set((state) => ({
        locations: state.locations.filter((location) => location.id !== id),
        items: state.items.map((item) =>
          item.locationId === id ? { ...item, locationId: undefined } : item
        ),
      }));
    } catch (error) {
      console.error('Failed to remove location:', error);
      throw error;
    }
  },
  
  setLoadingLocations: (isLoadingLocations) => set({ isLoadingLocations }),
  
  setLocationsError: (locationsError) => set({ locationsError }),
  
  toggleFavorite: async (itemId) => {
    const isFav = get().favorites.includes(itemId);
    try {
      if (isFav) {
        await dbRemoveFavorite(itemId);
      } else {
        await dbAddFavorite(itemId);
      }
      set((state) => ({
        favorites: isFav
          ? state.favorites.filter((id) => id !== itemId)
          : [...state.favorites, itemId],
      }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  },
  
  setFavorites: (favorites) => set({ favorites }),
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  setSearchResults: (searchResults) => set({ searchResults }),
  
  setIsSearching: (isSearching) => set({ isSearching }),
  
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  
  setSelectedLocationId: (selectedLocationId) => set({ selectedLocationId }),
  
  setCustomCategories: (customCategories) => set({ customCategories }),
  
  loadCustomCategories: async () => {
    try {
      set({ isLoadingCustomCategories: true });
      const categories = await dbGetAllCustomCategories();
      set({ customCategories: categories });
    } catch (error) {
      console.error('Failed to load custom categories:', error);
    } finally {
      set({ isLoadingCustomCategories: false });
    }
  },
  
  addCustomCategory: async (category) => {
    try {
      const newCategory = await dbCreateCustomCategory(category);
      set((state) => ({
        customCategories: [newCategory, ...state.customCategories],
      }));
    } catch (error) {
      console.error('Failed to add custom category:', error);
      throw error;
    }
  },
  
  updateCustomCategory: async (id, updates) => {
    try {
      const updated = await dbUpdateCustomCategory(id, updates);
      if (updated) {
        set((state) => ({
          customCategories: state.customCategories.map((cat) =>
            cat.id === id ? updated : cat
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update custom category:', error);
      throw error;
    }
  },
  
  removeCustomCategory: async (id) => {
    try {
      await dbDeleteCustomCategory(id);
      set((state) => ({
        customCategories: state.customCategories.filter((cat) => cat.id !== id),
      }));
    } catch (error) {
      console.error('Failed to remove custom category:', error);
      throw error;
    }
  },
  
  reset: () => set(initialState),
}));

export const useItems = () => useAppStore((state) => state.items);
export const useIsLoadingItems = () => useAppStore((state) => state.isLoadingItems);
export const useItemsError = () => useAppStore((state) => state.itemsError);

export const useLocations = () => useAppStore((state) => state.locations);
export const useIsLoadingLocations = () => useAppStore((state) => state.isLoadingLocations);
export const useLocationsError = () => useAppStore((state) => state.locationsError);

export const useFavorites = () => useAppStore((state) => state.favorites);
export const useIsFavorite = (itemId: string) =>
  useAppStore((state) => state.favorites.includes(itemId));

export const useSearchQuery = () => useAppStore((state) => state.searchQuery);
export const useSearchResults = () => useAppStore((state) => state.searchResults);
export const useIsSearching = () => useAppStore((state) => state.isSearching);

export const useSelectedCategory = () => useAppStore((state) => state.selectedCategory);
export const useSelectedLocationId = () => useAppStore((state) => state.selectedLocationId);

export const useFavoriteItems = () => {
  const items = useAppStore((state) => state.items);
  const favorites = useAppStore((state) => state.favorites);
  return items.filter((item) => favorites.includes(item.id));
};

export const useFilteredItems = () => {
  const items = useAppStore((state) => state.items);
  const selectedCategory = useAppStore((state) => state.selectedCategory);
  const selectedLocationId = useAppStore((state) => state.selectedLocationId);
  
  return items.filter((item) => {
    if (selectedCategory && item.category !== selectedCategory) {
      return false;
    }
    if (selectedLocationId && item.locationId !== selectedLocationId) {
      return false;
    }
    return true;
  });
};

export const useLocationPath = (locationId: string | undefined) => {
  const locations = useAppStore((state) => state.locations);
  
  if (!locationId) return '';
  
  const path: string[] = [];
  let currentLocation = locations.find((loc) => loc.id === locationId);
  
  while (currentLocation) {
    path.unshift(currentLocation.name);
    currentLocation = currentLocation.parentId
      ? locations.find((loc) => loc.id === currentLocation?.parentId)
      : undefined;
  }
  
  return path.join(' > ');
};

export const useCustomCategories = () => useAppStore((state) => state.customCategories);
export const useIsLoadingCustomCategories = () => useAppStore((state) => state.isLoadingCustomCategories);

export type { AppState };
