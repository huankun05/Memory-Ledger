import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, Sparkles, Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutPage() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const features = [
    'profile.aboutFeature1',
    'profile.aboutFeature2',
    'profile.aboutFeature3',
    'profile.aboutFeature4',
    'profile.aboutFeature5',
  ];

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
          {t('profile.about')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & App Name */}
        <View style={[styles.logoSection, { backgroundColor: colors.surface }]}>
          <View style={[styles.logo, { backgroundColor: colors.primary + '15' }]}>
            <Sparkles size={48} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            {t('common.appName')}
          </Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            {t('profile.version')} 1.0.0
          </Text>
        </View>

        {/* App Intro */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.secondary + '15' }]}>
              <Info size={18} color={colors.secondary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('profile.aboutIntro')}
            </Text>
          </View>
          <Text style={[styles.descText, { color: colors.textSecondary }]}>
            {t('profile.aboutIntroDesc')}
          </Text>
        </View>

        {/* Key Features */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Star size={18} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('profile.aboutFeatures')}
            </Text>
          </View>
          <View style={styles.featureList}>
            {features.map((key, i) => (
              <View key={i} style={[styles.featureItem, { backgroundColor: colors.surfaceVariant }]}>
                <Star size={12} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Developer */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {t('settings.developer')}
            </Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
              HUANKUN + TRAE AI
            </Text>
          </View>
        </View>

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
  logoSection: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
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
  descText: {
    fontSize: 13,
    lineHeight: 22,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
  },
  bottomSpace: {
    height: 40,
  },
});
