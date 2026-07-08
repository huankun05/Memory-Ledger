import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import { formatCurrency, calculateHealthScore } from '../utils/formatters';
import { User, Settings, HelpCircle, MessageSquare, Share2, Wallet, Package, MapPin, Clock } from 'lucide-react';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { items, locations, settings, updateSettings, refreshData } = useStore();
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
    const activeItems = items.filter(item => item.status === 'inUse');
    const avgHealth = activeItems.length > 0 
      ? Math.round(activeItems.reduce((sum, item) => sum + calculateHealthScore(item), 0) / activeItems.length)
      : 100;
    const expiringItems = items.filter(item => {
      if (!item.warrantyEndDate) return false;
      const days = new Date(item.warrantyEndDate).getTime() - new Date().getTime();
      return days > 0 && days < 30 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      totalItems: items.length,
      totalLocations: locations.length,
      totalValue,
      avgHealth,
      expiringItems,
    };
  }, [items, locations]);

  const toggleLanguage = () => {
    const newLang = settings.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    updateSettings({ language: newLang });
  };

  const toggleTheme = () => {
    const newTheme = settings.themeMode === 'light' ? 'dark' : 'light';
    updateSettings({ themeMode: newTheme });
  };

  const handleClearData = () => {
    if (confirm(t('confirmClear'))) {
      refreshData();
    }
  };

  const menuItems = [
    { icon: Settings, label: t('settings'), action: () => {} },
    { icon: HelpCircle, label: t('help'), action: () => {} },
    { icon: MessageSquare, label: t('feedback'), action: () => {} },
    { icon: Share2, label: t('share'), action: () => {} },
  ];

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" 
          style={{ backgroundColor: colors.primary + '20' }}>
          <User size={28} style={{ color: colors.primary }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: colors.text }}>{t('appName')}</h1>
          <p className="text-sm" style={{ color: colors.muted }}>{t('appNameEn')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} style={{ color: colors.primary }} />
            <span className="text-xs text-gray-500">{t('totalItems')}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalItems}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} style={{ color: colors.primary }} />
            <span className="text-xs text-gray-500">{t('totalLocations')}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalLocations}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} style={{ color: colors.primary }} />
            <span className="text-xs text-gray-500">{t('totalValue')}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} style={{ color: colors.primary }} />
            <span className="text-xs text-gray-500">{t('warrantyCount')}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.expiringItems}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold mb-4" style={{ color: colors.text }}>{t('settings')}</h2>
        
        <button 
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <span className="text-xs font-medium text-blue-500">
                {settings.language === 'zh' ? '中' : 'EN'}
              </span>
            </div>
            <span className="text-sm" style={{ color: colors.text }}>{t('language')}</span>
          </div>
          <span className="text-sm text-gray-500">
            {settings.language === 'zh' ? t('chinese') : t('english')}
          </span>
        </button>

        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50">
              <span className="text-xs font-medium text-purple-500">
                {settings.themeMode === 'dark' ? '🌙' : '☀️'}
              </span>
            </div>
            <span className="text-sm" style={{ color: colors.text }}>{t('theme')}</span>
          </div>
          <span className="text-sm text-gray-500">
            {settings.themeMode === 'dark' ? t('dark') : t('light')}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold mb-4" style={{ color: colors.text }}>{t('dataManagement')}</h2>
        
        <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50">
              <span className="text-xs font-medium text-green-500">📤</span>
            </div>
            <span className="text-sm" style={{ color: colors.text }}>{t('exportData')}</span>
          </div>
        </button>

        <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <span className="text-xs font-medium text-blue-500">📥</span>
            </div>
            <span className="text-sm" style={{ color: colors.text }}>{t('importData')}</span>
          </div>
        </button>

        <button 
          onClick={handleClearData}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50">
              <span className="text-xs font-medium text-red-500">🗑️</span>
            </div>
            <span className="text-sm text-red-500">{t('clearData')}</span>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors mb-2 last:mb-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: colors.primary + '10' }}>
                <item.icon size={16} style={{ color: colors.primary }} />
              </div>
              <span className="text-sm" style={{ color: colors.text }}>{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center py-4">
        <p className="text-xs text-gray-400">v1.0.0</p>
        <p className="text-xs text-gray-400 mt-1">Memory Ledger</p>
      </div>
    </div>
  );
}
