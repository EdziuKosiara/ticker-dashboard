import React from 'react';
import { fmt, fmtTime } from '../utils/formatters';

export default function ChartTooltip({ active, payload, period, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-price">{fmt(d.price)} {currency || 'USD'}</span>
      <span className="chart-tooltip-sep"> · </span>
      <span className="chart-tooltip-time">{fmtTime(d.time, period)}</span>
    </div>
  );
}
