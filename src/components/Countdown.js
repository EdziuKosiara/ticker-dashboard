import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Countdown({ lastRefresh, interval, onRefresh, autoRefresh, onToggleAutoRefresh }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - lastRefresh;
      const rem = Math.max(0, interval - elapsed);
      setRemaining(rem);
      if (rem === 0 && autoRefresh) onRefresh();
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [lastRefresh, interval, onRefresh, autoRefresh]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="countdown">
      <Clock size={12} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      <button
        className={`auto-refresh-toggle ${autoRefresh ? 'on' : 'off'}`}
        onClick={onToggleAutoRefresh}
        title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
      >
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </button>
    </span>
  );
}