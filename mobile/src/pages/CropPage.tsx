import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, RotateCcw, Move } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import * as ImageManipulator from 'expo-image-manipulator';

const MIN_CROP_SIZE = 50;
const HANDLE_SIZE = 28;
const HANDLE_TOL = HANDLE_SIZE;        // 角句柄命中容差
const SMALL_HANDLE_TOL = 12;           // 边中点句柄命中容差

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragType = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'lm' | 'rm' | 'draw';

interface DragState {
  active: boolean;
  type: DragType;
  startX: number;
  startY: number;
  startCropX: number;
  startCropY: number;
  startCropW: number;
  startCropH: number;
}

export default function CropPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const imageUri = route.params?.imageUri;
  const [cropping, setCropping] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [hud, setHud] = useState('init');

  // 图片尺寸来源：onLoad (优先) / getSize (回退)
  const imageOnLoadSizeRef = useRef({ width: 0, height: 0 });
  const imageGetSizeRef = useRef({ width: 0, height: 0 });
  const displayRef = useRef({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const lastContainerSizeRef = useRef({ width: 0, height: 0 });
  const dragRef = useRef<DragState>({
    active: false,
    type: 'move',
    startX: 0,
    startY: 0,
    startCropX: 0,
    startCropY: 0,
    startCropW: 0,
    startCropH: 0,
  });

  // 用 ref 保存最新的 cropRect，避免手势回调闭包拿到过期值
  const cropRectRef = useRef(cropRect);
  cropRectRef.current = cropRect;

  // 基于图片原始尺寸计算显示参数（被 getSize 和 onLoad 共用）
  const calcDisplayParams = useCallback((containerW: number, containerH: number, imgW: number, imgH: number) => {
    const padding = 20;
    const maxW = containerW - padding * 2;
    const maxH = containerH - padding * 2;
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    const dWidth = imgW * ratio;
    const dHeight = imgH * ratio;
    const offsetX = (containerW - dWidth) / 2;
    const offsetY = (containerH - dHeight) / 2;
    return { dWidth, dHeight, offsetX, offsetY };
  }, []);

  const handleContainerLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    if (width === 0 || height === 0) return;
    lastContainerSizeRef.current = { width, height };
    if (!imageUri || imageGetSizeRef.current.width > 0) return;

    Image.getSize(imageUri, (imgWidth, imgHeight) => {
      imageGetSizeRef.current = { width: imgWidth, height: imgHeight };

      // 如果 onLoad 已经回调，优先用 onLoad 的尺寸；否则用 getSize 的
      const refW = imageOnLoadSizeRef.current.width || imgWidth;
      const refH = imageOnLoadSizeRef.current.height || imgHeight;

      const { dWidth, dHeight, offsetX, offsetY } = calcDisplayParams(width, height, refW, refH);
      displayRef.current = { width: dWidth, height: dHeight, offsetX, offsetY };
      const initW = dWidth * 0.7;
      const initH = dHeight * 0.7;
      const initX = offsetX + (dWidth - initW) / 2;
      const initY = offsetY + (dHeight - initH) / 2;

      setCropRect({ x: initX, y: initY, width: initW, height: initH });
      setIsReady(true);
      setHud(`ready ${Math.round(dWidth)}x${Math.round(dHeight)} @${Math.round(offsetX)},${Math.round(offsetY)}`);
      console.warn('[CropPage] sizeReady getSize', { imgWidth, imgHeight, dWidth, dHeight, offsetX, offsetY });
    }, (error) => {
      console.warn('[CropPage] Image.getSize failed', error);
    });
  }, [imageUri, calcDisplayParams]);

  // Image onLoad: 捕获实际加载后的图片原始尺寸（比 getSize 更准确）
  const onImageLoad = useCallback((event: any) => {
    const src = event.nativeEvent?.source;
    if (src && typeof src.width === 'number' && typeof src.height === 'number' && src.width > 0 && src.height > 0) {
      const onLoadW = src.width;
      const onLoadH = src.height;
      console.warn('[CropPage] onImageLoad', { onLoadW, onLoadH });

      // 如果与 getSize 尺寸相同，无需重新计算
      if (onLoadW === imageGetSizeRef.current.width && onLoadH === imageGetSizeRef.current.height) {
        return;
      }

      // 尺寸不同：以 onLoad 为准，重新计算显示参数
      imageOnLoadSizeRef.current = { width: onLoadW, height: onLoadH };
      const { width: cw, height: ch } = lastContainerSizeRef.current;
      if (cw === 0 || ch === 0) return;

      const { dWidth, dHeight, offsetX, offsetY } = calcDisplayParams(cw, ch, onLoadW, onLoadH);
      displayRef.current = { width: dWidth, height: dHeight, offsetX, offsetY };

      // 重置裁切框到新的显示中心
      const initW = dWidth * 0.7;
      const initH = dHeight * 0.7;
      const initX = offsetX + (dWidth - initW) / 2;
      const initY = offsetY + (dHeight - initH) / 2;
      setCropRect({ x: initX, y: initY, width: initW, height: initH });
      setIsReady(true);
      setHud(`ready-onload ${Math.round(dWidth)}x${Math.round(dHeight)}`);
      console.warn('[CropPage] sizeReady onLoad (dimensions differ from getSize)', {
        getSize: imageGetSizeRef.current,
        onLoad: { width: onLoadW, height: onLoadH },
        display: { dWidth, dHeight, offsetX, offsetY },
      });
    }
  }, [calcDisplayParams]);

  // 获取最佳图片尺寸：onLoad > getSize > 0
  const getImageSize = useCallback(() => {
    if (imageOnLoadSizeRef.current.width > 0) return imageOnLoadSizeRef.current;
    return imageGetSizeRef.current;
  }, []);

  const clampCrop = useCallback((x: number, y: number, w: number, h: number): CropRect => {
    const { offsetX, offsetY, width: imgW, height: imgH } = displayRef.current;

    const nx = Math.max(offsetX, Math.min(offsetX + imgW - w, x));
    const ny = Math.max(offsetY, Math.min(offsetY + imgH - h, y));
    const nw = Math.max(MIN_CROP_SIZE, Math.min(imgW, w));
    const nh = Math.max(MIN_CROP_SIZE, Math.min(imgH, h));

    return { x: nx, y: ny, width: nw, height: nh };
  }, []);

  // 命中检测：根据触摸点（相对容器坐标）判断要执行的操作
  const hitTest = useCallback((px: number, py: number): DragType | 'none' => {
    const { offsetX, offsetY, width: imgW, height: imgH } = displayRef.current;
    if (imgW === 0 || imgH === 0) return 'none';
    const { x: cx, y: cy, width: cw, height: ch } = cropRectRef.current;

    if (px < offsetX || px > offsetX + imgW || py < offsetY || py > offsetY + imgH) return 'none';

    if (Math.abs(px - cx) <= HANDLE_TOL && Math.abs(py - cy) <= HANDLE_TOL) return 'tl';
    if (Math.abs(px - (cx + cw)) <= HANDLE_TOL && Math.abs(py - cy) <= HANDLE_TOL) return 'tr';
    if (Math.abs(px - cx) <= HANDLE_TOL && Math.abs(py - (cy + ch)) <= HANDLE_TOL) return 'bl';
    if (Math.abs(px - (cx + cw)) <= HANDLE_TOL && Math.abs(py - (cy + ch)) <= HANDLE_TOL) return 'br';
    if (Math.abs(px - (cx + cw / 2)) <= SMALL_HANDLE_TOL && Math.abs(py - cy) <= SMALL_HANDLE_TOL) return 'tm';
    if (Math.abs(px - (cx + cw / 2)) <= SMALL_HANDLE_TOL && Math.abs(py - (cy + ch)) <= SMALL_HANDLE_TOL) return 'bm';
    if (Math.abs(px - cx) <= SMALL_HANDLE_TOL && Math.abs(py - (cy + ch / 2)) <= SMALL_HANDLE_TOL) return 'lm';
    if (Math.abs(px - (cx + cw)) <= SMALL_HANDLE_TOL && Math.abs(py - (cy + ch / 2)) <= SMALL_HANDLE_TOL) return 'rm';
    if (px > cx && px < cx + cw && py > cy && py < cy + ch) return 'move';
    return 'draw';
  }, []);

  const updateRect = useCallback((type: DragType, curX: number, curY: number) => {
    const { offsetX, offsetY, width: imgW, height: imgH } = displayRef.current;
    const drag = dragRef.current;

    const dx = curX - drag.startX;
    const dy = curY - drag.startY;

    let nx = drag.startCropX;
    let ny = drag.startCropY;
    let nw = drag.startCropW;
    let nh = drag.startCropH;

    switch (type) {
      case 'move':
        nx = Math.max(offsetX, Math.min(offsetX + imgW - nw, drag.startCropX + dx));
        ny = Math.max(offsetY, Math.min(offsetY + imgH - nh, drag.startCropY + dy));
        break;
      case 'tl':
        nx = Math.max(offsetX, drag.startCropX + dx);
        ny = Math.max(offsetY, drag.startCropY + dy);
        nw = drag.startCropW - (nx - drag.startCropX);
        nh = drag.startCropH - (ny - drag.startCropY);
        break;
      case 'tr':
        ny = Math.max(offsetY, drag.startCropY + dy);
        nw = Math.min(offsetX + imgW - drag.startCropX, drag.startCropW + dx);
        nh = drag.startCropH - (ny - drag.startCropY);
        break;
      case 'bl':
        nx = Math.max(offsetX, drag.startCropX + dx);
        nw = drag.startCropW - (nx - drag.startCropX);
        nh = Math.min(offsetY + imgH - drag.startCropY, drag.startCropH + dy);
        break;
      case 'br':
        nw = Math.min(offsetX + imgW - drag.startCropX, drag.startCropW + dx);
        nh = Math.min(offsetY + imgH - drag.startCropY, drag.startCropH + dy);
        break;
      case 'tm':
        ny = Math.max(offsetY, drag.startCropY + dy);
        nh = drag.startCropH - (ny - drag.startCropY);
        break;
      case 'bm':
        nh = Math.min(offsetY + imgH - drag.startCropY, drag.startCropH + dy);
        break;
      case 'lm':
        nx = Math.max(offsetX, drag.startCropX + dx);
        nw = drag.startCropW - (nx - drag.startCropX);
        break;
      case 'rm':
        nw = Math.min(offsetX + imgW - drag.startCropX, drag.startCropW + dx);
        break;
      case 'draw': {
        const sx = Math.max(offsetX, Math.min(offsetX + imgW, drag.startX));
        const sy = Math.max(offsetY, Math.min(offsetY + imgH, drag.startY));
        const ex = Math.max(offsetX, Math.min(offsetX + imgW, curX));
        const ey = Math.max(offsetY, Math.min(offsetY + imgH, curY));
        nx = Math.min(sx, ex);
        ny = Math.min(sy, ey);
        nw = Math.abs(ex - sx);
        nh = Math.abs(ey - sy);
        break;
      }
    }

    if (type === 'draw') {
      if (nw > 2 && nh > 2) {
        setCropRect({ x: nx, y: ny, width: nw, height: nh });
      }
    } else if (nw >= MIN_CROP_SIZE && nh >= MIN_CROP_SIZE) {
      setCropRect(clampCrop(nx, ny, nw, nh));
    }
  }, [clampCrop]);

  // 手势状态变化：BEGIN 命中检测并初始化，END 结束
  const onHandlerStateChange = useCallback((event: any) => {
    const { state, x, y } = event.nativeEvent;
    if (state === State.BEGAN) {
      if (displayRef.current.width === 0) {
        console.warn('[CropPage] BEGAN but display not ready');
        setHud('BEGAN but not ready');
        return;
      }
      const type = hitTest(x, y);
      console.warn('[CropPage] BEGAN type =', type, 'at', Math.round(x), Math.round(y));
      if (type === 'none') return;
      const cur = cropRectRef.current;
      dragRef.current = {
        active: true,
        type,
        startX: x,
        startY: y,
        startCropX: cur.x,
        startCropY: cur.y,
        startCropW: cur.width,
        startCropH: cur.height,
      };
      setHud(`start:${type} @${Math.round(x)},${Math.round(y)}`);
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      console.warn('[CropPage] END type =', dragRef.current.type, 'active =', dragRef.current.active);
      dragRef.current.active = false;
      setHud(`end:${dragRef.current.type}`);
    }
  }, [hitTest]);

  // 手势移动：实时更新裁剪框
  const onGestureEvent = useCallback((event: any) => {
    if (!dragRef.current.active) return;
    const { x, y } = event.nativeEvent;
    updateRect(dragRef.current.type, x, y);
    const cr = cropRectRef.current;
    console.warn('[CropPage] MOVE', dragRef.current.type, Math.round(x), Math.round(y), '->', Math.round(cr.x), Math.round(cr.y), Math.round(cr.width), Math.round(cr.height));
    setHud(`${dragRef.current.type} (${Math.round(x)},${Math.round(y)}) rect(${Math.round(cr.x)},${Math.round(cr.y)},${Math.round(cr.width)}x${Math.round(cr.height)})`);
  }, [updateRect]);

  const handleCrop = async () => {
    if (!imageUri || displayRef.current.width === 0) return;
    if (cropRect.width < MIN_CROP_SIZE || cropRect.height < MIN_CROP_SIZE) {
      Alert.alert(t('add.cropTooSmall') || t('add.cropFailed'), t('add.cropRetry'));
      return;
    }

    setCropping(true);
    try {
      const { offsetX, offsetY, width: dWidth, height: dHeight } = displayRef.current;
      const imgSize = getImageSize();
      const imgW = imgSize.width;
      const imgH = imgSize.height;

      // 使用单一均匀的缩放比例，避免 scaleX/scaleY 不一致
      const scale = imgW / dWidth;

      const originX = Math.max(0, Math.round((cropRect.x - offsetX) * scale));
      const originY = Math.max(0, Math.round((cropRect.y - offsetY) * scale));
      const cropWidth = Math.min(imgW - originX, Math.round(cropRect.width * scale));
      const cropHeight = Math.min(imgH - originY, Math.round(cropRect.height * scale));

      console.warn('[CropPage] handleCrop', {
        display: { dWidth, dHeight, offsetX, offsetY },
        imgSize: { imgW, imgH },
        scale,
        cropRect: { ...cropRect },
        result: { originX, originY, cropWidth, cropHeight },
      });

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.PNG }
      );

      navigation.replace('AddManual', { imageUrl: result.uri, autoProcess: true });
    } catch (error) {
      console.warn('[CropPage] crop failed:', error);
      Alert.alert(t('add.cropFailed'), t('add.cropRetry'));
    } finally {
      setCropping(false);
    }
  };

  const handleReset = () => {
    const { offsetX, offsetY, width: dWidth, height: dHeight } = displayRef.current;
    if (dWidth === 0) return;

    const initW = dWidth * 0.7;
    const initH = dHeight * 0.7;
    setCropRect({
      x: offsetX + (dWidth - initW) / 2,
      y: offsetY + (dHeight - initH) / 2,
      width: initW,
      height: initH,
    });
  };

  const ds = displayRef.current;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('add.cropImage')}</Text>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: cropping || !isReady ? 0.5 : 1 }]}
          onPress={handleCrop}
          disabled={cropping || !isReady}
        >
          {cropping ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Check size={20} color={colors.onPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/*
        容器用 PanGestureHandler 包裹（react-native-gesture-handler）。
        原因：本项目导航是 createNativeStackNavigator（原生栈），原生栈下
        普通 PanResponder 的触摸事件会被原生手势系统拦截，JS 收不到；
        必须用基于原生手势识别器的 PanGestureHandler 才能正常工作。
        坐标：event.nativeEvent.x/y 即相对 imageContainer 的坐标。
        所有视觉子元素 pointerEvents="none"，让手势落到 imageContainer。
      */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <View
          style={styles.imageContainer}
          onLayout={handleContainerLayout}
        >
          {isReady && imageUri && (
            <>
              <Image
                pointerEvents="none"
                key={`crop-${imageUri}`}
                source={{ uri: imageUri }}
                onLoad={onImageLoad}
                style={{
                  width: ds.width,
                  height: ds.height,
                  position: 'absolute',
                  left: ds.offsetX,
                  top: ds.offsetY,
                }}
              />

              <View pointerEvents="none" style={{
                position: 'absolute', top: ds.offsetY, left: cropRect.x,
                width: cropRect.width, height: Math.max(0, cropRect.y - ds.offsetY),
                backgroundColor: 'rgba(0,0,0,0.5)',
              }} />
              <View pointerEvents="none" style={{
                position: 'absolute', top: cropRect.y + cropRect.height, left: cropRect.x,
                width: cropRect.width, height: Math.max(0, ds.offsetY + ds.height - cropRect.y - cropRect.height),
                backgroundColor: 'rgba(0,0,0,0.5)',
              }} />
              <View pointerEvents="none" style={{
                position: 'absolute', top: cropRect.y, left: ds.offsetX,
                width: Math.max(0, cropRect.x - ds.offsetX), height: cropRect.height,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }} />
              <View pointerEvents="none" style={{
                position: 'absolute', top: cropRect.y, left: cropRect.x + cropRect.width,
                width: Math.max(0, ds.offsetX + ds.width - cropRect.x - cropRect.width), height: cropRect.height,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }} />

              <View pointerEvents="none" style={{
                position: 'absolute',
                left: cropRect.x, top: cropRect.y,
                width: cropRect.width, height: cropRect.height,
                borderWidth: 2, borderColor: colors.primary,
              }}>
                <View style={[styles.moveHint, { backgroundColor: colors.primary + '30' }]}>
                  <Move size={20} color={colors.primary} />
                </View>
              </View>

              <View pointerEvents="none" style={[styles.handle, {
                backgroundColor: colors.primary, borderColor: colors.onPrimary,
                position: 'absolute',
                left: cropRect.x - HANDLE_SIZE / 2, top: cropRect.y - HANDLE_SIZE / 2,
              }]} />
              <View pointerEvents="none" style={[styles.handle, {
                backgroundColor: colors.primary, borderColor: colors.onPrimary,
                position: 'absolute',
                left: cropRect.x + cropRect.width - HANDLE_SIZE / 2, top: cropRect.y - HANDLE_SIZE / 2,
              }]} />
              <View pointerEvents="none" style={[styles.handle, {
                backgroundColor: colors.primary, borderColor: colors.onPrimary,
                position: 'absolute',
                left: cropRect.x - HANDLE_SIZE / 2, top: cropRect.y + cropRect.height - HANDLE_SIZE / 2,
              }]} />
              <View pointerEvents="none" style={[styles.handle, {
                backgroundColor: colors.primary, borderColor: colors.onPrimary,
                position: 'absolute',
                left: cropRect.x + cropRect.width - HANDLE_SIZE / 2, top: cropRect.y + cropRect.height - HANDLE_SIZE / 2,
              }]} />
              <View pointerEvents="none" style={[styles.handleSmall, {
                backgroundColor: colors.primary + '80',
                position: 'absolute',
                left: cropRect.x + cropRect.width / 2 - 6, top: cropRect.y - 6,
              }]} />
              <View pointerEvents="none" style={[styles.handleSmall, {
                backgroundColor: colors.primary + '80',
                position: 'absolute',
                left: cropRect.x + cropRect.width / 2 - 6, top: cropRect.y + cropRect.height - 6,
              }]} />
              <View pointerEvents="none" style={[styles.handleSmall, {
                backgroundColor: colors.primary + '80',
                position: 'absolute',
                left: cropRect.x - 6, top: cropRect.y + cropRect.height / 2 - 6,
              }]} />
              <View pointerEvents="none" style={[styles.handleSmall, {
                backgroundColor: colors.primary + '80',
                position: 'absolute',
                left: cropRect.x + cropRect.width - 6, top: cropRect.y + cropRect.height / 2 - 6,
              }]} />
            </>
          )}

          {/* 调试 HUD（直接显示命中/坐标，便于确认手势是否生效；调试完可删除） */}
          <View pointerEvents="none" style={styles.hud}>
            <Text style={styles.hudText}>{hud}</Text>
          </View>

          {!isReady && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </PanGestureHandler>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleReset} disabled={!isReady}>
          <RotateCcw size={20} color={isReady ? colors.text : colors.textSecondary} />
          <Text style={[styles.actionText, { color: isReady ? colors.text : colors.textSecondary }]}>
            {t('add.resetCrop')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  title: { fontSize: 18, fontWeight: '600' },
  confirmBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { flex: 1, position: 'relative' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  moveHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -20,
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 3,
  },
  handleSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, fontWeight: '500' },
  hud: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 999,
  },
  hudText: { color: '#00ff88', fontSize: 12, fontFamily: 'monospace' },
});
