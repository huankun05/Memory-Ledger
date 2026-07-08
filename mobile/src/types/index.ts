// 物品状态
export type ItemStatus = 'inUse' | 'idle' | 'discarded' | 'donated' | 'sold';

// 物品类型
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
  consumptionType: ConsumptionType;
  imageUrl?: string;
  /** 数量，默认 1 */
  quantity: number;
  /** 购买渠道（如京东、淘宝、官网等） */
  purchaseStore?: string;
  /** 序列号/编号 */
  serialNumber?: string;
  /** 物品状态：在用/闲置/已丢弃/已捐赠/已出售 */
  status: ItemStatus;
  /** 最后移动时间 */
  movedAt: string;
  /** 自定义折旧率（覆盖分类默认折旧率，null/undefined 表示使用分类默认） */
  customDepreciationRate?: number | null;
}

// 位置布局类型
export interface LocationLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'rounded';
  color?: string;
}

// 位置类型
export interface Location {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  createdAt: string;
  layout?: LocationLayout;
}

// 带布局的位置节点
export interface LocationMapNode extends Location {
  layout: LocationLayout;
  children: LocationMapNode[];
  itemCount: number;
}

// 位置历史记录类型
export interface LocationHistory {
  id: string;
  itemId: string;
  fromLocationId?: string;
  toLocationId?: string;
  movedAt: string;
  notes?: string;
}

// 物品分类枚举
export type ItemCategory =
  | 'electronics'
  | 'clothing'
  | 'books'
  | 'kitchen'
  | 'furniture'
  | 'sports'
  | 'toys'
  | 'tools'
  | 'documents'
  | 'cosmetics'
  | 'medicine'
  | 'food'
  | 'accessories'
  | 'shoes'
  | 'bags'
  | 'homeAppliances'
  | 'digitalAccessories'
  | 'stationery'
  | 'plants'
  | 'art'
  | 'collectibles'
  | 'musicalInstruments'
  | 'cameras'
  | 'automotive'
  | 'baby'
  | 'petSupplies'
  | 'outdoor'
  | 'other';

// 消耗类型枚举
export type ConsumptionType =
  | 'durable'
  | 'consumable'
  | 'rental'
  | 'borrowed';

// 主题模式类型
export type ThemeMode = 'light' | 'dark' | 'system';

// 配色方案类型
export type ColorScheme = 'warm' | 'ocean' | 'forest' | 'rose' | 'twilight';

// 分类显示名称映射
export const ItemCategoryLabels: Record<ItemCategory, string> = {
  electronics: '电子产品',
  clothing: '服装',
  books: '书籍',
  kitchen: '厨房用品',
  furniture: '家具',
  sports: '运动器材',
  toys: '玩具',
  tools: '工具',
  documents: '文件',
  cosmetics: '化妆品',
  medicine: '药品',
  food: '食品',
  accessories: '配饰',
  shoes: '鞋靴',
  bags: '箱包',
  homeAppliances: '家用电器',
  digitalAccessories: '数码配件',
  stationery: '文具',
  plants: '植物',
  art: '艺术品',
  collectibles: '收藏品',
  musicalInstruments: '乐器',
  cameras: '摄影器材',
  automotive: '汽车用品',
  baby: '母婴用品',
  petSupplies: '宠物用品',
  outdoor: '户外装备',
  other: '其他',
};

// 自定义分类类型
export interface CustomCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  depreciationRate: number;
  createdAt: string;
}

// 消耗类型显示名称映射
export const ConsumptionTypeLabels: Record<ConsumptionType, string> = {
  durable: '耐用品',
  consumable: '消耗品',
  rental: '租赁',
  borrowed: '借入',
};

// 物品状态显示名称映射
export const ItemStatusLabels: Record<ItemStatus, string> = {
  inUse: '使用中',
  idle: '闲置',
  discarded: '已丢弃',
  donated: '已捐赠',
  sold: '已出售',
};