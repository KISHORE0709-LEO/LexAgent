import React, { useState } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
import './JoinByCode.css';

const JoinByCode = ({ onJoin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toLowerCase();
    
    if (!cleanCode) {
      setError('Please enter a meeting code');
      return;
    }
    
    // Validate format: xxx-xxxx-xxx
    const codePattern = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;
    if (!codePattern.test(cleanCode)) {
      setError('Invalid code format. Use: xxx-xxxx-xxx');
      return;
    }
    
    setError('');
    onJoin(cleanCode);
  };

  const handleChange = (e) => {
    let value = e.target.value.toLowerCase();
    // Auto-format with dashes
    value = value.replace(/[^a-z0-9-]/g, '');
    
    // Auto-add dashes
    if (value.length === 3 && !value.includes('-')) {
      value = value + '-';
    } else if (value.length === 8 && value.split('-').length === 2) {
      value = value + '-';
    }
    
    // Limit length
    if (value.length <= 12) {
      setCode(value);
      setError('');
    }
  };

  return (
    <div className="jbc-container">
      <div className="jbc-header">
        <LogIn size={18} />
        <span>JOIN BY CODE</span>
      </div>
      
      <form onSubmit={handleSubmit} className="jbc-form">
        <div className="jbc-input-group">
          <input
            type="text"
            className={`jbc-input ${error ? 'jbc-input-error' : ''}`}
            placeholder="xxx-xxxx-xxx"
            value={code}
            onChange={handleChange}
            maxLength={12}
          />
          <button type="submit" className="jbc-submit-btn">
            JOIN
          </button>
        </div>
        
        {error && (
          <div className="jbc-error">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}
        
        <div className="jbc-hint">
          Enter the meeting code shared by the judge
        </div>
      </form>
    </div>
  );
};

export default JoinByCode;
