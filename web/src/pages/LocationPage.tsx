import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import { formatCurrency } from '../utils/formatters';
import { MapPin, ChevronRight, Plus, Home, Building2, DoorOpen, TreeDeciduous } from 'lucide-react';

export function LocationPage() {
  const { t } = useTranslation();
  const { items, locations } = useStore();
  const { colors } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  interface TreeLocation {
    id: string;
    name: string;
    parentId?: string;
    level: number;
    createdAt: string;
    children: TreeLocation[];
    itemCount: number;
    totalValue: number;
  }

  const locationTree = useMemo((): TreeLocation[] => {
    const rootLocations = locations.filter(l => !l.parentId);
    
    const buildTree = (parentId?: string, level: number = 0): TreeLocation[] => {
      const children = locations.filter(l => l.parentId === parentId);
      return children.map(loc => ({
        ...loc,
        level,
        children: buildTree(loc.id, level + 1),
        itemCount: items.filter(i => i.locationId === loc.id).length,
        totalValue: items.filter(i => i.locationId === loc.id).reduce((sum, i) => sum + (i.purchasePrice || 0), 0),
      }));
    };

    return rootLocations.map(loc => ({
      ...loc,
      level: 0,
      children: buildTree(loc.id, 1),
      itemCount: items.filter(i => i.locationId === loc.id).length,
      totalValue: items.filter(i => i.locationId === loc.id).reduce((sum, i) => sum + (i.purchasePrice || 0), 0),
    }));
  }, [locations, items]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderTree = (nodes: TreeLocation[], level: number = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div 
          className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => toggleExpand(node.id)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
              style={{ backgroundColor: colors.primary + '20' }}>
              {level === 0 ? (
                <Home size={18} style={{ color: colors.primary }} />
              ) : level === 1 ? (
                <DoorOpen size={18} style={{ color: colors.primary }} />
              ) : (
                <TreeDeciduous size={18} style={{ color: colors.primary }} />
              )}
            </div>
            <div>
              <p className="font-medium" style={{ color: colors.text }}>{node.name}</p>
              <p className="text-xs text-gray-500">
                {node.itemCount} {t('items')} · {formatCurrency(node.totalValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {node.children.length > 0 && (
              <ChevronRight 
                size={18} 
                className={`text-gray-400 transition-transform ${expandedIds.has(node.id) ? 'rotate-90' : ''}`} 
              />
            )}
          </div>
        </div>
        {expandedIds.has(node.id) && node.children.length > 0 && (
          <div className="mt-1">
            {renderTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: colors.text }}>{t('location')}</h1>
          <p className="text-sm" style={{ color: colors.muted }}>{locations.length} {t('locations')}</p>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center" 
          style={{ backgroundColor: colors.primary + '20' }}>
          <Plus size={20} style={{ color: colors.primary }} />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <MapPin size={20} style={{ color: colors.primary }} />
          <h2 className="font-semibold" style={{ color: colors.text }}>{t('treeView')}</h2>
        </div>
        <div className="space-y-1">
          {locationTree.length === 0 ? (
            <div className="text-center py-8">
              <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">{t('noLocations')}</p>
            </div>
          ) : (
            renderTree(locationTree)
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold mb-4" style={{ color: colors.text }}>{t('recentMoves')}</h2>
        <div className="space-y-3">
          {items.slice(0, 3).map(item => {
            const location = locations.find(l => l.id === item.locationId);
            return (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <MapPin size={14} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: colors.text }}>{item.name}</p>
                  <p className="text-xs text-gray-500">{location?.name || '-'}</p>
                </div>
                <span className="text-xs text-gray-400">·</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
