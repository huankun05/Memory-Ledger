import { Location } from '../types';
import type { TFunction } from 'i18next';

export function formatPrice(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00';
  return (fen / 100).toFixed(2);
}

export function formatPriceShort(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0';
  const yuan = fen / 100;
  if (yuan >= 10000) {
    return `${(yuan / 10000).toFixed(1)}万`;
  }
  if (yuan >= 1000) {
    return `${(yuan / 1000).toFixed(1)}k`;
  }
  return `${Math.round(yuan)}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return dateStr.split('T')[0];
}

/**
 * 格式化为相对时间（今天/昨天/N天前/N周前/N个月前），支持国际化
 */
export function formatRelativeDate(dateStr: string, t: TFunction): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('common.today');
  if (diffDays === 1) return t('common.yesterday');
  if (diffDays < 7) return t('common.daysAgo', { n: diffDays });
  if (diffDays < 30) return t('common.weeksAgo', { n: Math.floor(diffDays / 7) });
  return t('common.monthsAgo', { n: Math.floor(diffDays / 30) });
}

export function getLocationPath(
  locationId: string | undefined,
  locations: Location[]
): string {
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
}

export type LocationTreeNode = Location & { children: LocationTreeNode[] };

export function buildLocationTree(
  locations: Location[]
): LocationTreeNode[] {
  const map = new Map<string, LocationTreeNode>();
  const roots: LocationTreeNode[] = [];

  locations.forEach((loc) => {
    map.set(loc.id, { ...loc, children: [] });
  });

  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function getLocationAndChildrenIds(
  locationId: string,
  locations: Location[]
): string[] {
  const ids: string[] = [locationId];
  const children = locations.filter((loc) => loc.parentId === locationId);
  children.forEach((child) => {
    ids.push(...getLocationAndChildrenIds(child.id, locations));
  });
  return ids;
}

export function countItemsInLocation(
  locationId: string,
  items: { locationId?: string }[],
  locations: Location[]
): number {
  const allIds = getLocationAndChildrenIds(locationId, locations);
  return items.filter((item) => item.locationId && allIds.includes(item.locationId)).length;
}
