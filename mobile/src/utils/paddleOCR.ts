import { NativeModules, Platform } from 'react-native';

const { PaddleOCR } = NativeModules;

export interface OCRTextBlock {
  text: string;
  confidence: number;
  centerX: number;
  centerY: number;
  points: Array<{ x: number; y: number }>;
}

class PaddleOCRService {
  private initialized = false;

  async init(): Promise<boolean> {
    if (!PaddleOCR) {
      console.warn('[PaddleOCR] Native module not available');
      return false;
    }
    if (this.initialized) return true;

    try {
      console.log('[PaddleOCR] Initializing...');
      const result = await PaddleOCR.initialize();
      this.initialized = !!result;
      console.log('[PaddleOCR] Initialized:', this.initialized);
      return this.initialized;
    } catch (error) {
      console.warn('[PaddleOCR] Init failed:', error);
      return false;
    }
  }

  async recognize(imagePath: string): Promise<OCRTextBlock[]> {
    if (!PaddleOCR) {
      console.warn('[PaddleOCR] Native module not available');
      return [];
    }

    if (!this.initialized) {
      const ok = await this.init();
      if (!ok) return [];
    }

    try {
      const cleanPath = imagePath.replace(/^file:\/\//, '');
      console.log('[PaddleOCR] Recognizing:', cleanPath);

      const startTime = Date.now();
      const results = await PaddleOCR.recognize(cleanPath);
      const elapsed = Date.now() - startTime;

      console.log('[PaddleOCR] Done,', results.length, 'results in', elapsed, 'ms');

      return results as OCRTextBlock[];
    } catch (error) {
      console.warn('[PaddleOCR] Recognize failed:', error);
      return [];
    }
  }

  release() {
    if (PaddleOCR?.release) {
      PaddleOCR.release();
    }
    this.initialized = false;
  }
}

export const paddleOCR = new PaddleOCRService();
export default paddleOCR;
