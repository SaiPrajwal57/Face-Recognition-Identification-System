import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  similarityThreshold: 0.50,
  cameraId: '',
  soundEnabled: true,
  autoCapture: false,
};

const STORAGE_KEYS = {
  SETTINGS: 'sentinel_recognition_settings',
  HISTORY: 'sentinel_session_history',
};

export function AppProvider({ children }) {
  // System Health
  const [health, setHealth] = useState({
    status: 'checking',
    database: 'connecting',
    database_mode: 'loading',
  });

  // People List (Direct from Backend)
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState(null);

  // Settings State (Persisted in localStorage)
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse stored settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Session Recognition History (Frontend Session/Local Audit Log)
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored history:', e);
    }
    return [];
  });

  // Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success', // 'success' | 'error' | 'info'
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // Check Backend Health
  const checkSystemHealth = useCallback(async () => {
    const res = await api.checkHealth();
    setHealth(res);
    return res;
  }, []);

  // Fetch People from Database
  const refreshPeople = useCallback(async () => {
    setLoadingPeople(true);
    setPeopleError(null);
    try {
      const list = await api.listPeople();
      setPeople(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load enrolled people:', err);
      setPeopleError(err.message || 'Failed to load enrolled people');
    } finally {
      setLoadingPeople(false);
    }
  }, []);

  // Initial Load & Polling
  useEffect(() => {
    checkSystemHealth();
    refreshPeople();

    // Periodic health check every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [checkSystemHealth, refreshPeople]);

  // Update Settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save settings to localStorage:', e);
      }
      return updated;
    });
    showToast('Settings saved successfully', 'success');
  }, [showToast]);

  // Reset Settings
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.warn('Could not reset settings in localStorage:', e);
    }
    showToast('Settings restored to defaults', 'info');
  }, [showToast]);

  // Add Recognition History Record
  const addHistoryRecord = useCallback((record) => {
    const newRecord = {
      id: record.id || `REC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: record.timestamp || new Date().toISOString(),
      mode: record.mode || 'Upload', // 'Upload' | 'Webcam'
      queryImage: record.queryImage || null,
      identified: !!record.identified,
      person: record.person || null, // { id, name, created_at }
      similarity: typeof record.similarity === 'number' ? record.similarity : 0,
      threshold: typeof record.threshold === 'number' ? record.threshold : settings.similarityThreshold,
      method: record.method || 'ArcFace 512-D Cosine Similarity',
      message: record.message || (record.identified ? 'Face identified' : 'Unknown face'),
    };

    setHistory(prev => {
      // Keep up to 50 most recent records
      const updated = [newRecord, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist history to localStorage:', e);
      }
      return updated;
    });

    return newRecord;
  }, [settings.similarityThreshold]);

  // Clear History
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.warn('Could not clear history from localStorage:', e);
    }
    showToast('Session history cleared', 'info');
  }, [showToast]);

  const value = {
    health,
    checkSystemHealth,
    people,
    loadingPeople,
    peopleError,
    refreshPeople,
    settings,
    updateSettings,
    resetSettings,
    history,
    addHistoryRecord,
    clearHistory,
    toast,
    showToast,
    hideToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
