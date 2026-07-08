import { useEffect, useState } from 'react';
import { useStore } from './store';
import { ThemeProvider } from './theme/ThemeContext';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { ItemsPage } from './pages/ItemsPage';
import { LocationPage } from './pages/LocationPage';
import { ProfilePage } from './pages/ProfilePage';
import './i18n';

function AppContent() {
  const { currentPage, loadItems, loadLocations, loadSettings, loadFavorites, settings } = useStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadItems(), loadLocations(), loadSettings(), loadFavorites()]);
      setIsReady(true);
    };
    init();
  }, [loadItems, loadLocations, loadSettings, loadFavorites]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'items':
        return <ItemsPage />;
      case 'location':
        return <LocationPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <ThemeProvider settings={settings}>
      <div className="pb-20">
        {renderPage()}
      </div>
      <BottomNav />
    </ThemeProvider>
  );
}

export default AppContent;
