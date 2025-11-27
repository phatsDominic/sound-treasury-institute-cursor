const GOOGLE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
};

export const fetchYahooSeries = async (symbol: string, range = 'max', interval = '1d') => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Yahoo Finance error for ${symbol}: ${response.status}`);
  }

  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance payload missing result for ${symbol}`);

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0]?.close || [];
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose || quote;

  return timestamps.map((ts: number, idx: number) => ({
    date: ts * 1000,
    price: typeof adjClose[idx] === 'number' ? adjClose[idx] : null
  }));
};

export const fetchGooglePrice = async (quoteId?: string) => {
  if (!quoteId) return null;
  const url = `https://www.google.com/finance/quote/${encodeURIComponent(quoteId)}`;
  const response = await fetch(url, { headers: GOOGLE_HEADERS, cache: 'no-store' });
  if (!response.ok) {
    console.warn(`Google Finance request failed for ${quoteId}`, response.status);
    return null;
  }

  const html = await response.text();
  const match = html.match(/class="[^"]*YMlKec[^"]*"[^>]*>([^<]+)<\/div>/);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};



