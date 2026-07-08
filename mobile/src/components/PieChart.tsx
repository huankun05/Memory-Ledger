
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { X, Package } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

export interface PieDataItem {
  key: string;
  label: string;
  value: number;
  count: number;
  color: string;
}

interface PieChartProps {
  data: PieDataItem[];
  size?: number;
  strokeWidth?: number;
  onItemPress?: (item: PieDataItem) => void;
  showCurrency?: boolean;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

export default function PieChart({
  data,
  size = 220,
  strokeWidth = 2,
  onItemPress,
  showCurrency = true,
}: PieChartProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const showSideInfo = screenWidth > 320;

  const { responsiveSize, sideInfoWidth } = useMemo(() => {
    // 卡片有 marginHorizontal:20 + padding:20，共占 80px
    const cardMarginAndPadding = 80;
    const gap = 16;
    // 大屏设备上侧边统计卡适当加宽
    const sWidth = screenWidth > 600 ? 110 : 90;
    const totalSideWidth = showSideInfo ? sWidth + gap : 0;
    const availableWidth = screenWidth - cardMarginAndPadding - totalSideWidth;
    // 大屏设备上允许饼图更大，但不超过可用宽度的 40%
    const maxSize = Math.min(size, screenWidth > 600 ? 300 : size);
    return {
      responsiveSize: Math.min(maxSize, Math.max(availableWidth, 120)),
      sideInfoWidth: sWidth,
    };
  }, [screenWidth, size, showSideInfo]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = responsiveSize / 2;
  const radius = responsiveSize / 2 - 10;

  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { ...item, startAngle, endAngle, angle, index };
  });

  const displaySize = expanded ? Math.min(responsiveSize * 1.1, screenWidth - 80) : responsiveSize;
  const displayCenter = displaySize / 2;
  const displayRadius = displaySize / 2 - (expanded ? 15 : 10);

  return (
    <View style={styles.container}>
      {/* Pie Chart + Side Stats */}
      <View style={styles.chartRow}>
        <TouchableOpacity
          style={[styles.chartWrapper, { width: displaySize, height: displaySize }]}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.9}
        >
          <Svg width={displaySize} height={displaySize}>
            <Circle
              cx={displayCenter}
              cy={displayCenter}
              r={displayRadius * 0.4}
              fill={colors.surface}
            />
            {slices.map((slice) => {
              const isSelected = selectedIndex === slice.index;
              const scale = isSelected ? 1.05 : 1;
              const adjustedRadius = displayRadius * scale;
              const path = describeArc(
                displayCenter,
                displayCenter,
                adjustedRadius,
                slice.startAngle,
                slice.endAngle
              );
              const midAngle = slice.startAngle + slice.angle / 2;
              const labelRadius = adjustedRadius * 0.75;
              const labelPos = polarToCartesian(
                displayCenter,
                displayCenter,
                labelRadius,
                midAngle
              );
              return (
                <G key={slice.key}>
                  <Path
                    d={path}
                    fill={slice.color}
                    stroke={colors.surface}
                    strokeWidth={strokeWidth}
                    onPress={() => {
                      setSelectedIndex(
                        selectedIndex === slice.index ? null : slice.index
                      );
                      onItemPress?.(slice);
                    }}
                  />
                  {slice.angle > 15 && (
                    <SvgText
                      x={labelPos.x}
                      y={labelPos.y}
                      fill="#fff"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {`${Math.round((slice.value / total) * 100)}%`}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </TouchableOpacity>

        {showSideInfo && data.length > 0 && (
          <View style={styles.sideColumn}>
            <View style={[styles.sideInfo, { backgroundColor: colors.surfaceVariant, width: sideInfoWidth }]}>
              <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>
                {showCurrency ? t('home.total') : t('home.totalCount')}
              </Text>
              <Text style={[styles.sideValue, { color: colors.primary }]}>
                {showCurrency ? `¥${(total / 100).toFixed(0)}` : total}
              </Text>
              <Text style={[styles.sideSub, { color: colors.textTertiary }]}>
                {data.length} {t('home.categories')}
              </Text>
            </View>

            <View style={[styles.sideInfo, { backgroundColor: colors.surfaceVariant, width: sideInfoWidth }]}>
              <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>
                {t('home.topCategory')}
              </Text>
              <View
                style={[styles.topCategoryDot, { backgroundColor: data[0].color }]}
              />
              <Text style={[styles.sideValue, { color: colors.text, fontSize: 14 }]} numberOfLines={1}>
                {data[0].label}
              </Text>
              <Text style={[styles.sideSub, { color: colors.primary }]}>
                {Math.round((data[0].value / total) * 100)}%
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Center Info (for small screens) */}
      {!showSideInfo && data.length > 0 && (
        <View style={[styles.centerInfo, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.centerInfoRow}>
            <View style={styles.centerInfoItem}>
              <Text style={[styles.centerInfoLabel, { color: colors.textSecondary }]}>
                {showCurrency ? t('home.total') : t('home.totalCount')}
              </Text>
              <Text style={[styles.centerInfoValue, { color: colors.primary }]}>
                {showCurrency ? `¥${(total / 100).toFixed(0)}` : total}
              </Text>
            </View>
            <View style={styles.centerInfoDivider} />
            <View style={styles.centerInfoItem}>
              <Text style={[styles.centerInfoLabel, { color: colors.textSecondary }]}>
                {t('home.topCategory')}
              </Text>
              <Text style={[styles.centerInfoValue, { color: colors.text }]}>
                {data[0].label}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendContainer}>
        {data.map((item, index) => {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          const isSelected = selectedIndex === index;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.legendItem,
                isSelected && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() =>
                setSelectedIndex(selectedIndex === index ? null : index)
              }
              activeOpacity={0.7}
            >
              <View
                style={[styles.legendDot, { backgroundColor: item.color }]}
              />
              <Text style={[styles.legendLabel, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                {item.count}件
              </Text>
              <Text style={[styles.legendPercent, { color: colors.primary }]}>
                {percent}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  sideColumn: {
    flexDirection: 'column',
    gap: 10,
  },
  sideInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 3,
  },
  centerInfo: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  centerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  centerInfoItem: {
    alignItems: 'center',
    gap: 2,
  },
  centerInfoLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  centerInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  sideValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  sideSub: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  topCategoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginVertical: 2,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    width: '100%',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    marginRight: 8,
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
});
