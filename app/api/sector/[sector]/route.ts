import { NextResponse } from 'next/server';
import { fetchYahooSeries, fetchGooglePrice } from '@/app/utils/dataSources';
import { SECTOR_CONFIG } from '@/app/utils/sectorConfig';
import { buildComparisonSeries } from '@/app/utils/comparison';

type Payload = { years: any[]; scoreboard: any[]; verification?: Record<string, boolean> };
const cache: Record<string, { payload: Payload; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5;
const headers = { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' };

// Define the Next.js 15 params structure
type Props = {
  params: Promise<{
    sector: string;
  }>;
};

export async function GET(request: Request, props: Props) {
  // Await the params object before accessing properties
  const params = await props.params;
  const sectorKey = params.sector as keyof typeof SECTOR_CONFIG;

  if (!SECTOR_CONFIG[sectorKey]) {
    return NextResponse.json({ error: 'Unknown sector' }, { status: 404 });
  }

  if (cache[sectorKey] && Date.now() - cache[sectorKey].timestamp < CACHE_TTL) {
    return NextResponse.json(cache[sectorKey].payload, { headers });
  }

  try {
    const sector = SECTOR_CONFIG[sectorKey];
    const historyData: Record<number, Record<string, { start: number; end: number } | null>> = sector.staticHistory
      ? JSON.parse(JSON.stringify(sector.staticHistory))
      : {};

    const liveRecord = await fetchLiveYearToDate(sector.assets);
    if (Object.keys(liveRecord).length) {
      historyData[2025] = liveRecord;
    }

    const comparison = buildComparisonSeries(historyData, sector.assets);
    const payload: Payload = { ...comparison };
    cache[sectorKey] = { payload, timestamp: Date.now() };
    return NextResponse.json(payload, { headers });
  } catch (error) {
    console.error(`Sector route error for ${sectorKey}`, error);
    return NextResponse.json({ error: 'Failed to load sector data' }, { status: 500 });
  }
}

const fetchLiveYearToDate = async (assets: typeof SECTOR_CONFIG['chemicals']['assets']) => {
  const yearStartMs = new Date('2025-01-01').getTime();

  const records = await Promise.all(
    assets.map(async (asset) => {
      try {
        const yahooSymbol = asset.symbol;
        const series = await fetchYahooSeries(yahooSymbol, '1y', '1d');
        if (!series.length) return null;

        const startPoint = series.find((pt) => pt.date >= yearStartMs);
        const endPoint = [...series].reverse().find((pt) => pt.price !== null);
        if (!startPoint || !endPoint || startPoint.price === null || endPoint.price === null) return null;

        const googleQuote = await fetchGooglePrice(asset.googleSymbol);
        if (googleQuote) {
          const spread = Math.abs(endPoint.price - googleQuote) / googleQuote;
          if (spread > 0.03) {
            console.warn(`Google Finance check mismatch for ${asset.symbol}: spread ${spread}`);
          }
        }

        return { symbol: asset.symbol, start: startPoint.price, end: endPoint.price };
      } catch (err) {
        console.warn(`Failed live fetch for ${asset.symbol}`, err);
        return null;
      }
    })
  );

  const entry: Record<string, { start: number; end: number }> = {};
  records.forEach((rec) => {
    if (rec) entry[rec.symbol] = { start: rec.start, end: rec.end };
  });
  return entry;
};



