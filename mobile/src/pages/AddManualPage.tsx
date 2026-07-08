import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package, Calendar, MapPin, Tag, Plus, X, Save, Clock, ChevronRight, Camera, Image as ImageIcon, ScanLine, ZoomIn } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore, useLocations } from '../store';
import { generateId } from '../database/db';
import { ItemCategory, ConsumptionType, ConsumptionTypeLabels } from '../types';
import LocationTreePicker from '../components/LocationTreePicker';
import CategoryPickerModal from '../components/CategoryPickerModal';
import { useCustomCategories } from '../store';
import { takePhoto, pickImageFromGallery, deleteImage } from '../utils/imageUtils';
import { bgRemoverService, type BgRemoverResult } from '../utils/bgRemover';
import { extractItemInfo, type ExtractedItemInfo } from '../utils/ocrUtils';
import { paddleOCR, type OCRTextBlock } from '../utils/paddleOCR';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemStatus, ItemStatusLabels } from '../types';
import { getCategoryDisplayName } from '../utils/categoryLabel';

const CONSUMPTION_TYPES: ConsumptionType[] = ['durable', 'consumable', 'rental', 'borrowed'];
const ITEM_STATUSES: ItemStatus[] = ['inUse', 'idle', 'discarded', 'donated', 'sold'];

export default function AddManualPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const locations = useLocations();
  const addItem = useAppStore((s) => s.addItem);
  const updateItem = useAppStore((s) => s.updateItem);
  const items = useAppStore((s) => s.items);
  const insets = useSafeAreaInsets();

  // Check if editing
  const editId = route.params?.id;
  const existingItem = editId ? items.find(i => i.id === editId) : null;
  const isEditMode = !!existingItem;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('electronics');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState('');
  const [warrantyEnd, setWarrantyEnd] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>('durable');
  const [quantity, setQuantity] = useState('1');
  const [purchaseStore, setPurchaseStore] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [itemStatus, setItemStatus] = useState<ItemStatus>('inUse');
  const [saving, setSaving] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [removingBg, setRemovingBg] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [autoProcessStep, setAutoProcessStep] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [ocrResults, setOcrResults] = useState<OCRTextBlock[]>([]);
  const [showOCRPanel, setShowOCRPanel] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string>('name');

  // 使用 ref 跟踪是否已处理过，防止重复调用
  const hasAutoProcessed = useRef(false);

  // 使用 ref 保存 route.params 的值，避免闭包问题
  const routeParamsRef = useRef(route.params);

  // 带超时的抠图函数
  const removeBackgroundWithTimeout = useCallback(async (imageUri: string, timeoutMs: number = 15000): Promise<BgRemoverResult> => {
    return new Promise((resolve) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({ success: false, error: 'Timeout' });
        }
      }, timeoutMs);

      bgRemoverService.removeBackground(imageUri)
        .then((result) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            resolve({ success: false, error: error?.message });
          }
        });
    });
  }, []);

  // 自动处理图片：PaddleOCR 识别 + 自动提取
  const processAutoImage = useCallback(async (imgUri: string) => {
    setAutoProcessing(true);

    try {
      const results = await paddleOCR.recognize(imgUri);
      setOcrResults(results);

      if (results.length > 0) {
        setShowOCRPanel(true);

        const allText = results.map(r => r.text).join('\n');
        try {
          const extractedInfo: ExtractedItemInfo = await extractItemInfo(allText);

          if (extractedInfo.name) setName(extractedInfo.name);
          if (extractedInfo.brand) setBrand(extractedInfo.brand);
          if (extractedInfo.category) setCategory(extractedInfo.category);
          if (extractedInfo.tags && extractedInfo.tags.length > 0) {
            setTags((prev) => {
              const newTags = [...prev];
              extractedInfo.tags.forEach((tag) => {
                if (!newTags.includes(tag) && newTags.length < 10) {
                  newTags.push(tag);
                }
              });
              return newTags;
            });
          }
        } catch (e) {
          console.warn('Auto extract failed:', e);
        }
      }
    } catch (e) {
      console.warn('PaddleOCR failed:', e);
    }

    setAutoProcessing(false);
  }, []);

  // 手动触发 OCR 识别
  const handleRunOCR = useCallback(async () => {
    if (!imageUrl || ocrLoading) return;
    setOcrLoading(true);
    try {
      const results = await paddleOCR.recognize(imageUrl);
      setOcrResults(results);
      if (results.length > 0) {
        setShowOCRPanel(true);
      }
    } catch (e) {
      console.warn('OCR failed:', e);
    } finally {
      setOcrLoading(false);
    }
  }, [imageUrl, ocrLoading]);

  // 可选填入的字段列表
  const fillableFields = [
    { key: 'name', label: t('add.ocrFieldName') },
    { key: 'brand', label: t('add.ocrFieldBrand') },
    { key: 'price', label: t('add.ocrFieldPrice') },
    { key: 'purchaseStore', label: t('add.ocrFieldStore') },
    { key: 'serialNumber', label: t('add.ocrFieldSerial') },
    { key: 'notes', label: t('add.ocrFieldNotes') },
    { key: 'tag', label: t('add.ocrFieldTag') },
  ];

  // 编辑状态
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // 将 OCR 文本填入当前选中的字段，并从列表移除该项
  const handleFillText = useCallback((text: string, index?: number) => {
    switch (focusedField) {
      case 'name':
        setName(text);
        break;
      case 'brand':
        setBrand(text);
        break;
      case 'price':
        const priceMatch = text.match(/\d+(\.\d+)?/);
        if (priceMatch) setPrice(priceMatch[0]);
        else setPrice(text.replace(/[^\d.]/g, ''));
        break;
      case 'purchaseStore':
        setPurchaseStore(text);
        break;
      case 'serialNumber':
        setSerialNumber(text);
        break;
      case 'notes':
        setNotes(prev => prev ? prev + ' ' + text : text);
        break;
      case 'tag':
        if (!tags.includes(text) && tags.length < 10) {
          setTags([...tags, text]);
        }
        break;
      default:
        setName(text);
    }
    // 从结果列表中移除已填入的项
    if (index !== undefined) {
      setOcrResults(prev => prev.filter((_, i) => i !== index));
    }
    // 退出编辑模式
    setEditingIndex(null);
    setEditingText('');
  }, [focusedField, tags]);

  // 进入编辑模式
  const handleStartEdit = useCallback((index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null) {
      setOcrResults(prev => prev.map((item, i) =>
        i === editingIndex ? { ...item, text: editingText } : item
      ));
    }
    setEditingIndex(null);
    setEditingText('');
  }, [editingIndex, editingText]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingText('');
  }, []);

  // 当 route.params 变化时更新 ref
  useEffect(() => {
    routeParamsRef.current = route.params;
  }, [route.params]);

  // 重置处理标志当 imageUrl 变化时
  useEffect(() => {
    if (route.params?.imageUrl) {
      hasAutoProcessed.current = false;
    }
  }, [route.params?.imageUrl]);

  // 处理编辑模式或自动处理
  useEffect(() => {
    // 延迟一小段时间确保所有状态已更新
    const timer = setTimeout(() => {
      if (isEditMode && existingItem) {
        setName(existingItem.name);
        setCategory(existingItem.category);
        setBrand(existingItem.brand || '');
        setPrice(((existingItem.purchasePrice || 0) / 100).toString());
        setPurchaseDate((existingItem.purchaseDate || new Date().toISOString().split('T')[0]).split('T')[0]);
        setLocationId(existingItem.locationId || '');
        setWarrantyEnd(existingItem.warrantyEndDate?.split('T')[0] || '');
        setTags(existingItem.tags || []);
        setNotes(existingItem.notes || '');
        setConsumptionType(existingItem.consumptionType);
        setImageUrl(existingItem.imageUrl);
        setQuantity(String(existingItem.quantity || 1));
        setPurchaseStore(existingItem.purchaseStore || '');
        setSerialNumber(existingItem.serialNumber || '');
        setItemStatus(existingItem.status || 'inUse');
      } else {
        const params = routeParamsRef.current;
        if (params?.imageUrl && !hasAutoProcessed.current) {
          setImageUrl(params.imageUrl);
          if (params?.autoProcess) {
            hasAutoProcessed.current = true;
            processAutoImage(params.imageUrl);
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isEditMode, existingItem, route.params?.imageUrl, processAutoImage]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTakePhoto = async () => {
    try {
      const result = await takePhoto();
      if (result) {
        navigation.navigate('Crop', { imageUri: result, from: 'AddManual' });
      }
    } catch (error) {
      console.warn('Take photo failed:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await pickImageFromGallery();
      if (result) {
        navigation.navigate('Crop', { imageUri: result, from: 'AddManual' });
      }
    } catch (error) {
      console.warn('Pick image failed:', error);
    }
  };

  const handleRemoveImage = async () => {
    if (imageUrl && imageUrl !== route.params?.imageUrl) {
      await deleteImage(imageUrl);
    }
    setImageUrl(undefined);
  };

  const handleRemoveBg = async () => {
    if (!imageUrl) return;
    console.log('[AddManual] handleRemoveBg start, imageUrl:', imageUrl);
    setRemovingBg(true);
    try {
      const result = await bgRemoverService.removeBackground(imageUrl);
      console.log('[AddManual] bg result:', result);
      if (result.success && result.outputPath) {
        console.log('[AddManual] setting new imageUrl:', result.outputPath);
        if (imageUrl && imageUrl !== route.params?.imageUrl) {
          try {
            await deleteImage(imageUrl);
          } catch (e) {
            console.warn('[AddManual] delete old image failed:', e);
          }
        }
        setImageUrl(result.outputPath);
      } else {
        console.log('[AddManual] bg failed, showing alert');
        Alert.alert(t('common.error'), result.error || t('add.bgRemoveFailed'));
      }
    } catch (error: any) {
      console.warn('[AddManual] bg exception:', error);
      Alert.alert(t('common.error'), error?.message || t('add.bgRemoveFailed'));
    } finally {
      setRemovingBg(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('add.nameRequired'));
      return;
    }

    setSaving(true);

    const priceFen = Math.round(parseFloat(price || '0') * 100);
    const qty = Math.max(1, parseInt(quantity || '1', 10) || 1);

    const itemData = {
      name: name.trim(),
      category,
      brand: brand.trim() || undefined,
      purchasePrice: priceFen,
      purchaseDate,
      locationId: locationId || undefined,
      warrantyEndDate: warrantyEnd || undefined,
      tags,
      notes: notes.trim() || undefined,
      consumptionType,
      imageUrl,
      quantity: qty,
      purchaseStore: purchaseStore.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      status: itemStatus,
    };

    try {
      if (isEditMode && existingItem) {
        await updateItem(existingItem.id, itemData);
        navigation.navigate('ItemDetail', { id: existingItem.id });
      } else {
        const newId = generateId();
        const newItem = {
          ...itemData,
          id: newId,
        };
        await addItem(newItem as any);
        navigation.navigate('ItemDetail', { id: newId });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const customCategories = useCustomCategories();

  const renderCategoryLabel = (cat: string): string => {
    return getCategoryDisplayName(cat, customCategories, i18n);
  };

  const handleCategorySelect = (catId: string, catName: string) => {
    setCategory(catId as ItemCategory);
  };

  const renderConsumptionLabel = (type: ConsumptionType): string => {
    return t(`item.consumptionTypes.${type}`) || ConsumptionTypeLabels[type];
  };

  const renderStatusLabel = (status: ItemStatus): string => {
    return t(`item.statuses.${status}`) || ItemStatusLabels[status];
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
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditMode ? t('item.editItem') : t('add.manualEntry')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isEditMode ? t('item.editItemDesc') : t('add.manualEntryDesc')}
          </Text>
        </View>
      </View>

      {/* Form */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('item.itemImage')}
            </Text>
            {autoProcessing && (
              <View style={styles.autoProcessIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.autoProcessText, { color: colors.primary }]}>
                  {t('add.recognizing')}
                </Text>
              </View>
            )}
          </View>
          {imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowImageViewer(true)}
                disabled={autoProcessing}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
                <View style={styles.imageZoomHint}>
                  <ZoomIn size={14} color={colors.onPrimary} />
                </View>
              </TouchableOpacity>
              {autoProcessing && (
                <View style={[styles.imageOverlay, { backgroundColor: colors.background + '80' }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.imageOverlayText, { color: colors.text }]}>
                    {t('add.recognizing')}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.removeImageBtn, { backgroundColor: colors.error }]}
                onPress={handleRemoveImage}
                disabled={autoProcessing}
              >
                <X size={14} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerRow}>
              <TouchableOpacity
                style={[styles.imagePickerBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={handleTakePhoto}
              >
                <Camera size={24} color={colors.primary} />
                <Text style={[styles.imagePickerText, { color: colors.text }]}>
                  {t('add.takePhoto')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imagePickerBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={handlePickImage}
              >
                <ImageIcon size={24} color={colors.primary} />
                <Text style={[styles.imagePickerText, { color: colors.text }]}>
                  {t('add.fromGallery')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {imageUrl && (
            <TouchableOpacity
              style={[styles.bgRemoveBtn, { backgroundColor: colors.primary, opacity: ocrLoading ? 0.5 : 1 }]}
              onPress={handleRunOCR}
              disabled={ocrLoading}
            >
              {ocrLoading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <ScanLine size={16} color={colors.onPrimary} />
                  <Text style={[styles.bgRemoveBtnText, { color: colors.onPrimary }]}>
                    {t('add.ocrRun')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* OCR Results */}
        {imageUrl && (showOCRPanel || ocrResults.length > 0 || ocrLoading) && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('add.ocrResults')} ({ocrResults.length})
              </Text>
              {ocrLoading && (
                <View style={styles.ocrLoadingIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>

            {/* 字段选择器 */}
            <Text style={[styles.ocrFieldLabel, { color: colors.textTertiary }]}>
              {t('add.ocrSelectField')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.fieldSelectorScroll}
              contentContainerStyle={styles.fieldSelectorContent}
            >
              {fillableFields.map((field) => (
                <TouchableOpacity
                  key={field.key}
                  style={[
                    styles.fieldSelectorBtn,
                    {
                      backgroundColor: focusedField === field.key
                        ? colors.primary + '20'
                        : colors.surfaceVariant,
                      borderColor: focusedField === field.key
                        ? colors.primary + '60'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setFocusedField(field.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.fieldSelectorText,
                      {
                        color: focusedField === field.key
                          ? colors.primary
                          : colors.textSecondary,
                        fontWeight: focusedField === field.key ? '600' : '400',
                      },
                    ]}
                  >
                    {field.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 识别结果列表 */}
            {ocrResults.length > 0 ? (
              <View style={styles.ocrResultsList}>
                {ocrResults.map((item, index) => (
                  <View
                    key={index}
                    style={[styles.ocrResultRow, { backgroundColor: colors.surfaceVariant }]}
                  >
                    {editingIndex === index ? (
                      // 编辑模式
                      <View style={styles.ocrEditContainer}>
                        <TextInput
                          style={[styles.ocrEditInput, { color: colors.text, borderColor: colors.primary }]}
                          value={editingText}
                          onChangeText={setEditingText}
                          autoFocus
                          multiline
                        />
                        <View style={styles.ocrEditActions}>
                          <TouchableOpacity
                            onPress={handleSaveEdit}
                            style={[styles.ocrEditBtn, { backgroundColor: colors.primary }]}
                          >
                            <Text style={[styles.ocrEditBtnText, { color: colors.onPrimary }]}>
                              ✓
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleCancelEdit}
                            style={[styles.ocrEditBtn, { backgroundColor: colors.surface }]}
                          >
                            <Text style={[styles.ocrEditBtnText, { color: colors.textSecondary }]}>
                              ✕
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      // 正常显示模式
                      <View style={styles.ocrResultContent}>
                        <TouchableOpacity
                          style={styles.ocrResultTextWrap}
                          onPress={() => handleFillText(item.text, index)}
                          activeOpacity={0.6}
                        >
                          <Text
                            style={[styles.ocrResultRowText, { color: colors.text }]}
                            numberOfLines={2}
                          >
                            {item.text}
                          </Text>
                          <Text style={[styles.ocrConfidence, { color: colors.textTertiary }]}>
                            {Math.round(item.confidence * 100)}%
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.ocrEditIcon}
                          onPress={() => handleStartEdit(index, item.text)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.ocrEditIconText, { color: colors.textTertiary }]}>
                            ✎
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.ocrEmpty}>
                <Text style={[styles.ocrEmptyText, { color: colors.textTertiary }]}>
                  {ocrLoading ? t('add.recognizing') : t('add.noOcrResults')}
                </Text>
                {!ocrLoading && ocrResults.length === 0 && (
                  <TouchableOpacity
                    style={[styles.ocrRunBtn, { backgroundColor: colors.primary }]}
                    onPress={handleRunOCR}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ocrRunBtnText, { color: colors.onPrimary }]}>
                      {t('add.ocrRun')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 操作提示 */}
            {ocrResults.length > 0 && (
              <Text style={[styles.ocrBottomHint, { color: colors.textTertiary }]}>
                {t('add.ocrHint')}
              </Text>
            )}
          </View>
        )}

        {/* Basic Info */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('item.title')}
          </Text>

          {/* Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('item.itemName')} *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('item.itemName')}
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField('name')}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Package size={12} color={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('item.category')} *
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.selectField, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectText, { color: colors.text }]}>
                {renderCategoryLabel(category)}
              </Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Brand */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('item.brand')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="e.g. SONY"
              placeholderTextColor={colors.textTertiary}
              value={brand}
              onChangeText={setBrand}
              onFocus={() => setFocusedField('brand')}
            />
          </View>

          {/* Price & Date */}
          <View style={styles.row}>
            <View style={[styles.field, styles.halfField]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('item.purchasePrice')}
              </Text>
              <View style={[styles.priceInput, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.currency, { color: colors.textSecondary }]}>¥</Text>
                <TextInput
                  style={[styles.priceTextInput, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  onFocus={() => setFocusedField('price')}
                />
              </View>
            </View>
            <View style={[styles.field, styles.halfField]}>
              <View style={styles.labelRow}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('item.purchaseDate')}
                </Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
              />
            </View>
          </View>

          {/* Quantity & Purchase Store */}
          <View style={styles.row}>
            <View style={[styles.field, styles.halfField]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('item.quantity')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, styles.halfField]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('item.purchaseStore')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('item.purchaseStorePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={purchaseStore}
                onChangeText={setPurchaseStore}
                onFocus={() => setFocusedField('purchaseStore')}
              />
            </View>
          </View>

          {/* Serial Number */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('item.serialNumber')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('item.serialNumberPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={serialNumber}
              onChangeText={setSerialNumber}
              onFocus={() => setFocusedField('serialNumber')}
            />
          </View>
        </View>

        {/* Status */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('item.status')}
          </Text>
          <View style={styles.consumptionGrid}>
            {ITEM_STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.consumptionBtn,
                  itemStatus === s
                    ? { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => setItemStatus(s)}
              >
                <Text style={[
                  styles.consumptionBtnText,
                  itemStatus === s ? { color: colors.primary } : { color: colors.text },
                ]}>
                  {renderStatusLabel(s)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location & Warranty */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('location.title')}
          </Text>

          {/* Location */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('item.location')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.selectField, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowLocationPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectText, { color: locationId ? colors.text : colors.textTertiary }]}>
                {locationId ? locations.find(l => l.id === locationId)?.name : t('common.no')}
              </Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Warranty */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('item.warrantyEndDate')}
              </Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={warrantyEnd}
              onChangeText={setWarrantyEnd}
            />
          </View>
        </View>

        {/* Tags */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('item.tags')}
            </Text>
            <Text style={[styles.tagLimit, { color: colors.textTertiary }]}>
              {tags.length}/10
            </Text>
          </View>

          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('add.addTag')}
              placeholderTextColor={colors.textTertiary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              onFocus={() => setFocusedField('tag')}
            />
            <TouchableOpacity 
              onPress={handleAddTag} 
              style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
              disabled={!tagInput.trim() || tags.length >= 10}
            >
              <Plus size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tagsList}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tagItem, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.tagItemText, { color: colors.textSecondary }]}>
                  {tag}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                  <X size={10} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Consumption Type */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('item.consumptionType')}
          </Text>
          <View style={styles.consumptionGrid}>
            {CONSUMPTION_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.consumptionBtn,
                  consumptionType === type 
                    ? { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' } 
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => setConsumptionType(type)}
              >
                <Text style={[
                  styles.consumptionBtnText,
                  consumptionType === type ? { color: colors.primary } : { color: colors.text },
                ]}>
                  {renderConsumptionLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('item.notes')}
          </Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            placeholder={t('add.description')}
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => setFocusedField('notes')}
          />
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={!name.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Save size={16} color={colors.onPrimary} />
              <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
                {t('common.save')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowLocationPicker(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('item.location')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLocationPicker(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <LocationTreePicker
                locations={locations}
                selectedId={locationId}
                onSelect={(id) => {
                  setLocationId(id);
                  setShowLocationPicker(false);
                }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        selectedCategory={category}
        onSelect={handleCategorySelect}
        onClose={() => setShowCategoryPicker(false)}
      />

      {/* Image Viewer Modal */}
      <Modal visible={showImageViewer} transparent animationType="fade">
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.imageViewerContent}>
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
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
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  autoProcessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoProcessText: {
    fontSize: 11,
    fontWeight: '500',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 5,
  },
  imageOverlayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  imageZoomHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '90%',
    height: '70%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bgRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  bgRemoveBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    gap: 8,
  },
  imagePickerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // 第二个 section 区域样式（非图片区域）
  infoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  currency: {
    fontSize: 14,
  },
  priceTextInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryBtnText: {
    fontSize: 12,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectText: {
    fontSize: 14,
    flex: 1,
  },
  locationScroll: {
    marginTop: 8,
  },
  locationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  locationBtnText: {
    fontSize: 12,
  },
  tagLimit: {
    fontSize: 10,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagItemText: {
    fontSize: 12,
  },
  consumptionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  consumptionBtn: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  consumptionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    minHeight: 80,
  },
  ocrLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ocrFieldLabel: {
    fontSize: 11,
    marginBottom: 8,
  },
  fieldSelectorScroll: {
    marginBottom: 12,
  },
  fieldSelectorContent: {
    gap: 8,
    paddingRight: 4,
  },
  fieldSelectorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  fieldSelectorText: {
    fontSize: 12,
  },
  ocrResultsList: {
    gap: 8,
  },
  ocrResultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ocrResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrResultTextWrap: {
    flex: 1,
  },
  ocrResultRowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ocrEditIcon: {
    paddingLeft: 10,
  },
  ocrEditIconText: {
    fontSize: 18,
  },
  ocrEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrEditInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 36,
  },
  ocrEditActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  ocrEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrEditBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ocrConfidence: {
    fontSize: 10,
    marginTop: 2,
  },
  ocrEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  ocrEmptyText: {
    fontSize: 13,
  },
  ocrRunBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ocrRunBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ocrBottomHint: {
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSpace: {
    height: 100,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flexGrow: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '70%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});