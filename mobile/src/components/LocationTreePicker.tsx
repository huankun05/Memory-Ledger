import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, ChevronDown, MapPin, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Location } from '../types';
import { buildLocationTree } from '../utils/formatters';

type LocationTreeNode = Location & { children: LocationTreeNode[] };

interface LocationTreePickerProps {
  locations: Location[];
  selectedId: string;
  onSelect: (id: string) => void;
  defaultExpandAll?: boolean;
  initiallyExpandedIds?: string[];
}

export default function LocationTreePicker({
  locations,
  selectedId,
  onSelect,
  defaultExpandAll = false,
  initiallyExpandedIds = [],
}: LocationTreePickerProps) {
  const { colors } = useTheme();
  
  const getParentIds = (locId: string): string[] => {
    const parentMap = new Map<string, string | undefined>();
    locations.forEach((loc) => parentMap.set(loc.id, loc.parentId));
    
    const ids: string[] = [];
    let current: string | undefined = parentMap.get(locId);
    while (current) {
      ids.unshift(current);
      current = parentMap.get(current);
    }
    return ids;
  };

  const initiallyExpanded = useMemo(() => {
    if (locations.length === 0) return new Set<string>();
    
    const expanded = new Set<string>(initiallyExpandedIds);
    
    if (selectedId) {
      const parentIds = getParentIds(selectedId);
      parentIds.forEach((id) => expanded.add(id));
    }
    
    return expanded;
  }, [locations, selectedId, initiallyExpandedIds]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initiallyExpanded);

  useEffect(() => {
    if (selectedId && locations.length > 0) {
      const parentIds = getParentIds(selectedId);
      if (parentIds.length > 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          parentIds.forEach((id) => next.add(id));
          return next;
        });
      }
    }
  }, [selectedId, locations]);

  const tree = useMemo(() => buildLocationTree(locations) as LocationTreeNode[], [locations]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNode = (
    node: LocationTreeNode,
    level: number
  ): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedId === node.id;

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.locationRow,
            { paddingLeft: 16 + level * 20 },
            isSelected && { backgroundColor: colors.primary + '15' },
          ]}
          activeOpacity={0.7}
        >
          <TouchableOpacity
            style={styles.expandArea}
            onPress={() => hasChildren && toggleExpand(node.id)}
            disabled={!hasChildren}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={16} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={16} color={colors.textSecondary} />
              )
            ) : (
              <View style={styles.placeholderIcon} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationContent}
            onPress={() => onSelect(node.id)}
            activeOpacity={0.6}
          >
            <View style={[styles.locationIcon, { backgroundColor: colors.primary + '15' }]}>
              <MapPin size={14} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.locationName,
                { color: isSelected ? colors.primary : colors.text },
              ]}
              numberOfLines={1}
            >
              {node.name}
            </Text>
            {isSelected && <Check size={16} color={colors.primary} />}
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded &&
          node.children.map((child) => renderNode(child, level + 1))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {tree.map((node) => renderNode(node, 0))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
  },
  expandArea: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 16,
  },
  locationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
