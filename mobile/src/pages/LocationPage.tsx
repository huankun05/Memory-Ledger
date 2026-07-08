import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, findNodeHandle, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MapPin, Package, ChevronRight, Plus, X, Check, FolderPlus, ChevronDown, Map, Home, MapPinPlus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore, useItems, useLocations } from '../store';
import { Location } from '../types';
import LocationMapCanvas from '../components/LocationMapCanvas';
import { getSingleLevelLayout, hasChildren, getLocationBreadcrumb } from '../utils/autoLayout';
import { formatRelativeDate, buildLocationTree, LocationTreeNode } from '../utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../hooks/useToast';

export default function LocationPage() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const items = useItems();
  const locations = useLocations();
  const addLocation = useAppStore((s) => s.addLocation);
  const insets = useSafeAreaInsets();
  const screenWidth = useWindowDimensions().width;

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [modalExpandedLocations, setModalExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { toast, showToast } = useToast();
  const scrollViewRef = useRef<ScrollView>(null);
  const locationRefs = useRef<Record<string, View>>({});

  const tree = useMemo(() => buildLocationTree(locations), [locations]);

  const itemCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item) => {
      if (item.locationId) {
        map[item.locationId] = (map[item.locationId] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  // 位置地图相关
  const [mapCurrentParentId, setMapCurrentParentId] = useState<string | undefined>(undefined);
  const [mapShowItemsModal, setMapShowItemsModal] = useState(false);
  const [mapSelectedLocationId, setMapSelectedLocationId] = useState<string | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  useEffect(() => {
    console.log('[LocationPage] mounted - v20260705');
  }, []);

  const mapSearchResults = useMemo(() => {
    if (!mapSearchQuery.trim()) return [];
    const query = mapSearchQuery.toLowerCase();
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [locations, mapSearchQuery]);

  const handleMapSearchSelect = useCallback((locationId: string) => {
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return;
    
    // 构建路径并设置到对应层级
    const path: string[] = [];
    let current: Location | undefined = loc;
    while (current) {
      path.unshift(current.id);
      current = locations.find(l => l.id === current!.parentId);
    }
    
    // 如果路径有父节点，设置到父节点层级
    if (path.length > 1) {
      setMapCurrentParentId(path[path.length - 2]);
    } else {
      setMapCurrentParentId(undefined);
    }
    setMapSearchQuery('');
  }, [locations]);

  const mapNodes = useMemo(() => {
    return getSingleLevelLayout(locations, items, mapCurrentParentId);
  }, [locations, items, mapCurrentParentId]);

  const hasSubLocationMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    locations.forEach((loc) => {
      map[loc.id] = hasChildren(locations, loc.id);
    });
    return map;
  }, [locations]);

  const mapHeight = useMemo(() => {
    const count = mapNodes.length;
    if (count === 0) return 200;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    // 大屏设备上限制地图宽度，避免卡片过大
    const effectiveWidth = Math.min(screenWidth - 72, 528);
    const idealCardH = effectiveWidth * 0.48;
    const minCardH = Math.max(120, idealCardH);
    const gapTotal = 10 * (rows - 1);
    return Math.max(180, Math.min(rows * minCardH + gapTotal, 400));
  }, [mapNodes.length, screenWidth]);

  const mapBreadcrumb = useMemo(() => {
    if (!mapCurrentParentId) return [];
    const result: Location[] = [];
    let currentId: string | undefined = mapCurrentParentId;
    while (currentId) {
      const loc = locations.find((l) => l.id === currentId);
      if (!loc) break;
      result.unshift(loc);
      currentId = loc.parentId;
    }
    return result;
  }, [locations, mapCurrentParentId]);

  const handleMapLocationPress = useCallback((locationId: string) => {
    const hasSub = hasChildren(locations, locationId);
    if (hasSub) {
      setMapCurrentParentId(locationId);
    } else {
      setMapSelectedLocationId(locationId);
      setMapShowItemsModal(true);
    }
  }, [locations]);

  const handleMapGoBack = useCallback(() => {
    if (mapCurrentParentId) {
      const currentLoc = locations.find((l) => l.id === mapCurrentParentId);
      if (currentLoc?.parentId) {
        setMapCurrentParentId(currentLoc.parentId);
      } else {
        setMapCurrentParentId(undefined);
      }
    }
  }, [mapCurrentParentId, locations]);

  const handleMapItemPress = useCallback((itemId: string) => {
    setMapShowItemsModal(false);
    navigation.navigate('ItemDetail', { id: itemId });
  }, [navigation]);

  const mapSelectedItems = useMemo(() => {
    if (!mapSelectedLocationId) return [];
    return items.filter((item) => item.locationId === mapSelectedLocationId);
  }, [items, mapSelectedLocationId]);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert(t('common.error'), t('location.nameRequired'));
      return;
    }

    const name = newLocationName.trim();
    const parentId = selectedParentId || undefined;

    setAdding(true);
    try {
      await addLocation({
        name,
        parentId,
      });
      setShowAddModal(false);
      setNewLocationName('');
      setSelectedParentId(null);

      // 展开父位置
      if (parentId) {
        const expanded = new Set(expandedLocations);
        expanded.add(parentId);
        setExpandedLocations(expanded);
      }

      // 滚动到新增的位置
      setTimeout(() => {
        const latestLocations = useAppStore.getState().locations;
        const newLoc = latestLocations.find(loc => 
          loc.name === name && loc.parentId === parentId
        );
        if (newLoc) {
          const ref = locationRefs.current[newLoc.id];
          if (ref && scrollViewRef.current) {
            ref.measureLayout(
              findNodeHandle(scrollViewRef.current)!,
              (_x, y, _w, _h) => {
                scrollViewRef.current?.scrollTo({ y, animated: true });
              },
              () => {}
            );
          }
        }
      }, 300);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setAdding(false);
    }
  };

  const toggleItemsExpand = (locationId: string) => {
    const locationItems = items.filter(item => item.locationId === locationId);
    if (locationItems.length === 0) {
      showToast(t('location.noDirectItems'));
      return;
    }
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const openAddModal = (parentId?: string) => {
    setSelectedParentId(parentId || null);
    setNewLocationName('');
    if (parentId) {
      const expanded = new Set<string>();
      const findAncestors = (nodes: LocationTreeNode[], targetId: string, path: string[]): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            path.forEach(id => expanded.add(id));
            return true;
          }
          if (node.children && node.children.length > 0) {
            if (findAncestors(node.children, targetId, [...path, node.id])) {
              return true;
            }
          }
        }
        return false;
      };
      findAncestors(tree, parentId, []);
      setModalExpandedLocations(expanded);
    } else {
      setModalExpandedLocations(new Set());
    }
    setShowAddModal(true);
  };

  const toggleLocationExpand = (id: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleModalLocationExpand = (id: string) => {
    setModalExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderParentTreeItem = (node: LocationTreeNode, level: number) => {
    const isExpanded = modalExpandedLocations.has(node.id);
    const isSelected = selectedParentId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.parentTreeItem,
            { paddingLeft: 12 + level * 16 },
            isSelected 
              ? { backgroundColor: colors.primary + '20', borderColor: colors.primary } 
              : { backgroundColor: colors.surfaceVariant, borderColor: 'transparent' },
          ]}
          onPress={() => setSelectedParentId(node.id)}
        >
          {hasChildren ? (
            <TouchableOpacity 
              onPress={(e) => { e.stopPropagation(); toggleModalLocationExpand(node.id); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronDown 
                size={16} 
                color={isSelected ? colors.primary : colors.textSecondary} 
                style={isExpanded ? undefined : { transform: [{ rotate: '-90deg' }] }}
              />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 16 }} />
          )}
          <FolderPlus size={16} color={isSelected ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.parentTreeText,
            isSelected ? { color: colors.primary, fontWeight: '600' } : { color: colors.text },
          ]}>
            {node.name}
          </Text>
          {isSelected && <Check size={16} color={colors.primary} />}
        </TouchableOpacity>
        {hasChildren && isExpanded && (
          <View>
            {node.children!.map((child) => renderParentTreeItem(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  // 最近移动记录（按 movedAt 排序）
  const recentMoves = useMemo(() => {
    const moves = items
      .filter(item => item.movedAt)
      .sort((a, b) => new Date(b.movedAt).getTime() - new Date(a.movedAt).getTime())
      .slice(0, 3)
      .map(item => {
        const currentLoc = locations.find(l => l.id === item.locationId);
        return {
          id: item.id,
          itemName: item.name,
          toLocation: currentLoc?.name || t('location.unknown'),
          movedAt: item.movedAt,
        };
      });
    return moves;
  }, [items, locations]);

  const renderLocationNode = (node: LocationTreeNode, level: number = 0) => {
    const itemCount = itemCountMap[node.id] || 0;
    const childItems = node.children?.reduce((sum, child) => sum + (itemCountMap[child.id] || 0), 0) || 0;
    const totalItems = itemCount + childItems;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedLocations.has(node.id);
    const itemsExpanded = expandedItems.has(node.id);

    // 获取该位置的物品列表
    const locationItems = items.filter(item => item.locationId === node.id);

    return (
      <View
        key={node.id}
        ref={(ref) => {
          if (ref) {
            locationRefs.current[node.id] = ref;
          }
        }}
        style={[
          styles.locationCard,
          { backgroundColor: colors.surface },
          level > 0 && { marginLeft: 12, marginBottom: 0 },
        ]}
      >
        <View style={[styles.locationHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.locationLeft}
            onPress={() => {
              if (hasChildren) {
                toggleLocationExpand(node.id);
              }
            }}
            activeOpacity={hasChildren ? 0.7 : 1}
          >
            {hasChildren ? (
              <View style={styles.expandBtn}>
                <ChevronDown
                  size={16}
                  color={colors.textSecondary}
                  style={isExpanded ? undefined : { transform: [{ rotate: '-90deg' }] }}
                />
              </View>
            ) : (
              <View style={styles.expandBtn} />
            )}
            <View style={[styles.locationIcon, { backgroundColor: colors.primary + '20' }]}>
              <MapPin size={18} color={colors.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationName, { color: colors.text }]}>
                {node.name}
              </Text>
              <Text style={[styles.locationCount, { color: colors.textSecondary }]}>
                {node.children?.length || 0}{t('location.subLocationUnit')}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.locationActions}>
            <TouchableOpacity
              style={[styles.addChildBtn, { backgroundColor: colors.primary + '20' }]}
              onPress={() => openAddModal(node.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={14} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.itemCountBadge,
                itemsExpanded && { backgroundColor: colors.primary + '30' },
              ]}
              onPress={() => toggleItemsExpand(node.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Package size={12} color={colors.primary} />
              <Text style={[styles.itemCountText, { color: colors.primary }]}>
                {totalItems}{t('common.unit.items')}
              </Text>
              {itemCount > 0 && (
                <ChevronDown
                  size={10}
                  color={colors.primary}
                  style={itemsExpanded ? undefined : { transform: [{ rotate: '-90deg' }] }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 物品列表 */}
        {itemsExpanded && locationItems.length > 0 && (
          <View style={styles.itemList}>
            {locationItems.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
              >
                <Package size={14} color={colors.textTertiary} />
                <Text style={[styles.itemRowText, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <ChevronRight size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            {locationItems.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('Items', { locationId: node.id })}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  {t('common.viewAll')} {locationItems.length}{t('common.unit.items')}
                </Text>
                <ChevronRight size={12} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {node.children!.map((child) => renderLocationNode(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('location.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('location.rooms')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.addTopBtn, { backgroundColor: colors.primary }]}
              onPress={() => openAddModal()}
            >
              <Plus size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Tree */}
        <View style={styles.content}>
          {tree.length > 0 ? (
            tree.map((node) => renderLocationNode(node))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceVariant }]}>
                <MapPin size={24} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('location.noLocations')}
              </Text>
              <TouchableOpacity
                style={[styles.addEmptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => openAddModal()}
              >
                <Plus size={16} color={colors.onPrimary} />
                <Text style={[styles.addEmptyText, { color: colors.onPrimary }]}>
                  {t('location.addLocation')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Location Map Section */}
        <View style={[styles.mapSection, { paddingHorizontal: 20 }]}>
          <View style={[styles.mapCard, { backgroundColor: colors.surface }]}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <Map size={16} color={colors.primary} />
                <Text style={[styles.mapTitle, { color: colors.text }]}>
                  {t('location.mapView')}
                </Text>
              </View>
              <View style={styles.mapHeaderRight}>
                {mapCurrentParentId && (
                  <TouchableOpacity onPress={handleMapGoBack} style={styles.mapBackBtn}>
                    <Text style={[styles.mapBackText, { color: colors.primary }]}>
                      {t('common.back')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.mapAddBtn}
                  onPress={() => openAddModal(mapCurrentParentId)}
                >
                  <MapPinPlus size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Search Box */}
            <View style={[styles.mapSearchBox, { backgroundColor: colors.surfaceVariant }]}>
              <TextInput
                style={[styles.mapSearchInput, { color: colors.text }]}
                placeholder={t('location.searchLocation')}
                placeholderTextColor={colors.textTertiary}
                value={mapSearchQuery}
                onChangeText={setMapSearchQuery}
              />
            </View>
            
            {/* Search Results */}
            {mapSearchResults.length > 0 && (
              <View style={[styles.mapSearchResults, { backgroundColor: colors.surfaceVariant }]}>
                {mapSearchResults.map((loc) => {
                  const locPath = getLocationBreadcrumb(locations, loc.id);
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={styles.mapSearchResultItem}
                      onPress={() => handleMapSearchSelect(loc.id)}
                    >
                      <MapPin size={14} color={colors.primary} />
                      <View style={styles.mapSearchResultInfo}>
                        <Text style={[styles.mapSearchResultName, { color: colors.text }]}>
                          {loc.name}
                        </Text>
                        <Text style={[styles.mapSearchResultPath, { color: colors.textSecondary }]}>
                          {locPath.map(l => l.name).join(' / ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            
            {mapBreadcrumb.length > 0 && (
              <View style={[styles.mapBreadcrumb, { backgroundColor: colors.surfaceVariant }]}>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  onPress={() => setMapCurrentParentId(undefined)}
                >
                  <Home size={16} color={colors.textTertiary} />
                </TouchableOpacity>
                {mapBreadcrumb.map((loc, index) => (
                  <React.Fragment key={loc.id}>
                    <Text style={[styles.mapBreadcrumbSep, { color: colors.textTertiary }]}> / </Text>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      onPress={() => {
                        if (index < mapBreadcrumb.length - 1) {
                          setMapCurrentParentId(loc.id);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.mapBreadcrumbText,
                          index === mapBreadcrumb.length - 1
                            ? { color: colors.primary, fontWeight: '600' }
                            : { color: colors.textSecondary },
                        ]}
                      >
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
            
            <View style={styles.mapCanvasWrapper}>
              <LocationMapCanvas
                nodes={mapNodes}
                hasSubLocationMap={hasSubLocationMap}
                onLocationPress={handleMapLocationPress}
                width={Math.min(screenWidth - 72, 528)}
                height={mapHeight}
              />
            </View>
          </View>
        </View>

        {/* Recent Moves */}
        {recentMoves.length > 0 && (
          <View style={[styles.activityCard, { backgroundColor: colors.surface }]}>
            <View style={styles.activityHeader}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>
                {t('location.recentMoves')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Items', { sortBy: 'idle', sortOrder: 'asc' })}>
                <View style={styles.viewDetailRow}>
                  <Text style={[styles.viewDetailText, { color: colors.primary }]}>
                    {t('common.all')}
                  </Text>
                  <ChevronRight size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>
            {recentMoves.map((move) => (
              <TouchableOpacity
                key={move.id}
                style={styles.activityItem}
                onPress={() => navigation.navigate('ItemDetail', { id: move.id })}
              >
                <View style={[styles.activityIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Package size={18} color={colors.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityName, { color: colors.text }]}>
                    {move.itemName}
                  </Text>
                  <Text style={[styles.activityLocation, { color: colors.textSecondary }]}>
                    {t('location.moveTo')} {move.toLocation}
                  </Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textTertiary }]}>
                  {formatRelativeDate(move.movedAt, t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Map Items Modal */}
      <Modal visible={mapShowItemsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setMapShowItemsModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {locations.find(l => l.id === mapSelectedLocationId)?.name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {mapSelectedItems.length} {t('common.unit.items')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMapShowItemsModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalItemList} showsVerticalScrollIndicator={false}>
              {mapSelectedItems.length > 0 ? (
                mapSelectedItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.modalItemRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleMapItemPress(item.id)}
                  >
                    <Package size={14} color={colors.textTertiary} />
                    <View style={styles.modalItemInfo}>
                      <Text style={[styles.modalItemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.modalItemMeta, { color: colors.textSecondary }]}>
                        {item.brand || ''}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.modalEmptyItems}>
                  <Package size={24} color={colors.textTertiary} />
                  <Text style={[styles.modalEmptyItemsText, { color: colors.textSecondary }]}>
                    {t('location.noDirectItems')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Location Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedParentId ? t('location.addSubLocation') : t('location.addLocation')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceVariant }]}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Parent Location Selector */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('location.parentLocation')}
              </Text>
              <ScrollView style={styles.parentTreeScroll} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.parentTreeItem,
                    !selectedParentId 
                      ? { backgroundColor: colors.primary + '20', borderColor: colors.primary } 
                      : { backgroundColor: colors.surfaceVariant, borderColor: 'transparent' },
                  ]}
                  onPress={() => setSelectedParentId(null)}
                >
                  <FolderPlus size={16} color={!selectedParentId ? colors.primary : colors.textSecondary} />
                  <Text style={[
                    styles.parentTreeText,
                    !selectedParentId ? { color: colors.primary, fontWeight: '600' } : { color: colors.text },
                  ]}>
                    {t('location.rootLevel')}
                  </Text>
                  {!selectedParentId && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
                {tree.map((node) => renderParentTreeItem(node, 0))}
              </ScrollView>
            </View>

            {/* Location Name */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('location.name')} *
              </Text>
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('location.namePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={newLocationName}
                onChangeText={setNewLocationName}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddLocation}
              disabled={!newLocationName.trim() || adding}
            >
              {adding ? (
                <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>{t('common.processing')}</Text>
              ) : (
                <>
                  <Check size={16} color={colors.onPrimary} />
                  <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
                    {t('common.confirm')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Text style={[styles.toastText, { color: colors.surface }]}>
            {toast}
          </Text>
        </View>
      )}
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  locationCard: {
    borderRadius: 16,
    marginBottom: 0,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  locationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationCount: {
    fontSize: 12,
    marginTop: 4,
  },
  itemCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  itemRowText: {
    flex: 1,
    fontSize: 13,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  childrenContainer: {
    paddingHorizontal: 8,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  childDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 14,
    fontWeight: '500',
  },
  childPreviewRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  childPreviewText: {
    fontSize: 10,
    maxWidth: 80,
  },
  moreText: {
    fontSize: 10,
  },
  childRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childCount: {
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  activityCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 100,
  },
  addTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mapSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  mapCard: {
    borderRadius: 16,
    padding: 16,
  },
  mapCanvasWrapper: {
    alignItems: 'center',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapBackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapBackText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mapHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  mapSearchResults: {
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  mapSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  mapSearchResultInfo: {
    flex: 1,
  },
  mapSearchResultName: {
    fontSize: 13,
    fontWeight: '500',
  },
  mapSearchResultPath: {
    fontSize: 11,
    marginTop: 2,
  },
  mapBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  mapBreadcrumbText: {
    fontSize: 14,
  },
  mapBreadcrumbSep: {
    fontSize: 13,
  },
  addEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 6,
  },
  addEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addChildBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  modalItemList: {
    maxHeight: 320,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  modalEmptyItems: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  modalEmptyItemsText: {
    fontSize: 13,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  parentTreeScroll: {
    maxHeight: 200,
  },
  parentTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 8,
    borderWidth: 1,
  },
  parentTreeText: {
    flex: 1,
    fontSize: 13,
  },
  nameInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -100 }],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});