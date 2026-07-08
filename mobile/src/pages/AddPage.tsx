import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Camera, Image, Edit, ChevronRight, CheckCircle, Lightbulb, Scissors, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { takePhoto, pickImageFromGallery } from '../utils/imageUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddPage() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePhotoEntry = async () => {
    try {
      const imageUri = await takePhoto();
      if (imageUri) {
        navigation.navigate('Crop', { imageUri });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleGalleryEntry = async () => {
    try {
      const imageUri = await pickImageFromGallery();
      if (imageUri) {
        navigation.navigate('Crop', { imageUri });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('add.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('add.subtitle')}
        </Text>
      </View>

      {/* Add Options */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Entry Card */}
        <View style={[styles.photoEntryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.photoEntryHeader}>
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Camera size={24} color={colors.primary} />
            </View>
            <View style={styles.photoEntryHeaderText}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {t('add.photoEntry')}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                {t('add.photoEntryDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.photoButtonsRow}>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: colors.primary }]}
              onPress={handlePhotoEntry}
              activeOpacity={0.8}
            >
              <Camera size={20} color={colors.onPrimary} />
              <Text style={[styles.photoButtonText, { color: colors.onPrimary }]}>
                {t('add.takePhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleGalleryEntry}
              activeOpacity={0.8}
            >
              <Image size={20} color={colors.primary} />
              <Text style={[styles.photoButtonTextSecondary, { color: colors.text }]}>
                {t('add.fromGallery')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photoEntryFeatures}>
            <View style={styles.featureItem}>
              <Scissors size={12} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textTertiary }]}>
                {t('add.freeCrop')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={12} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textTertiary }]}>
                {t('add.ocrRecognize')}
              </Text>
            </View>
          </View>
        </View>

        {/* Manual Entry Card */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('AddManual')}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Edit size={28} color={colors.secondary} />
          </View>
          
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {t('add.manualEntry')}
            </Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
              {t('add.manualEntryDesc')}
            </Text>
            
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Edit size={12} color={colors.secondary} />
                </View>
                <Text style={[styles.featureText, { color: colors.textTertiary }]}>
                  {t('add.fullInfoEntry')}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <CheckCircle size={12} color={colors.secondary} />
                </View>
                <Text style={[styles.featureText, { color: colors.textTertiary }]}>
                  {t('add.customFields')}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.optionArrow, { backgroundColor: colors.surfaceVariant }]}>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.tipsHeader}>
            <Lightbulb size={16} color={colors.primary} />
            <Text style={[styles.tipsTitle, { color: colors.text }]}>
              {t('add.tips')}
            </Text>
          </View>
          <View style={styles.tipsContent}>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • {t('add.tip1')}
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • {t('add.tip2')}
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • {t('add.tip3')}
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 20,
  },
  photoEntryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  photoEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  photoEntryHeaderText: {
    flex: 1,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '500',
  },
  photoEntryFeatures: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  optionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 11,
  },
  optionArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipsContent: {
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomSpace: {
    height: 100,
  },
});