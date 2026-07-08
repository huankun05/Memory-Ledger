import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { X, Plus, Check, Edit2, Trash2, Tag } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ItemCategory, CustomCategory } from '../types';
import { useCustomCategories, useAppStore } from '../store';
import { getCategoryIcon, PRESET_CATEGORIES } from '../utils/categoryIcons';
import { getCategoryDisplayName } from '../utils/categoryLabel';

const COLOR_OPTIONS = [
  '#C8956D', '#6B7F4E', '#5C8A7A', '#A07448', '#8B7355',
  '#7BA05B', '#E8A87C', '#85B8CB', '#A9A9A9', '#D4A5A5',
  '#B8D4E3', '#F4D03F', '#E8B4B8', '#A8D8EA', '#D4A373',
  '#95B8D1', '#B8B8D1', '#F0E68C', '#90C695', '#DDA0DD',
  '#FFD700', '#8B4513', '#2F4F4F', '#4682B4', '#FFB6C1',
  '#8FBC8F', '#20B2AA', '#7A7A7A',
];

interface CategoryPickerModalProps {
  visible: boolean;
  selectedCategory: string;
  onSelect: (categoryId: string, categoryName: string) => void;
  onClose: () => void;
}

export default function CategoryPickerModal({
  visible,
  selectedCategory,
  onSelect,
  onClose,
}: CategoryPickerModalProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const customCategories = useCustomCategories();
  const loadCustomCategories = useAppStore((s) => s.loadCustomCategories);
  const addCustomCategory = useAppStore((s) => s.addCustomCategory);
  const updateCustomCategory = useAppStore((s) => s.updateCustomCategory);
  const removeCustomCategory = useAppStore((s) => s.removeCustomCategory);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7A7A7A');
  const [depreciationRate, setDepreciationRate] = useState('10');

  useEffect(() => {
    console.log('CategoryPickerModal visible changed:', visible);
    if (visible) {
      loadCustomCategories();
    }
  }, [visible]);

  const resetForm = () => {
    setName('');
    setNameEn('');
    setSelectedColor('#7A7A7A');
    setDepreciationRate('10');
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = (category: CustomCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setNameEn(category.nameEn);
    setSelectedColor(category.color);
    setDepreciationRate((category.depreciationRate * 100).toString());
    setShowAddForm(true);
  };

  const handleDelete = (category: CustomCategory) => {
    Alert.alert(
      t('common.delete'),
      t('item.deleteCategoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removeCustomCategory(category.id);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('item.categoryNameRequired'));
      return;
    }

    const rate = parseFloat(depreciationRate) / 100;
    const categoryData = {
      name: name.trim(),
      nameEn: nameEn.trim() || name.trim(),
      icon: 'Package',
      color: selectedColor,
      depreciationRate: isNaN(rate) ? 0.1 : rate,
    };

    try {
      if (editingCategory) {
        await updateCustomCategory(editingCategory.id, categoryData);
      } else {
        await addCustomCategory(categoryData);
      }
      resetForm();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const getCategoryColor = (catId: string): string => {
    const customCat = customCategories.find((c) => c.id === catId);
    if (customCat) return customCat.color;
    return colors.primary;
  };

  const handleSelectCategory = (catId: string) => {
    const displayName = getCategoryDisplayName(catId, customCategories, i18n);
    onSelect(catId, displayName);
    onClose();
  };

  const renderCategoryItem = (catId: string, isCustom: boolean = false, customCat?: CustomCategory) => {
    const isSelected = selectedCategory === catId;
    const displayName = getCategoryDisplayName(catId, customCategories, i18n);
    const color = isCustom && customCat ? customCat.color : getCategoryColor(catId);
    const IconComponent = getCategoryIcon(isCustom && customCat ? customCat.icon || 'Package' : catId);

    return (
      <TouchableOpacity
        key={catId}
        style={[
          styles.categoryItem,
          { backgroundColor: colors.surfaceVariant },
          isSelected && { borderColor: color, borderWidth: 2 },
        ]}
        onPress={() => handleSelectCategory(catId)}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
          <IconComponent size={20} color={color} />
        </View>
        <Text
          style={[styles.categoryName, { color: colors.text }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {isSelected && (
          <View style={[styles.checkIcon, { backgroundColor: color }]}>
            <Check size={12} color="#fff" />
          </View>
        )}
        {isCustom && customCat && (
          <View style={styles.customActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleEdit(customCat)}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Edit2 size={14} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(customCat)}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Trash2 size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('item.category')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showAddForm ? (
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editingCategory ? t('item.editCustomCategory') : t('item.addCustomCategory')}
              </Text>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  {t('item.categoryName')} *
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('item.categoryName')}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  {t('item.categoryNameEn')}
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                  value={nameEn}
                  onChangeText={setNameEn}
                  placeholder="English name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  {t('item.categoryColor')}
                </Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Check size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  {t('item.depreciationRate')} (%)
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                  value={depreciationRate}
                  onChangeText={setDepreciationRate}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.cancelBtn, { backgroundColor: colors.surfaceVariant }]}
                  onPress={resetForm}
                >
                  <Text style={[styles.formBtnText, { color: colors.text }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                >
                  <Text style={[styles.formBtnText, { color: colors.onPrimary }]}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.categoryList}>
              {/* Category Stats */}
              <View style={styles.statsContainer}>
                <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                  {t('item.categorySummary', {
                    preset: PRESET_CATEGORIES.length,
                    custom: customCategories.length,
                    total: PRESET_CATEGORIES.length + customCategories.length
                  })}
                </Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {customCategories.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      {t('item.myCategories')} ({customCategories.length})
                    </Text>
                    <View style={styles.categoryGrid}>
                      {customCategories.map((cat) =>
                        renderCategoryItem(cat.id, true, cat)
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {t('item.presetCategories')} ({PRESET_CATEGORIES.length})
                  </Text>
                  <View style={styles.categoryGrid}>
                    {PRESET_CATEGORIES.map((cat) => renderCategoryItem(cat))}
                  </View>
                </View>

                <View style={styles.bottomSpace} />
              </ScrollView>
            </View>
          )}

          {!showAddForm && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={handleAdd}
              >
                <Plus size={18} color={colors.onPrimary} />
                <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>
                  {t('item.addCustomCategory')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  categoryList: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 13,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '31%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customActions: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 2,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  formBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {},
  saveBtn: {},
  formBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 20,
  },
});
