import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { initDatabase, getAllItems, getAllLocations, getAllFavorites, seedDemoData, clearAllData, getDatabase } from '../database/db';
import { seedRichData } from '../../scripts/seed_rich_data';
import { loadLanguageSetting } from '../i18n';

const checkInitialized = async (): Promise<boolean> => {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM items');
    return result && result.count > 0;
  } catch {
    return false;
  }
};

export function useInitData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setItems = useAppStore((s) => s.setItems);
  const setLocations = useAppStore((s) => s.setLocations);
  const setFavorites = useAppStore((s) => s.setFavorites);
  const setLoadingItems = useAppStore((s) => s.setLoadingItems);
  const setLoadingLocations = useAppStore((s) => s.setLoadingLocations);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingItems(true);
        setLoadingLocations(true);

        await initDatabase();

        const isInitialized = await checkInitialized();

        if (!isInitialized) {
          await seedRichData();
        }

        const [items, locations, favorites] = await Promise.all([
          getAllItems(),
          getAllLocations(),
          getAllFavorites(),
        ]);

        setItems(items);
        setLocations(locations);
        setFavorites(favorites);

        await loadLanguageSetting();
      } catch (err: any) {
        setError(err.message || 'Failed to initialize data');
      } finally {
        setIsLoading(false);
        setLoadingItems(false);
        setLoadingLocations(false);
      }
    };

    init();
  }, [setItems, setLocations, setFavorites, setLoadingItems, setLoadingLocations]);

  const reinitialize = async () => {
    try {
      setIsLoading(true);
      setLoadingItems(true);
      setLoadingLocations(true);

      await clearAllData();

      await seedRichData();

      const [items, locations, favorites] = await Promise.all([
        getAllItems(),
        getAllLocations(),
        getAllFavorites(),
      ]);

      setItems(items);
      setLocations(locations);
      setFavorites(favorites);

      await loadLanguageSetting();
    } catch (err: any) {
      setError(err.message || 'Failed to reinitialize data');
    } finally {
      setIsLoading(false);
      setLoadingItems(false);
      setLoadingLocations(false);
    }
  };

  const clearData = async () => {
    try {
      setIsLoading(true);
      setLoadingItems(true);
      setLoadingLocations(true);
      await clearAllData();
      await seedRichData();
      const [items, locations, favorites] = await Promise.all([
        getAllItems(),
        getAllLocations(),
        getAllFavorites(),
      ]);
      setItems(items);
      setLocations(locations);
      setFavorites(favorites);
    } catch (err: any) {
      setError(err.message || 'Failed to clear data');
    } finally {
      setIsLoading(false);
      setLoadingItems(false);
      setLoadingLocations(false);
    }
  };

  const refreshData = async () => {
    try {
      const [items, locations, favorites] = await Promise.all([
        getAllItems(),
        getAllLocations(),
        getAllFavorites(),
      ]);
      setItems(items);
      setLocations(locations);
      setFavorites(favorites);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data');
    }
  };

  return { isLoading, error, reinitialize, clearData, refreshData };
}
