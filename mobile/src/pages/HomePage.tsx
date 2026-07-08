import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Sparkles, Package, Shield, ChevronRight, Plus, MapPin, BarChart3, TrendingDown, TrendingUp, Clock, ShieldAlert, Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useItems, useLocations } from '../store';
import { ItemCategory, ItemCategoryLabels } from '../types';
import { calculateResidualValue, getWarrantyStatus, getIdleDays, calculateHealthScore } from '../utils/itemCalculations';
import { formatPrice, formatPriceShort, getLocationPath, formatRelativeDate } from '../utils/formatters';
import PieChart from '../components/PieChart';
import { CATEGORY_COLORS } from '../utils/categoryIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomePage() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  console.log('[HomePage] v20260705 - monthly trend moved from profile');
  const items = useItems();
  const locations = useLocations();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const stats = useMemo(() => {
    const totalOriginal = items.reduce((sum, item) => sum + (item.purchasePrice || 0) / 100, 0);
    const totalResidual = items.reduce(
      (sum, item) => sum + calculateResidualValue(item.purchasePrice, item.purchaseDate, item.category, item.customDepreciationRate),
      0
    );
    const depreciation = totalOriginal - totalResidual;
    const health = calculateHealthScore(items);

    const warrantyExpiring = items.filter((item) => {
      const status = getWarrantyStatus(item.warrantyEndDate);
      return status === 'danger' || status === 'warning';
    }).length;

    const catCount: Record<string, number> = {};
    const catValue: Record<string, { purchase: number; residual: number }> = {};
    let longIdleItems = 0;
    const now = new Date();

    items.forEach((i) => {
      catCount[i.category] = (catCount[i.category] || 0) + 1;
      const residual = calculateResidualValue(i.purchasePrice, i.purchaseDate, i.category, i.customDepreciationRate) * 100;
      if (!catValue[i.category]) {
        catValue[i.category] = { purchase: 0, residual: 0 };
      }
      catValue[i.category].purchase += i.purchasePrice || 0;
      catValue[i.category].residual += residual;

      const moveDate = new Date(i.movedAt || i.updatedAt);
      const idleDays = isNaN(moveDate.getTime()) ? 0 : (now.getTime() - moveDate.getTime()) / (1000 * 60 * 60 * 24);
      if (idleDays > 180) longIdleItems++;
    });

    const pieData = Object.entries(catCount)
      .map(([cat, count]) => ({
        name: t(`item.categories.${cat}`) || ItemCategoryLabels[cat as ItemCategory] || cat,
        value: count,
        color: CATEGORY_COLORS[cat as ItemCategory] || '#7A7A7A',
        percentage: Math.round((count / items.length) * 100),
        category: cat,
      }))
      .sort((a, b) => b.value - a.value);

    const categoryValueRank = Object.entries(catValue)
      .map(([cat, val]) => ({
        category: cat,
        name: t(`item.categories.${cat}`) || ItemCategoryLabels[cat as ItemCategory] || cat,
        residual: val.residual,
        purchase: val.purchase,
        count: catCount[cat] || 0,
      }))
      .sort((a, b) => b.residual - a.residual)
      .slice(0, 5);

    // 月度消费趋势（近6个月）
    const monthlyStats: Array<{ label: string; purchase: number; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthItems = items.filter((item) => {
        const pd = new Date(item.purchaseDate || 0);
        return `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}` === key;
      });
      monthlyStats.push({
        label: i === 0 ? t('profile.thisMonth') : `${d.getMonth() + 1}${t('common.unit.months')}`,
        purchase: monthItems.reduce((s, i) => s + (i.purchasePrice || 0), 0),
        count: monthItems.length,
      });
    }

    return {
      totalOriginal,
      totalResidual,
      depreciation,
      depreciationPercent: totalOriginal > 0 ? Math.round((depreciation / totalOriginal) * 100) : 0,
      health,
      warrantyExpiring,
      itemCount: items.length,
      locationCount: locations.length,
      longIdleItems,
      pieData,
      categoryValueRank,
      monthlyStats,
    };
  }, [items, locations, t]);

  const recentActivity = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        name: item.name,
        location: getLocationPath(item.locationId, locations),
        time: formatRelativeDate(item.updatedAt, t),
      }));
  }, [items, locations]);

  const quickActions = [
    { icon: Plus, label: t('home.aiArchive'), route: 'Add', color: colors.primary },
    { icon: MapPin, label: t('home.quickLocation'), route: 'Location', color: colors.secondary },
    { icon: Star, label: t('profile.favorites'), route: 'Items', params: { filterFavorites: true }, color: colors.tertiary },
    { icon: Shield, label: t('home.warranty'), route: 'WarrantyReminder', color: colors.error },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Text style={[styles.logoText, { color: colors.onPrimary }]}>M</Text>
          </View>
          <View>
            <Text style={[styles.appName, { color: colors.text }]}>{t('common.appTagline')}</Text>
            <Text style={[styles.appNameEn, { color: colors.textSecondary }]}>Memory Ledger</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => navigation.navigate('Add')}
        >
          <Plus size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Health Score Card */}
      <View style={[styles.healthCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.healthCircleContainer]}>
          <View style={[styles.healthCircle, { borderColor: colors.border }]}>
            <View style={[styles.healthProgress, { 
              borderColor: colors.primary,
              borderTopColor: colors.primary,
              borderRightColor: colors.primary,
            }]} />
            <View style={styles.healthInner}>
              <Text style={[styles.healthScore, { color: colors.text }]}>{stats.health.total}</Text>
              <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>
                {t('home.healthScore')}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.healthInfo}>
          <View style={styles.healthLevelRow}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.healthLevel, { color: colors.text }]}>
              {t(stats.health.levelKey)}
            </Text>
          </View>
          <Text style={[styles.healthDesc, { color: colors.textSecondary }]}>
            {t(stats.health.descKey)}
          </Text>
          <TouchableOpacity 
            style={styles.viewDetailBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={[styles.viewDetailText, { color: colors.primary }]}>
              {t('common.viewDetail')}
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Asset Overview Card */}
      <View style={[styles.assetCard, { backgroundColor: colors.surface }]}>
        <View style={styles.assetHeader}>
          <Text style={[styles.assetTitle, { color: colors.textSecondary }]}>
            {t('home.assetOverview')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.viewDetailRow}>
              <Text style={[styles.viewDetailText, { color: colors.primary }]}>
                {t('common.viewDetail')}
              </Text>
              <ChevronRight size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.assetValueContainer}>
          <Text style={[styles.assetValueLabel, { color: colors.textSecondary }]}>
            {t('home.currentValue')}
          </Text>
          <View style={styles.assetValueRow}>
            <Text style={[styles.assetCurrency, { color: colors.textSecondary }]}>¥</Text>
            <Text style={[styles.assetValue, { color: colors.text }]}>
              {formatPrice(Math.round(stats.totalResidual * 100))}
            </Text>
          </View>
        </View>

        <View style={styles.assetStatsRow}>
          <View style={styles.assetStatItem}>
            <Text style={[styles.assetStatLabel, { color: colors.textSecondary }]}>
              {t('home.totalDepreciation')}
            </Text>
            <Text style={[styles.assetStatValue, { color: colors.text }]}>
              ¥{formatPrice(Math.round(stats.depreciation * 100))}
            </Text>
          </View>
          <View style={[styles.assetStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.assetStatItem}>
            <Text style={[styles.assetStatLabel, { color: colors.textSecondary }]}>
              {t('home.itemCount')}
            </Text>
            <Text style={[styles.assetStatValue, { color: colors.text }]}>
              {stats.itemCount}{t('common.unit.items')}
            </Text>
          </View>
          <View style={[styles.assetStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.assetStatItem}>
            <Text style={[styles.assetStatLabel, { color: colors.textSecondary }]}>
              {t('home.depreciationRate')}
            </Text>
            <Text style={[styles.assetStatValue, { color: colors.error }]}>
              {stats.depreciationPercent}%
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <TouchableOpacity 
              key={index}
              style={[styles.quickActionBtn, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(action.route, action.params)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.surfaceVariant }]}>
                <Icon size={20} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Warranty Warning */}
      {stats.warrantyExpiring > 0 && (
        <TouchableOpacity
          style={[styles.warrantyCard, { backgroundColor: colors.surface, borderLeftColor: colors.error }]}
          onPress={() => navigation.navigate('WarrantyReminder')}
          activeOpacity={0.7}
        >
          <View style={[styles.warrantyIcon, { backgroundColor: colors.error + '20' }]}>
            <Shield size={20} color={colors.error} />
          </View>
          <View style={styles.warrantyInfo}>
            <Text style={[styles.warrantyTitle, { color: colors.text }]}>
              {t('home.warrantyExpiring', { count: stats.warrantyExpiring })}
            </Text>
            <Text style={[styles.warrantyDesc, { color: colors.textSecondary }]}>
              {t('home.warrantyExpiringDesc')}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.surface, minWidth: (width - 52) / 2 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Items')}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Package size={18} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.itemCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.itemCount')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.surface, minWidth: (width - 52) / 2 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Location')}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
            <MapPin size={18} color={colors.secondary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.locationCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('location.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.surface, minWidth: (width - 52) / 2 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('WarrantyReminder')}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
            <ShieldAlert size={18} color={colors.error} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.warrantyExpiring}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.warranty')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.surface, minWidth: (width - 52) / 2 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Items', { sortBy: 'idle', sortOrder: 'desc' })}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.tertiary + '20' }]}>
            <Clock size={18} color={colors.tertiary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.longIdleItems}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('itemDetail.longIdle')}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Distribution */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
        <View style={styles.chartHeader}>
          <BarChart3 size={16} color={colors.primary} />
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            {t('profile.categoryDistribution')}
          </Text>
        </View>

        <PieChart
          data={stats.pieData.map((item) => ({
            key: item.category,
            label: item.name,
            value: item.value,
            count: item.value,
            color: item.color,
          }))}
          size={220}
          showCurrency={false}
        />
      </View>

      {/* Monthly Trend */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
        <View style={styles.chartHeader}>
          <TrendingDown size={16} color={colors.primary} />
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            {t('profile.monthlyTrend')}
          </Text>
        </View>
        <View style={styles.monthlyChartContainer}>
          {stats.monthlyStats.map((m, idx) => {
            const maxPurchase = Math.max(...stats.monthlyStats.map(d => d.purchase), 1);
            const barHeight = maxPurchase > 0 ? (m.purchase / maxPurchase) * 100 : 0;
            return (
              <View key={idx} style={styles.monthlyBarColumn}>
                <View style={styles.monthlyBarWrapper}>
                  <View
                    style={[
                      styles.monthlyBarFill,
                      {
                        backgroundColor: colors.primary,
                        height: `${Math.max(4, barHeight)}%`,
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.monthlyBarLabel, { color: colors.textSecondary }]}>
                  {m.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Category Value Rank */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
        <View style={styles.chartHeader}>
          <TrendingUp size={16} color={colors.primary} />
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            {t('profile.categoryValueRank')}
          </Text>
        </View>

        <View style={styles.barChartContainer}>
          {stats.categoryValueRank.slice(0, 5).map((item, index) => {
            const maxPurchase = Math.max(...stats.categoryValueRank.map(d => d.purchase));
            const purchaseHeight = maxPurchase > 0 ? (item.purchase / maxPurchase) * 100 : 0;
            const residualHeight = maxPurchase > 0 ? (item.residual / maxPurchase) * 100 : 0;

            return (
              <View key={item.category} style={styles.barItem}>
                <View style={styles.barRow}>
                  <View style={[styles.bar, { backgroundColor: colors.primary, height: `${purchaseHeight}%` }]} />
                  <View style={[styles.bar, { backgroundColor: colors.secondary, height: `${residualHeight}%` }]} />
                </View>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.barLegend}>
          <View style={styles.barLegendItem}>
            <View style={[styles.barLegendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.barLegendText, { color: colors.textSecondary }]}>
              {t('profile.purchaseTotal')}
            </Text>
          </View>
          <View style={styles.barLegendItem}>
            <View style={[styles.barLegendDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.barLegendText, { color: colors.textSecondary }]}>
              {t('profile.residualTotal')}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[styles.activityCard, { backgroundColor: colors.surface }]}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>
            {t('home.recentActivity')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Items', { sortBy: 'idle', sortOrder: 'asc' })}>
            <View style={styles.viewDetailRow}>
              <Text style={[styles.viewDetailText, { color: colors.primary }]}>
                {t('common.all')}
              </Text>
              <ChevronRight size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <TouchableOpacity 
              key={activity.id}
              style={styles.activityItem}
              onPress={() => navigation.navigate('ItemDetail', { id: activity.id })}
            >
              <View style={[styles.activityIcon, { backgroundColor: colors.surfaceVariant }]}>
                <Package size={18} color={colors.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityName, { color: colors.text }]}>
                  {activity.name}
                </Text>
                <Text style={[styles.activityLocation, { color: colors.textSecondary }]}>
                  {activity.location || t('location.locationNotSet')}
                </Text>
              </View>
              <Text style={[styles.activityTime, { color: colors.textTertiary }]}>
                {activity.time}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyActivity}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('common.noData')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appNameEn: {
    fontSize: 11,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  healthCircleContainer: {
    width: 96,
    height: 96,
  },
  healthCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthProgress: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  healthInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScore: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  healthLabel: {
    fontSize: 10,
  },
  healthInfo: {
    flex: 1,
  },
  healthLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  healthLevel: {
    fontSize: 16,
    fontWeight: '600',
  },
  healthDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assetCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assetTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  assetValueContainer: {
    marginBottom: 16,
  },
  assetValueLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  assetValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  assetCurrency: {
    fontSize: 11,
  },
  assetValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  assetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetStatItem: {
    alignItems: 'center',
  },
  assetStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  assetStatValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  assetStatDivider: {
    width: 1,
    height: '100%',
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
  },
  warrantyCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
  },
  warrantyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warrantyInfo: {
    flex: 1,
  },
  warrantyTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  warrantyDesc: {
    fontSize: 12,
  },
  activityCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
  },
  emptyActivity: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  bottomSpace: {
    height: 100,
  },
  statsGrid: {
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pieChart: {
    width: 160,
    height: 160,
    borderRadius: 80,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pieSegment: {},
  pieCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  pieCenterLabel: {
    fontSize: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '30%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    flex: 1,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  barChartContainer: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 100,
  },
  bar: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  barLegendText: {
    fontSize: 11,
  },
  monthlyChartContainer: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  monthlyBarColumn: {
    flex: 1,
    alignItems: 'center',
  },
  monthlyBarWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  monthlyBarFill: {
    width: 18,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  monthlyBarLabel: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  rankList: {
    gap: 12,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIndexText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  rankProgressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  rankRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rankValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  rankCount: {
    fontSize: 11,
    marginTop: 2,
  },
});