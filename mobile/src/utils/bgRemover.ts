import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const { BgRemover } = NativeModules;

export interface BgRemoverResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

class BgRemoverService {
  private initialized = false;

  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (Platform.OS !== 'android') return false;
    if (!BgRemover) return false;

    try {
      const result = await BgRemover.initialize();
      this.initialized = result === true || result === 'true';
      return this.initialized;
    } catch (error) {
      console.warn('BgRemover init failed:', error);
      return false;
    }
  }

  async removeBackground(imageUri: string): Promise<BgRemoverResult> {
    console.log('[BgRemover] removeBackground start, uri:', imageUri);

    if (Platform.OS !== 'android') {
      console.log('[BgRemover] not android');
      return { success: false, error: 'Only supported on Android' };
    }

    if (!BgRemover) {
      console.log('[BgRemover] module not available');
      return { success: false, error: 'BgRemover module not available' };
    }

    try {
      if (!this.initialized) {
        console.log('[BgRemover] initializing...');
        const initResult = await this.init();
        console.log('[BgRemover] init result:', initResult);
        if (!initResult) {
          return { success: false, error: 'Failed to initialize BgRemover' };
        }
      }

      const inputPath = await this.getLocalPath(imageUri);
      console.log('[BgRemover] inputPath:', inputPath);

      const outputDirUri = FileSystem.documentDirectory || 'file:///data/user/0/com.mobile/files/';
      const outputDir = outputDirUri.replace('file://', '');
      console.log('[BgRemover] outputDir:', outputDir);

      try {
        await FileSystem.makeDirectoryAsync(outputDirUri, { intermediates: true });
      } catch (e) {
        console.log('[BgRemover] mkdir (may already exist):', e);
      }

      const outputPath = `${outputDir}bgremoved_${Date.now()}.png`;
      console.log('[BgRemover] calling native removeBackground with output:', outputPath);

      const result = await BgRemover.removeBackground(inputPath, outputPath);
      console.log('[BgRemover] native result:', result, typeof result);

      let finalOutputPath: string;
      if (typeof result === 'string') {
        finalOutputPath = result;
      } else {
        finalOutputPath = outputPath;
      }

      if (!finalOutputPath.startsWith('file://')) {
        finalOutputPath = `file://${finalOutputPath}`;
      }

      console.log('[BgRemover] final output path:', finalOutputPath);

      const fileInfo = await FileSystem.getInfoAsync(finalOutputPath);
      console.log('[BgRemover] output file exists:', fileInfo.exists);

      return {
        success: true,
        outputPath: finalOutputPath,
      };
    } catch (error: any) {
      console.warn('[BgRemover] process failed:', error);
      console.warn('[BgRemover] error code:', error?.code);
      console.warn('[BgRemover] error message:', error?.message);
      return {
        success: false,
        error: error?.message || 'Failed to remove background',
      };
    }
  }

  async release(): Promise<void> {
    if (!BgRemover || !this.initialized) return;
    try {
      await BgRemover.release();
    } catch (error) {
      console.warn('BgRemover release failed:', error);
    }
    this.initialized = false;
  }

  private async getLocalPath(uri: string): Promise<string> {
    if (uri.startsWith('file://')) {
      return uri.replace('file://', '');
    }
    if (uri.startsWith('/')) {
      return uri;
    }
    if (uri.startsWith('content://')) {
      const tmpPath = `${FileSystem.cacheDirectory}tmp_img_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: tmpPath });
      return tmpPath.replace('file://', '');
    }
    return uri;
  }
}

export const bgRemoverService = new BgRemoverService();
