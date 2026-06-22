import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TrendingUp, RefreshCw, Plus, Tag, X, Check } from 'lucide-react';

import './App.css';
import TickerCard from './components/TickerCard';
import Countdown from './components/Countdown';
import { searchTickers } from './services/yahooFinance';
import {
  loadTickers, saveTickers,
  loadEntries, saveEntries,
  loadPeriods, savePeriods,
  loadGroups, saveGroups,
  loadTickerGroups, saveTickerGroups,
} from './utils/storage';

const REFRESH_INTERVAL = 10 * 60 * 1000;

const GROUP_COLORS = [
  '#8ab4f8','#81c995','#f28b82','#fdd663','#c58af9',
  '#78d9ec','#ff9800','#f48fb1','#a5d6a7','#ce93d8',
];

// ── Group management modal ─────────────────────────────────────────────────
function GroupModal({ groups, onSave, onClose }) {
  const [localGroups, setLocalGroups] = useState(() => ({ ...groups }));
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);

  const addGroup = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `g_${Date.now()}`;
    setLocalGroups(prev => ({ ...prev, [id]: { name, color: newColor } }));
    setNewName('');
    setNewColor(GROUP_COLORS[(Object.keys(localGroups).length + 1) % GROUP_COLORS.length]);
  };

  const removeGroup = (id) => {
    setLocalGroups(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Manage Groups</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {Object.entries(localGroups).map(([id, g]) => (
          <div key={id} className="group-row">
            <span className="group-swatch" style={{ background: g.color }} />
            <span className="group-row-name">{g.name}</span>
            <button className="icon-btn" onClick={() => removeGroup(id)}><X size={13} /></button>
          </div>
        ))}

        <div className="group-new-row">
          <div className="group-color-picker">
            {GROUP_COLORS.map(c => (
              <button
                key={c}
                className={`color-dot ${newColor === c ? 'color-dot-active' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <input
            className="modal-input group-name-input"
            placeholder="Group name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGroup()}
          />
          <button className="btn-primary group-add-btn" onClick={addGroup}>
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(localGroups); onClose(); }}>
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ticker search with Yahoo autocomplete ──────────────────────────────────
function TickerSearch({ tickers, onAdd }) {
  const [val, setVal] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef();
  const wrapRef = useRef();
  const debounceRef = useRef();

  const doAdd = (sym) => {
    const s = (sym || val).trim().toUpperCase();
    if (!s) { setInvalid(true); return; }
    if (!tickers.includes(s)) onAdd(s);
    setVal(''); setResults([]); setOpen(false); setInvalid(false);
  };

  const handleChange = (e) => {
    const v = e.target.value.toUpperCase();
    setVal(v);
    setInvalid(false);
    setOpen(true);
    clearTimeout(debounceRef.current);
    if (v.length < 1) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchTickers(v);
      setResults(r);
      setSearching(false);
    }, 300);
  };

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="ticker-search" ref={wrapRef}>
      <button className="hdr-btn hdr-btn-add" onClick={() => { doAdd(); }}>
        <Plus size={14} /> Add
      </button>
      <input
        ref={inputRef}
        className={`ticker-search-input ${invalid ? 'ticker-search-invalid' : ''}`}
        placeholder="Ticker symbol, e.g. AAPL"
        value={val}
        onChange={handleChange}
        onFocus={() => val && setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter') doAdd();
          if (e.key === 'Escape') { setVal(''); setOpen(false); }
        }}
      />
      {open && (results.length > 0 || searching) && (
        <div className="ticker-dropdown">
          {searching && <div className="ticker-dropdown-searching">Searching…</div>}
          {results.map(r => (
            <button key={r.symbol} className="ticker-dropdown-item" onMouseDown={() => doAdd(r.symbol)}>
              <span className="ticker-dropdown-sym">{r.symbol}</span>
              <span className="ticker-dropdown-name">
                {r.currency && <span className="ticker-dropdown-currency">{r.currency}</span>}
                {r.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [tickers, setTickers] = useState(loadTickers);
  const [entries, setEntries] = useState(loadEntries);
  const [periods, setPeriods] = useState(loadPeriods);
  const [groups, setGroups] = useState(loadGroups);
  const [tickerGroups, setTickerGroups] = useState(loadTickerGroups);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [filterGroup, setFilterGroup] = useState(null); // null = All

  useEffect(() => { saveTickers(tickers); }, [tickers]);
  useEffect(() => { saveEntries(entries); }, [entries]);
  useEffect(() => { savePeriods(periods); }, [periods]);
  useEffect(() => { saveGroups(groups); }, [groups]);
  useEffect(() => { saveTickerGroups(tickerGroups); }, [tickerGroups]);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    setLastRefresh(Date.now());
    setRefreshKey(k => k + 1);
    setTimeout(() => setSpinning(false), 800);
  }, []);

  const addTicker = (sym) => {
    if (!tickers.includes(sym)) setTickers(prev => [...prev, sym]);
  };

  const removeTicker = (sym) => {
    setTickers(prev => prev.filter(t => t !== sym));
    setEntries(prev => { const n = { ...prev }; delete n[sym]; return n; });
    setPeriods(prev => { const n = { ...prev }; delete n[sym]; return n; });
    setTickerGroups(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };

  const setEntry = (sym, val) => {
    setEntries(prev => {
      const n = { ...prev };
      if (val == null) delete n[sym]; else n[sym] = val;
      return n;
    });
  };

  const setPeriod = (sym, p) => setPeriods(prev => ({ ...prev, [sym]: p }));

  const setTickerGroup = (sym, groupId) => {
    setTickerGroups(prev => {
      const n = { ...prev };
      if (!groupId) delete n[sym]; else n[sym] = groupId;
      return n;
    });
  };

  const saveGroupsHandler = (newGroups) => {
    setGroups(newGroups);
    // clean up tickerGroups referencing deleted groups
    setTickerGroups(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(sym => { if (!newGroups[n[sym]]) delete n[sym]; });
      return n;
    });
  };

  const visibleTickers = filterGroup
    ? tickers.filter(t => tickerGroups[t] === filterGroup)
    : tickers;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="logo"><TrendingUp size={28} />Ticker Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="last-refresh-label">
            Last refreshed: {new Date(lastRefresh).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <div className="header-clock-row">
            <Countdown
              lastRefresh={lastRefresh}
              interval={REFRESH_INTERVAL}
              onRefresh={handleRefresh}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh(v => !v)}
            />
            <button className={`hdr-btn hdr-btn-refresh ${spinning ? 'spin' : ''}`} onClick={handleRefresh}>
              <RefreshCw size={13} /> Refresh now
            </button>
          </div>
        </div>
      </header>

      <div className="add-ticker-bar">
        <TickerSearch tickers={tickers} onAdd={addTicker} />
        <div className="group-filter-row">
          <button
            className={`group-filter-pill ${filterGroup === null ? 'active' : ''}`}
            onClick={() => setFilterGroup(null)}
          >All</button>
          {Object.entries(groups).map(([id, g]) => (
            <button
              key={id}
              className={`group-filter-pill ${filterGroup === id ? 'active' : ''}`}
              style={{ '--gcolor': g.color }}
              onClick={() => setFilterGroup(prev => prev === id ? null : id)}
            >
              <span className="group-filter-dot" style={{ background: g.color }} />
              {g.name}
            </button>
          ))}
          <button className="group-manage-btn" onClick={() => setShowGroupModal(true)}>
            <Tag size={13} /> Groups
          </button>
        </div>
      </div>

      <div className="app-grid">
        {tickers.map((ticker) => {
          const inFilter = !filterGroup || tickerGroups[ticker] === filterGroup;
          return (
            <TickerCard
              key={ticker}
              ticker={ticker}
              entry={entries[ticker]}
              period={periods[ticker] || '1D'}
              group={groups[tickerGroups[ticker]]}
              groups={groups}
              onRemove={removeTicker}
              onSetEntry={setEntry}
              onPeriodChange={setPeriod}
              onSetGroup={setTickerGroup}
              refreshKey={refreshKey}
              hidden={!inFilter}
            />
          );
        })}
      </div>

      {showGroupModal && (
        <GroupModal
          groups={groups}
          onSave={saveGroupsHandler}
          onClose={() => setShowGroupModal(false)}
        />
      )}
    </div>
  );
}
