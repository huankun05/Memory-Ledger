import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Animated } from 'react-native';
import * as Updates from 'expo-updates';
import * as Constants from 'expo-constants';
import { RefreshCw, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error';

interface UpdateInfo {
  message: string;
  available: boolean;
  progress: number;
  status: UpdateStatus;
}

export default function UpdateManager() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    message: '',
    available: false,
    progress: 0,
    status: 'idle',
  });
  const [showModal, setShowModal] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const checkForUpdate = useCallback(async () => {
    console.log('[UpdateManager] Starting update check...');

    try {
      setUpdateInfo(prev => ({ ...prev, status: 'checking' }));
      console.log('[UpdateManager] Calling checkForUpdateAsync...');
      const update = await Updates.checkForUpdateAsync();
      console.log('[UpdateManager] Update check result:', JSON.stringify(update));

      if (update.isAvailable) {
        // 自动下载更新
        setUpdateInfo(prev => ({
          ...prev,
          status: 'downloading',
          progress: 0,
          message: t('update.available'),
        }));
        setShowModal(true);

        console.log('[UpdateManager] Auto-downloading update...');
        await Updates.fetchUpdateAsync();
        console.log('[UpdateManager] Download complete, waiting for user to restart');

        setUpdateInfo(prev => ({
          ...prev,
          status: 'ready',
          progress: 100,
          message: t('update.ready'),
        }));
        // 不自动 reload，避免无限循环（reloadAsync 在某些情况下不会加载 pending update）
        // 用户点击"立即重启"按钮后才执行 reload
      } else {
        setUpdateInfo(prev => ({
          ...prev,
          status: 'none',
          available: false,
          message: t('update.noUpdate'),
        }));
      }
    } catch (error) {
      console.log('Update check error:', error);
      setUpdateInfo(prev => ({
        ...prev,
        status: 'error',
        available: false,
        message: t('update.error'),
      }));
    }
  }, [t]);

  const downloadUpdate = useCallback(async () => {
    try {
      setUpdateInfo(prev => ({ ...prev, status: 'downloading', progress: 0 }));

      await Updates.fetchUpdateAsync();

      setUpdateInfo(prev => ({
        ...prev,
        status: 'ready',
        progress: 100,
        message: t('update.ready'),
      }));
    } catch (error) {
      console.log('Download error:', error);
      setUpdateInfo(prev => ({
        ...prev,
        status: 'error',
        message: t('update.downloadError'),
      }));
    }
  }, [t]);

  const reloadApp = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.log('Reload error:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // 先检查是否已有 pending update（已下载但未加载）
      // 如果有，直接显示"更新已就绪"，避免重复下载
      const currentState = Updates.currentState;
      console.log('[UpdateManager] Current state:', JSON.stringify(currentState));
      if (currentState && currentState.isUpdatePending) {
        console.log('[UpdateManager] Update already downloaded, showing ready state');
        setUpdateInfo(prev => ({
          ...prev,
          status: 'ready',
          progress: 100,
          message: t('update.ready'),
        }));
        setShowModal(true);
      } else {
        checkForUpdate();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkForUpdate, t]);

  useEffect(() => {
    if (updateInfo.status === 'downloading') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [updateInfo.status, spinAnim]);

  const handleModalAction = () => {
    if (updateInfo.status === 'available') {
      downloadUpdate();
    } else if (updateInfo.status === 'ready') {
      reloadApp();
    } else {
      setShowModal(false);
    }
  };

  const getActionText = () => {
    switch (updateInfo.status) {
      case 'available':
        return t('update.download');
      case 'downloading':
        return `${t('update.downloading')} ${updateInfo.progress}%`;
      case 'ready':
        return t('update.install');
      case 'none':
        return t('common.close');
      case 'error':
        return t('common.retry');
      default:
        return t('common.close');
    }
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={() => {
            if (updateInfo.status !== 'downloading') {
              setShowModal(false);
            }
          }}
        />
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('update.title')}
            </Text>
            {updateInfo.status !== 'downloading' && (
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.modalBody}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              {updateInfo.status === 'checking' && (
                <ActivityIndicator size="large" color={colors.primary} />
              )}
              {updateInfo.status === 'downloading' && (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: spinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <RefreshCw size={24} color={colors.primary} />
                </Animated.View>
              )}
              {(updateInfo.status === 'available' || updateInfo.status === 'ready') && (
                <RefreshCw size={24} color={colors.primary} />
              )}
              {(updateInfo.status === 'none' || updateInfo.status === 'error') && (
                <Text style={[styles.statusIcon, { color: colors.primary }]}>
                  {updateInfo.status === 'none' ? '✓' : '!'}
                </Text>
              )}
            </View>

            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              {t('update.currentVersion')} {Constants.default.nativeAppVersion || '1.0.0'}
            </Text>

            <Text style={[styles.messageText, { color: colors.text }]}>
              {updateInfo.message}
            </Text>

            {updateInfo.status === 'downloading' && (
              <View style={styles.progressContainer}>
                <View
                  style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${updateInfo.progress}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {updateInfo.progress}%
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor:
                  updateInfo.status === 'downloading' || updateInfo.status === 'checking'
                    ? colors.surfaceVariant
                    : colors.primary,
              },
            ]}
            onPress={handleModalAction}
            disabled={updateInfo.status === 'downloading' || updateInfo.status === 'checking'}
          >
            <Text
              style={[
                styles.actionBtnText,
                {
                  color:
                    updateInfo.status === 'downloading' || updateInfo.status === 'checking'
                      ? colors.textSecondary
                      : colors.onPrimary,
                },
              ]}
            >
              {getActionText()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    padding: 24,
    paddingBottom: 32,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});