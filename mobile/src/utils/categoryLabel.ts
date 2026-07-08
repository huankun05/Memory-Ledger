import type { i18n as I18nType } from 'i18next';
import { ItemCategoryLabels, CustomCategory } from '../types';

/**
 * 获取分类的显示名称（支持自定义分类的中英文切换）
 * 优先级：自定义分类（按当前语言） > 预设分类 i18n 翻译 > 预设分类默认标签 > 原始 catId
 */
export function getCategoryDisplayName(
  catId: string,
  customCategories: CustomCategory[],
  i18n: I18nType
): string {
  const customCat = customCategories.find((c) => c.id === catId);
  if (customCat) {
    return i18n.language === 'zh' ? customCat.name : customCat.nameEn;
  }
  const presetLabel = (ItemCategoryLabels as Record<string, string>)[catId];
  if (presetLabel) {
    return i18n.t(`item.categories.${catId}`) || presetLabel;
  }
  return catId;
}
