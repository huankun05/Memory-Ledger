import * as SQLite from 'expo-sqlite';
import { Item, Location, LocationHistory, CustomCategory } from '../types';

// 数据库名称
const DB_NAME = 'items_manager.db';

// 数据库实例
let db: SQLite.SQLiteDatabase | null = null;

// 初始化数据库
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // 创建物品表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      purchasePrice REAL,
      purchaseDate TEXT,
      locationId TEXT,
      warrantyEndDate TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      consumptionType TEXT NOT NULL DEFAULT 'durable',
      imageUrl TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      purchaseStore TEXT,
      serialNumber TEXT,
      status TEXT NOT NULL DEFAULT 'inUse'
    );
  `);

  // 迁移：添加新列（如果不存在，只针对旧数据库）
  const migrations = ['imageUrl', 'purchaseStore', 'serialNumber'];
  for (const col of migrations) {
    try {
      await db.execAsync(`ALTER TABLE items ADD COLUMN ${col} TEXT`);
    } catch (e) {
      // 列已存在，忽略错误
    }
  }
  // quantity 和 status 类型特殊，单独处理
  try {
    await db.execAsync(`ALTER TABLE items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`);
  } catch (e) {
    // 列已存在，忽略
  }
  try {
    await db.execAsync(`ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'inUse'`);
  } catch (e) {
    // 列已存在，忽略
  }
  try {
    await db.execAsync(`ALTER TABLE items ADD COLUMN movedAt TEXT`);
  } catch (e) {
    // 列已存在，忽略
  }
  try {
    await db.execAsync(`ALTER TABLE items ADD COLUMN customDepreciationRate REAL`);
  } catch (e) {
    // 列已存在，忽略
  }

  // 创建位置表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      parentId TEXT,
      level INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (parentId) REFERENCES locations(id) ON DELETE SET NULL
    );
  `);

  // 创建位置历史记录表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS location_history (
      id TEXT PRIMARY KEY NOT NULL,
      itemId TEXT NOT NULL,
      fromLocationId TEXT,
      toLocationId TEXT,
      movedAt TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (fromLocationId) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY (toLocationId) REFERENCES locations(id) ON DELETE SET NULL
    );
  `);

  // 创建收藏表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS favorites (
      itemId TEXT PRIMARY KEY NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
    );
  `);

  // 创建设置表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // 创建自定义分类表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      nameEn TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Package',
      color TEXT NOT NULL DEFAULT '#7A7A7A',
      depreciationRate REAL NOT NULL DEFAULT 0.10,
      createdAt TEXT NOT NULL
    );
  `);

  // 创建索引
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_items_locationId ON items(locationId);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_locations_parentId ON locations(parentId);
    CREATE INDEX IF NOT EXISTS idx_location_history_itemId ON location_history(itemId);
  `);

  return db;
}

// 获取数据库实例
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// 关闭数据库
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

// ==================== 物品 CRUD 操作 ====================

// 创建物品
export async function createItem(item: Omit<Item, 'createdAt' | 'updatedAt'>): Promise<Item> {
  const database = getDatabase();
  const now = new Date().toISOString();
  const newItem: Item = {
    ...item,
    createdAt: now,
    updatedAt: now,
    // 注意：新建物品不等于"移动"，movedAt 不应默认为创建时间，
    // 否则"最近移动"会把所有新建物品误当成今天移动。
    movedAt: '',
  };

  await database.runAsync(
    `INSERT INTO items (id, name, category, brand, purchasePrice, purchaseDate, locationId, warrantyEndDate, tags, notes, createdAt, updatedAt, consumptionType, imageUrl, quantity, purchaseStore, serialNumber, status, movedAt, customDepreciationRate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newItem.id,
      newItem.name,
      newItem.category,
      newItem.brand ?? null,
      newItem.purchasePrice ?? null,
      newItem.purchaseDate ?? null,
      newItem.locationId ?? null,
      newItem.warrantyEndDate ?? null,
      JSON.stringify(newItem.tags),
      newItem.notes ?? null,
      newItem.createdAt,
      newItem.updatedAt,
      newItem.consumptionType,
      newItem.imageUrl ?? null,
      newItem.quantity,
      newItem.purchaseStore ?? null,
      newItem.serialNumber ?? null,
      newItem.status,
      newItem.movedAt ?? null,
      newItem.customDepreciationRate ?? null,
    ]
  );

  return newItem;
}

// ==================== 行映射辅助函数 ====================

// 将数据库行映射为 Item 对象（统一处理 null/undefined 和 JSON 解析）
function mapItemRow(row: any): Item {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    purchasePrice: row.purchasePrice ?? undefined,
    purchaseDate: row.purchaseDate ?? undefined,
    locationId: row.locationId ?? undefined,
    warrantyEndDate: row.warrantyEndDate ?? undefined,
    brand: row.brand ?? undefined,
    notes: row.notes ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    quantity: row.quantity ?? 1,
    purchaseStore: row.purchaseStore ?? undefined,
    serialNumber: row.serialNumber ?? undefined,
    status: row.status || 'inUse',
    // 未实际移动过的物品 movedAt 为空字符串，不兜底成 createdAt，
    // 这样它们不会出现在"最近移动"列表中。
    movedAt: row.movedAt ?? '',
    customDepreciationRate: row.customDepreciationRate ?? undefined,
  };
}

// 将数据库行映射为 Location 对象
function mapLocationRow(row: any): Location {
  return {
    ...row,
    parentId: row.parentId ?? undefined,
  };
}

// 将数据库行映射为 LocationHistory 对象
function mapHistoryRow(row: any): LocationHistory {
  return {
    ...row,
    fromLocationId: row.fromLocationId ?? undefined,
    toLocationId: row.toLocationId ?? undefined,
    notes: row.notes ?? undefined,
  };
}

// 获取所有物品
export async function getAllItems(): Promise<Item[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<any>('SELECT * FROM items ORDER BY updatedAt DESC');
  return results.map(mapItemRow);
}

// 根据 ID 获取物品
export async function getItemById(id: string): Promise<Item | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<any>('SELECT * FROM items WHERE id = ?', [id]);
  return result ? mapItemRow(result) : null;
}

// 更新物品
export async function updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>): Promise<Item | null> {
  const database = getDatabase();
  const existingItem = await getItemById(id);
  
  if (!existingItem) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedItem: Item = {
    ...existingItem,
    ...updates,
    updatedAt: now,
  };

  await database.runAsync(
    `UPDATE items SET name = ?, category = ?, brand = ?, purchasePrice = ?, purchaseDate = ?, locationId = ?, warrantyEndDate = ?, tags = ?, notes = ?, updatedAt = ?, consumptionType = ?, imageUrl = ?, quantity = ?, purchaseStore = ?, serialNumber = ?, status = ?, movedAt = ?, customDepreciationRate = ? WHERE id = ?`,
    [
      updatedItem.name,
      updatedItem.category,
      updatedItem.brand ?? null,
      updatedItem.purchasePrice ?? null,
      updatedItem.purchaseDate ?? null,
      updatedItem.locationId ?? null,
      updatedItem.warrantyEndDate ?? null,
      JSON.stringify(updatedItem.tags),
      updatedItem.notes ?? null,
      updatedItem.updatedAt,
      updatedItem.consumptionType,
      updatedItem.imageUrl ?? null,
      updatedItem.quantity,
      updatedItem.purchaseStore ?? null,
      updatedItem.serialNumber ?? null,
      updatedItem.status,
      updatedItem.movedAt ?? null,
      updatedItem.customDepreciationRate ?? null,
      id,
    ]
  );

  return updatedItem;
}

// 删除物品
export async function deleteItem(id: string): Promise<boolean> {
  const database = getDatabase();
  const result = await database.runAsync('DELETE FROM items WHERE id = ?', [id]);
  return result.changes > 0;
}

// 根据位置 ID 获取物品
export async function getItemsByLocationId(locationId: string): Promise<Item[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<any>(
    'SELECT * FROM items WHERE locationId = ? ORDER BY updatedAt DESC',
    [locationId]
  );
  return results.map(mapItemRow);
}

// 搜索物品
export async function searchItems(query: string): Promise<Item[]> {
  const database = getDatabase();
  const searchTerm = `%${query}%`;
  const results = await database.getAllAsync<any>(
    `SELECT * FROM items WHERE name LIKE ? OR brand LIKE ? OR notes LIKE ? ORDER BY updatedAt DESC`,
    [searchTerm, searchTerm, searchTerm]
  );
  return results.map(mapItemRow);
}

// 创建位置
export async function createLocation(location: Omit<Location, 'createdAt' | 'id' | 'level'>): Promise<Location> {
  const database = getDatabase();
  const now = new Date().toISOString();

  // 生成唯一 ID
  const id = generateId();

  // 计算层级：如果有父位置，level = 父level + 1
  let level = 0;
  if (location.parentId) {
    const parent = await getLocationById(location.parentId);
    if (parent) {
      level = parent.level + 1;
    }
  }

  const newLocation: Location = {
    ...location,
    id,
    level,
    createdAt: now,
  };

  await database.runAsync(
    `INSERT INTO locations (id, name, parentId, level, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [newLocation.id, newLocation.name, newLocation.parentId ?? null, newLocation.level, newLocation.createdAt]
  );

  return newLocation;
}

// 获取所有位置
export async function getAllLocations(): Promise<Location[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<any>('SELECT * FROM locations ORDER BY name ASC');
  return results.map(mapLocationRow);
}

// 根据 ID 获取位置
export async function getLocationById(id: string): Promise<Location | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<any>('SELECT * FROM locations WHERE id = ?', [id]);
  return result ? mapLocationRow(result) : null;
}

// 更新位置
export async function updateLocation(id: string, updates: Partial<Omit<Location, 'id' | 'createdAt'>>): Promise<Location | null> {
  const database = getDatabase();
  const existingLocation = await getLocationById(id);
  
  if (!existingLocation) {
    return null;
  }

  const updatedLocation: Location = {
    ...existingLocation,
    ...updates,
  };

  await database.runAsync(
    `UPDATE locations SET name = ?, parentId = ?, level = ? WHERE id = ?`,
    [updatedLocation.name, updatedLocation.parentId ?? null, updatedLocation.level, id]
  );

  return updatedLocation;
}

// 删除位置
export async function deleteLocation(id: string): Promise<boolean> {
  const database = getDatabase();
  const result = await database.runAsync('DELETE FROM locations WHERE id = ?', [id]);
  return result.changes > 0;
}

// 获取子位置
export async function getChildLocations(parentId: string): Promise<Location[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<any>(
    'SELECT * FROM locations WHERE parentId = ? ORDER BY name ASC',
    [parentId]
  );
  return results.map(mapLocationRow);
}

// 获取根位置（没有父级的位置）
export async function getRootLocations(): Promise<Location[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<any>(
    'SELECT * FROM locations WHERE parentId IS NULL ORDER BY name ASC'
  );
  return results.map(mapLocationRow);
}

// ==================== 位置历史记录操作 ====================

// 创建位置历史记录
export async function createLocationHistory(history: Omit<LocationHistory, 'id'>): Promise<LocationHistory> {
  const database = getDatabase();
  const id = generateId();
  const newHistory: LocationHistory = {
    ...history,
    id,
  };

  await database.runAsync(
    `INSERT INTO location_history (id, itemId, fromLocationId, toLocationId, movedAt, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [newHistory.id, newHistory.itemId, newHistory.fromLocationId ?? null, newHistory.toLocationId ?? null, newHistory.movedAt, newHistory.notes ?? null]
  );

  return newHistory;
}

// 获取物品的位置历史
export async function getLocationHistoryByItemId(itemId: string): Promise<LocationHistory[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<any>(
    'SELECT * FROM location_history WHERE itemId = ? ORDER BY movedAt DESC',
    [itemId]
  );
  return results.map(mapHistoryRow);
}

// ==================== 辅助函数 ====================

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ==================== 收藏操作 ====================

// 添加收藏
export async function addFavorite(itemId: string): Promise<void> {
  const database = getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT OR IGNORE INTO favorites (itemId, createdAt) VALUES (?, ?)',
    [itemId, now]
  );
}

// 移除收藏
export async function removeFavorite(itemId: string): Promise<boolean> {
  const database = getDatabase();
  const result = await database.runAsync('DELETE FROM favorites WHERE itemId = ?', [itemId]);
  return result.changes > 0;
}

// 获取所有收藏
export async function getAllFavorites(): Promise<string[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<{ itemId: string }>(
    'SELECT itemId FROM favorites ORDER BY createdAt DESC'
  );
  return results.map(row => row.itemId);
}

// 检查是否已收藏
export async function isFavorite(itemId: string): Promise<boolean> {
  const database = getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM favorites WHERE itemId = ?',
    [itemId]
  );
  return result ? result.count > 0 : false;
}

// 导入数据
export async function importData(data: { items?: any[]; locations?: any[] }): Promise<void> {
  const database = getDatabase();
  
  await database.execAsync('BEGIN TRANSACTION');
  
  try {
    if (data.locations && data.locations.length > 0) {
      for (const loc of data.locations) {
        await database.runAsync(
          `INSERT OR REPLACE INTO locations (id, name, parentId, level, createdAt) VALUES (?, ?, ?, ?, ?)`,
          [loc.id, loc.name, loc.parentId ?? null, loc.level || 0, loc.createdAt || new Date().toISOString()]
        );
      }
    }
    
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const movedAt = item.movedAt || item.updatedAt || item.createdAt || new Date().toISOString();
        await database.runAsync(
          `INSERT OR REPLACE INTO items (id, name, category, brand, purchasePrice, purchaseDate, locationId, warrantyEndDate, tags, notes, createdAt, updatedAt, consumptionType, imageUrl, quantity, purchaseStore, serialNumber, status, movedAt, customDepreciationRate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.name,
            item.category,
            item.brand ?? null,
            item.purchasePrice ?? null,
            item.purchaseDate ?? null,
            item.locationId ?? null,
            item.warrantyEndDate ?? null,
            JSON.stringify(item.tags || []),
            item.notes ?? null,
            item.createdAt || new Date().toISOString(),
            item.updatedAt || new Date().toISOString(),
            item.consumptionType || 'durable',
            item.imageUrl ?? null,
            item.quantity ?? 1,
            item.purchaseStore ?? null,
            item.serialNumber ?? null,
            item.status || 'inUse',
            movedAt,
            item.customDepreciationRate ?? null,
          ]
        );
      }
    }
    
    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

// ==================== 设置操作 ====================

// 获取设置值
export async function getSetting(key: string): Promise<string | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return result ? result.value : null;
}

// 设置值
export async function setSetting(key: string, value: string): Promise<void> {
  const database = getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)',
    [key, value, now]
  );
}

// 获取所有设置
export async function getAllSettings(): Promise<Record<string, string>> {
  const database = getDatabase();
  const results = await database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const settings: Record<string, string> = {};
  results.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

// ==================== 自定义分类 CRUD 操作 ====================

// 创建自定义分类
export async function createCustomCategory(category: Omit<CustomCategory, 'id' | 'createdAt'>): Promise<CustomCategory> {
  const database = getDatabase();
  const now = new Date().toISOString();
  const id = generateId();
  
  const newCategory: CustomCategory = {
    ...category,
    id,
    createdAt: now,
  };

  await database.runAsync(
    `INSERT INTO custom_categories (id, name, nameEn, icon, color, depreciationRate, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      newCategory.id,
      newCategory.name,
      newCategory.nameEn,
      newCategory.icon,
      newCategory.color,
      newCategory.depreciationRate,
      newCategory.createdAt,
    ]
  );

  return newCategory;
}

// 获取所有自定义分类
export async function getAllCustomCategories(): Promise<CustomCategory[]> {
  const database = getDatabase();
  const results = await database.getAllAsync<CustomCategory>(
    'SELECT * FROM custom_categories ORDER BY createdAt DESC'
  );
  return results;
}

// 更新自定义分类
export async function updateCustomCategory(id: string, updates: Partial<Omit<CustomCategory, 'id' | 'createdAt'>>): Promise<CustomCategory | null> {
  const database = getDatabase();
  const existing = await getCustomCategoryById(id);
  
  if (!existing) return null;

  const updated = { ...existing, ...updates };

  await database.runAsync(
    `UPDATE custom_categories SET name = ?, nameEn = ?, icon = ?, color = ?, depreciationRate = ? WHERE id = ?`,
    [updated.name, updated.nameEn, updated.icon, updated.color, updated.depreciationRate, id]
  );

  return updated;
}

// 删除自定义分类
export async function deleteCustomCategory(id: string): Promise<boolean> {
  const database = getDatabase();
  const result = await database.runAsync('DELETE FROM custom_categories WHERE id = ?', [id]);
  return result.changes > 0;
}

// 根据ID获取自定义分类
export async function getCustomCategoryById(id: string): Promise<CustomCategory | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<CustomCategory>(
    'SELECT * FROM custom_categories WHERE id = ?',
    [id]
  );
  return result || null;
}

// 清空所有数据（用于测试或重置）
export async function clearAllData(): Promise<void> {
  const database = getDatabase();
  await database.execAsync(`
    DELETE FROM location_history;
    DELETE FROM favorites;
    DELETE FROM items;
    DELETE FROM locations;
    DELETE FROM custom_categories;
  `);
}

// ==================== 种子数据生成 ====================

// 生成种子数据：插入示例位置和物品
export async function seedDemoData(): Promise<void> {
  const database = getDatabase();

  // 检查是否已有数据
  const existingItems = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM items');
  if (existingItems && existingItems.count > 0) {
    return; // 已有数据，不重复插入
  }

  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // 生成ID辅助函数
  const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // ---- 位置数据 ----
  const locHome = id('loc');
  const locOffice = id('loc');
  const locBedroom = id('loc');
  const locKitchen = id('loc');
  const locStudy = id('loc');
  const locMeeting = id('loc');

  const locations = [
    { id: locHome, name: '家', parentId: null, level: 0, createdAt: new Date(now.getTime() - 86400000 * 30).toISOString() },
    { id: locOffice, name: '公司', parentId: null, level: 0, createdAt: new Date(now.getTime() - 86400000 * 30).toISOString() },
    { id: locBedroom, name: '卧室', parentId: locHome, level: 1, createdAt: new Date(now.getTime() - 86400000 * 28).toISOString() },
    { id: locKitchen, name: '厨房', parentId: locHome, level: 1, createdAt: new Date(now.getTime() - 86400000 * 28).toISOString() },
    { id: locStudy, name: '书房', parentId: locHome, level: 1, createdAt: new Date(now.getTime() - 86400000 * 27).toISOString() },
    { id: locMeeting, name: '会议室', parentId: locOffice, level: 1, createdAt: new Date(now.getTime() - 86400000 * 25).toISOString() },
  ];

  for (const loc of locations) {
    await database.runAsync(
      `INSERT OR IGNORE INTO locations (id, name, parentId, level, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [loc.id, loc.name, loc.parentId, loc.level, loc.createdAt]
    );
  }

  // ---- 物品数据 ----
  const items = [
    { id: id('it'), name: 'MacBook Pro 14"', category: 'electronics', brand: 'Apple', purchasePrice: 1499900, purchaseDate: fmt(new Date(now.getFullYear()-1, 5, 15)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 5, 15)), tags: ['电脑', '工作', '笔记本'], notes: 'M3 Pro 芯片，18GB 内存，深空灰', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 2).toISOString(), quantity: 1, purchaseStore: 'Apple官网', serialNumber: 'FVLK3CH8X9', status: 'inUse' },
    { id: id('it'), name: 'iPhone 16 Pro', category: 'electronics', brand: 'Apple', purchasePrice: 899900, purchaseDate: fmt(new Date(now.getFullYear(), 8, 20)), locationId: locBedroom, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 8, 20)), tags: ['手机', 'Apple', '旗舰'], notes: '256GB 沙漠钛金', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 5).toISOString(), quantity: 1, purchaseStore: '京东', serialNumber: 'GD3X4Y7K2M', status: 'inUse' },
    { id: id('it'), name: 'AirPods Pro 2', category: 'electronics', brand: 'Apple', purchasePrice: 189900, purchaseDate: fmt(new Date(now.getFullYear(), 2, 10)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 2, 10)), tags: ['耳机', '无线', '降噪'], notes: 'USB-C 版本', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 8).toISOString(), quantity: 1, purchaseStore: 'Apple Store 直营店', serialNumber: 'L2NR7P9Q5T', status: 'inUse' },
    { id: id('it'), name: '戴尔 U2723QE 显示器', category: 'electronics', brand: 'Dell', purchasePrice: 459900, purchaseDate: fmt(new Date(now.getFullYear()-1, 3, 1)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+2, 2, 28)), tags: ['显示器', '4K', '办公'], notes: '27寸 4K IPS Black Type-C 90W供电', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 15).toISOString(), quantity: 1, purchaseStore: '戴尔官网', serialNumber: 'CN-0V7NG3-T3K1', status: 'inUse' },
    { id: id('it'), name: '索尼 WH-1000XM5', category: 'electronics', brand: 'Sony', purchasePrice: 299900, purchaseDate: fmt(new Date(now.getFullYear()-1, 10, 5)), locationId: locOffice, warrantyEndDate: fmt(new Date(now.getFullYear(), 10, 5)), tags: ['耳机', '降噪', '通勤'], notes: '黑色，续航30小时', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 3).toISOString(), quantity: 1, purchaseStore: '天猫Sony旗舰店', serialNumber: '1-084-921-12', status: 'inUse' },
    { id: id('it'), name: 'Herman Miller Aeron', category: 'furniture', brand: 'Herman Miller', purchasePrice: 1289900, purchaseDate: fmt(new Date(now.getFullYear()-2, 1, 20)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+10, 1, 20)), tags: ['椅子', '人体工学', '办公'], notes: '经典款 尺寸B 石墨色', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 30).toISOString(), quantity: 1, purchaseStore: '线下授权经销商', serialNumber: 'HM-AE-B-2203', status: 'inUse' },
    { id: id('it'), name: '北欧风书桌', category: 'furniture', brand: '宜家', purchasePrice: 249900, purchaseDate: fmt(new Date(now.getFullYear()-2, 6, 10)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear(), 6, 10)), tags: ['书桌', '橡木', '家居'], notes: '140x70cm 白色桌面+白色桌腿', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 40).toISOString(), quantity: 1, purchaseStore: '宜家商场', status: 'inUse' },
    { id: id('it'), name: '小米手环 8 Pro', category: 'electronics', brand: '小米', purchasePrice: 39900, purchaseDate: fmt(new Date(now.getFullYear(), 0, 15)), locationId: locBedroom, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 0, 15)), tags: ['穿戴', '运动', '健康'], notes: '黑色，支持血氧检测', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 1).toISOString(), quantity: 1, purchaseStore: '小米商城', status: 'inUse' },
    { id: id('it'), name: '李宁跑步鞋 赤兔7', category: 'shoes', brand: '李宁', purchasePrice: 59900, purchaseDate: fmt(new Date(now.getFullYear(), 2, 8)), locationId: locHome, warrantyEndDate: undefined, tags: ['跑步', '运动鞋', '训练'], notes: '42码 白色/荧光绿', consumptionType: 'consumable', updatedAt: new Date(now.getTime() - 86400000 * 4).toISOString(), quantity: 1, purchaseStore: '李宁官方旗舰店', status: 'inUse' },
    { id: id('it'), name: '博世电动螺丝刀', category: 'tools', brand: 'Bosch', purchasePrice: 35900, purchaseDate: fmt(new Date(now.getFullYear()-1, 4, 20)), locationId: locHome, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 4, 20)), tags: ['工具', '电动', '维修'], notes: 'GSR 120-LI 双电池套装', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 10).toISOString(), quantity: 1, purchaseStore: '京东', status: 'inUse' },
    { id: id('it'), name: 'Serving Robot', category: 'electronics', brand: '华为', purchasePrice: 469900, purchaseDate: fmt(new Date(now.getFullYear(), 9, 1)), locationId: locMeeting, warrantyEndDate: fmt(new Date(now.getFullYear()+2, 9, 1)), tags: ['机器人', '会议', '智能'], notes: '企业版 白色 ProMax', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 7).toISOString(), quantity: 1, purchaseStore: '华为企业购', status: 'inUse' },
    { id: id('it'), name: 'Ninja 破壁机', category: 'kitchen', brand: 'Ninja', purchasePrice: 129900, purchaseDate: fmt(new Date(now.getFullYear(), 5, 1)), locationId: locKitchen, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 5, 1)), tags: ['厨房', '搅拌', '料理'], notes: 'BN801 1500W 大功率', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 14).toISOString(), quantity: 1, purchaseStore: '天猫', status: 'inUse' },
    { id: id('it'), name: '象印保温杯', category: 'kitchen', brand: 'Zojirushi', purchasePrice: 26900, purchaseDate: fmt(new Date(now.getFullYear(), 6, 15)), locationId: locOffice, warrantyEndDate: undefined, tags: ['杯子', '保温', '日用品'], notes: '480ml 不锈钢 深蓝色 SM-KC48', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 6).toISOString(), quantity: 2, purchaseStore: '日本代购', status: 'inUse' },
    { id: id('it'), name: 'Moleskine 笔记本', category: 'stationery', brand: 'Moleskine', purchasePrice: 12900, purchaseDate: fmt(new Date(now.getFullYear(), 9, 5)), locationId: locStudy, warrantyEndDate: undefined, tags: ['笔记本', '经典', '文具'], notes: 'L号 横线 黑色 硬壳', consumptionType: 'consumable', updatedAt: new Date(now.getTime() - 86400000 * 12).toISOString(), quantity: 3, purchaseStore: 'PageOne书店', status: 'inUse' },
    { id: id('it'), name: 'Lamy Safari 钢笔', category: 'stationery', brand: 'Lamy', purchasePrice: 35900, purchaseDate: fmt(new Date(now.getFullYear()-2, 8, 10)), locationId: locOffice, warrantyEndDate: undefined, tags: ['钢笔', '德国', '文具'], notes: '磨砂黑 F尖 + Z28吸墨器', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 20).toISOString(), quantity: 1, purchaseStore: 'Lamy专柜', status: 'inUse' },
    { id: id('it'), name: '北鼎养生壶', category: 'kitchen', brand: '北鼎', purchasePrice: 79900, purchaseDate: fmt(new Date(now.getFullYear(), 7, 1)), locationId: locKitchen, warrantyEndDate: fmt(new Date(now.getFullYear()+2, 7, 1)), tags: ['养生', '壶', '茶水'], notes: '1.5L 白色 预约保温功能', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 18).toISOString(), quantity: 1, purchaseStore: '北鼎天猫旗舰店', status: 'inUse' },
    { id: id('it'), name: '机械革命 轻薄本', category: 'electronics', brand: '机械革命', purchasePrice: 599900, purchaseDate: fmt(new Date(now.getFullYear()-2, 11, 1)), locationId: locMeeting, warrantyEndDate: fmt(new Date(now.getFullYear(), 11, 1)), tags: ['笔记本', '备用机'], notes: '无界14 锐龙版 R7-7840HS 16GB 512GB', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 60).toISOString(), quantity: 1, purchaseStore: '京东', status: 'idle' },
    { id: id('it'), name: 'Dyson V15 Detect', category: 'homeAppliances', brand: 'Dyson', purchasePrice: 499000, purchaseDate: fmt(new Date(now.getFullYear()-1, 1, 5)), locationId: locHome, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 1, 5)), tags: ['吸尘器', '无线', '清洁'], notes: '旗舰款 激光探测 智能灰尘感应', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 25).toISOString(), quantity: 1, purchaseStore: 'Dyson官网', serialNumber: 'DV15-2024-00234', status: 'inUse' },
    { id: id('it'), name: '施耐德电气插排', category: 'electronics', brand: 'Schneider', purchasePrice: 8900, purchaseDate: fmt(new Date(now.getFullYear(), 3, 10)), locationId: locStudy, warrantyEndDate: fmt(new Date(now.getFullYear()+3, 3, 10)), tags: ['插排', '防浪涌', '充电'], notes: '6位+3USB 1.8m 防浪涌保护', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 35).toISOString(), quantity: 2, purchaseStore: '京东', status: 'inUse' },
    { id: id('it'), name: '戴森 Airwrap', category: 'cosmetics', brand: 'Dyson', purchasePrice: 369000, purchaseDate: fmt(new Date(now.getFullYear(), 0, 20)), locationId: locBedroom, warrantyEndDate: fmt(new Date(now.getFullYear()+1, 0, 20)), tags: ['吹风机', '造型', '美发'], notes: '多功能美发器 镍铜色', consumptionType: 'durable', updatedAt: new Date(now.getTime() - 86400000 * 9).toISOString(), quantity: 1, purchaseStore: '丝芙兰', serialNumber: 'HS09-2401-876', status: 'sold' },
  ];

  for (const item of items) {
    await database.runAsync(
      `INSERT OR IGNORE INTO items (id, name, category, brand, purchasePrice, purchaseDate, locationId, warrantyEndDate, tags, notes, createdAt, updatedAt, consumptionType, quantity, purchaseStore, serialNumber, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id, item.name, item.category, item.brand,
        item.purchasePrice, item.purchaseDate, item.locationId,
        item.warrantyEndDate ?? null,
        JSON.stringify(item.tags), item.notes,
        new Date(item.updatedAt).toISOString(),
        item.updatedAt,
        item.consumptionType,
        item.quantity,
        item.purchaseStore ?? null,
        item.serialNumber ?? null,
        item.status,
      ]
    );
  }

  // 添加一些收藏
  const favItems = items.slice(0, 3);
  for (const item of favItems) {
    await database.runAsync(
      `INSERT OR IGNORE INTO favorites (itemId, createdAt) VALUES (?, ?)`,
      [item.id, new Date().toISOString()]
    );
  }

  // 添加一些位置历史 (最近移动)
  const nowDate = new Date();
  for (let i = 0; i < 5; i++) {
    const item = items[i];
    if (item) {
      const movedAt = new Date(nowDate.getTime() - 86400000 * (i + 5));
      await database.runAsync(
        `INSERT OR IGNORE INTO location_history (id, itemId, fromLocationId, toLocationId, movedAt) VALUES (?, ?, ?, ?, ?)`,
        [id('hist'), item.id, locations[i % 3].id, item.locationId ?? locations[(i+1) % 3].id, movedAt.toISOString()]
      );
      // 更新物品的 movedAt 为最后一次移动时间
      await database.runAsync(`UPDATE items SET movedAt = ? WHERE id = ?`, [movedAt.toISOString(), item.id]);
    }
  }
}