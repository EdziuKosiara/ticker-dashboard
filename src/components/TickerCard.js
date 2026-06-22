import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, X, AlertCircle, ChevronDown } from 'lucide-react';
import { fetchTickerData } from '../services/yahooFinance';
import { fmt, currencySymbol } from '../utils/formatters';
import ChartTooltip from './ChartTooltip';
import EntryModal from './EntryModal';
import './TickerCard.css';

const PERIODS = ['1D', '7D', '1M', '6M'];

function GroupPicker({ ticker, group, groups, onSetGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="group-picker" ref={ref}>
      <button
        className="group-picker-btn"
        style={group ? { borderColor: group.color, color: group.color } : {}}
        onClick={() => setOpen(o => !o)}
      >
        {group && <span className="group-swatch-sm" style={{ background: group.color }} />}
        <span>{group ? group.name : 'No group'}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="group-picker-dropdown">
          <button className="group-picker-item" onMouseDown={() => { onSetGroup(ticker, null); setOpen(false); }}>
            — No group
          </button>
          {Object.entries(groups).map(([id, g]) => (
            <button
              key={id}
              className="group-picker-item"
              onMouseDown={() => { onSetGroup(ticker, id); setOpen(false); }}
            >
              <span className="group-swatch-sm" style={{ background: g.color }} />
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TickerCard({ ticker, entry, onRemove, onSetEntry, onPeriodChange, period, refreshKey, group, groups, onSetGroup, hidden }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entryModal, setEntryModal] = useState(false);

  const cache = useRef({});
  const lastRefreshKey = useRef(refreshKey);

  useEffect(() => {
    if (refreshKey !== lastRefreshKey.current) {
      cache.current = {};
      lastRefreshKey.current = refreshKey;
    }
  }, [refreshKey]);

  const load = useCallback(async () => {
    if (cache.current[period]) {
      setData(cache.current[period]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await fetchTickerData(ticker, period);
      cache.current[period] = d;
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ticker, period, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const price = data?.regularMarketPrice ?? data?.points?.at(-1)?.price;
  const prevClose = data?.previousClose;
  const change = price != null && prevClose != null ? price - prevClose : null;
  const changePct = change != null && prevClose ? (change / prevClose) * 100 : null;
  const isUp = change != null ? change >= 0 : null;

  const chartData = data?.points || [];
  const chartColor = isUp === null ? '#8ab4f8' : isUp ? '#81c995' : '#f28b82';
  const chartColorDim = isUp === null ? '#303134' : isUp ? '#13522b' : '#5c191a';
  const chartGradId = `grad-${ticker}`;

  const currency = data?.currency || 'USD';
  const sym = currencySymbol(currency);

  const week52Low = data?.fiftyTwoWeekLow;
  const week52High = data?.fiftyTwoWeekHigh;
  const week52Pct = week52Low != null && week52High != null && week52High > week52Low && price != null
    ? Math.min(100, Math.max(0, ((price - week52Low) / (week52High - week52Low)) * 100))
    : null;

  const basePrice = chartData[0]?.price ?? prevClose;
  const entryDiff = entry != null && price != null ? ((price - entry) / entry) * 100 : null;
  const entryAbove = entryDiff != null && entryDiff >= 0;

  const minPrice = chartData.length ? Math.min(...chartData.map(p => p.price)) : 0;
  const maxPrice = chartData.length ? Math.max(...chartData.map(p => p.price)) : 0;
  const padding = (maxPrice - minPrice) * 0.05 || 0.2;

  // One tick per unique time unit to avoid duplicate labels
  const xTicks = useMemo(() => {
    if (!chartData.length) return [];
    if (period === '1D') {
      return chartData
        .filter(p => new Date(p.time).getMinutes() === 0 && new Date(p.time).getHours() % 2 === 0)
        .map(p => p.time);
    }
    if (period === '7D') {
      const seen = new Set();
      return chartData.filter(p => {
        const day = new Date(p.time).toDateString();
        if (seen.has(day)) return false;
        seen.add(day);
        return true;
      }).map(p => p.time);
    }
    if (period === '1M') {
      const seen = new Set();
      return chartData.filter(p => {
        const d = new Date(p.time);
        const week = `${d.getFullYear()}-${Math.floor(d.getDate() / 7)}`;
        if (seen.has(week)) return false;
        seen.add(week);
        return true;
      }).map(p => p.time);
    }
    // 6M — one per month
    const seen = new Set();
    return chartData.filter(p => {
      const d = new Date(p.time);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(p => p.time);
  }, [chartData, period]);

  return (
    <div
      className="card"
      style={{
        ...(group ? { borderLeftColor: group.color, borderLeftWidth: 3 } : {}),
        ...(hidden ? { display: 'none' } : {}),
      }}
    >
      <div className="card-header">
        <div className="card-left">
          <span className="card-ticker">{ticker}</span>
          {loading
            ? <span className="skeleton-name" />
            : data?.shortName && <span className="card-name">{data.shortName}</span>
          }
        </div>
        <div className="card-header-right">
          <GroupPicker ticker={ticker} group={group} groups={groups || {}} onSetGroup={onSetGroup} />
          <button className="icon-btn remove-btn" title="Remove Ticker" onClick={() => onRemove(ticker)}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="card-price-row">
        {loading ? (
          <>
            <div className="skeleton-price" />
            <div className="skeleton-change" />
          </>
        ) : error ? (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>Connection Error</span>
          </div>
        ) : (
          <>
            <span className="card-price">{sym}{fmt(price)}</span>
            {change != null && (
              <span className={`card-change ${isUp ? 'up' : 'down'}`}>
                {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{fmt(changePct)}%)
              </span>
            )}
          </>
        )}
      </div>

      {!loading && !error && week52Pct != null && (
        <div className="week52-row">
          <span className="week52-label" title="52-week low">{sym}{fmt(week52Low)}</span>
          <div className="week52-track">
            <div className="week52-fill" style={{ width: `${week52Pct}%` }} />
            <div className="week52-thumb" style={{ left: `${week52Pct}%` }} />
          </div>
          <span className="week52-label" title="52-week high">{sym}{fmt(week52High)}</span>
        </div>
      )}

      <div className="card-actions-row">
        <div className="actions-left">
          <button className="entry-trigger-btn" onClick={() => setEntryModal(true)}>
            <Target size={12} />
            <span>{entry != null ? `${sym}${fmt(entry)}` : 'Set Entry'}</span>
          </button>
          {entry != null && !loading && !error && (
            <div className={`entry-badge ${entryAbove ? 'entry-up' : 'entry-down'}`}>
              {entryAbove ? '+' : ''}{fmt(entryDiff)}%
            </div>
          )}
        </div>
        <div className="period-row">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'period-active' : ''}`}
              onClick={() => onPeriodChange(ticker, p)}
            >{p}</button>
          ))}
        </div>
      </div>

      <div className="card-chart">
        {!error && chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#3c4043"
                strokeOpacity={0.7}
                strokeDasharray=""
                vertical={true}
                horizontal={true}
              />
              <XAxis
                dataKey="time"
                ticks={xTicks}
                tick={{ fill: '#6e7681', fontSize: 9 }}
                axisLine={{ stroke: '#3c4043' }}
                tickLine={{ stroke: '#3c4043' }}
                tickFormatter={(t) => {
                  const d = new Date(t);
                  if (period === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  if (period === '7D') return d.toLocaleDateString('en-GB', { weekday: 'short' });
                  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                }}
              />
              <YAxis
                orientation="left"
                domain={['auto', 'auto']}
                tickCount={5}
                tick={{ fill: '#6e7681', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(2)}
                width={46}
              />
              <Tooltip content={<ChartTooltip period={period} currency={currency} />} />
              {basePrice != null && (
                <ReferenceLine
                  y={basePrice}
                  stroke={chartColorDim}
                  strokeDasharray="3 3"
                  label={{ value: 'Open', position: 'insideTopRight', fontSize: 8, fill: '#5f6368', dx: 44 }}
                />
              )}
              {entry != null && (
                <ReferenceLine
                  y={entry}
                  stroke="#8ab4f8"
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                  label={{ value: 'Entry', position: 'insideTopRight', fontSize: 8, fill: '#8ab4f8', dx: 8 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={1.8}
                fill={`url(#${chartGradId})`}
                dot={false}
                activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : loading ? (
          <div className="skeleton-chart" />
        ) : (
          <div className="chart-no-data">No price history available.</div>
        )}
      </div>

      {entryModal && (
        <EntryModal
          ticker={ticker}
          current={price}
          entry={entry}
          onSave={(v) => onSetEntry(ticker, v)}
          onClose={() => setEntryModal(false)}
        />
      )}
    </div>
  );
}
