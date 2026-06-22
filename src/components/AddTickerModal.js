import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function AddTickerModal({ existing, onAdd, onClose }) {
  const [val, setVal] = useState('');
  const inputRef = useRef();
  
  useEffect(() => { inputRef.current?.focus(); }, []);

  const suggestions = [
    'AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','AMD','SOFI',
    'NFLX','BABA','UBER','LYFT','PLTR','COIN','SPY','QQQ','BRK-B',
    'JPM','BAC','GS','V','MA','DIS','INTC','IBM','ORCL','CRM','ADBE','PYPL'
  ];

  const filtered = suggestions.filter(s =>
    !existing.includes(s) && s.includes(val.toUpperCase())
  ).slice(0, 8);

  const doAdd = (sym) => {
    const s = sym.trim().toUpperCase();
    if (s && !existing.includes(s)) { onAdd(s); onClose(); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Ticker</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-row">
          <input
            ref={inputRef}
            className="modal-input"
            placeholder="Symbol, e.g. AAPL"
            value={val}
            onChange={e => setVal(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') doAdd(val); if (e.key === 'Escape') onClose(); }}
          />
        </div>
        {filtered.length > 0 && (
          <div className="suggestions">
            {filtered.map(s => (
              <button key={s} className="suggestion-item" onClick={() => doAdd(s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => doAdd(val)}>Add</button>
        </div>
      </div>
    </div>
  );
}