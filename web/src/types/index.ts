export interface Item {
  id: string;
  name: string;
  category: string;
  brand?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  locationId?: string;
  warrantyEndDate?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  consumptionType: 'durable' | 'consumable';
  imageUrl?: string;
  quantity: number;
  purchaseStore?: string;
  serialNumber?: string;
  status: 'inUse' | 'idle' | 'sold' | 'lost';
  movedAt?: string;
  customDepreciationRate?: number;
}

export interface Location {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  createdAt: string;
}

export interface LocationHistory {
  id: string;
  itemId: string;
  fromLocationId?: string;
  toLocationId?: string;
  movedAt: string;
  notes?: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  depreciationRate: number;
  createdAt: string;
}

export interface Settings {
  language: 'zh' | 'en';
  themeMode: 'light' | 'dark' | 'system';
  colorScheme: 'warm' | 'ocean' | 'forest' | 'rose' | 'twilight';
}

export type CategoryType = 'electronics' | 'furniture' | 'kitchen' | 'stationery' | 'cosmetics' | 'homeAppliances' | 'tools' | 'shoes';

export const DEFAULT_CATEGORIES: Record<CategoryType, { name: string; nameEn: string; icon: string; color: string; depreciationRate: number }> = {
  electronics: { name: '电子产品', nameEn: 'Electronics', icon: 'Smartphone', color: '#3B82F6', depreciationRate: 0.15 },
  furniture: { name: '家具', nameEn: 'Furniture', icon: 'Armchair', color: '#8B5CF6', depreciationRate: 0.05 },
  kitchen: { name: '厨房用品', nameEn: 'Kitchen', icon: 'ChefHat', color: '#F59E0B', depreciationRate: 0.10 },
  stationery: { name: '文具', nameEn: 'Stationery', icon: 'PenTool', color: '#EC4899', depreciationRate: 0.20 },
  cosmetics: { name: '美妆护肤', nameEn: 'Cosmetics', icon: 'Sparkles', color: '#D946EF', depreciationRate: 0.30 },
  homeAppliances: { name: '家用电器', nameEn: 'Home Appliances', icon: 'WashingMachine', color: '#10B981', depreciationRate: 0.12 },
  tools: { name: '工具', nameEn: 'Tools', icon: 'Wrench', color: '#6B7280', depreciationRate: 0.08 },
  shoes: { name: '鞋靴', nameEn: 'Shoes', icon: 'Footprints', color: '#F97316', depreciationRate: 0.18 },
};
