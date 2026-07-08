import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import { formatCurrency, getStatusLabel, getStatusColor, formatDate } from '../utils/formatters';
import { DEFAULT_CATEGORIES } from '../types';
import { Search, Filter, Plus, ChevronRight, Package } from 'lucide-react';

export function ItemsPage() {
  const { t } = useTranslation();
  const { items, locations, setCurrentPage } = useStore();
  const { colors } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const categories = useMemo(() => {
    return Object.entries(DEFAULT_CATEGORIES).map(([key, value]) => ({
      id: key,
      name: value.name,
      color: value.color,
    }));
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }
    
    if (selectedLocation) {
      result = result.filter(item => item.locationId === selectedLocation);
    }
    
    return result;
  }, [items, searchQuery, selectedCategory, selectedLocation]);

  const getLocationName = (locationId?: string) => {
    if (!locationId) return '-';
    return locations.find(l => l.id === locationId)?.name || '-';
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold" style={{ color: colors.text }}>{t('items')}</h1>
        <button 
          onClick={() => setCurrentPage('home')}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.primary + '20' }}
        >
          <Plus size={20} style={{ color: colors.primary }} />
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 bg-white"
          style={{ color: colors.text }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
            selectedCategory === '' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('allCategories')}
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === cat.id 
                ? 'text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Filter size={16} className="text-gray-400" />
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-500"
          style={{ color: colors.text }}
        >
          <option value="">{t('allLocations')}</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {' '.repeat(loc.level * 2)}{loc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('noItems')}</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: DEFAULT_CATEGORIES[item.category as keyof typeof DEFAULT_CATEGORIES]?.color + '20' }}
                >
                  <span 
                    className="text-lg font-bold"
                    style={{ color: DEFAULT_CATEGORIES[item.category as keyof typeof DEFAULT_CATEGORIES]?.color }}
                  >
                    {item.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate" style={{ color: colors.text }}>{item.name}</h3>
                    {item.quantity > 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        ×{item.quantity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.brand}</span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-500">{getLocationName(item.locationId)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                      {formatCurrency(item.purchasePrice)}
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: getStatusColor(item.status) + '15',
                        color: getStatusColor(item.status)
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
              </div>
              {item.warrantyEndDate && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {t('warranty')}: {formatDate(item.warrantyEndDate)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
