import { format, parseISO, differenceInDays } from 'date-fns';

export function formatCurrency(amount?: number): string {
  if (!amount) return '¥0';
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(2)}万`;
  }
  return `¥${(amount / 100).toFixed(2)}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'yyyy-MM-dd HH:mm');
  } catch {
    return dateStr;
  }
}

export function getDaysUntil(dateStr?: string): number {
  if (!dateStr) return -1;
  try {
    const target = parseISO(dateStr);
    return differenceInDays(target, new Date());
  } catch {
    return -1;
  }
}

export function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  } catch {
    return '';
  }
}

export function calculateDepreciation(purchasePrice: number, purchaseDate: string, categoryRate: number = 0.15): number {
  try {
    const purchase = parseISO(purchaseDate);
    const now = new Date();
    const years = differenceInDays(now, purchase) / 365;
    const residualValue = purchasePrice * Math.pow(1 - categoryRate, years);
    return Math.max(0, Math.round(residualValue));
  } catch {
    return purchasePrice;
  }
}

export function calculateHealthScore(item: { purchasePrice?: number; purchaseDate?: string; status: string; warrantyEndDate?: string }): number {
  let score = 100;
  
  if (item.status === 'lost') return 0;
  if (item.status === 'sold') return 0;
  if (item.status === 'idle') score -= 20;
  
  if (item.warrantyEndDate) {
    const daysUntil = getDaysUntil(item.warrantyEndDate);
    if (daysUntil < 0) score -= 15;
    else if (daysUntil < 30) score -= 10;
  }
  
  if (item.purchasePrice && item.purchaseDate) {
    try {
      const purchase = parseISO(item.purchaseDate);
      const now = new Date();
      const years = differenceInDays(now, purchase) / 365;
      score = Math.max(0, score - Math.floor(years * 5));
    } catch {
      // ignore
    }
  }
  
  return score;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    inUse: '使用中',
    idle: '闲置',
    sold: '已出售',
    lost: '已丢失',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    inUse: '#10B981',
    idle: '#F59E0B',
    sold: '#6B7280',
    lost: '#EF4444',
  };
  return colors[status] || '#6B7280';
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}
