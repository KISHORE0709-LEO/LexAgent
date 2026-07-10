import React, { createContext, useContext, useState, useCallback } from 'react';

const HistoryContext = createContext();

export const HistoryProvider = ({ children }) => {
  // history: [{ id, timestamp, type, data }]
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  /**
   * Save a new version to the history stack
   * @param {Object} data - The draft or state to save
   * @param {string} type - 'AI_GENERATED' | 'USER_EDIT' | 'SYSTEM'
   */
  const saveVersion = useCallback((data, type = 'USER_EDIT') => {
    if (!data) return;

    const newVersion = {
      id: `v-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      data: JSON.parse(JSON.stringify(data)) // Deep clone
    };

    setHistory(prev => {
      // Remove any "future" states if we were in the middle of undoing
      const cleanHistory = prev.slice(0, currentIndex + 1);
      const updated = [...cleanHistory, newVersion];
      
      // Keep only last 20 versions for performance
      if (updated.length > 20) return updated.slice(1);
      return updated;
    });
    
    setCurrentIndex(prev => {
      const cleanPrev = prev < 0 ? 0 : prev;
      const next = cleanPrev + 1;
      return next > 19 ? 19 : next;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      return history[prevIndex].data;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      return history[nextIndex].data;
    }
    return null;
  }, [currentIndex, history]);

  const restoreVersion = useCallback((versionId) => {
    const idx = history.findIndex(v => v.id === versionId);
    if (idx !== -1) {
      setCurrentIndex(idx);
      return history[idx].data;
    }
    return null;
  }, [history]);

  return (
    <HistoryContext.Provider value={{ 
      history, 
      currentIndex, 
      saveVersion, 
      undo, 
      redo, 
      restoreVersion,
      canUndo: currentIndex > 0,
      canRedo: currentIndex < history.length - 1
    }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => useContext(HistoryContext);
