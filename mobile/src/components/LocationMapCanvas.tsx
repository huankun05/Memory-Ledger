import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LocationMapNode } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin, Package } from 'lucide-react-native';

interface LocationMapCanvasProps {
  nodes: LocationMapNode[];
  highlightedLocationId?: string;
  hasSubLocationMap?: Record<string, boolean>;
  onLocationPress: (locationId: string) => void;
  width: number;
  height: number;
}

export default function LocationMapCanvas({
  nodes,
  highlightedLocationId,
  hasSubLocationMap = {},
  onLocationPress,
  width,
  height,
}: LocationMapCanvasProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const gridLayout = useMemo(() => {
    const count = nodes.length;
    if (count === 0) return { cols: 0, rows: 0 };

    let cols = Math.ceil(Math.sqrt(count));
    let rows = Math.ceil(count / cols);

    if (width > height * 1.5) {
      cols = Math.min(count, Math.ceil(Math.sqrt(count * 2)));
      rows = Math.ceil(count / cols);
    } else if (height > width * 1.5) {
      rows = Math.min(count, Math.ceil(Math.sqrt(count * 2)));
      cols = Math.ceil(count / rows);
    }

    return { cols, rows };
  }, [nodes.length, width, height]);

  const { cols, rows } = gridLayout;
  const gap = 10;

  const cardWidth = (width - gap * (cols - 1)) / cols;
  const cardHeight = (height - gap * (rows - 1)) / rows;

  // 计算网格总宽高，在容器内居中
  const totalGridWidth = cols * cardWidth + (cols - 1) * gap;
  const totalGridHeight = rows * cardHeight + (rows - 1) * gap;
  const offsetX = Math.max(0, (width - totalGridWidth) / 2);
  const offsetY = Math.max(0, (height - totalGridHeight) / 2);

  // 根据卡片实际高度决定图标大小
  const iconSize = cardHeight < 140 ? 28 : 36;
  const iconContainerSize = cardHeight < 140 ? 36 : 44;

  if (nodes.length === 0) {
    return (
      <View style={[styles.emptyContainer, { width, height }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('location.noLocations')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={[styles.paddingLayer, { width, height }]}>
        {nodes.map((node, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const isHighlighted = node.id === highlightedLocationId;
          const hasChildren = hasSubLocationMap[node.id] || false;

          // 最后一行居中处理：计算该行实际项目数
          const itemsInRow = Math.min(cols, nodes.length - row * cols);
          const rowOffsetX = offsetX + (itemsInRow < cols ? (cols - itemsInRow) * (cardWidth + gap) / 2 : 0);

          return (
            <TouchableOpacity
              key={node.id}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  height: cardHeight,
                  left: rowOffsetX + col * (cardWidth + gap),
                  top: offsetY + row * (cardHeight + gap),
                  backgroundColor: colors.surface,
                  borderColor: isHighlighted ? colors.primary : colors.border,
                  borderWidth: isHighlighted ? 2 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={() => onLocationPress(node.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15', width: iconContainerSize, height: iconContainerSize, borderRadius: iconContainerSize / 2 }]}>
                <MapPin size={iconSize} color={colors.primary} />
              </View>
              <Text
                style={[styles.cardTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {node.name}
              </Text>
              <View style={styles.cardCountRow}>
                <Package size={12} color={colors.textSecondary} />
                <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
                  {node.itemCount}
                </Text>
              </View>
              {hasChildren && (
                <View style={[styles.arrowBadge, { backgroundColor: colors.primary }]}>
                  <ChevronRight size={14} color={colors.onPrimary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  paddingLayer: {
    position: 'relative',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  card: {
    position: 'absolute',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  cardIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCount: {
    fontSize: 12,
  },
  arrowBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
