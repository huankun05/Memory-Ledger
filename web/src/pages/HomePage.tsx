import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import { PieChart, PieLegend } from '../components/PieChart';
import { TrendChart } from '../components/TrendChart';
import { formatCurrency, calculateDepreciation, calculateHealthScore, getHealthScoreColor, getRelativeTime } from '../utils/formatters';
import { DEFAULT_CATEGORIES } from '../types';
import { Home, Wallet, TrendingUp, Activity, Star } from 'lucide-react';

export function HomePage() {
  const { t } = useTranslation();
  const { items, locations, favorites } = useStore();
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const originalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
    const residualValue = items.reduce((sum, item) => {
      if (!item.purchasePrice || !item.purchaseDate) return sum;
      const rate = DEFAULT_CATEGORIES[item.category as keyof typeof DEFAULT_CATEGORIES]?.depreciationRate || 0.15;
      return sum + calculateDepreciation(item.purchasePrice, item.purchaseDate, rate);
    }, 0);
    const depreciationRate = originalValue > 0 ? Math.round((1 - residualValue / originalValue) * 100) : 0;
    
    const activeItems = items.filter(item => item.status === 'inUse');
    const avgHealthScore = activeItems.length > 0 
      ? Math.round(activeItems.reduce((sum, item) => sum + calculateHealthScore(item), 0) / activeItems.length)
      : 100;

    return {
      totalItems: items.length,
      totalLocations: locations.length,
      originalValue,
      residualValue,
      depreciationRate,
      avgHealthScore,
    };
  }, [items, locations]);

  const recentActivity = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [items]);

  const recentFavorites = useMemo(() => {
    return items.filter(item => favorites.includes(item.id)).slice(0, 3);
  }, [items, favorites]);

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: colors.text }}>{t('appName')}</h1>
          <p className="text-sm" style={{ color: colors.muted }}>{t('totalAssets')}</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '20' }}>
          <Home size={20} style={{ color: colors.primary }} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">{t('originalValue')}</p>
            <p className="text-2xl font-bold" style={{ color: colors.text }}>{formatCurrency(stats.originalValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{t('residualValue')}</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(stats.residualValue)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t('depreciationRate')}</span>
          <span className="text-sm font-medium text-orange-500">{stats.depreciationRate}%</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + '15' }}>
          <div className="text-center">
            <span className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.avgHealthScore}</span>
            <span className="text-xs text-gray-500">分</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{t('healthScore')}</p>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.avgHealthScore}%`, backgroundColor: getHealthScoreColor(stats.avgHealthScore) }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: colors.text }}>{t('categoryDistribution')}</h2>
          <Wallet size={18} style={{ color: colors.primary }} />
        </div>
        <div className="flex items-center gap-6">
          <PieChart items={items} size={100} />
          <div className="flex-1">
            <PieLegend items={items} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: colors.text }}>{t('monthlyTrend')}</h2>
          <TrendingUp size={18} style={{ color: colors.primary }} />
        </div>
        <TrendChart items={items} />
      </div>

      {recentFavorites.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: colors.text }}>{t('recentlyAdded')}</h2>
            <Star size={18} style={{ color: colors.primary }} />
          </div>
          <div className="space-y-3">
            {recentFavorites.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                  style={{ backgroundColor: DEFAULT_CATEGORIES[item.category as keyof typeof DEFAULT_CATEGORIES]?.color + '20' }}>
                  <span className="text-xs font-medium" 
                    style={{ color: DEFAULT_CATEGORIES[item.category as keyof typeof DEFAULT_CATEGORIES]?.color }}>
                    {item.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{item.name}</p>
                  <p className="text-xs text-gray-500">{item.brand}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                  {formatCurrency(item.purchasePrice)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{ color: colors.text }}>{t('recentActivity')}</h2>
          <Activity size={18} style={{ color: colors.primary }} />
        </div>
        <div className="space-y-3">
          {recentActivity.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: colors.text }}>{item.name}</p>
                <p className="text-xs text-gray-500">{getRelativeTime(item.updatedAt)}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" 
                style={{ backgroundColor: colors.border, color: colors.muted }}>
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
