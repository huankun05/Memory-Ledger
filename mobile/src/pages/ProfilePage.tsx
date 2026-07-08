import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Image, Linking, Share, Alert, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Settings, ChevronRight, Shield, Clock, TrendingUp, Layers, Activity, Star, Plus, Sparkles, MessageSquare, Share2, HelpCircle, Info, Send, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useItems, useLocations, useFavorites } from '../store';
import { calculateHealthScore, calculateResidualValue } from '../utils/itemCalculations';
import { getCategoryIcon } from '../utils/categoryIcons';
import { formatPrice, formatDate } from '../utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEEDBACK_EMAIL = 'huankun@example.com';

export default function ProfilePage() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const items = useItems();
  const locations = useLocations();
  const favorites = useFavorites();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'other'>('suggestion');
  const [showRating, setShowRating] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);

  const health = useMemo(() => calculateHealthScore(items), [items]);

  const stats = useMemo(() => {
    const totalPurchase = items.reduce((s, i) => s + (i.purchasePrice || 0), 0);
    const totalResidual = items.reduce(
      (s, i) => s + calculateResidualValue(i.purchasePrice || 0, i.purchaseDate || new Date().toISOString(), i.category, i.customDepreciationRate) * 100,
      0
    );
    const totalDepreciation = totalPurchase - totalResidual;

    const catSet = new Set(items.map((i) => i.category));
    const locSet = new Set(items.map((i) => i.locationId));

    return {
      totalItems: items.length,
      totalPurchase: Math.round(totalPurchase),
      totalResidual: Math.round(totalResidual),
      totalDepreciation: Math.round(totalDepreciation),
      categoryCount: catSet.size,
      locationCount: locSet.size,
      favoriteCount: favorites.length,
    };
  }, [items, favorites]);

  const depreciationPercent = stats.totalPurchase > 0
    ? Math.round((stats.totalDepreciation / stats.totalPurchase) * 100)
    : 0;

  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [items]);

  const getDimensionIcon = (key: string) => {
    const iconProps = { size: 16, color: colors.primary };
    switch (key) {
      case 'warranty': return <Shield {...iconProps} />;
      case 'idle': return <Clock {...iconProps} />;
      case 'value': return <TrendingUp {...iconProps} />;
      case 'diversity': return <Layers {...iconProps} />;
      case 'activity': return <Activity {...iconProps} />;
      default: return null;
    }
  };

  const handleShareApp = useCallback(async () => {
    try {
      const result = await Share.share({
        message: t('profile.shareMessage'),
        title: t('common.appName'),
      });
      if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error: any) {
      console.error('Share failed:', error?.message || error);
      Alert.alert(
        t('profile.shareFailedTitle'),
        t('profile.shareFailedMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('profile.shareCopyLink'),
            onPress: () => {
              Alert.alert(t('profile.shareCopyTip'), t('profile.shareMessage'));
            },
          },
        ]
      );
    }
  }, [t]);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackContent.trim()) {
      Alert.alert(t('profile.feedbackEmptyTitle'), t('profile.feedbackEmptyMsg'));
      return;
    }
    const typeLabel = t(`profile.feedbackType_${feedbackType}`);
    const subject = `[${typeLabel}] ${feedbackTitle || t('profile.feedbackSubject')}`;
    const body = `${feedbackContent}\n\n---\n${t('profile.version')}: 1.0.0\n${t('settings.language')}: ${i18n.language}`;
    const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    const supported = await Linking.canOpenURL(mailtoUrl);
    if (supported) {
      await Linking.openURL(mailtoUrl);
      setShowFeedback(false);
      setFeedbackTitle('');
      setFeedbackContent('');
      setFeedbackType('suggestion');
    } else {
      Alert.alert(t('common.error'), t('profile.feedbackMailNotSupported'));
    }
  }, [feedbackTitle, feedbackContent, feedbackType, t, i18n.language]);

  const handleRateApp = useCallback((rating: number) => {
    setCurrentRating(rating);
    setTimeout(() => {
      Alert.alert(
        t('profile.rateThanksTitle'),
        t('profile.rateThanksMsg', { rating }),
        [{ text: t('common.confirm'), onPress: () => setShowRating(false) }]
      );
    }, 300);
  }, [t]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('profile.title')}
        </Text>
      </View>

      {/* Health Score Detail Card */}
      <View style={[styles.healthDetailCard, { backgroundColor: colors.surface }]}>
        <View style={styles.healthDetailHeader}>
          <View style={styles.healthCircleBig}>
            <View style={[styles.healthCircleBg, { borderColor: colors.border }]} />
            <View 
              style={[
                styles.healthCircleProgress, 
                { 
                  borderColor: colors.primary,
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                  transform: [{ rotate: `${(health.total / 100) * 360 + 90}deg` }],
                }
              ]} 
            />
            <View style={styles.healthCircleInner}>
              <Text style={[styles.healthScoreBig, { color: colors.text }]}>{health.total}</Text>
              <Text style={[styles.healthLabelSmall, { color: colors.textSecondary }]}>
                {t('home.healthScore')}
              </Text>
            </View>
          </View>
          <View style={styles.healthLevelInfo}>
            <View style={styles.healthLevelRow}>
              <Sparkles size={16} color={colors.primary} />
              <Text style={[styles.healthLevelText, { color: colors.text }]}>
                {t(health.levelKey)}
              </Text>
            </View>
            <Text style={[styles.healthDescText, { color: colors.textSecondary }]}>
              {t(health.descKey)}
            </Text>
          </View>
        </View>

        <View style={[styles.dimensionDivider, { backgroundColor: colors.border }]} />

        <View style={styles.dimensionGrid}>
          {health.dimensions.map((dim) => (
            <View key={dim.key} style={styles.dimensionItem}>
              <View style={[styles.dimensionIcon, { backgroundColor: colors.primary + '15' }]}>
                {getDimensionIcon(dim.key)}
              </View>
              <View style={styles.dimensionInfo}>
                <Text style={[styles.dimensionLabel, { color: colors.text }]}>
                  {t(dim.labelKey)}
                </Text>
                <Text style={[styles.dimensionDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                  {t(dim.descKey)}
                </Text>
              </View>
              <View style={styles.dimensionScoreRow}>
                <Text style={[styles.dimensionScore, { color: colors.primary }]}>
                  {dim.score}
                </Text>
                <Text style={[styles.dimensionScoreMax, { color: colors.textTertiary }]}>
                  /{dim.maxScore}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfaceVariant }]}>
            <Settings size={18} color={colors.textSecondary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t('profile.settings')}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => setShowFeedback(true)}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
            <MessageSquare size={18} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t('profile.feedback')}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={handleShareApp}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '15' }]}>
            <Share2 size={18} color={colors.secondary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t('profile.shareApp')}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => { setCurrentRating(0); setShowRating(true); }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.success + '15' }]}>
            <Star size={18} color={colors.success} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t('profile.rateApp')}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Help')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.info + '15' }]}>
            <HelpCircle size={18} color={colors.info} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t('settings.help')}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('About')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfaceVariant }]}>
            <Info size={18} color={colors.textSecondary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {t('profile.about')}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Feedback Modal */}
      <Modal visible={showFeedback} transparent animationType="slide" onRequestClose={() => setShowFeedback(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowFeedback(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('profile.feedbackTitle')}
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowFeedback(false)}
              >
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.feedbackTypeRow}>
                {(['suggestion', 'bug', 'other'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.feedbackTypeBtn,
                      { backgroundColor: feedbackType === type ? colors.primary : colors.surfaceVariant }
                    ]}
                    onPress={() => setFeedbackType(type)}
                  >
                    <Text style={[styles.feedbackTypeText, { color: feedbackType === type ? colors.onPrimary : colors.text }]}>
                      {t(`profile.feedbackType_${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.feedbackLabel, { color: colors.text }]}>
                {t('profile.feedbackTitleLabel')}
              </Text>
              <TextInput
                style={[styles.feedbackInput, { color: colors.text, backgroundColor: colors.surfaceVariant }]}
                placeholder={t('profile.feedbackTitlePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={feedbackTitle}
                onChangeText={setFeedbackTitle}
              />

              <Text style={[styles.feedbackLabel, { color: colors.text }]}>
                {t('profile.feedbackContentLabel')}
              </Text>
              <TextInput
                style={[styles.feedbackTextArea, { color: colors.text, backgroundColor: colors.surfaceVariant }]}
                placeholder={t('profile.feedbackContentPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={feedbackContent}
                onChangeText={setFeedbackContent}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.feedbackSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmitFeedback}
              >
                <Send size={16} color={colors.onPrimary} />
                <Text style={[styles.feedbackSubmitText, { color: colors.onPrimary }]}>
                  {t('profile.feedbackSubmit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={showRating} transparent animationType="fade" onRequestClose={() => setShowRating(false)}>
        <View style={styles.ratingOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowRating(false)} />
          <View style={[styles.ratingCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.ratingTitle, { color: colors.text }]}>
              {t('profile.rateTitle')}
            </Text>
            <Text style={[styles.ratingSubtitle, { color: colors.textSecondary }]}>
              {t('profile.rateSubtitle')}
            </Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.ratingStarBtn}
                  onPress={() => handleRateApp(star)}
                >
                  <Star
                    size={36}
                    color={star <= currentRating ? colors.success : colors.border}
                    fill={star <= currentRating ? colors.success : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.ratingLaterBtn}
              onPress={() => setShowRating(false)}
            >
              <Text style={[styles.ratingLaterText, { color: colors.textSecondary }]}>
                {t('profile.rateLater')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: colors.textSecondary }]}>
          {t('common.appName')}
        </Text>
        <Text style={[styles.appNameEn, { color: colors.textTertiary }]}>
          MEMORY LEDGER
        </Text>
        <Text style={[styles.developer, { color: colors.textTertiary }]}>
          HUANKUN + TRAE AI
        </Text>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  healthDetailCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  healthDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  healthCircleBig: {
    width: 88,
    height: 88,
    position: 'relative',
  },
  healthCircleBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 44,
    borderWidth: 6,
  },
  healthCircleProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 44,
    borderWidth: 6,
  },
  healthCircleInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreBig: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  healthLabelSmall: {
    fontSize: 10,
    marginTop: 2,
  },
  healthLevelInfo: {
    flex: 1,
    gap: 6,
  },
  healthLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthLevelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  healthDescText: {
    fontSize: 12,
    lineHeight: 18,
  },
  dimensionDivider: {
    height: 1,
    marginVertical: 14,
  },
  dimensionGrid: {
    gap: 10,
  },
  dimensionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dimensionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimensionInfo: {
    flex: 1,
    gap: 2,
  },
  dimensionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dimensionDesc: {
    fontSize: 11,
  },
  dimensionScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dimensionScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  dimensionScoreMax: {
    fontSize: 11,
  },

  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentItemImg: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  recentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemInfo: {
    flex: 1,
    gap: 3,
  },
  recentItemName: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentItemDate: {
    fontSize: 11,
  },
  recentItemPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickActions: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickActionCount: {
    fontSize: 10,
  },
  actionsContainer: {
    marginHorizontal: 16,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 24,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appNameEn: {
    fontSize: 10,
    marginTop: 4,
  },
  developer: {
    fontSize: 10,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  feedbackTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  feedbackTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  feedbackTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 4,
  },
  feedbackInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  feedbackTextArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
    height: 120,
  },
  feedbackSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  feedbackSubmitText: {
    fontSize: 15,
    fontWeight: '600',
  },
  ratingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCard: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  ratingSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  ratingStarBtn: {
    padding: 4,
  },
  ratingLaterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ratingLaterText: {
    fontSize: 13,
  },
  bottomSpace: {
    height: 100,
  },
});