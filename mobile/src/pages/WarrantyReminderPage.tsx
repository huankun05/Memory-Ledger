import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, Star, ArrowUpDown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore, useItems, useLocations, useFavorites } from '../store';
import { getCategoryIcon } from '../utils/categoryIcons';
import { getWarrantyDays, getWarrantyStatus, enhanceItem } from '../utils/itemCalculations';
import { formatPrice, formatDate } from '../utils/formatters';

export default function WarrantyReminderPage() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems();
  const locations = useLocations();
  const favorites = useFavorites();
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning'>('all');

  const baseWarrantyItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const status = getWarrantyStatus(item.warrantyEndDate);
      return status === 'danger' || status === 'warning';
    });

    return filtered.map((item) => enhanceItem(item, locations, favorites));
  }, [items, locations, favorites]);

  const warrantyItems = useMemo(() => {
    let filtered = baseWarrantyItems;
    if (filter !== 'all') {
      filtered = filtered.filter(item => item._warrantyStatus === filter);
    }
    filtered.sort((a, b) => {
      const comparison = getWarrantyDays(a.warrantyEndDate) - getWarrantyDays(b.warrantyEndDate);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [baseWarrantyItems, filter, sortOrder]);

  const dangerCount = useMemo(() =>
    baseWarrantyItems.filter(item => item._warrantyStatus === 'danger').length
  , [baseWarrantyItems]);

  const warningCount = useMemo(() =>
    baseWarrantyItems.filter(item => item._warrantyStatus === 'warning').length
  , [baseWarrantyItems]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const renderItem = ({ item }: { item: any }) => {
    const CategoryIcon = getCategoryIcon(item.category);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          { backgroundColor: colors.surface },
          item._warrantyStatus === 'danger' && { borderLeftWidth: 4, borderLeftColor: colors.error },
          item._warrantyStatus === 'warning' && { borderLeftWidth: 4, borderLeftColor: colors.warning || '#F59E0B' },
        ]}
        onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
          />
        ) : (
          <View style={[styles.itemIcon, { backgroundColor: colors.surfaceVariant }]}>
            <CategoryIcon size={18} color={colors.primary} />
          </View>
        )}

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.itemBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.brand && `${item.brand} · `}{item._locationPath || t('common.no')}
              </Text>
            </View>
            <View style={styles.itemValue}>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => toggleFavorite(item.id)}
                  style={styles.favoriteBtn}
                >
                  <Star
                    size={18}
                    color={item._isFavorite ? colors.primary : colors.textTertiary}
                    fill={item._isFavorite ? colors.primary : 'none'}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.residualValue, { color: colors.text }]}>
                ¥{formatPrice(item._residualFen)}
              </Text>
              <Text style={[styles.depreciation, { color: colors.textTertiary }]}>
                -{item._depreciation}%
              </Text>
            </View>
          </View>

          {item.warrantyEndDate && (
            <View style={styles.warrantyBarContainer}>
              <View style={[styles.warrantyBarBackground, { backgroundColor: colors.surfaceVariant }]}>
                <View 
                  style={[
                    styles.warrantyBarFill,
                    item._warrantyStatus === 'danger' && { backgroundColor: colors.error },
                    item._warrantyStatus === 'warning' && { backgroundColor: colors.warning || '#F59E0B' },
                    { width: `${Math.min(item._warrantyProgress, 100)}%` }
                  ]}
                />
              </View>
              <View style={styles.warrantyBarInfo}>
                <Text style={[styles.warrantyBarText, { color: item._warrantyStatus === 'danger' ? colors.error : (colors.warning || '#F59E0B') }]}>
                  {item._warrantyStatus === 'danger' 
                    ? t('item.warrantyExpiredDays', { days: Math.abs(item._warrantyDays) })
                    : t('item.warrantyRemaining', { days: item._warrantyDays })}
                </Text>
                <Text style={[styles.warrantyBarText, { color: colors.textTertiary }]}>
                  {formatDate(item.warrantyEndDate)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('home.warranty')}
        </Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={toggleSortOrder}
        >
          <ArrowUpDown size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary - Clickable filter */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.summaryItem,
            filter === 'danger' && [styles.summaryItemActive, { backgroundColor: colors.error + '15' }],
          ]}
          onPress={() => setFilter(filter === 'danger' ? 'all' : 'danger')}
          activeOpacity={0.7}
        >
          <Text style={[styles.summaryValue, { color: colors.error }]}>{dangerCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('item.warrantyExpired')}</Text>
        </TouchableOpacity>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[
            styles.summaryItem,
            filter === 'warning' && [styles.summaryItemActive, { backgroundColor: (colors.warning || '#F59E0B') + '15' }],
          ]}
          onPress={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
          activeOpacity={0.7}
        >
          <Text style={[styles.summaryValue, { color: colors.warning || '#F59E0B' }]}>{warningCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('item.warrantyExpiring')}</Text>
        </TouchableOpacity>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={[
            styles.summaryItem,
            filter === 'all' && [styles.summaryItemActive, { backgroundColor: colors.primary + '15' }],
          ]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.summaryValue, { color: colors.text }]}>{baseWarrantyItems.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('common.total')}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={warrantyItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Shield size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('common.noData')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sortBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  summaryItemActive: {
    borderRadius: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  itemIcon: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: 12,
  },
  itemValue: {
    alignItems: 'flex-end',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  favoriteBtn: {
    padding: 4,
  },
  residualValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  depreciation: {
    fontSize: 11,
  },
  warrantyBarContainer: {
    marginTop: 8,
  },
  warrantyBarBackground: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  warrantyBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  warrantyBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  warrantyBarText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
