const DEFAULT_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'SOFI'];
const LS_TICKERS_KEY = 'sd_tickers';
const LS_ENTRIES_KEY = 'sd_entries';
const LS_PERIODS_KEY = 'sd_periods';
const LS_GROUPS_KEY = 'sd_groups';
const LS_TICKER_GROUPS_KEY = 'sd_ticker_groups';

export function loadTickers() {
  try { 
    return JSON.parse(localStorage.getItem(LS_TICKERS_KEY)) || DEFAULT_TICKERS; 
  } catch { 
    return DEFAULT_TICKERS; 
  }
}

export function saveTickers(t) { 
  localStorage.setItem(LS_TICKERS_KEY, JSON.stringify(t)); 
}

export function loadEntries() {
  try { 
    return JSON.parse(localStorage.getItem(LS_ENTRIES_KEY)) || {}; 
  } catch { 
    return {}; 
  }
}

export function saveEntries(e) { 
  localStorage.setItem(LS_ENTRIES_KEY, JSON.stringify(e)); 
}

export function loadPeriods() {
  try { 
    return JSON.parse(localStorage.getItem(LS_PERIODS_KEY)) || {}; 
  } catch { 
    return {}; 
  }
}

export function savePeriods(p) {
  localStorage.setItem(LS_PERIODS_KEY, JSON.stringify(p));
}

export function loadGroups() {
  try { return JSON.parse(localStorage.getItem(LS_GROUPS_KEY)) || {}; }
  catch { return {}; }
}
export function saveGroups(g) {
  localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(g));
}

export function loadTickerGroups() {
  try { return JSON.parse(localStorage.getItem(LS_TICKER_GROUPS_KEY)) || {}; }
  catch { return {}; }
}
export function saveTickerGroups(tg) {
  localStorage.setItem(LS_TICKER_GROUPS_KEY, JSON.stringify(tg));
}