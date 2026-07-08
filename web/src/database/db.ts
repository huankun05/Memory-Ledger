import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Item, Location, LocationHistory, CustomCategory, Settings } from '../types';

interface AppDB extends DBSchema {
  items: {
    key: string;
    value: Item;
    indexes: {
      'by-location': string;
      'by-category': string;
      'by-updated': string;
    };
  };
  locations: {
    key: string;
    value: Location;
    indexes: {
      'by-parent': string;
      'by-name': string;
    };
  };
  location_history: {
    key: string;
    value: LocationHistory;
    indexes: {
      'by-item': string;
    };
  };
  favorites: {
    key: string;
    value: { itemId: string; createdAt: string };
  };
  settings: {
    key: string;
    value: { key: string; value: string; updatedAt: string };
  };
  custom_categories: {
    key: string;
    value: CustomCategory;
  };
}

let db: IDBPDatabase<AppDB> | null = null;

export async function initDatabase(): Promise<IDBPDatabase<AppDB>> {
  if (db) return db;

  db = await openDB<AppDB>('memory_ledger_db', 1, {
    upgrade(database) {
      const itemsStore = database.createObjectStore('items', { keyPath: 'id' });
      itemsStore.createIndex('by-location', 'locationId');
      itemsStore.createIndex('by-category', 'category');
      itemsStore.createIndex('by-updated', 'updatedAt');

      const locationsStore = database.createObjectStore('locations', { keyPath: 'id' });
      locationsStore.createIndex('by-parent', 'parentId');
      locationsStore.createIndex('by-name', 'name');

      const historyStore = database.createObjectStore('location_history', { keyPath: 'id' });
      historyStore.createIndex('by-item', 'itemId');

      database.createObjectStore('favorites', { keyPath: 'itemId' });
      database.createObjectStore('settings', { keyPath: 'key' });
      database.createObjectStore('custom_categories', { keyPath: 'id' });
    },
  });

  await seedDemoData();
  return db;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export async function createItem(item: Omit<Item, 'createdAt' | 'updatedAt'>): Promise<Item> {
  const database = await initDatabase();
  const now = new Date().toISOString();
  const newItem: Item = {
    ...item,
    createdAt: now,
    updatedAt: now,
    movedAt: '',
  };
  await database.add('items', newItem);
  return newItem;
}

export async function getAllItems(): Promise<Item[]> {
  const database = await initDatabase();
  return database.getAllFromIndex('items', 'by-updated');
}

export async function getItemById(id: string): Promise<Item | undefined> {
  const database = await initDatabase();
  return database.get('items', id);
}

export async function updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>): Promise<Item | undefined> {
  const database = await initDatabase();
  const existing = await database.get('items', id);
  if (!existing) return undefined;

  const updated: Item = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await database.put('items', updated);
  return updated;
}

export async function deleteItem(id: string): Promise<boolean> {
  const database = await initDatabase();
  await database.delete('items', id);
  return true;
}

export async function getItemsByLocationId(locationId: string): Promise<Item[]> {
  const database = await initDatabase();
  return database.getAllFromIndex('items', 'by-location', locationId);
}

export async function searchItems(query: string): Promise<Item[]> {
  const database = await initDatabase();
  const items = await database.getAll('items');
  const searchTerm = query.toLowerCase();
  return items.filter(item =>
    item.name.toLowerCase().includes(searchTerm) ||
    item.brand?.toLowerCase().includes(searchTerm) ||
    item.notes?.toLowerCase().includes(searchTerm)
  );
}

export async function createLocation(location: Omit<Location, 'createdAt' | 'id' | 'level'>): Promise<Location> {
  const database = await initDatabase();
  const now = new Date().toISOString();
  const id = generateId();

  let level = 0;
  if (location.parentId) {
    const parent = await database.get('locations', location.parentId);
    if (parent) level = parent.level + 1;
  }

  const newLocation: Location = { ...location, id, level, createdAt: now };
  await database.add('locations', newLocation);
  return newLocation;
}

export async function getAllLocations(): Promise<Location[]> {
  const database = await initDatabase();
  return database.getAllFromIndex('locations', 'by-name');
}

export async function getLocationById(id: string): Promise<Location | undefined> {
  const database = await initDatabase();
  return database.get('locations', id);
}

export async function updateLocation(id: string, updates: Partial<Omit<Location, 'id' | 'createdAt'>>): Promise<Location | undefined> {
  const database = await initDatabase();
  const existing = await database.get('locations', id);
  if (!existing) return undefined;

  const updated: Location = { ...existing, ...updates };
  await database.put('locations', updated);
  return updated;
}

export async function deleteLocation(id: string): Promise<boolean> {
  const database = await initDatabase();
  await database.delete('locations', id);
  return true;
}

export async function getRootLocations(): Promise<Location[]> {
  const database = await initDatabase();
  const locations = await database.getAll('locations');
  return locations.filter(l => !l.parentId);
}

export async function getChildLocations(parentId: string): Promise<Location[]> {
  const database = await initDatabase();
  return database.getAllFromIndex('locations', 'by-parent', parentId);
}

export async function createLocationHistory(history: Omit<LocationHistory, 'id'>): Promise<LocationHistory> {
  const database = await initDatabase();
  const id = generateId();
  const newHistory: LocationHistory = { ...history, id };
  await database.add('location_history', newHistory);
  return newHistory;
}

export async function getLocationHistoryByItemId(itemId: string): Promise<LocationHistory[]> {
  const database = await initDatabase();
  return database.getAllFromIndex('location_history', 'by-item', itemId);
}

export async function addFavorite(itemId: string): Promise<void> {
  const database = await initDatabase();
  await database.put('favorites', { itemId, createdAt: new Date().toISOString() });
}

export async function removeFavorite(itemId: string): Promise<void> {
  const database = await initDatabase();
  await database.delete('favorites', itemId);
}

export async function getAllFavorites(): Promise<string[]> {
  const database = await initDatabase();
  const favorites = await database.getAll('favorites');
  return favorites.map(f => f.itemId);
}

export async function isFavorite(itemId: string): Promise<boolean> {
  const database = await initDatabase();
  const result = await database.get('favorites', itemId);
  return !!result;
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await initDatabase();
  const result = await database.get('settings', key);
  return result?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await initDatabase();
  await database.put('settings', { key, value, updatedAt: new Date().toISOString() });
}

export async function getAllSettings(): Promise<Settings> {
  const database = await initDatabase();
  const settings = await database.getAll('settings');
  const result: Record<string, string> = {};
  settings.forEach(s => { result[s.key] = s.value; });

  return {
    language: (result.language as Settings['language']) || 'zh',
    themeMode: (result.themeMode as Settings['themeMode']) || 'light',
    colorScheme: (result.colorScheme as Settings['colorScheme']) || 'ocean',
  };
}

export async function clearAllData(): Promise<void> {
  const database = await initDatabase();
  await database.clear('items');
  await database.clear('locations');
  await database.clear('location_history');
  await database.clear('favorites');
  await database.clear('custom_categories');
  await seedDemoData();
}

export async function seedDemoData(): Promise<void> {
  const database = await initDatabase();
  const itemsCount = await database.count('items');
  if (itemsCount > 0) return;

  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const locHome = id('loc');
  const locOffice = id('loc');
  const locBedroom = id('loc');
  const locKitchen = id('loc');
  const locStudy = id('loc');
  const locMeeting = id('loc');

  const locations: Location[] = [
    { id: locHome, name: '家', parentId: undefined, level: 0, createdAt: new Date(now.getTime() - 86400000 * 30).toISOString() },
    { id: locOffice, name: '公司', parentId: undefined, level: 0, createdAt: new Date(now.getTime() - 86400000 * 30).toISOString() },
    { id: locBedroom, name: '卧室', parentId: locHome, level: 1, createdAt: new Date(now.getTime() - 86400000 * 28).toISOString() },
    { id: locKitchen, name: '厨房', parentId: locHome, level: 1, createdAt: new Date(now.getTime() - 86400000 * 28).toISOString() },
    { id: locStudy, name: '书房', parentId: locHome, level: 1, createdAt: new Date(now.getTime() - 86400000 * 27).toISOString() },
    { id: locMeeting, name: '会议室', parentId: locOffice, level: 1, createdAt: new Date(now.getTime() - 86400000 * 25).toISOString() },
  ];

  for (const loc of locations) {
    await database.add('locations', loc);
  }

  const itemsData = [
    { id: id('it'), name: 'MacBook Pro 14"', category: 'electronics', brand: 'Apple', purchasePrice: 1499900, purchaseDate: fmt(new Date(now.getFullYear()-1, 5, 15)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 5, 15)), tags: ['电脑', '工作', '笔记本'], notes: 'M3 Pro 芯片，18GB 内存，深空灰', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 2).toISOString(), quantity: 1, purchaseStore: 'Apple官网', serialNumber: 'FVLK3CH8X9', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 2).toISOString() },
    { id: id('it'), name: 'iPhone 16 Pro', category: 'electronics', brand: 'Apple', purchasePrice: 899900, purchaseDate: fmt(new Date(now.getFullYear(), 8, 20)), locationId: locBedroom, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 8, 20)), tags: ['手机', 'Apple', '旗舰'], notes: '256GB 沙漠钛金', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 5).toISOString(), quantity: 1, purchaseStore: '京东', serialNumber: 'GD3X4Y7K2M', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 5).toISOString() },
    { id: id('it'), name: 'AirPods Pro 2', category: 'electronics', brand: 'Apple', purchasePrice: 189900, purchaseDate: fmt(new Date(now.getFullYear(), 2, 10)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 2, 10)), tags: ['耳机', '无线', '降噪'], notes: 'USB-C 版本', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 8).toISOString(), quantity: 1, purchaseStore: 'Apple Store 直营店', serialNumber: 'L2NR7P9Q5T', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 8).toISOString() },
    { id: id('it'), name: '戴尔 U2723QE 显示器', category: 'electronics', brand: 'Dell', purchasePrice: 459900, purchaseDate: fmt(new Date(now.getFullYear()-1, 3, 1)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+2, 2, 28)), tags: ['显示器', '4K', '办公'], notes: '27寸 4K IPS Black Type-C 90W供电', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 15).toISOString(), quantity: 1, purchaseStore: '戴尔官网', serialNumber: 'CN-0V7NG3-T3K1', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 15).toISOString() },
    { id: id('it'), name: '索尼 WH-1000XM5', category: 'electronics', brand: 'Sony', purchasePrice: 299900, purchaseDate: fmt(new Date(now.getFullYear()-1, 10, 5)), locationId: locOffice, warrantyEndDate: fmt(new Date(now.getFullYear(), 10, 5)), tags: ['耳机', '降噪', '通勤'], notes: '黑色，续航30小时', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 3).toISOString(), quantity: 1, purchaseStore: '天猫Sony旗舰店', serialNumber: '1-084-921-12', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 3).toISOString() },
    { id: id('it'), name: 'Herman Miller Aeron', category: 'furniture', brand: 'Herman Miller', purchasePrice: 1289900, purchaseDate: fmt(new Date(now.getFullYear()-2, 1, 20)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+10, 1, 20)), tags: ['椅子', '人体工学', '办公'], notes: '经典款 尺寸B 石墨色', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 30).toISOString(), quantity: 1, purchaseStore: '线下授权经销商', serialNumber: 'HM-AE-B-2203', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 30).toISOString() },
    { id: id('it'), name: '北欧风书桌', category: 'furniture', brand: '宜家', purchasePrice: 249900, purchaseDate: fmt(new Date(now.getFullYear()-2, 6, 10)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear(), 6, 10)), tags: ['书桌', '橡木', '家居'], notes: '140x70cm 白色桌面+白色桌腿', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 40).toISOString(), quantity: 1, purchaseStore: '宜家商场', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 40).toISOString() },
    { id: id('it'), name: 'Ninja 破壁机', category: 'kitchen', brand: 'Ninja', purchasePrice: 129900, purchaseDate: fmt(new Date(now.getFullYear(), 5, 1)), locationId: locKitchen, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 5, 1)), tags: ['厨房', '搅拌', '料理'], notes: 'BN801 1500W 大功率', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 14).toISOString(), quantity: 1, purchaseStore: '天猫', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 14).toISOString() },
    { id: id('it'), name: '戴森 V15 Detect', category: 'homeAppliances', brand: 'Dyson', purchasePrice: 499000, purchaseDate: fmt(new Date(now.getFullYear()-1, 1, 5)), locationId: locHome, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 1, 5)), tags: ['吸尘器', '无线', '清洁'], notes: '旗舰款 激光探测 智能灰尘感应', consumptionType: 'durable' as const, updatedAt: new Date(now.getTime() - 86400000 * 25).toISOString(), quantity: 1, purchaseStore: 'Dyson官网', serialNumber: 'DV15-2024-00234', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 25).toISOString() },
    { id: id('it'), name: 'Moleskine 笔记本', category: 'stationery', brand: 'Moleskine', purchasePrice: 12900, purchaseDate: fmt(new Date(now.getFullYear(), 9, 5)), locationId: locStudy, tags: ['笔记本', '经典', '文具'], notes: 'L号 横线 黑色 硬壳', consumptionType: 'consumable' as const, updatedAt: new Date(now.getTime() - 86400000 * 12).toISOString(), quantity: 3, purchaseStore: 'PageOne书店', status: 'inUse' as const, movedAt: new Date(now.getTime() - 86400000 * 12).toISOString() },
  ];

  for (const item of itemsData) {
    await database.add('items', { ...item, createdAt: item.updatedAt });
  }

  const favItems = itemsData.slice(0, 3);
  for (const item of favItems) {
    await database.put('favorites', { itemId: item.id, createdAt: new Date().toISOString() });
  }
}
