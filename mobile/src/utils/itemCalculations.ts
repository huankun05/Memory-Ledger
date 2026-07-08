import { Item, ItemCategory, CustomCategory, Location } from '../types';
import { getLocationPath } from './formatters';

const DEPRECIATION_RATES: Record<string, number> = {
  electronics: 0.15,
  clothing: 0.10,
  books: 0.05,
  kitchen: 0.08,
  furniture: 0.05,
  sports: 0.08,
  toys: 0.12,
  tools: 0.05,
  documents: 0.02,
  cosmetics: 0.20,
  medicine: 0.25,
  food: 0.30,
  accessories: 0.10,
  shoes: 0.12,
  bags: 0.08,
  homeAppliances: 0.07,
  digitalAccessories: 0.18,
  stationery: 0.05,
  plants: 0.15,
  art: 0.02,
  collectibles: 0.01,
  musicalInstruments: 0.05,
  cameras: 0.10,
  automotive: 0.06,
  baby: 0.15,
  petSupplies: 0.10,
  outdoor: 0.08,
  other: 0.10,
};

export function calculateResidualValue(
  purchasePrice: number | undefined,
  purchaseDate: string | undefined,
  category: string,
  customDepreciationRate?: number | null
): number {
  if (!purchasePrice || !purchaseDate) return 0;
  const price = purchasePrice / 100;
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const months = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
  // 优先使用物品自定义折旧率，否则使用分类默认折旧率
  const rate = customDepreciationRate != null ? customDepreciationRate : (DEPRECIATION_RATES[category] || 0.10);
  // 按月复利公式：月折旧率 = 1 - (1 - 年折旧率)^(1/12)，残值 = 购买价格 × (1 - 月折旧率)^已使用月数
  const monthlyRate = 1 - Math.pow(1 - rate, 1 / 12);
  const residual = price * Math.pow(1 - monthlyRate, months);
  return Math.max(0, residual);
}

/**
 * 计算日均成本（元/天）
 */
export function calculateDailyCost(
  purchasePrice: number | undefined,
  purchaseDate: string | undefined
): number {
  if (!purchasePrice || !purchaseDate) return 0;
  const purchase = new Date(purchaseDate);
  if (isNaN(purchase.getTime())) return 0;
  const days = Math.max(1, (getNow() - purchase.getTime()) / (1000 * 60 * 60 * 24));
  return (purchasePrice / 100) / days;
}

/**
 * 判断保修是否紧急（已过期或即将到期）
 */
export function isWarrantyUrgent(warrantyEndDate?: string): boolean {
  const status = getWarrantyStatus(warrantyEndDate);
  return status === 'danger' || status === 'warning';
}

// 缓存当前时间戳，避免批量计算时重复创建 Date 对象（healthScore 计算会遍历所有 items）
let _nowCache: { time: number; ts: number } | null = null;
function getNow(): number {
  const ts = Date.now();
  // 1 秒内复用
  if (_nowCache && ts - _nowCache.ts < 1000) return _nowCache.time;
  _nowCache = { time: ts, ts };
  return ts;
}

export function getWarrantyDays(warrantyEndDate?: string): number {
  if (!warrantyEndDate) return 0;
  const end = new Date(warrantyEndDate);
  return Math.ceil((end.getTime() - getNow()) / (1000 * 60 * 60 * 24));
}

export type WarrantyStatus = 'ok' | 'warning' | 'danger' | null;

export function getWarrantyStatus(warrantyEndDate?: string): WarrantyStatus {
  if (!warrantyEndDate) return null;
  const days = getWarrantyDays(warrantyEndDate);
  if (days < 0) return 'danger';
  if (days < 30) return 'warning';
  return 'ok';
}

export function calculateWarrantyProgress(warrantyEndDate?: string, purchaseDate?: string): number {
  if (!warrantyEndDate) return 0;
  const end = new Date(warrantyEndDate);
  const start = purchaseDate ? new Date(purchaseDate) : new Date(getNow());
  const now = getNow();
  
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = (now - start.getTime()) / (1000 * 60 * 60 * 24);
  
  const progress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  return Math.round(progress);
}

export function getIdleDays(movedAt: string): number {
  const moved = new Date(movedAt);
  if (isNaN(moved.getTime())) return 0;
  return Math.floor((getNow() - moved.getTime()) / (1000 * 60 * 60 * 24));
}

export interface HealthDimension {
  key: 'warranty' | 'idle' | 'value' | 'diversity' | 'activity';
  labelKey: string;
  score: number;
  maxScore: number;
  descKey: string;
}

export interface HealthScoreResult {
  total: number;
  levelKey: string;
  descKey: string;
  dimensions: HealthDimension[];
}

export function calculateHealthScore(items: Item[]): HealthScoreResult {
  if (items.length === 0) {
    return {
      total: 100,
      levelKey: 'home.healthExcellent',
      descKey: 'home.healthExcellentDesc',
      dimensions: [
        { key: 'warranty', labelKey: 'health.warranty', score: 20, maxScore: 20, descKey: 'health.warrantyDescExcellent' },
        { key: 'idle', labelKey: 'health.idle', score: 20, maxScore: 20, descKey: 'health.idleDescExcellent' },
        { key: 'value', labelKey: 'health.value', score: 20, maxScore: 20, descKey: 'health.valueDescExcellent' },
        { key: 'diversity', labelKey: 'health.diversity', score: 20, maxScore: 20, descKey: 'health.diversityDescExcellent' },
        { key: 'activity', labelKey: 'health.activity', score: 20, maxScore: 20, descKey: 'health.activityDescExcellent' },
      ],
    };
  }

  const warrantyScore = calculateWarrantyScore(items);
  const idleScore = calculateIdleScore(items);
  const valueScore = calculateValueScore(items);
  const diversityScore = calculateDiversityScore(items);
  const activityScore = calculateActivityScore(items);

  const total = Math.round(warrantyScore + idleScore + valueScore + diversityScore + activityScore);

  let levelKey = 'home.healthPoor';
  let descKey = 'home.healthPoorDesc';
  if (total >= 90) {
    levelKey = 'home.healthExcellent';
    descKey = 'home.healthExcellentDesc';
  } else if (total >= 70) {
    levelKey = 'home.healthGood';
    descKey = 'home.healthGoodDesc';
  } else if (total >= 50) {
    levelKey = 'home.healthFair';
    descKey = 'home.healthFairDesc';
  }

  const dimensions: HealthDimension[] = [
    { key: 'warranty', labelKey: 'health.warranty', score: Math.round(warrantyScore), maxScore: 20, descKey: getWarrantyDescKey(warrantyScore) },
    { key: 'idle', labelKey: 'health.idle', score: Math.round(idleScore), maxScore: 20, descKey: getIdleDescKey(idleScore) },
    { key: 'value', labelKey: 'health.value', score: Math.round(valueScore), maxScore: 20, descKey: getValueDescKey(valueScore) },
    { key: 'diversity', labelKey: 'health.diversity', score: Math.round(diversityScore), maxScore: 20, descKey: getDiversityDescKey(diversityScore) },
    { key: 'activity', labelKey: 'health.activity', score: Math.round(activityScore), maxScore: 20, descKey: getActivityDescKey(activityScore) },
  ];

  return { total, levelKey, descKey, dimensions };
}

function calculateWarrantyScore(items: Item[]): number {
  const itemsWithWarranty = items.filter((i) => i.warrantyEndDate);
  if (itemsWithWarranty.length === 0) return 20;

  let score = 20;
  itemsWithWarranty.forEach((item) => {
    const status = getWarrantyStatus(item.warrantyEndDate);
    if (status === 'danger') {
      score -= 4;
    } else if (status === 'warning') {
      score -= 1.5;
    }
  });

  const maxPenalty = itemsWithWarranty.length * 4;
  if (maxPenalty > 20) {
    const ratio = 20 / maxPenalty;
    score = 20 - (20 - score) * ratio;
  }

  return Math.max(0, Math.min(20, score));
}

function calculateIdleScore(items: Item[]): number {
  const idleItems = items.filter((i) => getIdleDays(i.movedAt || i.updatedAt) > 180);
  const idleRatio = idleItems.length / items.length;

  if (idleRatio === 0) return 20;
  if (idleRatio >= 0.5) return 4;
  return Math.round(20 - idleRatio * 32);
}

function calculateValueScore(items: Item[]): number {
  const totalPurchase = items.reduce((s, i) => s + (i.purchasePrice || 0), 0);
  if (totalPurchase === 0) return 20;

  let totalResidual = 0;
  items.forEach((item) => {
    totalResidual += calculateResidualValue(item.purchasePrice || 0, item.purchaseDate || new Date().toISOString(), item.category, item.customDepreciationRate) * 100;
  });

  const residualRatio = totalResidual / totalPurchase;
  if (residualRatio >= 0.8) return 20;
  if (residualRatio <= 0.2) return 4;
  return Math.round(4 + (residualRatio - 0.2) * (16 / 0.6));
}

function calculateDiversityScore(items: Item[]): number {
  const categoryCount: Record<string, number> = {};
  items.forEach((item) => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  });

  const categories = Object.keys(categoryCount);
  if (categories.length <= 1) return 4;
  if (categories.length >= 8) return 20;

  const maxCount = Math.max(...Object.values(categoryCount));
  const total = items.length;
  const concentration = maxCount / total;

  let score = 4 + (categories.length - 1) * (16 / 7);
  if (concentration > 0.6) {
    score -= (concentration - 0.6) * 10;
  }

  return Math.max(4, Math.min(20, Math.round(score)));
}

function calculateActivityScore(items: Item[]): number {
  const now = getNow();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const activeItems = items.filter((i) => {
    const updated = new Date(i.updatedAt || i.createdAt).getTime();
    return updated >= thirtyDaysAgo;
  });

  const activeRatio = activeItems.length / items.length;
  return Math.max(4, Math.round(4 + activeRatio * 16));
}

function getWarrantyDescKey(score: number): string {
  if (score >= 18) return 'health.warrantyDescExcellent';
  if (score >= 14) return 'health.warrantyDescGood';
  if (score >= 10) return 'health.warrantyDescFair';
  return 'health.warrantyDescPoor';
}

function getIdleDescKey(score: number): string {
  if (score >= 18) return 'health.idleDescExcellent';
  if (score >= 14) return 'health.idleDescGood';
  if (score >= 10) return 'health.idleDescFair';
  return 'health.idleDescPoor';
}

function getValueDescKey(score: number): string {
  if (score >= 18) return 'health.valueDescExcellent';
  if (score >= 14) return 'health.valueDescGood';
  if (score >= 10) return 'health.valueDescFair';
  return 'health.valueDescPoor';
}

function getDiversityDescKey(score: number): string {
  if (score >= 18) return 'health.diversityDescExcellent';
  if (score >= 14) return 'health.diversityDescGood';
  if (score >= 10) return 'health.diversityDescFair';
  return 'health.diversityDescPoor';
}

function getActivityDescKey(score: number): string {
  if (score >= 18) return 'health.activityDescExcellent';
  if (score >= 14) return 'health.activityDescGood';
  if (score >= 10) return 'health.activityDescFair';
  return 'health.activityDescPoor';
}

export function getDepreciationPercent(
  purchasePrice: number | undefined,
  residualValue: number
): number {
  if (!purchasePrice) return 0;
  const price = purchasePrice / 100;
  return Math.round((1 - residualValue / price) * 100);
}

export function getCategoryDepreciationRate(
  category: string,
  customCategories: CustomCategory[] = []
): number {
  const customCat = customCategories.find((c) => c.id === category);
  if (customCat) return customCat.depreciationRate;
  return DEPRECIATION_RATES[category] || 0.10;
}

/**
 * 获取物品实际使用的折旧率
 * 优先级：物品自定义折旧率 > 自定义分类折旧率 > 预设分类折旧率 > 0.10
 */
export function getEffectiveDepreciationRate(
  category: string,
  customDepreciationRate?: number | null,
  customCategories: CustomCategory[] = []
): number {
  if (customDepreciationRate != null) return customDepreciationRate;
  return getCategoryDepreciationRate(category, customCategories);
}

/** 导出预设分类折旧率表，用于设置页编辑 */
export const PRESET_DEPRECIATION_RATES = DEPRECIATION_RATES;

/**
 * 增强物品对象，附加计算字段（残值、折旧、位置路径、保修状态等）
 * 用于物品列表页和保修提醒页的统一数据增强
 */
export interface EnhancedItem extends Item {
  _residualFen: number;
  _depreciation: number;
  _locationPath: string;
  _warrantyStatus: WarrantyStatus;
  _warrantyDays: number;
  _warrantyProgress: number;
  _isFavorite: boolean;
}

export function enhanceItem(
  item: Item,
  locations: Location[],
  favorites: string[]
): EnhancedItem {
  const residual = calculateResidualValue(
    item.purchasePrice || 0,
    item.purchaseDate || new Date().toISOString(),
    item.category,
    item.customDepreciationRate
  );
  return {
    ...item,
    _residualFen: Math.round(residual * 100),
    _depreciation: getDepreciationPercent(item.purchasePrice || 0, residual),
    _locationPath: getLocationPath(item.locationId, locations),
    _warrantyStatus: getWarrantyStatus(item.warrantyEndDate),
    _warrantyDays: getWarrantyDays(item.warrantyEndDate),
    _warrantyProgress: calculateWarrantyProgress(item.warrantyEndDate, item.purchaseDate),
    _isFavorite: favorites.includes(item.id),
  };
}
