import { NextResponse } from 'next/server';
import { fetchYahooSeries, fetchGooglePrice } from '@/app/utils/dataSources';
import { calculateFairPrice, GENESIS_DATE, ONE_DAY_MS, PROJECT_TO_YEAR, downsampleData } from '@/app/utils/powerLaw';

type CachePayload = {
  data: any[];
  chartData: any[];
  stats: {
    stdDev: number;
    rSquared: number;
    currentPrice: number | null;
    currentFairPrice: number | null;
    dataSource: string;
    verification?: { googlePrice: number; spread: number; matches: boolean };
  };
  lastUpdated: number;
};

let cache: { payload: CachePayload; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes
const headers = {
  'Cache-Control': 's-maxage=600, stale-while-revalidate=86400'
};

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.payload, { headers });
  }

  try {
    const rawSeries = await fetchYahooSeries('BTC-USD', 'max', '1d');
    const processedData = rawSeries
      .map((pt) => {
        if (pt.price === null || pt.price === undefined) return null;
        const daysSinceGenesis = (pt.date - GENESIS_DATE) / ONE_DAY_MS;
        if (daysSinceGenesis <= 1) return null;
        const fairPrice = calculateFairPrice(daysSinceGenesis);
        if (!fairPrice) return null;
        return { date: pt.date, price: pt.price, fairPrice, daysSinceGenesis };
      })
      .filter((entry): entry is { date: number; price: number; fairPrice: number; daysSinceGenesis: number } => !!entry);

    if (!processedData.length) throw new Error('No valid BTC data');

    const logResiduals = processedData.map((d) => Math.log(d.price) - Math.log(d.fairPrice));
    const meanResidual = logResiduals.reduce((sum, val) => sum + val, 0) / logResiduals.length;
    const variance =
      logResiduals.map((val) => Math.pow(val - meanResidual, 2)).reduce((sum, val) => sum + val, 0) / logResiduals.length;
    const stdDev = Math.sqrt(variance);

    const lastPoint = processedData[processedData.length - 1];
    if (!lastPoint) throw new Error('Missing latest BTC datapoint');

    const targetDateMs = new Date(`${PROJECT_TO_YEAR}-12-31`).getTime();
    const futureData: any[] = [];
    let nextDateMs = lastPoint.date + ONE_DAY_MS;
    while (nextDateMs <= targetDateMs) {
      const daysSinceGenesis = (nextDateMs - GENESIS_DATE) / ONE_DAY_MS;
      const fairPrice = calculateFairPrice(daysSinceGenesis);
      futureData.push({ date: nextDateMs, price: null, fairPrice, daysSinceGenesis });
      nextDateMs += ONE_DAY_MS;
    }

    const combined = [...processedData, ...futureData].map((d) => ({
      ...d,
      upperBand: d.fairPrice * Math.exp(2 * stdDev),
      lowerBand: d.fairPrice * Math.exp(-1 * stdDev)
    }));

    const logActuals = processedData.map((d) => Math.log(d.price));
    const meanLogActual = logActuals.reduce((a, b) => a + b, 0) / logActuals.length;
    const ssTot = logActuals.reduce((acc, val) => acc + Math.pow(val - meanLogActual, 2), 0);
    const ssRes = processedData.reduce((acc, d) => acc + Math.pow(Math.log(d.price) - Math.log(d.fairPrice), 2), 0);
    const rSquared = 1 - ssRes / ssTot;

    const chartData = downsampleData(combined, 1200);
    const googlePrice = await fetchGooglePrice('CURRENCY:BTC-USD');
    const verification =
      googlePrice && lastPoint.price
        ? {
            googlePrice,
            spread: Math.abs(lastPoint.price - googlePrice) / googlePrice,
            matches: Math.abs(lastPoint.price - googlePrice) / googlePrice <= 0.015
          }
        : undefined;

    const payload: CachePayload = {
      data: combined,
      chartData,
      stats: {
        stdDev,
        rSquared,
        currentPrice: lastPoint.price,
        currentFairPrice: lastPoint.fairPrice,
        dataSource: 'Yahoo Finance',
        verification
      },
      lastUpdated: Date.now()
    };

    cache = { payload, timestamp: Date.now() };
    return NextResponse.json(payload, { headers });
  } catch (error) {
    console.error('BTC route error', error);
    return NextResponse.json({ error: 'Failed to load BTC data' }, { status: 500 });
  }
}



