export const START_YEAR = 2016;

type Asset = {
  symbol: string;
  name: string;
  color: string;
  yahooSymbol?: string;
  googleSymbol?: string;
};

type SectorConfig = {
  label: string;
  assets: Asset[];
  staticHistory: Record<number, Record<string, { start: number; end: number } | null>>;
};

export const SECTOR_CONFIG: Record<'chemicals' | 'agriculture', SectorConfig> = {
  chemicals: {
    label: 'Chemicals',
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a', googleSymbol: 'CURRENCY:BTC-USD' },
      { symbol: 'DOW', name: 'Dow Inc.', color: '#C8102E', googleSymbol: 'NYSE:DOW' },
      { symbol: 'BASFY', name: 'BASF (ADR)', color: '#004A96', googleSymbol: 'OTCMKTS:BASFY' },
      { symbol: 'CE', name: 'Celanese', color: '#008542', googleSymbol: 'NYSE:CE' },
      { symbol: 'MEOH', name: 'Methanex', color: '#582C83', googleSymbol: 'NASDAQ:MEOH' },
      { symbol: 'FSCHX', name: 'Fidelity Chem', color: '#71c7ec', googleSymbol: 'MUTF:FSCHX' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, DOW: null, BASFY: { start: 16.5, end: 20.8 }, CE: { start: 66, end: 78.5 }, MEOH: { start: 27.77, end: 45.95 }, FSCHX: { start: 12.12, end: 14.91 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, DOW: null, BASFY: { start: 20.8, end: 27.5 }, CE: { start: 78.5, end: 107 }, MEOH: { start: 45.95, end: 54.15 }, FSCHX: { start: 14.91, end: 18.42 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, DOW: null, BASFY: { start: 27.5, end: 17.2 }, CE: { start: 107, end: 90 }, MEOH: { start: 54.15, end: 64.49 }, FSCHX: { start: 18.42, end: 14.42 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, DOW: { start: 51.63, end: 54.73 }, BASFY: { start: 17.2, end: 19.5 }, CE: { start: 90, end: 123 }, MEOH: { start: 64.49, end: 35.42 }, FSCHX: { start: 14.42, end: 11.95 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, DOW: { start: 46.07, end: 55.5 }, BASFY: { start: 19.5, end: 17.8 }, CE: { start: 123, end: 129 }, MEOH: { start: 35.42, end: 45.45 }, FSCHX: { start: 11.95, end: 12.26 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, DOW: { start: 55.5, end: 56.72 }, BASFY: { start: 17.8, end: 19.2 }, CE: { start: 129, end: 168 }, MEOH: { start: 45.45, end: 39.55 }, FSCHX: { start: 12.26, end: 16.76 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, DOW: { start: 59.73, end: 50.39 }, BASFY: { start: 19.2, end: 13.5 }, CE: { start: 168, end: 102.2 }, MEOH: { start: 39.55, end: 37.86 }, FSCHX: { start: 16.76, end: 15.81 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, DOW: { start: 59.35, end: 54.84 }, BASFY: { start: 13.5, end: 15.2 }, CE: { start: 102.2, end: 155.3 }, MEOH: { start: 37.86, end: 47.36 }, FSCHX: { start: 15.81, end: 15.41 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, DOW: { start: 53.6, end: 40.13 }, BASFY: { start: 15.2, end: 12.44 }, CE: { start: 146.14, end: 68.76 }, MEOH: { start: 45.58, end: 49 }, FSCHX: { start: 14.78, end: 13.53 } }
    }
  },
  agriculture: {
    label: 'Agriculture',
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a', googleSymbol: 'CURRENCY:BTC-USD' },
      { symbol: 'ADM', name: 'ADM', color: '#005eb8', googleSymbol: 'NYSE:ADM' },
      { symbol: 'BG', name: 'Bunge', color: '#002d72', googleSymbol: 'NYSE:BG' },
      { symbol: 'DE', name: 'Deere', color: '#367C2B', googleSymbol: 'NYSE:DE' },
      { symbol: 'MOS', name: 'Mosaic', color: '#e37e26', googleSymbol: 'NYSE:MOS' },
      { symbol: 'CF', name: 'CF Ind', color: '#008542', googleSymbol: 'NYSE:CF' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, ADM: { start: 26.23, end: 34.95 }, BG: { start: 46.11, end: 55.19 }, DE: { start: 65.43, end: 89.51 }, MOS: { start: 20.05, end: 25.41 }, CF: { start: 22.57, end: 24.79 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, ADM: { start: 33.88, end: 31.64 }, BG: { start: 52.87, end: 52.56 }, DE: { start: 93.54, end: 138.87 }, MOS: { start: 27.18, end: 22.75 }, CF: { start: 27.79, end: 34.77 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, ADM: { start: 33.9, end: 33.31 }, BG: { start: 62.23, end: 43.1 }, DE: { start: 148.22, end: 134.66 }, MOS: { start: 24.23, end: 25.99 }, CF: { start: 34.69, end: 36.55 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, ADM: { start: 36.5, end: 39 }, BG: { start: 44.42, end: 48.18 }, DE: { start: 148.82, end: 159.43 }, MOS: { start: 28.74, end: 19.38 }, CF: { start: 36.67, end: 41.21 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, ADM: { start: 37.66, end: 43.85 }, BG: { start: 43.89, end: 57.29 }, DE: { start: 146.56, end: 252.2 }, MOS: { start: 17.82, end: 20.86 }, CF: { start: 34.77, end: 34.71 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, ADM: { start: 43.51, end: 60.22 }, BG: { start: 57.17, end: 83.57 }, DE: { start: 271.49, end: 324.93 }, MOS: { start: 23.59, end: 35.92 }, CF: { start: 37.11, end: 64.97 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, ADM: { start: 66.82, end: 84.3 }, BG: { start: 88.5, end: 91.33 }, DE: { start: 357.77, end: 411.42 }, MOS: { start: 36.6, end: 40.6 }, CF: { start: 63.22, end: 79.46 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, ADM: { start: 75.22, end: 67.09 }, BG: { start: 90.71, end: 94.79 }, DE: { start: 406.88, end: 388.54 }, MOS: { start: 45.85, end: 33.74 }, CF: { start: 78.99, end: 75.69 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, ADM: { start: 51.63, end: 48.62 }, BG: { start: 82.72, end: 75.13 }, DE: { start: 383.83, end: 417.83 }, MOS: { start: 29.17, end: 23.86 }, CF: { start: 71.89, end: 83.31 } }
    }
  }
};

export type SectorKey = keyof typeof SECTOR_CONFIG;



