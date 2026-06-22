const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

const EXCHANGE_CURRENCY = {
  WAR: 'PLN', WSE: 'PLN',           // Warsaw
  LSE: 'GBP', IOB: 'USD',           // London
  FRA: 'EUR', XETRA: 'EUR',         // Frankfurt
  PAR: 'EUR', AMS: 'EUR', MIL: 'EUR', // Euronext
  TOR: 'CAD', NEO: 'CAD',           // Toronto
  ASX: 'AUD',                        // Sydney
  HKG: 'HKD',                        // Hong Kong
  TSE: 'JPY',                        // Tokyo
  SHH: 'CNY', SHZ: 'CNY',           // Shanghai/Shenzhen
};

const SUFFIX_CURRENCY = {
  '.WA': 'PLN', '.L': 'GBP', '.DE': 'EUR', '.F': 'EUR',
  '.PA': 'EUR', '.AS': 'EUR', '.MI': 'EUR', '.TO': 'CAD',
  '.AX': 'AUD', '.HK': 'HKD', '.T': 'JPY',
};

function inferCurrency(symbol, exchange) {
  for (const [suffix, cur] of Object.entries(SUFFIX_CURRENCY)) {
    if (symbol.endsWith(suffix)) return cur;
  }
  if (exchange && EXCHANGE_CURRENCY[exchange]) return EXCHANGE_CURRENCY[exchange];
  return 'USD';
}

const PERIOD_PARAMS = {
  '1D': { interval: '5m',  range: '1d'  },
  '7D': { interval: '60m', range: '7d'  },
  '1M': { interval: '1d',  range: '1mo' },
  '6M': { interval: '1d',  range: '6mo' },
};

const WORKER_URL = 'https://ticker-dashboard-proxy.edziukosiara.workers.dev';

const PROXIES = [
  (url) => `${WORKER_URL}?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
];

// Unwrap proxy envelope — allorigins wraps in { contents }, others return raw
function unwrap(wrapper) {
  if (wrapper && typeof wrapper === 'object' && 'contents' in wrapper) {
    return typeof wrapper.contents === 'string'
      ? JSON.parse(wrapper.contents)
      : wrapper.contents;
  }
  return wrapper;
}

// Fire all proxies simultaneously, resolve with the first valid parsed result
async function raceProxies(targetUrl) {
  const attempts = PROXIES.map(async (mkUrl) => {
    const res = await fetch(mkUrl(targetUrl), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = unwrap(json);
    if (!data) throw new Error('empty');
    return data;
  });

  // Promise.any — first success wins, all failing throws AggregateError
  return Promise.any(attempts);
}

export async function searchTickers(query) {
  if (!query) return [];
  const target = `${YF_SEARCH}?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=8&newsCount=0`;
  try {
    const data = await raceProxies(target);
    return (data?.quotes || [])
      .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
      .map(q => ({ symbol: q.symbol, name: q.shortname || q.longname || '', currency: inferCurrency(q.symbol, q.exchange) }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

export async function fetchTickerData(ticker, period) {
  const { interval, range } = PERIOD_PARAMS[period];
  const target = `${YF_BASE}${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;

  let data;
  try {
    data = await raceProxies(target);
  } catch {
    throw new Error('All proxies failed — check your connection.');
  }

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for ${ticker}`);

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const meta = result.meta || {};

  const points = timestamps
    .map((t, i) => ({ time: t * 1000, price: closes[i] }))
    .filter(p => p.price != null && !isNaN(p.price));

  return {
    points,
    currency: meta.currency || 'USD',
    regularMarketPrice: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose ?? meta.previousClose,
    shortName: meta.shortName || ticker,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
  };
}
