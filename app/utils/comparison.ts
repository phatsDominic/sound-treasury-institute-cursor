import { START_YEAR } from './sectorConfig';

type HistoryMap = Record<number, Record<string, { start: number; end: number } | null> | undefined>;
type Asset = { symbol: string; name: string; color: string };
type ScoreboardEntry = Asset & {
  count: number;
  cagr2: number | null;
  cagr3: number | null;
  cagr5: number | null;
  cagr10: number | null;
  label10: string;
  totalReturn: number | null;
};

export const buildComparisonSeries = (historyData: HistoryMap, assets: Asset[]) => {
  const years: any[] = [];
  const wins: Record<string, number> = {};
  assets.forEach((asset) => {
    wins[asset.symbol] = 0;
  });

  for (let year = START_YEAR; year <= 2025; year++) {
    const yearReturns: any[] = [];
    const yearData = historyData[year];

    if (yearData) {
      assets.forEach((asset) => {
        const stats = yearData[asset.symbol];
        if (!stats) {
          yearReturns.push({ ...asset, value: null, startPrice: null, endPrice: null });
        } else {
          const percentChange = ((stats.end - stats.start) / stats.start) * 100;
          yearReturns.push({ ...asset, value: percentChange, startPrice: stats.start, endPrice: stats.end });
        }
      });

      yearReturns.sort((a, b) => {
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return b.value - a.value;
      });

      const winner = yearReturns[0].value !== null ? yearReturns[0] : null;
      if (winner) wins[winner.symbol] = (wins[winner.symbol] || 0) + 1;

      years.push({ year, returns: yearReturns, winner });
    }
  }

  const calculateStats = (symbol: string) => {
    const getPrice = (year: number, type: 'start' | 'end') =>
      historyData[year] ? historyData[year]![symbol]?.[type] : null;
    const currentEnd = getPrice(2025, 'end');
    const p2 = getPrice(2023, 'end');
    const cagr2 = p2 && currentEnd ? (Math.pow(currentEnd / p2, 1 / 2) - 1) * 100 : null;
    const p3 = getPrice(2022, 'end');
    const cagr3 = p3 && currentEnd ? (Math.pow(currentEnd / p3, 1 / 3) - 1) * 100 : null;
    const p5 = getPrice(2020, 'end');
    const cagr5 = p5 && currentEnd ? (Math.pow(currentEnd / p5, 1 / 5) - 1) * 100 : null;

    let startYear10 = 2016;
    let years10 = 10;
    let label10 = '10Y';
    if (symbol === 'DOW') {
      startYear10 = 2019;
      years10 = 2025 - 2019 + 1;
      label10 = '6Y';
    }
    const p10 = getPrice(startYear10, 'start');
    const cagr10 = p10 && currentEnd ? (Math.pow(currentEnd / p10, 1 / years10) - 1) * 100 : null;
    const totalReturn = p10 && currentEnd ? ((currentEnd - p10) / p10) * 100 : null;
    return { cagr2, cagr3, cagr5, cagr10, label10, totalReturn };
  };

  const scoreboard: ScoreboardEntry[] = Object.entries(wins)
    .map(([symbol, count]) => {
      const asset = assets.find((a) => a.symbol === symbol);
      if (!asset) return null;
      const stats = calculateStats(symbol);
      return { ...asset, count, ...stats };
    })
    .filter((entry): entry is ScoreboardEntry => entry !== null)
    .sort((a, b) => b.count - a.count);

  return { years, scoreboard };
};

