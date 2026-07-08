
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import { Home, Package, MapPin, User } from 'lucide-react';

export function BottomNav() {
  const { t } = useTranslation();
  const { currentPage, setCurrentPage } = useStore();
  const { colors } = useTheme();

  const tabs = [
    { id: 'home' as const, icon: Home, label: t('home') },
    { id: 'items' as const, icon: Package, label: t('items') },
    { id: 'location' as const, icon: MapPin, label: t('location') },
    { id: 'profile' as const, icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 max-w-md mx-auto">
      <div className="flex justify-around">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentPage(tab.id)}
            className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors"
            style={{
              backgroundColor: currentPage === tab.id ? colors.primary + '10' : 'transparent',
            }}
          >
            <tab.icon 
              size={22} 
              style={{ 
                color: currentPage === tab.id ? colors.primary : '#9CA3AF' 
              }} 
            />
            <span 
              className="text-xs font-medium"
              style={{ color: currentPage === tab.id ? colors.primary : '#9CA3AF' }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
