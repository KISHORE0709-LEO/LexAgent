import React, { createContext, useContext, useState, useEffect } from 'react';

const MandamusContext = createContext();

const defaultState = {
  summariser_output: null,
  summariser_status: 'idle',
  precedent_results: [],
  selected_precedents: [],
  draft_output: null,
  draft_status: 'idle',
  case_id: null,
  scheduler_status: 'idle',
  scheduled_date: null,
  virtual_hearing_status: 'idle',
  active_case: null,
  pipeline_stage: 'summarise'
};

export const MandamusProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mandamus_case_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load mandamus_case_state", e);
    }
    return defaultState;
  });

  useEffect(() => {
    sessionStorage.setItem('mandamus_case_state', JSON.stringify(state));
  }, [state]);

  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const reinitialize = () => {
    setState(defaultState);
    sessionStorage.removeItem('mandamus_case_state');
    
    // Clear legacy local storage items to ensure clean slate
    sessionStorage.removeItem('mandamus_summary');
    sessionStorage.removeItem('mandamus_precedents');
    sessionStorage.removeItem('mandamus_draft_state');
    sessionStorage.removeItem('mandamus_saved_draft');
    localStorage.removeItem('mandamus_case_state');
    localStorage.removeItem('mandamus_summary');
    localStorage.removeItem('mandamus_precedents');
    localStorage.removeItem('mandamus_draft_state');
    localStorage.removeItem('mandamus_saved_draft');
  };

  return (
    <MandamusContext.Provider value={{ state, updateState, reinitialize, clearState: reinitialize }}>
      {children}
    </MandamusContext.Provider>
  );
};

export const useMandamus = () => useContext(MandamusContext);
