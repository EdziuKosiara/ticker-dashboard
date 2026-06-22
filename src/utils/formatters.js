export function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function currencySymbol(currency) {
  if (!currency) return '$';
  if (currency === 'PLN') return 'zł';
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return currency + ' ';
}

export function fmtTime(ts, period) {
  const d = new Date(ts);
  if (period === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (period === '7D') {
    const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const date = d.getDate();
    const mon = d.toLocaleDateString('en-GB', { month: 'short' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} ${date} ${mon}  ${time}`;
  }
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const date = d.getDate();
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${day} ${date} ${mon}`;
}