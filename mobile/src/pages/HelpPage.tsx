import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HelpCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HELP_SECTIONS = [
  { titleKey: 'settings.helpSection1', items: ['settings.help1Item1', 'settings.help1Item2', 'settings.help1Item3', 'settings.help1Item4'] },
  { titleKey: 'settings.helpSection2', items: ['settings.help2Item1', 'settings.help2Item2', 'settings.help2Item3'] },
  { titleKey: 'settings.helpSection3', items: ['settings.help3Item1', 'settings.help3Item2', 'settings.help3Item3'] },
  { titleKey: 'settings.helpSection4', items: ['settings.help4Item1', 'settings.help4Item2', 'settings.help4Item3'] },
];

export default function HelpPage() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.helpTitle')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {HELP_SECTIONS.map((section, idx) => (
          <View key={idx} style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                <HelpCircle size={18} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                {t(section.titleKey)}
              </Text>
            </View>
            <View style={styles.sectionItems}>
              {section.items.map((itemKey, i) => (
                <View key={i} style={[styles.helpItem, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.helpItemDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.helpItemText, { color: colors.text }]}>
                    {t(itemKey)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.bottomSpace} />
      </ScrollView>
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
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 44,
  },
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionItems: {
    gap: 6,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
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
    lineHeight: 20,
  },
  bottomSpace: {
    height: 40,
  },
});
