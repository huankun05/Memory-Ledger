import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Calendar, Shield, Clock, ChevronRight, Edit2, Trash2, Check, X, PiggyBank, Tag, FileText, Hash, Package, Plus, TrendingDown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore, useItems, useLocations, useCustomCategories } from '../store';
import { ItemCategory } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { getLocationPath, formatPrice, formatDate } from '../utils/formatters';
import { getEffectiveDepreciationRate, getCategoryDepreciationRate, calculateResidualValue, getDepreciationPercent, calculateDailyCost, getWarrantyStatus, getIdleDays } from '../utils/itemCalculations';
import { getCategoryDisplayName } from '../utils/categoryLabel';
import DatePicker from '../components/DatePicker';
import CategoryPickerModal from '../components/CategoryPickerModal';
import LocationTreePicker from '../components/LocationTreePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type QuickEditField = 'name' | 'brand' | 'purchasePrice' | 'purchaseDate' | 'warrantyEndDate' | 'notes' | null;

export default function ItemDetailPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const items = useItems();
  const locations = useLocations();
  const customCategories = useCustomCategories();
  const removeItem = useAppStore((s) => s.removeItem);
  const moveItem = useAppStore((s) => s.moveItem);
  const loadCustomCategories = useAppStore((s) => s.loadCustomCategories);
  const insets = useSafeAreaInsets();

  const id = route.params?.id;
  const item = items.find(i => i.id === id);

  const [deleting, setDeleting] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [moving, setMoving] = useState(false);
  const [quickEditField, setQuickEditField] = useState<QuickEditField>(null);
  const [quickEditValue, setQuickEditValue] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDepreciationEditor, setShowDepreciationEditor] = useState(false);
  const [depreciationInput, setDepreciationInput] = useState('');
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const lastTapRef = useRef<number>(0);
  const lastTapFieldRef = useRef<QuickEditField>(null);

  const updateItem = useAppStore((s) => s.updateItem);

  useEffect(() => {
    loadCustomCategories();
  }, [loadCustomCategories]);

  const handleDoubleTap = (field: QuickEditField) => {
    // 单击即可触发快速编辑
    openQuickEdit(field);
  };

  // 打开折旧率编辑器
  const openDepreciationEditor = () => {
    if (!item) return;
    const currentRate = getEffectiveDepreciationRate(item.category, item.customDepreciationRate, customCategories);
    setDepreciationInput((currentRate * 100).toFixed(1));
    setShowDepreciationEditor(true);
  };

  // 保存折旧率
  const handleDepreciationSave = async () => {
    if (!item) return;
    const percent = parseFloat(depreciationInput);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      Alert.alert(t('common.error'), t('depreciation.invalidRate'));
      return;
    }
    const categoryDefault = getCategoryDepreciationRate(item.category, customCategories);
    const newRate = percent / 100;
    // 如果新值等于分类默认值，则清除自定义设置，使用分类默认
    const customRate = Math.abs(newRate - categoryDefault) < 0.0001 ? null : newRate;
    try {
      await updateItem(item.id, { customDepreciationRate: customRate });
      setShowDepreciationEditor(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  // 重置为分类默认折旧率
  const handleDepreciationReset = async () => {
    if (!item) return;
    try {
      await updateItem(item.id, { customDepreciationRate: null });
      setShowDepreciationEditor(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const openQuickEdit = (field: QuickEditField) => {
    if (!item || !field) return;
    let value = '';
    switch (field) {
      case 'name':
        value = item.name;
        setQuickEditField(field);
        setQuickEditValue(value);
        break;
      case 'brand':
        value = item.brand || '';
        setQuickEditField(field);
        setQuickEditValue(value);
        break;
      case 'purchasePrice':
        value = ((item.purchasePrice || 0) / 100).toString();
        setQuickEditField(field);
        setQuickEditValue(value);
        break;
      case 'purchaseDate':
        // 日期字段使用日期选择器
        setQuickEditField(field);
        setQuickEditValue(item.purchaseDate || new Date().toISOString().split('T')[0]);
        setShowDatePicker(true);
        return;
      case 'warrantyEndDate':
        // 日期字段使用日期选择器
        setQuickEditField(field);
        setQuickEditValue(item.warrantyEndDate || new Date().toISOString().split('T')[0]);
        setShowDatePicker(true);
        return;
      case 'notes':
        value = item.notes || '';
        setQuickEditField(field);
        setQuickEditValue(value);
        break;
    }
  };

  const handleDatePickerChange = (date: string) => {
    setQuickEditValue(date);
  };

  const handleDatePickerConfirm = async (date: string) => {
    if (!item || !quickEditField) return;
    if (!date) return;
    setShowDatePicker(false);
    setQuickEditField(null);
    setSavingQuickEdit(true);
    try {
      let updates: Record<string, any> = {};
      if (quickEditField === 'purchaseDate') {
        updates.purchaseDate = date;
      } else if (quickEditField === 'warrantyEndDate') {
        updates.warrantyEndDate = date;
      }
      await updateItem(item.id, updates);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const handleQuickEditSave = async () => {
    if (!item || !quickEditField) return;
    setSavingQuickEdit(true);
    try {
      let updates: Record<string, any> = {};
      switch (quickEditField) {
        case 'name':
          if (!quickEditValue.trim()) {
            Alert.alert(t('common.error'), t('add.nameRequired'));
            return;
          }
          updates.name = quickEditValue.trim();
          break;
        case 'brand':
          updates.brand = quickEditValue.trim() || undefined;
          break;
        case 'purchasePrice':
          const price = parseFloat(quickEditValue);
          if (isNaN(price) || price < 0) {
            Alert.alert(t('common.error'), t('error.invalidPrice'));
            return;
          }
          updates.purchasePrice = Math.round(price * 100);
          break;
        case 'purchaseDate':
          if (!quickEditValue.trim()) {
            Alert.alert(t('common.error'), t('error.invalidDate'));
            return;
          }
          updates.purchaseDate = quickEditValue.trim();
          break;
        case 'warrantyEndDate':
          updates.warrantyEndDate = quickEditValue.trim() || undefined;
          break;
        case 'notes':
          updates.notes = quickEditValue.trim() || undefined;
          break;
      }
      await updateItem(item.id, updates);
      setQuickEditField(null);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const getQuickEditTitle = (): string => {
    if (!quickEditField) return '';
    const titles: Record<string, string> = {
      name: t('item.itemName'),
      brand: t('itemDetail.brand'),
      purchasePrice: t('itemDetail.purchasePrice'),
      purchaseDate: t('itemDetail.purchaseDate'),
      warrantyEndDate: t('itemDetail.expireDate'),
      notes: t('itemDetail.notes'),
    };
    return titles[quickEditField] || '';
  };

  const getQuickEditIcon = () => {
    if (!quickEditField) return null;
    const iconProps = { size: 18, color: colors.primary };
    switch (quickEditField) {
      case 'name':
        return <Tag {...iconProps} />;
      case 'brand':
        return <Hash {...iconProps} />;
      case 'purchasePrice':
        return <PiggyBank {...iconProps} />;
      case 'purchaseDate':
        return <Calendar {...iconProps} />;
      case 'warrantyEndDate':
        return <Shield {...iconProps} />;
      case 'notes':
        return <FileText {...iconProps} />;
      default:
        return null;
    }
  };

  const stats = useMemo(() => {
    if (!item) return null;
    const purchasePrice = item.purchasePrice || 0;
    const purchaseDate = item.purchaseDate || new Date().toISOString();
    const residual = calculateResidualValue(purchasePrice, purchaseDate, item.category, item.customDepreciationRate);
    const residualFen = Math.round(residual * 100);
    const depreciation = purchasePrice > 0 ? getDepreciationPercent(purchasePrice, residual) : 0;
    const warrantyStatus = getWarrantyStatus(item.warrantyEndDate);
    const daysSincePurchase = getIdleDays(purchaseDate);
    const idleDays = getIdleDays(item.movedAt || item.updatedAt);
    const dailyCost = calculateDailyCost(purchasePrice, purchaseDate);
    const dailyCostLevel = dailyCost > 10 ? 'expensive' : dailyCost > 5 ? 'medium' : 'cheap';

    return {
      residualFen,
      depreciation,
      warrantyStatus,
      daysSincePurchase,
      idleDays,
      dailyCost,
      dailyCostLevel,
    };
  }, [item]);

  if (!item || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceVariant }]}
          >
            <ArrowLeft size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('error.itemNotFound')}
          </Text>
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    Alert.alert(
      t('common.delete'),
      t('item.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            await removeItem(item.id);
            navigation.navigate('Items');
          },
        },
      ]
    );
  };

  const handleMoveConfirm = async () => {
    if (!selectedLocationId || selectedLocationId === item.locationId) {
      setShowMoveModal(false);
      return;
    }
    setMoving(true);
    await moveItem(item.id, selectedLocationId, moveNote || undefined);
    setMoving(false);
    setShowMoveModal(false);
  };

  const locationName = getLocationPath(item.locationId, locations);

  const dailyCostLevelKey: Record<string, string> = {
    expensive: 'itemDetail.dailyCostLevelExpensive',
    medium: 'itemDetail.dailyCostLevelMedium',
    cheap: 'itemDetail.dailyCostLevelCheap',
  };

  const dailyCostColor = stats.dailyCostLevel === 'expensive'
    ? colors.error
    : stats.dailyCostLevel === 'medium'
      ? colors.secondary
      : colors.tertiary;

  const warrantyColor = stats.warrantyStatus === 'danger'
    ? colors.error
    : stats.warrantyStatus === 'warning'
      ? colors.primary
      : colors.tertiary;

  const renderCategoryLabel = (): string => {
    return getCategoryDisplayName(item.category, customCategories, i18n);
  };

  const handleCategorySelect = (catId: string, _catName: string) => {
    if (!item) return;
    updateItem(item.id, { category: catId });
    setShowCategoryPicker(false);
  };

  const openTagEditor = () => {
    if (!item) return;
    setEditingTags([...item.tags]);
    setTagInput('');
    setShowTagEditor(true);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !editingTags.includes(tag)) {
      setEditingTags([...editingTags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setEditingTags(editingTags.filter((t) => t !== tag));
  };

  const saveTags = async () => {
    if (!item) return;
    try {
      await updateItem(item.id, { tags: editingTags });
      setShowTagEditor(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceVariant }]}
        >
          <ArrowLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDoubleTap('name')}
        >
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('EditItem', { id: item.id })} 
          style={[styles.editBtn, { backgroundColor: colors.surfaceVariant }]}
        >
          <Edit2 size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        {item.imageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemDetailImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Residual Value Card */}
        <View style={[styles.valueCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>
            {t('itemDetail.currentResidual')}
          </Text>
          <Text style={[styles.valueAmount, { color: colors.text }]}>
            ¥{formatPrice(stats.residualFen)}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleDoubleTap('purchasePrice')}
            style={styles.valueRow}
          >
            <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
              ¥{formatPrice(item.purchasePrice || 0)}
            </Text>
            <Text style={[styles.depreciationPercent, { color: colors.error }]}>
              -{stats.depreciation}%
            </Text>
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${100 - stats.depreciation}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.residualValue')} {100 - stats.depreciation}%
              </Text>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.monthsUsed', { months: Math.round(stats.daysSincePurchase / 30) })}
              </Text>
            </View>
          </View>
          {/* 折旧率调整入口 */}
          <TouchableOpacity
            style={[styles.depreciationRateRow, { borderTopColor: colors.border }]}
            onPress={openDepreciationEditor}
            activeOpacity={0.7}
          >
            <View style={styles.depreciationRateLeft}>
              <TrendingDown size={14} color={colors.textSecondary} />
              <Text style={[styles.depreciationRateLabel, { color: colors.textSecondary }]}>
                {t('depreciation.rateLabel')}
              </Text>
            </View>
            <View style={styles.depreciationRateRight}>
              <Text style={[
                styles.depreciationRateValue,
                {
                  color: item?.customDepreciationRate != null ? colors.primary : colors.textSecondary,
                  fontWeight: item?.customDepreciationRate != null ? '600' : '400',
                }
              ]}>
                {(getEffectiveDepreciationRate(item!.category, item?.customDepreciationRate, customCategories) * 100).toFixed(1)}%
                {item?.customDepreciationRate != null ? ` (${t('depreciation.custom')})` : ` (${t('depreciation.default')})`}
              </Text>
              <ChevronRight size={14} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Daily Cost Card */}
        <View style={[styles.dailyCostCard, { backgroundColor: colors.surface }]}>
          <View style={styles.dailyCostHeader}>
            <View style={[styles.dailyCostIcon, { backgroundColor: dailyCostColor + '20' }]}>
              <PiggyBank size={20} color={dailyCostColor} />
            </View>
            <View style={styles.dailyCostInfo}>
              <Text style={[styles.dailyCostLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.dailyCost')}
              </Text>
              <Text style={[styles.dailyCostValue, { color: dailyCostColor }]}>
                ¥{stats.dailyCost.toFixed(2)}
                <Text style={[styles.dailyCostUnit, { color: colors.textSecondary }]}> {t('itemDetail.perDay')}</Text>
              </Text>
            </View>
            <View style={styles.dailyCostBadge}>
              <Text style={[styles.dailyCostBadgeText, { color: colors.textSecondary }]}>
                {t('itemDetail.daysUsed', { days: stats.daysSincePurchase })}
              </Text>
              <View style={[styles.costLevelBadge, { backgroundColor: dailyCostColor + '20' }]}>
                <Text style={[styles.costLevelText, { color: dailyCostColor }]}>
                  {t(dailyCostLevelKey[stats.dailyCostLevel])}
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.dailyCostDesc, { color: colors.textSecondary }]}>
            {t('itemDetail.dailyCostDesc', { days: stats.daysSincePurchase, cost: stats.dailyCost.toFixed(2) })}
          </Text>
        </View>

        {/* Basic Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {t('itemDetail.basicInfo')}
          </Text>
          <View style={styles.infoList}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowCategoryPicker(true)}
              style={[styles.infoItem, styles.infoItemClickable, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.category')}
              </Text>
              <View style={styles.infoValueRow}>
                <View style={styles.categoryDisplay}>
                  {(() => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    return <CategoryIcon size={16} color={colors.primary} />;
                  })()}
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {renderCategoryLabel()}
                  </Text>
                </View>
                <ChevronRight size={12} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDoubleTap('brand')}
              style={[styles.infoItem, styles.infoItemClickable, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.brand')}
              </Text>
              <View style={styles.infoValueRow}>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {item.brand || t('common.notSet')}
                </Text>
                <ChevronRight size={12} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDoubleTap('purchaseDate')}
              style={[styles.infoItem, styles.infoItemClickable, { borderBottomColor: colors.border }]}
            >
              <View style={styles.infoLabelRow}>
                <Calendar size={13} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {t('itemDetail.purchaseDate')}
                </Text>
              </View>
              <View style={styles.infoValueRow}>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(item.purchaseDate || '')}
                </Text>
                <ChevronRight size={12} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDoubleTap('purchasePrice')}
              style={[styles.infoItem, styles.infoItemClickable, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.purchasePrice')}
              </Text>
              <View style={styles.infoValueRow}>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  ¥{formatPrice(item.purchasePrice || 0)}
                </Text>
                <ChevronRight size={12} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.infoItem, styles.infoItemClickable]}
              onPress={() => {
                setSelectedLocationId(item.locationId || '');
                setMoveNote('');
                setShowMoveModal(true);
              }}
            >
              <View style={styles.infoLabelRow}>
                <MapPin size={13} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {t('itemDetail.location')}
                </Text>
              </View>
              <View style={styles.infoValueRow}>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {locationName || t('common.notSet')}
                </Text>
                <ChevronRight size={12} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity & Purchase Info Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EditItem', { id: item.id })}
          style={[styles.warrantyCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}
        >
          <View style={styles.warrantyHeader}>
            <Tag size={18} color={colors.primary} />
            <Text style={[styles.warrantyTitle, { color: colors.text }]}>
              {t('item.quantityAndSource')}
            </Text>
            <ChevronRight size={14} color={colors.textTertiary} />
          </View>
          <View style={styles.warrantyList}>
            <View style={styles.warrantyItem}>
              <Text style={[styles.warrantyLabel, { color: colors.textSecondary }]}>{t('item.quantity')}</Text>
              <Text style={[styles.warrantyValue, { color: colors.text }]}>
                {item.quantity || 1}{t('common.unit.items')}
              </Text>
            </View>
            {item.purchaseStore && (
              <View style={styles.warrantyItem}>
                <Text style={[styles.warrantyLabel, { color: colors.textSecondary }]}>{t('item.purchaseChannel')}</Text>
                <Text style={[styles.warrantyValue, { color: colors.text }]}>{item.purchaseStore}</Text>
              </View>
            )}
            {item.serialNumber && (
              <View style={styles.warrantyItem}>
                <Text style={[styles.warrantyLabel, { color: colors.textSecondary }]}>{t('item.serialNumberLabel')}</Text>
                <Text style={[styles.warrantyValue, { color: colors.text }]}>{item.serialNumber}</Text>
              </View>
            )}
            <View style={styles.warrantyItem}>
              <Text style={[styles.warrantyLabel, { color: colors.textSecondary }]}>{t('item.status')}</Text>
              <Text style={[styles.warrantyValue, { color: colors.primary }]}>
                {t(`item.statuses.${item.status}`) || t('item.statuses.inUse')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Warranty Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleDoubleTap('warrantyEndDate')}
          style={[styles.warrantyCard, styles.warrantyCardClickable, { backgroundColor: colors.surface, borderLeftColor: warrantyColor }]}
        >
          <View style={styles.warrantyHeader}>
            <Shield size={18} color={warrantyColor} />
            <Text style={[styles.warrantyTitle, { color: colors.text }]}>
              {t('itemDetail.warrantyInfo')}
            </Text>
            <ChevronRight size={14} color={colors.textTertiary} />
          </View>
          {item.warrantyEndDate ? (
            <View style={styles.warrantyList}>
              <View style={styles.warrantyItem}>
                <Text style={[styles.warrantyLabel, { color: colors.textSecondary }]}>
                  {t('itemDetail.expireDate')}
                </Text>
                <Text style={[styles.warrantyValue, { color: colors.text }]}>
                  {formatDate(item.warrantyEndDate)}
                </Text>
              </View>
              <View style={styles.warrantyItem}>
                <Text style={[styles.warrantyLabel, { color: colors.textSecondary }]}>
                  {(() => {
                    const days = Math.floor((new Date(item.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return days >= 0 ? t('itemDetail.remainingDays') : t('itemDetail.expiredDays');
                  })()}
                </Text>
                <Text style={[styles.warrantyValue, { color: warrantyColor }]}>
                  {(() => {
                    const days = Math.floor((new Date(item.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (days >= 0) {
                      return t('itemDetail.remainingDaysCount', { days });
                    }
                    return t('item.warrantyExpiredDays', { days: Math.abs(days) });
                  })()}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.warrantyEmpty, { color: colors.textSecondary }]}>
              {t('common.notSet')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Idle Status Card */}
        <View style={[styles.idleCard, { backgroundColor: colors.surface }]}>
          <View style={[
            styles.idleIcon,
            { backgroundColor: stats.idleDays > 180 ? colors.error + '20' : colors.primary + '20' },
          ]}>
            <Clock size={20} color={stats.idleDays > 180 ? colors.error : colors.primary} />
          </View>
          <View style={styles.idleInfo}>
            <Text style={[styles.idleTitle, { color: colors.text }]}>
              {stats.idleDays > 180 ? t('itemDetail.longIdle') : t('itemDetail.inUse')}
            </Text>
            <Text style={[styles.idleDesc, { color: colors.textSecondary }]}>
              {t('itemDetail.daysSinceLastMove', { days: stats.idleDays })}
            </Text>
          </View>
          {stats.idleDays > 180 && (
            <View style={[styles.idleBadge, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.idleBadgeText, { color: colors.error }]}>
                {t('itemDetail.suggestDispose')}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openTagEditor}
          style={[styles.tagsCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.tagsHeader}>
            <View style={styles.tagsLabelRow}>
              <Tag size={13} color={colors.textSecondary} />
              <Text style={[styles.tagsLabel, { color: colors.textSecondary }]}>
                {t('itemDetail.tags')}
              </Text>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </View>
          {item.tags.length > 0 ? (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag) => (
                <View key={tag} style={[styles.tagItem, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noTagsText, { color: colors.textTertiary }]}>
              {t('common.notSet')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Notes */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleDoubleTap('notes')}
          style={[styles.notesCard, styles.notesCardClickable, { backgroundColor: colors.surface }]}
        >
          <View style={styles.notesHeader}>
            <Text style={[styles.notesTitle, { color: colors.text }]}>
              {t('itemDetail.notes')}
            </Text>
            <ChevronRight size={14} color={colors.textTertiary} />
          </View>
          {item.notes ? (
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {item.notes}
            </Text>
          ) : (
            <Text style={[styles.notesEmpty, { color: colors.textTertiary }]}>
              {t('common.notSet')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.error }]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Trash2 size={16} color={colors.error} />
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>
                {t('itemDetail.deleteItem')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

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
              <TouchableOpacity 
                onPress={() => setShowMoveModal(false)} 
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
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
              onPress={handleMoveConfirm}
              disabled={!selectedLocationId || selectedLocationId === item?.locationId || moving}
            >
              {moving ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
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

      {/* Quick Edit Modal */}
      <Modal visible={!!quickEditField} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setQuickEditField(null)} />
          <View style={[styles.quickEditContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.quickEditIcon, { backgroundColor: colors.primary + '20' }]}>
                {getQuickEditIcon()}
              </View>
              <Text style={[styles.quickEditTitle, { color: colors.text }]}>
                {getQuickEditTitle()}
              </Text>
              <TouchableOpacity
                onPress={() => setQuickEditField(null)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.quickEditInput,
                { backgroundColor: colors.surfaceVariant, color: colors.text },
                quickEditField === 'notes' && styles.quickEditTextarea,
              ]}
              placeholder={getQuickEditTitle()}
              placeholderTextColor={colors.textTertiary}
              value={quickEditValue}
              onChangeText={setQuickEditValue}
              multiline={quickEditField === 'notes'}
              numberOfLines={quickEditField === 'notes' ? 4 : 1}
              textAlignVertical={quickEditField === 'notes' ? 'top' : 'center'}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleQuickEditSave}
              disabled={savingQuickEdit}
            >
              {savingQuickEdit ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Check size={16} color={colors.onPrimary} />
                  <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
                    {t('common.save')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <DatePicker
        visible={showDatePicker}
        value={quickEditValue || new Date().toISOString().split('T')[0]}
        title={quickEditField === 'warrantyEndDate' ? t('itemDetail.expireDate') : t('itemDetail.purchaseDate')}
        maxDate={quickEditField === 'purchaseDate' ? new Date().toISOString().split('T')[0] : undefined}
        minDate={quickEditField === 'warrantyEndDate' ? item?.purchaseDate : undefined}
        onChange={handleDatePickerChange}
        onConfirm={handleDatePickerConfirm}
        onClose={() => {
          setShowDatePicker(false);
          setQuickEditField(null);
        }}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        selectedCategory={item.category}
        onSelect={handleCategorySelect}
        onClose={() => setShowCategoryPicker(false)}
      />

      {/* Depreciation Rate Editor Modal */}
      <Modal visible={showDepreciationEditor} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowDepreciationEditor(false)} />
          <View style={[styles.quickEditContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.quickEditIcon, { backgroundColor: colors.primary + '20' }]}>
                <TrendingDown size={18} color={colors.primary} />
              </View>
              <Text style={[styles.quickEditTitle, { color: colors.text }]}>
                {t('depreciation.editorTitle')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDepreciationEditor(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.depreciationEditorDesc, { color: colors.textSecondary }]}>
              {t('depreciation.editorDesc')}
            </Text>

            <View style={[styles.depreciationInputRow, { backgroundColor: colors.surfaceVariant }]}>
              <TextInput
                style={[styles.depreciationInput, { color: colors.text }]}
                placeholder={t('depreciation.inputPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={depreciationInput}
                onChangeText={setDepreciationInput}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              <Text style={[styles.depreciationInputSuffix, { color: colors.textSecondary }]}>%</Text>
            </View>

            <View style={[styles.depreciationDefaultHint, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.depreciationDefaultHintText, { color: colors.textSecondary }]}>
                {t('depreciation.categoryDefault', { rate: (getCategoryDepreciationRate(item.category, customCategories) * 100).toFixed(1) })}
              </Text>
            </View>

            <View style={styles.depreciationBtnRow}>
              <TouchableOpacity
                style={[styles.resetBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={handleDepreciationReset}
              >
                <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>
                  {t('depreciation.resetToDefault')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.depreciationSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleDepreciationSave}
              >
                <Check size={16} color={colors.onPrimary} />
                <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tag Editor Modal */}
      <Modal visible={showTagEditor} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowTagEditor(false)} />
          <View style={[styles.tagEditorContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.quickEditIcon, { backgroundColor: colors.primary + '20' }]}>
                <Tag size={18} color={colors.primary} />
              </View>
              <Text style={[styles.quickEditTitle, { color: colors.text }]}>
                {t('itemDetail.tags')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTagEditor(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.tagInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('itemDetail.addTag')}
                placeholderTextColor={colors.textTertiary}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
                onPress={addTag}
              >
                <Plus size={18} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
              {editingTags.length === 0 ? (
                <Text style={[styles.noTagsText, { color: colors.textTertiary }]}>
                  {t('itemDetail.noTags')}
                </Text>
              ) : (
                <View style={styles.tagsEditContainer}>
                  {editingTags.map((tag) => (
                    <View key={tag} style={[styles.tagEditItem, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.tagEditText, { color: colors.text }]}>
                        {tag}
                      </Text>
                      <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <X size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={saveTags}
            >
              <Check size={16} color={colors.onPrimary} />
              <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemDetailImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
  },
  valueCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  valueLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  depreciationPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 10,
  },
  depreciationRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  depreciationRateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  depreciationRateLabel: {
    fontSize: 12,
  },
  depreciationRateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  depreciationRateValue: {
    fontSize: 12,
  },
  depreciationEditorDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  depreciationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  depreciationInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  depreciationInputSuffix: {
    fontSize: 16,
    fontWeight: '500',
  },
  depreciationDefaultHint: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  depreciationDefaultHintText: {
    fontSize: 12,
  },
  depreciationBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  depreciationSaveBtn: {
    flex: 1.5,
  },
  dailyCostCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  dailyCostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyCostIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyCostInfo: {
    flex: 1,
  },
  dailyCostLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dailyCostValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dailyCostUnit: {
    fontSize: 11,
  },
  dailyCostBadge: {
    alignItems: 'flex-end',
  },
  dailyCostBadgeText: {
    fontSize: 10,
    marginBottom: 4,
  },
  costLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  costLevelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dailyCostDesc: {
    fontSize: 12,
    marginTop: 12,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoItemClickable: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warrantyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  warrantyCardClickable: {
    borderLeftWidth: 4,
  },
  warrantyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warrantyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  warrantyList: {
    gap: 8,
  },
  warrantyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  warrantyLabel: {
    fontSize: 14,
  },
  warrantyValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  warrantyEmpty: {
    fontSize: 14,
  },
  idleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  idleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleInfo: {
    flex: 1,
  },
  idleTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  idleDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  idleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  idleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
  },
  notesCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  notesCardClickable: {},
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesEmpty: {
    fontSize: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 100,
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
    flexGrow: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    flexDirection: 'column',
    overflow: 'hidden',
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
  locationList: {
    flex: 1,
    minHeight: 256,
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
  quickEditContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  quickEditIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEditTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  quickEditInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  quickEditTextarea: {
    height: 120,
    paddingTop: 14,
  },
  tagsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  noTagsText: {
    fontSize: 14,
  },
  tagEditorContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  tagsEditContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagEditText: {
    fontSize: 13,
  },
});