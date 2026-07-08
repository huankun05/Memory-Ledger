import React, { createContext, useContext, ReactNode } from 'react';
import { File, Directory, Paths } from 'expo-file-system';
import { useInitData } from '../hooks/useInitData';

export interface BackupFileInfo {
  name: string;
  uri: string;
  size: number;
  lastModified: number | null;
}

interface DataContextType {
  isLoading: boolean;
  error: string | null;
  exportData: () => Promise<boolean>;
  importData: () => Promise<boolean>;
  importFromFile: (fileUri: string) => Promise<boolean>;
  listBackups: () => Promise<BackupFileInfo[]>;
  clearData: () => Promise<void>;
  resetData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function getBackupDir(): Directory {
  return new Directory(Paths.document, 'backups');
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { isLoading, error, reinitialize, clearData, refreshData } = useInitData();

  const exportData = async (): Promise<boolean> => {
    try {
      const { getAllItems, getAllLocations } = await import('../database/db');
      const [items, locations] = await Promise.all([
        getAllItems(),
        getAllLocations(),
      ]);

      const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        items,
        locations,
      };

      const jsonData = JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `memory_ledger_${dateStr}.json`;

      const backupDir = getBackupDir();
      if (!backupDir.exists) {
        backupDir.create();
      }

      const file = new File(backupDir, fileName);
      file.write(jsonData);
      return true;
    } catch (err) {
      console.error('Export failed:', err);
      throw err;
    }
  };

  const importFromFile = async (fileUri: string): Promise<boolean> => {
    try {
      const file = new File(fileUri);
      const fileContent = await file.text();

      const data = JSON.parse(fileContent);

      if (!data.items && !data.locations) {
        throw new Error('Invalid data format');
      }

      const { importData: dbImportData } = await import('../database/db');
      await dbImportData(data);

      await refreshData();
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      throw err;
    }
  };

  const importData = async (): Promise<boolean> => {
    // 兼容旧调用：不再使用，直接返回 false
    return false;
  };

  const listBackups = async (): Promise<BackupFileInfo[]> => {
    try {
      const backupDir = getBackupDir();
      if (!backupDir.exists) {
        return [];
      }
      const entries = backupDir.list();
      const files: BackupFileInfo[] = [];
      for (const entry of entries) {
        if (entry instanceof File && entry.name.endsWith('.json')) {
          files.push({
            name: entry.name,
            uri: entry.uri,
            size: entry.size || 0,
            lastModified: entry.lastModified,
          });
        }
      }
      // 按修改时间倒序（最新在前）
      files.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
      return files;
    } catch (err) {
      console.error('List backups failed:', err);
      return [];
    }
  };

  return (
    <DataContext.Provider
      value={{
        isLoading,
        error,
        exportData,
        importData,
        importFromFile,
        listBackups,
        clearData,
        resetData: reinitialize,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
