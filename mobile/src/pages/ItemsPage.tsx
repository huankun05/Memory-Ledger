import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, ScrollView, StatusBar, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Search, X, ArrowUpDown, Trash2, MapPin, Star, Shield, ArrowUp, ArrowDown, Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore, useItems, useLocations, useFavorites, useCustomCategories } from '../store';
import { Item, ItemCategory } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { calculateResidualValue, getWarrantyDays, getWarrantyStatus, enhanceItem } from '../utils/itemCalculations';
import { formatPrice, formatDate } from '../utils/formatters';
import { getCategoryDisplayName } from '../utils/categoryLabel';
import LocationTreePicker from '../components/LocationTreePicker';
import CategoryPickerModal from '../components/CategoryPickerModal';

const CATEGORIES: Array<{ value: ItemCategory | 'all'; label: string }> = [
  { value: 'all', label: 'search.allCategories' },
  { value: 'electronics', label: 'item.categories.electronics' },
  { value: 'clothing', label: 'item.categories.clothing' },
  { value: 'books', label: 'item.categories.books' },
  { value: 'kitchen', label: 'item.categories.kitchen' },
  { value: 'furniture', label: 'item.categories.furniture' },
  { value: 'sports', label: 'item.categories.sports' },
  { value: 'toys', label: 'item.categories.toys' },
  { value: 'tools', label: 'item.categories.tools' },
  { value: 'documents', label: 'item.categories.documents' },
  { value: 'cosmetics', label: 'item.categories.cosmetics' },
  { value: 'medicine', label: 'item.categories.medicine' },
  { value: 'food', label: 'item.categories.food' },
  { value: 'accessories', label: 'item.categories.accessories' },
  { value: 'shoes', label: 'item.categories.shoes' },
  { value: 'bags', label: 'item.categories.bags' },
  { value: 'homeAppliances', label: 'item.categories.homeAppliances' },
  { value: 'digitalAccessories', label: 'item.categories.digitalAccessories' },
  { value: 'stationery', label: 'item.categories.stationery' },
  { value: 'plants', label: 'item.categories.plants' },
  { value: 'art', label: 'item.categories.art' },
  { value: 'collectibles', label: 'item.categories.collectibles' },
  { value: 'musicalInstruments', label: 'item.categories.musicalInstruments' },
  { value: 'cameras', label: 'item.categories.cameras' },
  { value: 'automotive', label: 'item.categories.automotive' },
  { value: 'baby', label: 'item.categories.baby' },
  { value: 'petSupplies', label: 'item.categories.petSupplies' },
  { value: 'outdoor', label: 'item.categories.outdoor' },
  { value: 'other', label: 'item.categories.other' },
];

export default function ItemsPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const items = useItems();
  const locations = useLocations();
  const favorites = useFavorites();
  const customCategories = useCustomCategories();
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const removeItem = useAppStore((s) => s.removeItem);
  const moveItem = useAppStore((s) => s.moveItem);
  const loadCustomCategories = useAppStore((s) => s.loadCustomCategories);
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date' | 'residual' | 'warranty' | 'idle'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const warrantyCount = useMemo(() => {
    return items.filter((item) => {
      const status = getWarrantyStatus(item.warrantyEndDate);
      return status === 'danger' || status === 'warning';
    }).length;
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      const matchQuery = !query || 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(query.toLowerCase())) ||
        item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      const matchCat = category === 'all' || item.category === category;
      const matchFav = !filterFavorites || favorites.includes(item.id);
      return matchQuery && matchCat && matchFav;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0);
          break;
        case 'date':
          comparison = new Date(a.purchaseDate || 0).getTime() - new Date(b.purchaseDate || 0).getTime();
          break;
        case 'residual':
          const residualA = calculateResidualValue(a.purchasePrice || 0, a.purchaseDate || new Date().toISOString(), a.category, a.customDepreciationRate);
          const residualB = calculateResidualValue(b.purchasePrice || 0, b.purchaseDate || new Date().toISOString(), b.category, b.customDepreciationRate);
          comparison = residualA - residualB;
          break;
        case 'warranty':
          const hasWarrantyA = !!a.warrantyEndDate;
          const hasWarrantyB = !!b.warrantyEndDate;
          if (!hasWarrantyA && hasWarrantyB) {
            comparison = 1;
          } else if (hasWarrantyA && !hasWarrantyB) {
            comparison = -1;
          } else {
            comparison = getWarrantyDays(a.warrantyEndDate) - getWarrantyDays(b.warrantyEndDate);
          }
          break;
        case 'idle':
          comparison = new Date(a.movedAt || a.updatedAt || 0).getTime() - new Date(b.movedAt || b.updatedAt || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result.map((item) => enhanceItem(item, locations, favorites));
  }, [items, query, category, sortBy, sortOrder, filterFavorites, favorites, locations]);

  const frequentCategories = useMemo(() => {
    const catCount: Record<string, number> = {};
    items.forEach((item) => {
      catCount[item.category] = (catCount[item.category] || 0) + 1;
    });
    const sorted = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);
    
    // 确保选中的分类在列表中显示
    let result = ['all', ...sorted];
    if (category !== 'all' && !result.includes(category)) {
      // 如果选中的分类不在高频列表中，添加到列表末尾
      result = [...result.slice(0, 4), category]; // 保留 'all' + 3个高频 + 选中的
    }
    return result;
  }, [items, category]);

  const handleLongPress = (itemId: string) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([itemId]));
    }
  };

  const handlePressIn = (itemId: string) => {
    if (selectMode) return;
    longPressTimer.current = setTimeout(() => {
      handleLongPress(itemId);
    }, 500);
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleSelect = (itemId: string) => {
    if (!selectMode) return;
    const next = new Set(selectedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
      if (next.size === 0) {
        setSelectMode(false);
      }
    } else {
      next.add(itemId);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
      setSelectMode(false);
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    Alert.alert(
      t('common.confirm'),
      `${t('common.delete')} (${selectedIds.size})`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setBatchProcessing(true);
            const ids = Array.from(selectedIds);
            for (const id of ids) {
              await removeItem(id);
            }
            setBatchProcessing(false);
            exitSelectMode();
          },
        },
      ]
    );
  };

  const handleBatchMove = async () => {
    if (!selectedLocationId) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await moveItem(id, selectedLocationId, moveNote || undefined);
    }
    setBatchProcessing(false);
    setShowMoveModal(false);
    exitSelectMode();
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (route.params?.filterFavorites) {
      setFilterFavorites(true);
    }
    if (route.params?.sortBy) {
      setSortBy(route.params.sortBy);
      setSortOrder(route.params.sortOrder || 'asc');
    }
    loadCustomCategories();
  }, [route.params]);

  const renderCategoryLabel = (catValue: string): string => {
    if (catValue === 'all') return t('search.allCategories');
    return getCategoryDisplayName(catValue, customCategories, i18n);
  };

  const handleCategorySelect = (catId: string, _catName: string) => {
    setCategory(catId);
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isSelected = selectedIds.has(item.id);
    const CategoryIcon = getCategoryIcon(item.category);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          { backgroundColor: colors.surface },
          isSelected && { borderWidth: 2, borderColor: colors.primary },
          item._warrantyStatus === 'danger' && { borderLeftWidth: 4, borderLeftColor: colors.error },
          item._warrantyStatus === 'warning' && { borderLeftWidth: 4, borderLeftColor: colors.warning || '#F59E0B' },
        ]}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else {
            navigation.navigate('ItemDetail', { id: item.id });
          }
        }}
        onLongPress={() => handleLongPress(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {selectMode && (
          <View style={[
            styles.checkbox,
            isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
          ]}>
            {isSelected && <Check size={12} color={colors.onPrimary} />}
          </View>
        )}
        
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
              {!selectMode && (
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
              )}
              <Text style={[styles.residualValue, { color: colors.text }]}>
                ¥{formatPrice(item._residualFen)}
              </Text>
              <Text style={[styles.depreciation, { color: colors.textTertiary }]}>
                -{item._depreciation}%
              </Text>
            </View>
          </View>
          
          <View style={styles.itemTags}>
            {item._warrantyStatus && item._warrantyStatus !== 'ok' && (
              <View style={[
                styles.warrantyTag,
                item._warrantyStatus === 'danger' 
                  ? { backgroundColor: colors.error + '20' } 
                  : { backgroundColor: (colors.warning || '#F59E0B') + '20' }
              ]}>
                <Shield 
                  size={12} 
                  color={item._warrantyStatus === 'danger' ? colors.error : (colors.warning || '#F59E0B')} 
                />
                <Text style={[
                  styles.warrantyTagText,
                  { color: item._warrantyStatus === 'danger' ? colors.error : (colors.warning || '#F59E0B') }
                ]}>
                  {item._warrantyStatus === 'danger' ? t('item.warrantyExpired') : t('item.warrantyExpiring')}
                </Text>
              </View>
            )}
          </View>
          
          {item.warrantyEndDate && (
            <View style={styles.warrantyBarContainer}>
              <View style={[styles.warrantyBarBackground, { backgroundColor: colors.surfaceVariant }]}>
                <View 
                  style={[
                    styles.warrantyBarFill,
                    item._warrantyStatus === 'danger' && { backgroundColor: colors.error },
                    item._warrantyStatus === 'warning' && { backgroundColor: colors.warning || '#F59E0B' },
                    item._warrantyStatus === 'ok' && { backgroundColor: colors.success || '#10B981' },
                    { width: `${item._warrantyProgress}%` }
                  ]}
                />
              </View>
              <View style={styles.warrantyBarInfo}>
                <Text style={[styles.warrantyBarText, { color: colors.textTertiary }]}>
                  {item._warrantyStatus === 'danger' 
                    ? t('item.warrantyExpiredDays', { days: Math.abs(item._warrantyDays) })
                    : item._warrantyStatus === 'warning'
                    ? t('item.warrantyRemaining', { days: item._warrantyDays })
                    : t('item.warrantyValid')}
                </Text>
                <Text style={[styles.warrantyBarText, { color: colors.textTertiary }]}>
                  {item.warrantyEndDate}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, selectMode, colors, t, toggleFavorite, navigation, handleLongPress, renderCategoryLabel]);

  const cycleSort = () => {
    setShowSortModal(true);
  };

  const sortOptions = [
    { key: 'date', label: t('sort.date') },
    { key: 'price', label: t('sort.price') },
    { key: 'residual', label: t('sort.residual') },
    { key: 'name', label: t('sort.name') },
    { key: 'warranty', label: t('sort.warranty') },
    { key: 'idle', label: t('sort.idle') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 8 }]}>
        {selectMode ? (
          <View style={styles.selectHeader}>
            <TouchableOpacity onPress={exitSelectMode} style={[styles.exitBtn, { backgroundColor: colors.surfaceVariant }]}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.selectInfo}>
              <Text style={[styles.selectTitle, { color: colors.text }]}>
                {selectedIds.size} / {filtered.length}
              </Text>
              <Text style={[styles.selectSubtitle, { color: colors.textSecondary }]}>
                {t('common.selected')}
              </Text>
            </View>
            <TouchableOpacity onPress={selectAll} style={[styles.selectAllBtn, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>
                {selectedIds.size === filtered.length ? t('common.cancel') : t('common.all')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('nav.items')}
              </Text>
              <Text style={[styles.countText, { color: colors.textTertiary }]}>
                {filtered.length}{t('common.unit.items')}
              </Text>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceVariant }]}>
              <Search size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
              />
              {query && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <X size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {frequentCategories.map((catValue) => {
                  const label = renderCategoryLabel(catValue);
                  const isSelected = category === catValue;
                  return (
                    <TouchableOpacity
                      key={catValue}
                      style={[
                        styles.categoryBtn,
                        isSelected 
                          ? { backgroundColor: colors.primary } 
                          : { backgroundColor: colors.surfaceVariant },
                      ]}
                      onPress={() => setCategory(catValue)}
                    >
                      <Text 
                        style={[
                          styles.categoryBtnText,
                          isSelected ? { color: colors.onPrimary } : { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.categoryBtn,
                    styles.moreCategoryBtn,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={[styles.categoryBtnText, { color: colors.textSecondary }]}>
                    {t('common.more')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
              <View style={styles.filterActions}>
                <TouchableOpacity 
                  onPress={() => setFilterFavorites(!filterFavorites)} 
                  style={[
                    styles.favFilterBtn, 
                    filterFavorites 
                      ? { backgroundColor: colors.primary } 
                      : { backgroundColor: colors.surfaceVariant }
                  ]}
                >
                  <Star
                    size={18}
                    color={filterFavorites ? colors.onPrimary : colors.textSecondary}
                    fill={filterFavorites ? colors.onPrimary : 'none'}
                  />
                </TouchableOpacity>
                <View style={[styles.sortBtn, { backgroundColor: colors.surfaceVariant }]}>
                  <TouchableOpacity 
                    onPress={cycleSort} 
                    style={styles.sortTextBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 5 }}
                  >
                    <Text style={[styles.sortText, { color: colors.textSecondary }]}>
                      {sortOptions.find(o => o.key === sortBy)?.label}
                    </Text>
                  </TouchableOpacity>
                  <View style={[styles.sortDivider, { backgroundColor: colors.border }]} />
                  <TouchableOpacity 
                    onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    style={styles.sortOrderBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
                  >
                    {sortOrder === 'asc' 
                      ? <ArrowUp size={16} color={colors.textSecondary} />
                      : <ArrowDown size={16} color={colors.textSecondary} />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        ListHeaderComponent={null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('common.noData')}
            </Text>
          </View>
        }
      />

      {/* Batch Action Bar */}
      {selectMode && (
        <View style={[styles.batchBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.batchBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedLocationId('');
              setMoveNote('');
              setShowMoveModal(true);
            }}
            disabled={selectedIds.size === 0 || batchProcessing}
          >
            <MapPin size={16} color={colors.onPrimary} />
            <Text style={[styles.batchBtnText, { color: colors.onPrimary }]}>
              {t('location.moveItem')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchBtn, styles.deleteBtn, { borderColor: colors.error }]}
            onPress={handleBatchDelete}
            disabled={selectedIds.size === 0 || batchProcessing}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.batchBtnText, { color: colors.error }]}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Move Modal */}
      <Modal visible={showMoveModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowMoveModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('location.moveItem')}
              </Text>
              <TouchableOpacity onPress={() => setShowMoveModal(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.locationList}>
              <LocationTreePicker
                locations={locations}
                selectedId={selectedLocationId}
                onSelect={setSelectedLocationId}
              />
            </View>

            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('item.notes')}
              placeholderTextColor={colors.textTertiary}
              value={moveNote}
              onChangeText={setMoveNote}
            />

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleBatchMove}
              disabled={!selectedLocationId || batchProcessing}
            >
              {batchProcessing ? (
                <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>{t('common.processing')}</Text>
              ) : (
                <>
                  <Check size={16} color={colors.onPrimary} />
                  <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
                    {t('common.confirm')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSortModal(false)} />
          <View style={[styles.sortModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('sort.title')}
              </Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptions}>
              {sortOptions.map((option) => {
                const isSelected = sortBy === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortOptionItem,
                      isSelected ? { backgroundColor: colors.primary + '15' } : {},
                    ]}
                    onPress={() => {
                      if (sortBy === option.key) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(option.key as any);
                        setSortOrder('desc');
                      }
                    }}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      { color: isSelected ? colors.primary : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.sortOrderIcons}>
                        {sortOrder === 'asc' 
                          ? <ArrowUp size={16} color={colors.primary} />
                          : <ArrowDown size={16} color={colors.primary} />
                        }
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        selectedCategory={category}
        onSelect={handleCategorySelect}
        onClose={() => setShowCategoryPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  countText: {
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    minHeight: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    minHeight: 32,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
    minWidth: 40,
    maxWidth: 120,
  },
  categoryBtnText: {
    fontSize: 12,
  },
  moreCategoryBtn: {
    marginRight: 0,
  },
  sortBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sortText: {
    fontSize: 12,
  },
  sortDivider: {
    width: 1,
    height: 16,
  },
  sortOrderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favFilterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterText: {
    fontSize: 20,
  },
  selectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectInfo: {
    flex: 1,
  },
  selectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectSubtitle: {
    fontSize: 12,
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectAllText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemBrand: {
    fontSize: 12,
    marginTop: 4,
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
    padding: 6,
  },
  favoriteStar: {
    fontSize: 20,
  },
  residualValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  depreciation: {
    fontSize: 10,
  },
  itemTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
  },
  warrantyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warrantyTagText: {
    fontSize: 10,
    fontWeight: '500',
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
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  batchBar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  batchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  deleteBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  batchBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortModalTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortOptions: {
    gap: 4,
  },
  sortOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sortOptionText: {
    fontSize: 14,
  },
  sortOrderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationList: {
    maxHeight: 256,
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  locationCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  warrantyAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  warrantyAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warrantyAlertInfo: {
    flex: 1,
  },
  warrantyAlertTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  warrantyAlertDesc: {
    fontSize: 12,
  },
});