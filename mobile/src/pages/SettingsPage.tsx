import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sun, Moon, Monitor, Globe, Check, Download, Upload, Trash2, Palette, AlertTriangle, Info, Database, RefreshCw, HelpCircle, HardDrive } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { File, Directory, Paths } from 'expo-file-system';
import { useTheme } from '../theme/ThemeContext';
import { colorSchemes } from '../theme/colors';
import { ThemeMode, ColorScheme } from '../types';
import { useData, BackupFileInfo } from '../context/DataContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../hooks/useToast';

const THEME_OPTIONS: Array<{ mode: ThemeMode; label: string; icon: typeof Sun; desc: string }> = [
  { mode: 'light', label: 'settings.lightMode', icon: Sun, desc: 'settings.lightModeDesc' },
  { mode: 'dark', label: 'settings.darkMode', icon: Moon, desc: 'settings.darkModeDesc' },
  { mode: 'system', label: 'settings.systemMode', icon: Monitor, desc: 'settings.systemModeDesc' },
];

const LANG_OPTIONS = [
  { code: 'zh', label: 'settings.zhCN', icon: 'CN' },
  { code: 'en', label: 'settings.enUS', icon: 'US' },
];

// 主题色方案（primary/secondary/tertiary 从 colorSchemes 单一数据源派生）
const COLOR_SCHEMES: Array<{
  scheme: ColorScheme;
  label: string;
  desc: string;
}> = [
  { scheme: 'warm', label: 'settings.colorWarm', desc: 'settings.colorWarmDesc' },
  { scheme: 'ocean', label: 'settings.colorOcean', desc: 'settings.colorOceanDesc' },
  { scheme: 'forest', label: 'settings.colorForest', desc: 'settings.colorForestDesc' },
  { scheme: 'rose', label: 'settings.colorRose', desc: 'settings.colorRoseDesc' },
  { scheme: 'twilight', label: 'settings.colorTwilight', desc: 'settings.colorTwilightDesc' },
];

type DialogType = 'clear' | null;

const HELP_SECTIONS: Array<{ titleKey: string; items: string[] }> = [
  {
    titleKey: 'settings.helpSection1',
    items: [
      'settings.help1Item1',
      'settings.help1Item2',
      'settings.help1Item3',
      'settings.help1Item4',
    ],
  },
  {
    titleKey: 'settings.helpSection2',
    items: [
      'settings.help2Item1',
      'settings.help2Item2',
      'settings.help2Item3',
    ],
  },
  {
    titleKey: 'settings.helpSection3',
    items: [
      'settings.help3Item1',
      'settings.help3Item2',
      'settings.help3Item3',
    ],
  },
  {
    titleKey: 'settings.helpSection4',
    items: [
      'settings.help4Item1',
      'settings.help4Item2',
      'settings.help4Item3',
    ],
  },
];

export default function SettingsPage() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors, themeMode, colorScheme, setThemeMode, setColorScheme } = useTheme();
  const { exportData, importFromFile, listBackups, clearData } = useData();
  const insets = useSafeAreaInsets();

  const [dialogType, setDialogType] = useState<DialogType>(null);
  const { toast, showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>('');
  const [showBackupPicker, setShowBackupPicker] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFileInfo[]>([]);

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
    showToast(t('settings.langChanged'));
  };

  const handleExport = async () => {
    try {
      setProcessing(true);
      const success = await exportData();
      if (success) {
        showToast(t('settings.exportSuccess'));
      }
    } catch (error) {
      showToast(t('settings.exportFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    // 打开备份文件选择 Modal
    try {
      const files = await listBackups();
      setBackupFiles(files);
      setShowBackupPicker(true);
    } catch (error) {
      showToast(t('settings.importFailed'));
    }
  };

  const handlePickBackup = async (fileUri: string) => {
    try {
      setProcessing(true);
      setShowBackupPicker(false);
      const success = await importFromFile(fileUri);
      if (success) {
        showToast(t('settings.importSuccess'));
      }
    } catch (error) {
      showToast(t('settings.importFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async () => {
    try {
      setProcessing(true);
      await clearData();
      setDialogType(null);
      showToast(t('settings.clearSuccess'));
    } catch (error) {
      showToast(t('settings.clearFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        showToast(t('settings.updateAvailable'));
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        showToast(t('settings.noUpdate'));
      }
    } catch (error) {
      showToast(t('settings.updateError'));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const getCacheSize = async () => {
    try {
      const cacheDir = Paths.cache;
      if (!cacheDir) return;
      const entries = cacheDir.list();
      let totalSize = 0;
      for (const entry of entries) {
        try {
          if (entry instanceof File) {
            totalSize += entry.size || 0;
          }
        } catch (e) {
          // skip entries that can't be stat'd
        }
      }
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      setCacheSize(`${sizeMB} MB`);
    } catch (error) {
      setCacheSize('');
    }
  };

  const handleClearCache = async () => {
    try {
      setProcessing(true);
      const cacheDir = Paths.cache;
      if (cacheDir) {
        const entries = cacheDir.list();
        for (const entry of entries) {
          try {
            if (entry instanceof File) {
              entry.delete();
            } else if (entry instanceof Directory) {
              entry.delete();
            }
          } catch (e) {
            // skip entries that can't be deleted
          }
        }
      }
      await getCacheSize();
      showToast(t('settings.cacheCleared'));
    } catch (error) {
      showToast(t('settings.cacheClearFailed'));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    getCacheSize();
  }, []);

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
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.title')}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Globe size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>
          </View>
          <View style={styles.optionsContainer}>
            {LANG_OPTIONS.map(({ code, label, icon }) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.optionItem,
                  i18n.language === code 
                    ? { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' } 
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => handleLangChange(code)}
              >
                <View style={[
                  styles.optionIcon,
                  i18n.language === code 
                    ? { backgroundColor: colors.primary } 
                    : { backgroundColor: colors.surface },
                ]}>
                  <Text style={[
                    styles.optionIconText,
                    i18n.language === code ? { color: colors.onPrimary } : { color: colors.textSecondary },
                  ]}>
                    {icon}
                  </Text>
                </View>
                <Text style={[
                  styles.optionLabel,
                  i18n.language === code ? { color: colors.primary } : { color: colors.text },
                ]}>
                  {t(label)}
                </Text>
                {i18n.language === code && (
                  <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                    <Check size={12} color={colors.onPrimary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme Mode */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Moon size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('settings.themeMode')}
            </Text>
          </View>
          <View style={styles.optionsContainer}>
            {THEME_OPTIONS.map(({ mode, label, icon: Icon, desc }) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.optionItem,
                  themeMode === mode 
                    ? { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' } 
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => setThemeMode(mode)}
              >
                <View style={[
                  styles.optionIcon,
                  themeMode === mode 
                    ? { backgroundColor: colors.primary } 
                    : { backgroundColor: colors.surface },
                ]}>
                  <Icon size={18} color={themeMode === mode ? colors.onPrimary : colors.textSecondary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    themeMode === mode ? { color: colors.primary } : { color: colors.text },
                  ]}>
                    {t(label)}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    {t(desc)}
                  </Text>
                </View>
                {themeMode === mode && (
                  <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                    <Check size={12} color={colors.onPrimary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Scheme */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Palette size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('settings.colorScheme')}
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            {t('settings.colorDesc')}
          </Text>
          <View style={styles.optionsContainer}>
            {COLOR_SCHEMES.map(({ scheme, label, desc }) => {
              const schemeColors = colorSchemes[scheme].light;
              return (
              <TouchableOpacity
                key={scheme}
                style={[
                  styles.optionItem,
                  colorScheme === scheme
                    ? { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                onPress={() => setColorScheme(scheme)}
              >
                <View style={styles.colorPreview}>
                  <View style={[styles.colorDot, { backgroundColor: schemeColors.primary }]} />
                  <View style={[styles.colorDot, styles.colorDotOverlap, { backgroundColor: schemeColors.secondary }]} />
                  <View style={[styles.colorDot, styles.colorDotOverlap, { backgroundColor: schemeColors.tertiary }]} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    colorScheme === scheme ? { color: colors.primary } : { color: colors.text },
                  ]}>
                    {t(label)}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    {t(desc)}
                  </Text>
                </View>
                {colorScheme === scheme && (
                  <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                    <Check size={12} color={colors.onPrimary} />
                  </View>
                )}
              </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Data Management */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Info size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('settings.dataManagement')}
            </Text>
          </View>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.dataItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleExport}
            >
              <View style={[styles.dataIcon, { backgroundColor: colors.primary + '20' }]}>
                <Download size={18} color={colors.primary} />
              </View>
              <View style={styles.dataContent}>
                <Text style={[styles.dataLabel, { color: colors.text }]}>
                  {t('settings.exportData')}
                </Text>
                <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                  {t('settings.exportDataDesc')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dataItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleImport}
            >
              <View style={[styles.dataIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Upload size={18} color={colors.secondary} />
              </View>
              <View style={styles.dataContent}>
                <Text style={[styles.dataLabel, { color: colors.text }]}>
                  {t('settings.importData')}
                </Text>
                <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                  {t('settings.importDataDesc')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dataItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setDialogType('clear')}
            >
              <View style={[styles.dataIcon, { backgroundColor: colors.error + '20' }]}>
                <Trash2 size={18} color={colors.error} />
              </View>
              <View style={styles.dataContent}>
                <Text style={[styles.dataLabel, { color: colors.error }]}>
                  {t('settings.clearData')}
                </Text>
                <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                  {t('settings.clearDataDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* System Tools */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Database size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('settings.systemTools')}
            </Text>
          </View>
          <View style={styles.optionsContainer}>
            {/* Cache Clear */}
            <TouchableOpacity
              style={[styles.dataItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleClearCache}
              disabled={processing}
            >
              <View style={[styles.dataIcon, { backgroundColor: colors.tertiary + '20' }]}>
                <HardDrive size={18} color={colors.tertiary} />
              </View>
              <View style={styles.dataContent}>
                <Text style={[styles.dataLabel, { color: colors.text }]}>
                  {t('settings.cacheClear')}
                </Text>
                <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                  {t('settings.cacheClearDesc')}
                </Text>
              </View>
              {cacheSize ? (
                <Text style={[styles.cacheSize, { color: colors.textSecondary }]}>
                  {cacheSize}
                </Text>
              ) : null}
            </TouchableOpacity>

            {/* Check Update */}
            <TouchableOpacity
              style={[styles.dataItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
            >
              <View style={[styles.dataIcon, { backgroundColor: colors.secondary + '20' }]}>
                {checkingUpdate ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <RefreshCw size={18} color={colors.secondary} />
                )}
              </View>
              <View style={styles.dataContent}>
                <Text style={[styles.dataLabel, { color: colors.text }]}>
                  {t('settings.checkUpdate')}
                </Text>
                <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                  {t('settings.checkUpdateDesc')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Help */}
            <TouchableOpacity
              style={[styles.dataItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowHelp(true)}
            >
              <View style={[styles.dataIcon, { backgroundColor: colors.primary + '20' }]}>
                <HelpCircle size={18} color={colors.primary} />
              </View>
              <View style={styles.dataContent}>
                <Text style={[styles.dataLabel, { color: colors.text }]}>
                  {t('settings.help')}
                </Text>
                <Text style={[styles.dataDesc, { color: colors.textSecondary }]}>
                  {t('settings.helpDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.about')}
          </Text>
          <View style={styles.aboutContent}>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
                {t('profile.version')}
              </Text>
              <Text style={[styles.aboutValue, { color: colors.text }]}>
                v1.0.0
              </Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
                {t('common.appName')}
              </Text>
              <Text style={[styles.aboutValue, { color: colors.text }]}>
                Memory Ledger
              </Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
                {t('settings.developer')}
              </Text>
              <Text style={[styles.aboutValue, { color: colors.text }]}>
                TRAE AI
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Confirmation Dialog */}
      <Modal visible={!!dialogType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setDialogType(null)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: colors.error + '20' }]}>
                <AlertTriangle size={24} color={colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('settings.confirmClear')}
              </Text>
            </View>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              {t('settings.confirmClearMsg')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setDialogType(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDangerBtn, { backgroundColor: colors.error }]}
                onPress={handleClear}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                    {t('common.confirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={showHelp} transparent animationType="slide" onRequestClose={() => setShowHelp(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowHelp(false)} />
          <View style={[styles.helpModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.helpHeader}>
              <View style={styles.helpHeaderLeft}>
                <View style={[styles.helpHeaderIcon, { backgroundColor: colors.primary + '20' }]}>
                  <HelpCircle size={20} color={colors.primary} />
                </View>
                <Text style={[styles.helpTitle, { color: colors.text }]}>
                  {t('settings.helpTitle')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHelp(false)}
                style={[styles.helpCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Text style={[styles.helpCloseText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.helpBody} showsVerticalScrollIndicator={false}>
              {HELP_SECTIONS.map((section, idx) => (
                <View key={idx} style={styles.helpSection}>
                  <Text style={[styles.helpSectionTitle, { color: colors.primary }]}>
                    {t(section.titleKey)}
                  </Text>
                  {section.items.map((itemKey, i) => (
                    <View key={i} style={[styles.helpItem, { backgroundColor: colors.surfaceVariant }]}>
                      <View style={[styles.helpItemDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.helpItemText, { color: colors.text }]}>
                        {t(itemKey)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Backup Picker Modal */}
      <Modal visible={showBackupPicker} transparent animationType="slide" onRequestClose={() => setShowBackupPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowBackupPicker(false)} />
          <View style={[styles.backupPickerContent, { backgroundColor: colors.surface }]}>
            <View style={styles.helpHeader}>
              <View style={styles.helpHeaderLeft}>
                <View style={[styles.helpHeaderIcon, { backgroundColor: colors.secondary + '20' }]}>
                  <Upload size={20} color={colors.secondary} />
                </View>
                <Text style={[styles.helpTitle, { color: colors.text }]}>
                  {t('settings.selectBackup')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBackupPicker(false)}
                style={[styles.helpCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Text style={[styles.helpCloseText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            {backupFiles.length === 0 ? (
              <View style={styles.backupEmptyContainer}>
                <Database size={40} color={colors.textTertiary} />
                <Text style={[styles.backupEmptyText, { color: colors.textSecondary }]}>
                  {t('settings.noBackups')}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.backupList} showsVerticalScrollIndicator={false}>
                {backupFiles.map((file, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.backupItem, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handlePickBackup(file.uri)}
                  >
                    <View style={[styles.backupItemIcon, { backgroundColor: colors.secondary + '20' }]}>
                      <Download size={18} color={colors.secondary} />
                    </View>
                    <View style={styles.backupItemInfo}>
                      <Text style={[styles.backupItemName, { color: colors.text }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.backupItemMeta, { color: colors.textSecondary }]}>
                        {file.lastModified
                          ? new Date(file.lastModified).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')
                          : ''}  ·  {(file.size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Text style={[styles.toastText, { color: colors.surface }]}>
            {toast}
          </Text>
        </View>
      )}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPreview: {
    flexDirection: 'row',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotOverlap: {
    marginLeft: -8,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  dataIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataContent: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dataDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  aboutContent: {
    gap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 100,
  },
  cacheSize: {
    fontSize: 12,
    fontWeight: '500',
  },
  helpModalContent: {
    width: '90%',
    maxHeight: '75%',
    borderRadius: 20,
    padding: 20,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCloseText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  helpBody: {
    maxHeight: 400,
  },
  helpSection: {
    marginBottom: 16,
  },
  helpSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  helpItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  helpItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  backupPickerContent: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
  },
  backupEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  backupEmptyText: {
    fontSize: 14,
  },
  backupList: {
    maxHeight: 400,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  backupItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupItemInfo: {
    flex: 1,
  },
  backupItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  backupItemMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDangerBtn: {},
  modalBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -100 }],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});