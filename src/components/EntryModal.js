import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { fmt } from '../utils/formatters';

export default function EntryModal({ ticker, current, entry, onSave, onClose }) {
  const [val, setVal] = useState(entry != null ? String(entry) : '');
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) onSave(n);
    else if (val === '') onSave(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Set Entry Price</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="modal-sub">
          <strong>{ticker}</strong> · Current: <strong>${fmt(current)}</strong>
        </p>
        <div className="modal-row">
          <span className="modal-label">Entry Point ($)</span>
          <input
            ref={inputRef}
            className="modal-input"
            type="number"
            step="0.01"
            placeholder="e.g. 14.50"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
          />
        </div>
        {val && !isNaN(parseFloat(val)) && current != null && (
          <div className={`modal-diff ${parseFloat(val) <= current ? 'positive' : 'negative'}`}>
            {parseFloat(val) <= current
              ? `+${fmt(((current - parseFloat(val)) / parseFloat(val)) * 100)}% above your entry`
              : `${fmt(((current - parseFloat(val)) / parseFloat(val)) * 100)}% below your entry`}
          </div>
        )}
        <div className="modal-actions">
          {entry != null && (
            <button className="btn btn-ghost" onClick={() => { onSave(null); onClose(); }}>
              Clear
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}