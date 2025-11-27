'use client';
// @ts-nocheck

import React, { useState, useEffect } from 'react';

import { 
  Activity, Anchor, BarChart3, Building, Database, Download, Factory, FileText,
  FlaskConical, Globe, HardHat, LayoutDashboard, Loader2, Menu, RefreshCcw,
  Settings, ShieldCheck, Trophy, TrendingUp, Truck, X, AlertCircle
} from 'lucide-react';

import {
  Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ComposedChart
} from 'recharts';


// --- 1. CONSTANTS & CONFIGURATION ---

const GENESIS_DATE = new Date('2009-01-03').getTime();
const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const PROJECT_TO_YEAR = 2035;
const MODEL_COEFF = 7.34596586961056e-18;
const MODEL_EXPONENT = 5.82;
const START_YEAR = 2016;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const POWER_LAW_DOWNSAMPLE_STEP = 2;

const POWER_LAW_CACHE = {
  data: null,
  stats: null,
  fetchedAt: 0,
};

// Image Paths
const HERO_IMAGE_LOCAL = "/assets/industrial-refinery-hero.png";
const MONOCHROME_IMAGE_LOCAL = "/assets/industrial-monochrome.png";
const HERO_FALLBACK = "https://images.unsplash.com/photo-1518709911915-712d59df4634?q=80&w=2600&auto=format&fit=crop"; 
const MONOCHROME_FALLBACK = "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2672&auto=format&fit=crop";

const SECTORS = {
  chemicals: {
    label: 'Chemicals',
    icon: <FlaskConical className="text-purple-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'DOW', name: 'Dow Inc.', color: '#C8102E' }, 
      { symbol: 'BASFY', name: 'BASF (ADR)', color: '#004A96' }, 
      { symbol: 'CE', name: 'Celanese', color: '#008542' },
      { symbol: 'MEOH', name: 'Methanex', color: '#582C83' },
      { symbol: 'FSCHX', name: 'Fidelity Chem', color: '#71c7ec' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'DOW': null, 'BASFY': { start: 16.5, end: 20.8 }, 'CE': { start: 66, end: 78.5 }, 'MEOH': { start: 27.77, end: 45.95 }, 'FSCHX': { start: 12.12, end: 14.91 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'DOW': null, 'BASFY': { start: 20.8, end: 27.5 }, 'CE': { start: 78.5, end: 107 }, 'MEOH': { start: 45.95, end: 54.15 }, 'FSCHX': { start: 14.91, end: 18.42 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'DOW': null, 'BASFY': { start: 27.5, end: 17.2 }, 'CE': { start: 107, end: 90 }, 'MEOH': { start: 54.15, end: 64.49 }, 'FSCHX': { start: 18.42, end: 14.42 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'DOW': { start: 51.63, end: 54.73 }, 'BASFY': { start: 17.2, end: 19.5 }, 'CE': { start: 90, end: 123 }, 'MEOH': { start: 64.49, end: 35.42 }, 'FSCHX': { start: 14.42, end: 11.95 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'DOW': { start: 46.07, end: 55.5 }, 'BASFY': { start: 19.5, end: 17.8 }, 'CE': { start: 123, end: 129 }, 'MEOH': { start: 35.42, end: 45.45 }, 'FSCHX': { start: 11.95, end: 12.26 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'DOW': { start: 55.5, end: 56.72 }, 'BASFY': { start: 17.8, end: 19.2 }, 'CE': { start: 129, end: 168 }, 'MEOH': { start: 45.45, end: 39.55 }, 'FSCHX': { start: 12.26, end: 16.76 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'DOW': { start: 59.73, end: 50.39 }, 'BASFY': { start: 19.2, end: 13.5 }, 'CE': { start: 168, end: 102.2 }, 'MEOH': { start: 39.55, end: 37.86 }, 'FSCHX': { start: 16.76, end: 15.81 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'DOW': { start: 59.35, end: 54.84 }, 'BASFY': { start: 13.5, end: 15.2 }, 'CE': { start: 102.2, end: 155.3 }, 'MEOH': { start: 37.86, end: 47.36 }, 'FSCHX': { start: 15.81, end: 15.41 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'DOW': { start: 53.6, end: 40.13 }, 'BASFY': { start: 15.2, end: 12.44 }, 'CE': { start: 146.14, end: 68.76 }, 'MEOH': { start: 45.58, end: 49 }, 'FSCHX': { start: 14.78, end: 13.53 } },
      2025: { 
        'BTC-USD': { start: 94419.76, end: 87244.6 }, 
        'DOW': { start: 37.35, end: 23.20 }, 
        'BASFY': { start: 10.31, end: 12.94 }, 
        'CE': { start: 68.25, end: 39.46 }, 
        'MEOH': { start: 48.83, end: 35.02 }, 
        'FSCHX': { start: 12.97, end: 12.04 } 
      }
    }
  },
  agriculture: {
    label: 'Agriculture',
    icon: <Factory className="text-green-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'ADM', name: 'Archer Daniels Midland', color: '#0f766e' },
      { symbol: 'DE', name: 'Deere & Co.', color: '#367C2B' },
      { symbol: 'CTVA', name: 'Corteva', color: '#0ea5e9' },
      { symbol: 'BG', name: 'Bunge', color: '#1d4ed8' },
      { symbol: 'NTR', name: 'Nutrien', color: '#059669' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'ADM': { start: 26.23, end: 34.95 }, 'DE': { start: 65.43, end: 89.51 }, 'CTVA': { start: 30.5, end: 32.1 }, 'BG': { start: 46.11, end: 55.19 }, 'NTR': { start: 34.2, end: 37.5 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'ADM': { start: 33.88, end: 31.64 }, 'DE': { start: 93.54, end: 138.87 }, 'CTVA': { start: 33.2, end: 36.7 }, 'BG': { start: 52.87, end: 52.56 }, 'NTR': { start: 35.1, end: 40.2 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'ADM': { start: 33.9, end: 33.31 }, 'DE': { start: 148.22, end: 134.66 }, 'CTVA': { start: 36.9, end: 31.4 }, 'BG': { start: 62.23, end: 43.1 }, 'NTR': { start: 40.8, end: 44.5 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'ADM': { start: 36.5, end: 39 }, 'DE': { start: 148.82, end: 159.43 }, 'CTVA': { start: 28.1, end: 31.9 }, 'BG': { start: 44.42, end: 48.18 }, 'NTR': { start: 44.7, end: 54.2 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'ADM': { start: 37.66, end: 43.85 }, 'DE': { start: 146.56, end: 252.2 }, 'CTVA': { start: 26.8, end: 39.6 }, 'BG': { start: 43.89, end: 57.29 }, 'NTR': { start: 51.4, end: 54.8 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'ADM': { start: 43.51, end: 60.22 }, 'DE': { start: 271.49, end: 324.93 }, 'CTVA': { start: 39.8, end: 45.4 }, 'BG': { start: 57.17, end: 83.57 }, 'NTR': { start: 54.9, end: 74.1 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'ADM': { start: 66.82, end: 84.3 }, 'DE': { start: 357.77, end: 411.42 }, 'CTVA': { start: 46.2, end: 64.3 }, 'BG': { start: 88.5, end: 91.33 }, 'NTR': { start: 74.5, end: 77.6 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'ADM': { start: 75.22, end: 67.09 }, 'DE': { start: 406.88, end: 388.54 }, 'CTVA': { start: 64.1, end: 53.7 }, 'BG': { start: 90.71, end: 94.79 }, 'NTR': { start: 77.2, end: 65.4 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'ADM': { start: 51.63, end: 48.62 }, 'DE': { start: 383.83, end: 417.83 }, 'CTVA': { start: 47.2, end: 45.6 }, 'BG': { start: 82.72, end: 75.13 }, 'NTR': { start: 64.8, end: 68.1 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'ADM': { start: 48.7, end: 50.1 }, 'DE': { start: 420.4, end: 389.2 }, 'CTVA': { start: 45.9, end: 42.3 }, 'BG': { start: 76.4, end: 70.8 }, 'NTR': { start: 68.5, end: 62.1 } }
    }
  },
  energy: {
    label: 'Energy',
    icon: <Activity className="text-red-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'XOM', name: 'ExxonMobil', color: '#991b1b' },
      { symbol: 'CVX', name: 'Chevron', color: '#2563eb' },
      { symbol: 'SHEL', name: 'Shell', color: '#facc15' },
      { symbol: 'BP', name: 'BP plc', color: '#16a34a' },
      { symbol: 'TTE', name: 'TotalEnergies', color: '#f97316' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'XOM': { start: 77.8, end: 90.3 }, 'CVX': { start: 90.1, end: 118.5 }, 'SHEL': { start: 47.2, end: 55.6 }, 'BP': { start: 30.2, end: 37.1 }, 'TTE': { start: 44.7, end: 49.9 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'XOM': { start: 90.3, end: 83.6 }, 'CVX': { start: 118.5, end: 125.3 }, 'SHEL': { start: 55.6, end: 67.4 }, 'BP': { start: 37.1, end: 41.9 }, 'TTE': { start: 49.9, end: 54.6 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'XOM': { start: 83.6, end: 68.2 }, 'CVX': { start: 125.3, end: 108.6 }, 'SHEL': { start: 67.4, end: 57.8 }, 'BP': { start: 41.9, end: 37.4 }, 'TTE': { start: 54.6, end: 48.1 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'XOM': { start: 68.2, end: 69.2 }, 'CVX': { start: 108.6, end: 120.3 }, 'SHEL': { start: 57.8, end: 59.6 }, 'BP': { start: 37.4, end: 38.7 }, 'TTE': { start: 48.1, end: 52.4 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'XOM': { start: 70.2, end: 41.2 }, 'CVX': { start: 119.6, end: 84.5 }, 'SHEL': { start: 59.3, end: 35.1 }, 'BP': { start: 38.1, end: 21.4 }, 'TTE': { start: 52.0, end: 41.8 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'XOM': { start: 41.2, end: 61.2 }, 'CVX': { start: 84.5, end: 117.2 }, 'SHEL': { start: 35.1, end: 45.7 }, 'BP': { start: 21.4, end: 24.0 }, 'TTE': { start: 41.8, end: 48.6 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'XOM': { start: 61.2, end: 110.3 }, 'CVX': { start: 117.2, end: 179.5 }, 'SHEL': { start: 45.7, end: 57.4 }, 'BP': { start: 24.0, end: 30.1 }, 'TTE': { start: 48.6, end: 63.2 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'XOM': { start: 110.3, end: 101.2 }, 'CVX': { start: 179.5, end: 149.6 }, 'SHEL': { start: 57.4, end: 64.8 }, 'BP': { start: 30.1, end: 37.5 }, 'TTE': { start: 63.2, end: 68.7 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'XOM': { start: 103.1, end: 118.6 }, 'CVX': { start: 152.2, end: 170.4 }, 'SHEL': { start: 65.3, end: 70.1 }, 'BP': { start: 38.2, end: 41.8 }, 'TTE': { start: 69.1, end: 72.7 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'XOM': { start: 120.5, end: 109.2 }, 'CVX': { start: 172.1, end: 158.4 }, 'SHEL': { start: 70.8, end: 66.3 }, 'BP': { start: 42.2, end: 39.5 }, 'TTE': { start: 73.5, end: 69.8 } }
    }
  },
  magnificent7: {
    label: 'Magnificent 7',
    icon: <LayoutDashboard className="text-cyan-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'MSFT', name: 'Microsoft', color: '#2563eb' },
      { symbol: 'AAPL', name: 'Apple', color: '#16a34a' },
      { symbol: 'GOOGL', name: 'Alphabet', color: '#f97316' },
      { symbol: 'AMZN', name: 'Amazon', color: '#a855f7' },
      { symbol: 'META', name: 'Meta Platforms', color: '#0ea5e9' },
      { symbol: 'NVDA', name: 'NVIDIA', color: '#22c55e' },
      { symbol: 'TSLA', name: 'Tesla', color: '#ef4444' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'MSFT': { start: 55.0, end: 62.0 }, 'AAPL': { start: 105, end: 115 }, 'GOOGL': { start: 758, end: 792 }, 'AMZN': { start: 656, end: 749 }, 'META': { start: 102, end: 115 }, 'NVDA': { start: 32, end: 106 }, 'TSLA': { start: 43, end: 45 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'MSFT': { start: 62, end: 85 }, 'AAPL': { start: 116, end: 170 }, 'GOOGL': { start: 792, end: 1053 }, 'AMZN': { start: 749, end: 1189 }, 'META': { start: 116, end: 176 }, 'NVDA': { start: 106, end: 193 }, 'TSLA': { start: 45, end: 62 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'MSFT': { start: 86, end: 101 }, 'AAPL': { start: 170, end: 158 }, 'GOOGL': { start: 1053, end: 1035 }, 'AMZN': { start: 1189, end: 1501 }, 'META': { start: 176, end: 131 }, 'NVDA': { start: 193, end: 133 }, 'TSLA': { start: 62, end: 66 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'MSFT': { start: 101, end: 157 }, 'AAPL': { start: 158, end: 293 }, 'GOOGL': { start: 1035, end: 1337 }, 'AMZN': { start: 1501, end: 1848 }, 'META': { start: 131, end: 205 }, 'NVDA': { start: 133, end: 240 }, 'TSLA': { start: 66, end: 83 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'MSFT': { start: 158, end: 222 }, 'AAPL': { start: 293, end: 134 }, 'GOOGL': { start: 1337, end: 1752 }, 'AMZN': { start: 1848, end: 3256 }, 'META': { start: 205, end: 273 }, 'NVDA': { start: 240, end: 522 }, 'TSLA': { start: 83, end: 705 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'MSFT': { start: 222, end: 336 }, 'AAPL': { start: 134, end: 177 }, 'GOOGL': { start: 1752, end: 2897 }, 'AMZN': { start: 3256, end: 3334 }, 'META': { start: 273, end: 336 }, 'NVDA': { start: 522, end: 294 }, 'TSLA': { start: 705, end: 352 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'MSFT': { start: 336, end: 239 }, 'AAPL': { start: 177, end: 129 }, 'GOOGL': { start: 2897, end: 2150 }, 'AMZN': { start: 3334, end: 167 }, 'META': { start: 336, end: 120 }, 'NVDA': { start: 294, end: 146 }, 'TSLA': { start: 352, end: 123 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'MSFT': { start: 240, end: 377 }, 'AAPL': { start: 130, end: 192 }, 'GOOGL': { start: 2150, end: 2890 }, 'AMZN': { start: 85, end: 171 }, 'META': { start: 120, end: 353 }, 'NVDA': { start: 146, end: 493 }, 'TSLA': { start: 123, end: 248 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'MSFT': { start: 376, end: 401 }, 'AAPL': { start: 192, end: 227 }, 'GOOGL': { start: 2890, end: 3250 }, 'AMZN': { start: 171, end: 198 }, 'META': { start: 353, end: 290 }, 'NVDA': { start: 493, end: 495 }, 'TSLA': { start: 248, end: 235 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'MSFT': { start: 402, end: 415 }, 'AAPL': { start: 229, end: 210 }, 'GOOGL': { start: 3250, end: 3125 }, 'AMZN': { start: 198, end: 205 }, 'META': { start: 290, end: 320 }, 'NVDA': { start: 495, end: 520 }, 'TSLA': { start: 235, end: 218 } }
    }
  },
  macro: {
    label: 'Macro Benchmarks',
    icon: <BarChart3 className="text-amber-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'SPY', name: 'S&P 500 (SPY)', color: '#10b981' },
      { symbol: 'QQQ', name: 'Nasdaq 100 (QQQ)', color: '#3b82f6' },
      { symbol: 'BND', name: 'Total Bond (BND)', color: '#f97316' },
      { symbol: 'GLD', name: 'Gold (GLD)', color: '#d97706' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'SPY': { start: 201, end: 224 }, 'QQQ': { start: 106, end: 119 }, 'BND': { start: 82, end: 81 }, 'GLD': { start: 103, end: 115 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'SPY': { start: 225, end: 266 }, 'QQQ': { start: 119, end: 156 }, 'BND': { start: 81, end: 82 }, 'GLD': { start: 115, end: 123 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'SPY': { start: 266, end: 250 }, 'QQQ': { start: 156, end: 155 }, 'BND': { start: 82, end: 78 }, 'GLD': { start: 123, end: 118 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'SPY': { start: 252, end: 321 }, 'QQQ': { start: 155, end: 214 }, 'BND': { start: 78, end: 84 }, 'GLD': { start: 118, end: 140 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'SPY': { start: 323, end: 374 }, 'QQQ': { start: 214, end: 313 }, 'BND': { start: 84, end: 87 }, 'GLD': { start: 140, end: 178 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'SPY': { start: 375, end: 477 }, 'QQQ': { start: 314, end: 400 }, 'BND': { start: 87, end: 84 }, 'GLD': { start: 178, end: 168 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'SPY': { start: 477, end: 384 }, 'QQQ': { start: 400, end: 267 }, 'BND': { start: 84, end: 72 }, 'GLD': { start: 168, end: 168 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'SPY': { start: 386, end: 476 }, 'QQQ': { start: 268, end: 403 }, 'BND': { start: 73, end: 74 }, 'GLD': { start: 168, end: 188 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'SPY': { start: 478, end: 520 }, 'QQQ': { start: 404, end: 432 }, 'BND': { start: 74, end: 76 }, 'GLD': { start: 188, end: 196 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'SPY': { start: 522, end: 507 }, 'QQQ': { start: 434, end: 420 }, 'BND': { start: 76, end: 77 }, 'GLD': { start: 197, end: 205 } }
    }
  },
  utilities: {
    label: 'Utilities & Infrastructure',
    icon: <Anchor className="text-blue-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'NEE', name: 'NextEra Energy', color: '#38bdf8' },
      { symbol: 'DUK', name: 'Duke Energy', color: '#a855f7' },
      { symbol: 'SO', name: 'Southern Company', color: '#facc15' },
      { symbol: 'EXC', name: 'Exelon', color: '#14b8a6' },
      { symbol: 'AWK', name: 'American Water', color: '#0ea5e9' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'NEE': { start: 28, end: 31 }, 'DUK': { start: 71, end: 76 }, 'SO': { start: 48, end: 49 }, 'EXC': { start: 29, end: 35 }, 'AWK': { start: 65, end: 74 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'NEE': { start: 31, end: 42 }, 'DUK': { start: 76, end: 78 }, 'SO': { start: 49, end: 51 }, 'EXC': { start: 35, end: 39 }, 'AWK': { start: 74, end: 87 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'NEE': { start: 42, end: 44 }, 'DUK': { start: 78, end: 86 }, 'SO': { start: 51, end: 47 }, 'EXC': { start: 39, end: 37 }, 'AWK': { start: 87, end: 96 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'NEE': { start: 44, end: 57 }, 'DUK': { start: 86, end: 92 }, 'SO': { start: 47, end: 63 }, 'EXC': { start: 37, end: 45 }, 'AWK': { start: 96, end: 117 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'NEE': { start: 57, end: 72 }, 'DUK': { start: 92, end: 87 }, 'SO': { start: 63, end: 61 }, 'EXC': { start: 45, end: 43 }, 'AWK': { start: 117, end: 151 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'NEE': { start: 72, end: 88 }, 'DUK': { start: 87, end: 103 }, 'SO': { start: 61, end: 68 }, 'EXC': { start: 43, end: 53 }, 'AWK': { start: 151, end: 179 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'NEE': { start: 88, end: 80 }, 'DUK': { start: 103, end: 99 }, 'SO': { start: 68, end: 70 }, 'EXC': { start: 53, end: 43 }, 'AWK': { start: 179, end: 151 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'NEE': { start: 80, end: 72 }, 'DUK': { start: 99, end: 92 }, 'SO': { start: 70, end: 69 }, 'EXC': { start: 43, end: 39 }, 'AWK': { start: 151, end: 139 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'NEE': { start: 72, end: 76 }, 'DUK': { start: 92, end: 94 }, 'SO': { start: 69, end: 71 }, 'EXC': { start: 39, end: 41 }, 'AWK': { start: 139, end: 142 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'NEE': { start: 76, end: 73 }, 'DUK': { start: 94, end: 92 }, 'SO': { start: 71, end: 70 }, 'EXC': { start: 41, end: 40 }, 'AWK': { start: 142, end: 138 } }
    }
  },
  defense: {
    label: 'Defense & Aerospace',
    icon: <ShieldCheck className="text-rose-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'LMT', name: 'Lockheed Martin', color: '#7c3aed' },
      { symbol: 'RTX', name: 'RTX', color: '#fb7185' },
      { symbol: 'NOC', name: 'Northrop Grumman', color: '#0ea5e9' },
      { symbol: 'GD', name: 'General Dynamics', color: '#22c55e' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'LMT': { start: 212, end: 249 }, 'RTX': { start: 53, end: 64 }, 'NOC': { start: 187, end: 238 }, 'GD': { start: 140, end: 180 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'LMT': { start: 249, end: 320 }, 'RTX': { start: 64, end: 72 }, 'NOC': { start: 238, end: 308 }, 'GD': { start: 180, end: 202 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'LMT': { start: 320, end: 278 }, 'RTX': { start: 72, end: 60 }, 'NOC': { start: 308, end: 260 }, 'GD': { start: 202, end: 170 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'LMT': { start: 278, end: 390 }, 'RTX': { start: 60, end: 74 }, 'NOC': { start: 260, end: 374 }, 'GD': { start: 170, end: 190 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'LMT': { start: 390, end: 356 }, 'RTX': { start: 74, end: 71 }, 'NOC': { start: 374, end: 300 }, 'GD': { start: 190, end: 149 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'LMT': { start: 356, end: 353 }, 'RTX': { start: 71, end: 86 }, 'NOC': { start: 300, end: 390 }, 'GD': { start: 149, end: 208 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'LMT': { start: 353, end: 488 }, 'RTX': { start: 86, end: 97 }, 'NOC': { start: 390, end: 523 }, 'GD': { start: 208, end: 247 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'LMT': { start: 488, end: 451 }, 'RTX': { start: 97, end: 88 }, 'NOC': { start: 523, end: 470 }, 'GD': { start: 247, end: 260 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'LMT': { start: 451, end: 470 }, 'RTX': { start: 88, end: 95 }, 'NOC': { start: 470, end: 495 }, 'GD': { start: 260, end: 285 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'LMT': { start: 470, end: 456 }, 'RTX': { start: 95, end: 92 }, 'NOC': { start: 495, end: 482 }, 'GD': { start: 285, end: 276 } }
    }
  },
  staples: {
    label: 'Consumer Staples',
    icon: <FileText className="text-emerald-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'KO', name: 'Coca-Cola', color: '#ef4444' },
      { symbol: 'PG', name: 'Procter & Gamble', color: '#1d4ed8' },
      { symbol: 'PEP', name: 'PepsiCo', color: '#0ea5e9' },
      { symbol: 'COST', name: 'Costco', color: '#facc15' },
      { symbol: 'WMT', name: 'Walmart', color: '#2563eb' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'KO': { start: 42, end: 43 }, 'PG': { start: 79, end: 84 }, 'PEP': { start: 94, end: 101 }, 'COST': { start: 150, end: 160 }, 'WMT': { start: 62, end: 69 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'KO': { start: 43, end: 46 }, 'PG': { start: 84, end: 92 }, 'PEP': { start: 101, end: 116 }, 'COST': { start: 160, end: 187 }, 'WMT': { start: 69, end: 98 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'KO': { start: 46, end: 48 }, 'PG': { start: 92, end: 91 }, 'PEP': { start: 116, end: 110 }, 'COST': { start: 187, end: 205 }, 'WMT': { start: 98, end: 94 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'KO': { start: 48, end: 55 }, 'PG': { start: 91, end: 125 }, 'PEP': { start: 110, end: 136 }, 'COST': { start: 205, end: 294 }, 'WMT': { start: 94, end: 118 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'KO': { start: 55, end: 54 }, 'PG': { start: 125, end: 139 }, 'PEP': { start: 136, end: 148 }, 'COST': { start: 294, end: 377 }, 'WMT': { start: 118, end: 144 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'KO': { start: 54, end: 60 }, 'PG': { start: 139, end: 162 }, 'PEP': { start: 148, end: 171 }, 'COST': { start: 377, end: 566 }, 'WMT': { start: 144, end: 144 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'KO': { start: 60, end: 63 }, 'PG': { start: 162, end: 152 }, 'PEP': { start: 171, end: 182 }, 'COST': { start: 566, end: 458 }, 'WMT': { start: 144, end: 142 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'KO': { start: 63, end: 59 }, 'PG': { start: 152, end: 151 }, 'PEP': { start: 182, end: 168 }, 'COST': { start: 458, end: 662 }, 'WMT': { start: 142, end: 156 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'KO': { start: 59, end: 61 }, 'PG': { start: 151, end: 166 }, 'PEP': { start: 168, end: 175 }, 'COST': { start: 662, end: 720 }, 'WMT': { start: 156, end: 165 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'KO': { start: 61, end: 60 }, 'PG': { start: 166, end: 164 }, 'PEP': { start: 175, end: 172 }, 'COST': { start: 720, end: 705 }, 'WMT': { start: 165, end: 162 } }
    }
  },
  innovators: {
    label: 'Emerging Tech Innovators',
    icon: <TrendingUp className="text-fuchsia-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'ASML', name: 'ASML', color: '#2563eb' },
      { symbol: 'TSM', name: 'Taiwan Semi', color: '#10b981' },
      { symbol: 'AVGO', name: 'Broadcom', color: '#f43f5e' },
      { symbol: 'AMD', name: 'AMD', color: '#a855f7' },
      { symbol: 'NOW', name: 'ServiceNow', color: '#0ea5e9' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'ASML': { start: 90, end: 106 }, 'TSM': { start: 24, end: 28 }, 'AVGO': { start: 130, end: 173 }, 'AMD': { start: 2.8, end: 11.5 }, 'NOW': { start: 70, end: 87 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'ASML': { start: 106, end: 172 }, 'TSM': { start: 28, end: 40 }, 'AVGO': { start: 173, end: 271 }, 'AMD': { start: 11.5, end: 10.9 }, 'NOW': { start: 87, end: 129 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'ASML': { start: 172, end: 149 }, 'TSM': { start: 40, end: 34 }, 'AVGO': { start: 271, end: 254 }, 'AMD': { start: 10.9, end: 18.0 }, 'NOW': { start: 129, end: 181 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'ASML': { start: 149, end: 296 }, 'TSM': { start: 34, end: 58 }, 'AVGO': { start: 254, end: 318 }, 'AMD': { start: 18, end: 45 }, 'NOW': { start: 181, end: 280 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'ASML': { start: 296, end: 401 }, 'TSM': { start: 58, end: 110 }, 'AVGO': { start: 318, end: 432 }, 'AMD': { start: 45, end: 92 }, 'NOW': { start: 280, end: 560 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'ASML': { start: 401, end: 782 }, 'TSM': { start: 110, end: 123 }, 'AVGO': { start: 432, end: 555 }, 'AMD': { start: 92, end: 143 }, 'NOW': { start: 560, end: 658 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'ASML': { start: 782, end: 500 }, 'TSM': { start: 123, end: 74 }, 'AVGO': { start: 555, end: 565 }, 'AMD': { start: 143, end: 64 }, 'NOW': { start: 658, end: 381 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'ASML': { start: 505, end: 720 }, 'TSM': { start: 75, end: 124 }, 'AVGO': { start: 570, end: 1130 }, 'AMD': { start: 65, end: 140 }, 'NOW': { start: 385, end: 706 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'ASML': { start: 725, end: 860 }, 'TSM': { start: 125, end: 140 }, 'AVGO': { start: 1140, end: 1350 }, 'AMD': { start: 142, end: 165 }, 'NOW': { start: 710, end: 780 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'ASML': { start: 860, end: 830 }, 'TSM': { start: 140, end: 135 }, 'AVGO': { start: 1350, end: 1290 }, 'AMD': { start: 165, end: 158 }, 'NOW': { start: 780, end: 760 } }
    }
  },
  commodities: {
    label: 'Hard Commodity Operators',
    icon: <HardHat className="text-yellow-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'BHP', name: 'BHP', color: '#0ea5e9' },
      { symbol: 'RIO', name: 'Rio Tinto', color: '#dc2626' },
      { symbol: 'FCX', name: 'Freeport-McMoRan', color: '#2563eb' },
      { symbol: 'NEM', name: 'Newmont', color: '#facc15' },
      { symbol: 'CAT', name: 'Caterpillar', color: '#a855f7' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'BHP': { start: 22, end: 38 }, 'RIO': { start: 23, end: 45 }, 'FCX': { start: 7, end: 13 }, 'NEM': { start: 18, end: 34 }, 'CAT': { start: 65, end: 93 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'BHP': { start: 38, end: 47 }, 'RIO': { start: 45, end: 52 }, 'FCX': { start: 13, end: 19 }, 'NEM': { start: 34, end: 37 }, 'CAT': { start: 93, end: 158 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'BHP': { start: 47, end: 44 }, 'RIO': { start: 52, end: 44 }, 'FCX': { start: 19, end: 11 }, 'NEM': { start: 37, end: 36 }, 'CAT': { start: 158, end: 127 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'BHP': { start: 44, end: 54 }, 'RIO': { start: 44, end: 51 }, 'FCX': { start: 11, end: 12 }, 'NEM': { start: 36, end: 45 }, 'CAT': { start: 127, end: 149 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'BHP': { start: 54, end: 70 }, 'RIO': { start: 51, end: 75 }, 'FCX': { start: 12, end: 25 }, 'NEM': { start: 45, end: 60 }, 'CAT': { start: 149, end: 185 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'BHP': { start: 70, end: 63 }, 'RIO': { start: 75, end: 71 }, 'FCX': { start: 25, end: 41 }, 'NEM': { start: 60, end: 62 }, 'CAT': { start: 185, end: 203 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'BHP': { start: 63, end: 58 }, 'RIO': { start: 71, end: 62 }, 'FCX': { start: 41, end: 34 }, 'NEM': { start: 62, end: 45 }, 'CAT': { start: 203, end: 238 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'BHP': { start: 58, end: 64 }, 'RIO': { start: 62, end: 70 }, 'FCX': { start: 34, end: 42 }, 'NEM': { start: 45, end: 42 }, 'CAT': { start: 238, end: 300 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'BHP': { start: 64, end: 68 }, 'RIO': { start: 70, end: 73 }, 'FCX': { start: 42, end: 46 }, 'NEM': { start: 42, end: 45 }, 'CAT': { start: 300, end: 328 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'BHP': { start: 68, end: 66 }, 'RIO': { start: 73, end: 71 }, 'FCX': { start: 46, end: 44 }, 'NEM': { start: 45, end: 43 }, 'CAT': { start: 328, end: 315 } }
    }
  },
  timber: {
    label: 'Timber & Forestry',
    icon: <Factory className="text-amber-700" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'WY', name: 'Weyerhaeuser', color: '#047857' },
      { symbol: 'PCH', name: 'PotlatchDeltic', color: '#f97316' },
      { symbol: 'RYN', name: 'Rayonier', color: '#0ea5e9' },
      { symbol: 'CFPZF', name: 'Canfor', color: '#b91c1c' },
      { symbol: 'ACA', name: 'Arcosa (Infra Timber)', color: '#7c3aed' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'WY': { start: 27, end: 33 }, 'PCH': { start: 34, end: 39 }, 'RYN': { start: 24, end: 27 }, 'CFPZF': { start: 12, end: 18 }, 'ACA': { start: 21, end: 24 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'WY': { start: 33, end: 36 }, 'PCH': { start: 39, end: 51 }, 'RYN': { start: 27, end: 32 }, 'CFPZF': { start: 18, end: 25 }, 'ACA': { start: 24, end: 27 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'WY': { start: 36, end: 25 }, 'PCH': { start: 51, end: 31 }, 'RYN': { start: 32, end: 27 }, 'CFPZF': { start: 25, end: 19 }, 'ACA': { start: 27, end: 24 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'WY': { start: 25, end: 29 }, 'PCH': { start: 31, end: 40 }, 'RYN': { start: 27, end: 35 }, 'CFPZF': { start: 19, end: 21 }, 'ACA': { start: 24, end: 32 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'WY': { start: 29, end: 31 }, 'PCH': { start: 40, end: 55 }, 'RYN': { start: 35, end: 31 }, 'CFPZF': { start: 21, end: 23 }, 'ACA': { start: 32, end: 41 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'WY': { start: 31, end: 38 }, 'PCH': { start: 55, end: 56 }, 'RYN': { start: 31, end: 39 }, 'CFPZF': { start: 23, end: 28 }, 'ACA': { start: 41, end: 44 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'WY': { start: 38, end: 31 }, 'PCH': { start: 56, end: 48 }, 'RYN': { start: 39, end: 34 }, 'CFPZF': { start: 28, end: 21 }, 'ACA': { start: 44, end: 38 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'WY': { start: 31, end: 33 }, 'PCH': { start: 48, end: 52 }, 'RYN': { start: 34, end: 32 }, 'CFPZF': { start: 21, end: 19 }, 'ACA': { start: 38, end: 39 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'WY': { start: 33, end: 35 }, 'PCH': { start: 52, end: 54 }, 'RYN': { start: 32, end: 34 }, 'CFPZF': { start: 19, end: 22 }, 'ACA': { start: 39, end: 41 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'WY': { start: 35, end: 34 }, 'PCH': { start: 54, end: 53 }, 'RYN': { start: 34, end: 33 }, 'CFPZF': { start: 22, end: 21 }, 'ACA': { start: 41, end: 40 } }
    }
  },
  banking: {
    label: 'Banking Titans',
    icon: <Database className="text-indigo-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'JPM', name: 'JPMorgan Chase', color: '#1d4ed8' },
      { symbol: 'BAC', name: 'Bank of America', color: '#16a34a' },
      { symbol: 'WFC', name: 'Wells Fargo', color: '#dc2626' },
      { symbol: 'C', name: 'Citigroup', color: '#0ea5e9' },
      { symbol: 'UMBF', name: 'UMB Financial', color: '#a855f7' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'JPM': { start: 57, end: 86 }, 'BAC': { start: 13, end: 22 }, 'WFC': { start: 50, end: 55 }, 'C': { start: 44, end: 59 }, 'UMBF': { start: 46, end: 73 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'JPM': { start: 86, end: 107 }, 'BAC': { start: 22, end: 29 }, 'WFC': { start: 55, end: 60 }, 'C': { start: 59, end: 75 }, 'UMBF': { start: 73, end: 76 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'JPM': { start: 107, end: 97 }, 'BAC': { start: 29, end: 24 }, 'WFC': { start: 60, end: 46 }, 'C': { start: 75, end: 51 }, 'UMBF': { start: 76, end: 65 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'JPM': { start: 97, end: 139 }, 'BAC': { start: 24, end: 35 }, 'WFC': { start: 46, end: 54 }, 'C': { start: 51, end: 79 }, 'UMBF': { start: 65, end: 73 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'JPM': { start: 139, end: 127 }, 'BAC': { start: 35, end: 31 }, 'WFC': { start: 54, end: 29 }, 'C': { start: 79, end: 61 }, 'UMBF': { start: 73, end: 73 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'JPM': { start: 127, end: 158 }, 'BAC': { start: 31, end: 44 }, 'WFC': { start: 29, end: 47 }, 'C': { start: 61, end: 60 }, 'UMBF': { start: 73, end: 106 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'JPM': { start: 158, end: 134 }, 'BAC': { start: 44, end: 33 }, 'WFC': { start: 47, end: 40 }, 'C': { start: 60, end: 45 }, 'UMBF': { start: 106, end: 84 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'JPM': { start: 134, end: 170 }, 'BAC': { start: 33, end: 33 }, 'WFC': { start: 40, end: 46 }, 'C': { start: 45, end: 52 }, 'UMBF': { start: 84, end: 97 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'JPM': { start: 170, end: 185 }, 'BAC': { start: 33, end: 36 }, 'WFC': { start: 46, end: 48 }, 'C': { start: 52, end: 57 }, 'UMBF': { start: 97, end: 102 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'JPM': { start: 185, end: 178 }, 'BAC': { start: 36, end: 34 }, 'WFC': { start: 48, end: 46 }, 'C': { start: 57, end: 55 }, 'UMBF': { start: 102, end: 98 } }
    }
  },
  emerging: {
    label: 'Emerging Markets',
    icon: <Globe className="text-lime-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'TCEHY', name: 'Tencent', color: '#2563eb' },
      { symbol: 'BABA', name: 'Alibaba', color: '#f97316' },
      { symbol: 'RLNIY', name: 'Reliance Industries ADR', color: '#10b981' },
      { symbol: 'PBR', name: 'Petrobras', color: '#dc2626' },
      { symbol: 'SSNLF', name: 'Samsung Electronics', color: '#0ea5e9' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'TCEHY': { start: 14, end: 24 }, 'BABA': { start: 76, end: 88 }, 'RLNIY': { start: 47, end: 53 }, 'PBR': { start: 4, end: 9 }, 'SSNLF': { start: 12, end: 14 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'TCEHY': { start: 24, end: 55 }, 'BABA': { start: 88, end: 175 }, 'RLNIY': { start: 53, end: 92 }, 'PBR': { start: 9, end: 10 }, 'SSNLF': { start: 14, end: 17 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'TCEHY': { start: 55, end: 40 }, 'BABA': { start: 175, end: 137 }, 'RLNIY': { start: 92, end: 105 }, 'PBR': { start: 10, end: 11 }, 'SSNLF': { start: 17, end: 15 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'TCEHY': { start: 40, end: 49 }, 'BABA': { start: 137, end: 212 }, 'RLNIY': { start: 105, end: 145 }, 'PBR': { start: 11, end: 15 }, 'SSNLF': { start: 15, end: 17 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'TCEHY': { start: 49, end: 74 }, 'BABA': { start: 212, end: 232 }, 'RLNIY': { start: 145, end: 190 }, 'PBR': { start: 15, end: 9 }, 'SSNLF': { start: 17, end: 19 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'TCEHY': { start: 74, end: 60 }, 'BABA': { start: 232, end: 118 }, 'RLNIY': { start: 190, end: 214 }, 'PBR': { start: 9, end: 11 }, 'SSNLF': { start: 19, end: 21 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'TCEHY': { start: 60, end: 38 }, 'BABA': { start: 118, end: 86 }, 'RLNIY': { start: 214, end: 222 }, 'PBR': { start: 11, end: 9 }, 'SSNLF': { start: 21, end: 18 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'TCEHY': { start: 38, end: 44 }, 'BABA': { start: 86, end: 87 }, 'RLNIY': { start: 222, end: 240 }, 'PBR': { start: 9, end: 16 }, 'SSNLF': { start: 18, end: 20 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'TCEHY': { start: 44, end: 48 }, 'BABA': { start: 87, end: 92 }, 'RLNIY': { start: 240, end: 255 }, 'PBR': { start: 16, end: 17 }, 'SSNLF': { start: 20, end: 21 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'TCEHY': { start: 48, end: 46 }, 'BABA': { start: 92, end: 90 }, 'RLNIY': { start: 255, end: 248 }, 'PBR': { start: 17, end: 16 }, 'SSNLF': { start: 21, end: 20 } }
    }
  },
  payments: {
    label: 'Retail Payments',
    icon: <RefreshCcw className="text-orange-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'V', name: 'Visa', color: '#2563eb' },
      { symbol: 'MA', name: 'Mastercard', color: '#f97316' },
      { symbol: 'PYPL', name: 'PayPal', color: '#0ea5e9' },
      { symbol: 'SQ', name: 'Block', color: '#22c55e' },
      { symbol: 'ADYEY', name: 'Adyen', color: '#7c3aed' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'V': { start: 74, end: 78 }, 'MA': { start: 93, end: 104 }, 'PYPL': { start: 31, end: 39 }, 'SQ': { start: 9, end: 14 }, 'ADYEY': { start: 13, end: 16 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'V': { start: 78, end: 114 }, 'MA': { start: 104, end: 151 }, 'PYPL': { start: 39, end: 74 }, 'SQ': { start: 14, end: 34 }, 'ADYEY': { start: 16, end: 26 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'V': { start: 114, end: 131 }, 'MA': { start: 151, end: 188 }, 'PYPL': { start: 74, end: 83 }, 'SQ': { start: 34, end: 57 }, 'ADYEY': { start: 26, end: 22 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'V': { start: 131, end: 187 }, 'MA': { start: 188, end: 298 }, 'PYPL': { start: 83, end: 109 }, 'SQ': { start: 57, end: 62 }, 'ADYEY': { start: 22, end: 26 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'V': { start: 187, end: 219 }, 'MA': { start: 298, end: 337 }, 'PYPL': { start: 109, end: 234 }, 'SQ': { start: 62, end: 222 }, 'ADYEY': { start: 26, end: 44 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'V': { start: 219, end: 217 }, 'MA': { start: 337, end: 347 }, 'PYPL': { start: 234, end: 187 }, 'SQ': { start: 222, end: 161 }, 'ADYEY': { start: 44, end: 58 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'V': { start: 217, end: 210 }, 'MA': { start: 347, end: 347 }, 'PYPL': { start: 187, end: 70 }, 'SQ': { start: 161, end: 58 }, 'ADYEY': { start: 58, end: 21 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'V': { start: 210, end: 260 }, 'MA': { start: 347, end: 418 }, 'PYPL': { start: 70, end: 61 }, 'SQ': { start: 58, end: 78 }, 'ADYEY': { start: 21, end: 24 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'V': { start: 262, end: 285 }, 'MA': { start: 420, end: 445 }, 'PYPL': { start: 62, end: 72 }, 'SQ': { start: 79, end: 82 }, 'ADYEY': { start: 24, end: 26 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'V': { start: 285, end: 276 }, 'MA': { start: 445, end: 432 }, 'PYPL': { start: 72, end: 69 }, 'SQ': { start: 82, end: 80 }, 'ADYEY': { start: 26, end: 25 } }
    }
  },
  logistics: {
    label: 'Logistics & Shipping',
    icon: <Truck className="text-slate-300" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'UPS', name: 'UPS', color: '#92400e' },
      { symbol: 'FDX', name: 'FedEx', color: '#6d28d9' },
      { symbol: 'UNP', name: 'Union Pacific', color: '#facc15' },
      { symbol: 'CSX', name: 'CSX Corp', color: '#2563eb' },
      { symbol: 'ATCO', name: 'Atlas Corp / Maersk Proxy', color: '#14b8a6' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'UPS': { start: 102, end: 114 }, 'FDX': { start: 135, end: 186 }, 'UNP': { start: 75, end: 104 }, 'CSX': { start: 25, end: 36 }, 'ATCO': { start: 14, end: 15 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'UPS': { start: 114, end: 119 }, 'FDX': { start: 186, end: 251 }, 'UNP': { start: 104, end: 134 }, 'CSX': { start: 36, end: 50 }, 'ATCO-A': { start: 15, end: 16 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'UPS': { start: 119, end: 97 }, 'FDX': { start: 251, end: 161 }, 'UNP': { start: 134, end: 139 }, 'CSX': { start: 50, end: 64 }, 'ATCO-A': { start: 16, end: 13 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'UPS': { start: 97, end: 118 }, 'FDX': { start: 161, end: 150 }, 'UNP': { start: 139, end: 181 }, 'CSX': { start: 64, end: 72 }, 'ATCO-A': { start: 13, end: 14 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'UPS': { start: 118, end: 168 }, 'FDX': { start: 150, end: 258 }, 'UNP': { start: 181, end: 206 }, 'CSX': { start: 72, end: 91 }, 'ATCO-A': { start: 14, end: 15 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'UPS': { start: 168, end: 214 }, 'FDX': { start: 258, end: 256 }, 'UNP': { start: 206, end: 248 }, 'CSX': { start: 91, end: 105 }, 'ATCO-A': { start: 15, end: 16 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'UPS': { start: 214, end: 178 }, 'FDX': { start: 256, end: 173 }, 'UNP': { start: 248, end: 212 }, 'CSX': { start: 105, end: 80 }, 'ATCO-A': { start: 16, end: 15 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'UPS': { start: 178, end: 161 }, 'FDX': { start: 173, end: 280 }, 'UNP': { start: 212, end: 237 }, 'CSX': { start: 80, end: 93 }, 'ATCO-A': { start: 15, end: 16 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'UPS': { start: 162, end: 170 }, 'FDX': { start: 280, end: 274 }, 'UNP': { start: 237, end: 248 }, 'CSX': { start: 93, end: 97 }, 'ATCO-A': { start: 16, end: 17 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'UPS': { start: 170, end: 165 }, 'FDX': { start: 274, end: 260 }, 'UNP': { start: 248, end: 244 }, 'CSX': { start: 97, end: 95 }, 'ATCO': { start: 17, end: 16 } }
    }
  },
  airlines: {
    label: 'Airlines & Travel',
    icon: <Activity className="text-sky-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'DAL', name: 'Delta Air Lines', color: '#0ea5e9' },
      { symbol: 'UAL', name: 'United Airlines', color: '#2563eb' },
      { symbol: 'LUV', name: 'Southwest Airlines', color: '#f97316' },
      { symbol: 'AAL', name: 'American Airlines', color: '#dc2626' },
      { symbol: 'MAR', name: 'Marriott', color: '#a855f7' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'DAL': { start: 49, end: 50 }, 'UAL': { start: 53, end: 72 }, 'LUV': { start: 36, end: 50 }, 'AAL': { start: 38, end: 48 }, 'MAR': { start: 72, end: 83 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'DAL': { start: 50, end: 56 }, 'UAL': { start: 72, end: 67 }, 'LUV': { start: 50, end: 65 }, 'AAL': { start: 48, end: 52 }, 'MAR': { start: 83, end: 136 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'DAL': { start: 56, end: 49 }, 'UAL': { start: 67, end: 78 }, 'LUV': { start: 65, end: 47 }, 'AAL': { start: 52, end: 32 }, 'MAR': { start: 136, end: 110 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'DAL': { start: 49, end: 58 }, 'UAL': { start: 78, end: 90 }, 'LUV': { start: 47, end: 54 }, 'AAL': { start: 32, end: 28 }, 'MAR': { start: 110, end: 151 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'DAL': { start: 58, end: 40 }, 'UAL': { start: 90, end: 39 }, 'LUV': { start: 54, end: 47 }, 'AAL': { start: 28, end: 16 }, 'MAR': { start: 151, end: 133 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'DAL': { start: 40, end: 39 }, 'UAL': { start: 39, end: 45 }, 'LUV': { start: 47, end: 44 }, 'AAL': { start: 16, end: 17 }, 'MAR': { start: 133, end: 169 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'DAL': { start: 39, end: 33 }, 'UAL': { start: 45, end: 38 }, 'LUV': { start: 44, end: 34 }, 'AAL': { start: 17, end: 12 }, 'MAR': { start: 169, end: 150 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'DAL': { start: 33, end: 39 }, 'UAL': { start: 38, end: 45 }, 'LUV': { start: 34, end: 29 }, 'AAL': { start: 12, end: 14 }, 'MAR': { start: 150, end: 195 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'DAL': { start: 39, end: 41 }, 'UAL': { start: 45, end: 48 }, 'LUV': { start: 29, end: 30 }, 'AAL': { start: 14, end: 15 }, 'MAR': { start: 195, end: 210 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'DAL': { start: 41, end: 40 }, 'UAL': { start: 48, end: 46 }, 'LUV': { start: 30, end: 31 }, 'AAL': { start: 15, end: 14 }, 'MAR': { start: 210, end: 205 } }
    }
  },
  reits: {
    label: 'Real Estate & REITs',
    icon: <Building className="text-fuchsia-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'AMT', name: 'American Tower', color: '#a855f7' },
      { symbol: 'PLD', name: 'Prologis', color: '#0ea5e9' },
      { symbol: 'SPG', name: 'Simon Property', color: '#f97316' },
      { symbol: 'INVH', name: 'Invitation Homes', color: '#22c55e' },
      { symbol: 'VICI', name: 'VICI Properties', color: '#facc15' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'AMT': { start: 100, end: 106 }, 'PLD': { start: 44, end: 52 }, 'SPG': { start: 180, end: 188 }, 'INVH': { start: 19, end: 21 }, 'VICI': { start: 17, end: 19 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'AMT': { start: 106, end: 144 }, 'PLD': { start: 52, end: 65 }, 'SPG': { start: 188, end: 171 }, 'INVH': { start: 21, end: 24 }, 'VICI': { start: 19, end: 20 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'AMT': { start: 144, end: 165 }, 'PLD': { start: 65, end: 62 }, 'SPG': { start: 171, end: 164 }, 'INVH': { start: 24, end: 21 }, 'VICI': { start: 20, end: 19 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'AMT': { start: 165, end: 237 }, 'PLD': { start: 62, end: 86 }, 'SPG': { start: 164, end: 147 }, 'INVH': { start: 21, end: 29 }, 'VICI': { start: 19, end: 24 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'AMT': { start: 237, end: 228 }, 'PLD': { start: 86, end: 99 }, 'SPG': { start: 147, end: 89 }, 'INVH': { start: 29, end: 30 }, 'VICI': { start: 24, end: 27 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'AMT': { start: 228, end: 270 }, 'PLD': { start: 99, end: 160 }, 'SPG': { start: 89, end: 155 }, 'INVH': { start: 30, end: 41 }, 'VICI': { start: 27, end: 31 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'AMT': { start: 270, end: 216 }, 'PLD': { start: 160, end: 112 }, 'SPG': { start: 155, end: 116 }, 'INVH': { start: 41, end: 33 }, 'VICI': { start: 31, end: 32 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'AMT': { start: 216, end: 217 }, 'PLD': { start: 112, end: 127 }, 'SPG': { start: 116, end: 147 }, 'INVH': { start: 33, end: 34 }, 'VICI': { start: 32, end: 32 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'AMT': { start: 217, end: 233 }, 'PLD': { start: 127, end: 132 }, 'SPG': { start: 147, end: 156 }, 'INVH': { start: 34, end: 35 }, 'VICI': { start: 32, end: 33 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'AMT': { start: 233, end: 225 }, 'PLD': { start: 132, end: 129 }, 'SPG': { start: 156, end: 152 }, 'INVH': { start: 35, end: 34 }, 'VICI': { start: 33, end: 33 } }
    }
  },
  miners: {
    label: 'Bitcoin Miners',
    icon: <HardHat className="text-amber-400" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'RIOT', name: 'Riot Platforms', color: '#0ea5e9' },
      { symbol: 'MARA', name: 'Marathon Digital', color: '#22c55e' },
      { symbol: 'CIFR', name: 'Cipher Mining', color: '#a855f7' },
      { symbol: 'HIVE', name: 'HIVE Digital', color: '#facc15' },
      { symbol: 'HUT', name: 'Hut 8 Mining', color: '#ef4444' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'RIOT': { start: 2.7, end: 3.8 }, 'MARA': { start: 2.6, end: 6.2 }, 'CIFR': { start: 7.4, end: 5.9 }, 'HIVE': { start: 1.2, end: 1.5 }, 'HUT': { start: 1.4, end: 2.0 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'RIOT': { start: 3.8, end: 23 }, 'MARA': { start: 6.2, end: 10.4 }, 'CIFR': { start: 5.9, end: 2.8 }, 'HIVE': { start: 1.5, end: 4.0 }, 'HUT': { start: 2.0, end: 5.2 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'RIOT': { start: 23, end: 2.7 }, 'MARA': { start: 10.4, end: 1.5 }, 'CIFR': { start: 2.8, end: 1.6 }, 'HIVE': { start: 4.0, end: 0.7 }, 'HUT': { start: 5.2, end: 0.9 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'RIOT': { start: 2.7, end: 1.7 }, 'MARA': { start: 1.5, end: 0.5 }, 'CIFR': { start: 1.6, end: 1.3 }, 'HIVE': { start: 0.7, end: 0.5 }, 'HUT': { start: 0.9, end: 1.2 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'RIOT': { start: 1.7, end: 16.5 }, 'MARA': { start: 0.5, end: 10.5 }, 'CIFR': { start: 1.3, end: 2.7 }, 'HIVE': { start: 0.5, end: 2.2 }, 'HUT': { start: 1.2, end: 4.5 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'RIOT': { start: 16.5, end: 23.0 }, 'MARA': { start: 10.5, end: 33.5 }, 'CIFR': { start: 2.7, end: 7.1 }, 'HIVE': { start: 2.2, end: 3.9 }, 'HUT': { start: 4.5, end: 8.4 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'RIOT': { start: 23.0, end: 3.3 }, 'MARA': { start: 33.5, end: 3.8 }, 'CIFR': { start: 7.1, end: 0.9 }, 'HIVE': { start: 3.9, end: 1.6 }, 'HUT': { start: 8.4, end: 1.9 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'RIOT': { start: 3.3, end: 15.8 }, 'MARA': { start: 3.8, end: 21.5 }, 'CIFR': { start: 0.9, end: 3.3 }, 'HIVE': { start: 1.6, end: 4.9 }, 'HUT': { start: 1.9, end: 9.2 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'RIOT': { start: 15.8, end: 16.9 }, 'MARA': { start: 21.5, end: 20.2 }, 'CIFR': { start: 3.3, end: 4.2 }, 'HIVE': { start: 4.9, end: 5.1 }, 'HUT': { start: 9.2, end: 10.5 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'RIOT': { start: 16.9, end: 14.7 }, 'MARA': { start: 20.2, end: 18.4 }, 'CIFR': { start: 4.2, end: 3.8 }, 'HIVE': { start: 5.1, end: 4.6 }, 'HUT': { start: 10.5, end: 9.8 } }
    }
  },
  treasuries: {
    label: 'Bitcoin Treasuries',
    icon: <Database className="text-amber-500" />,
    assets: [
      { symbol: 'BTC-USD', name: 'Bitcoin', color: '#f7931a' },
      { symbol: 'MSTR', name: 'MicroStrategy', color: '#ef4444' },
      { symbol: 'TSLA', name: 'Tesla', color: '#22c55e' },
      { symbol: 'SQ', name: 'Block', color: '#0ea5e9' },
      { symbol: 'MUFG', name: 'Metaplanet (Proxy)', color: '#a855f7' },
      { symbol: 'COIN', name: 'Coinbase', color: '#f97316' }
    ],
    staticHistory: {
      2016: { 'BTC-USD': { start: 434, end: 963 }, 'MSTR': { start: 16.7, end: 19.1 }, 'TSLA': { start: 43, end: 45 }, 'SQ': { start: 9, end: 14 }, 'MUFG': { start: 6, end: 7 }, 'COIN': { start: 45, end: 50 } },
      2017: { 'BTC-USD': { start: 963, end: 13860 }, 'MSTR': { start: 19.1, end: 13.1 }, 'TSLA': { start: 45, end: 62 }, 'SQ': { start: 14, end: 34 }, 'MUFG': { start: 7, end: 9 }, 'COIN': { start: 50, end: 64 } },
      2018: { 'BTC-USD': { start: 13860, end: 3740 }, 'MSTR': { start: 13.1, end: 13.5 }, 'TSLA': { start: 62, end: 66 }, 'SQ': { start: 34, end: 57 }, 'MUFG': { start: 9, end: 8 }, 'COIN': { start: 64, end: 50 } },
      2019: { 'BTC-USD': { start: 3740, end: 7200 }, 'MSTR': { start: 13.5, end: 15.5 }, 'TSLA': { start: 66, end: 83 }, 'SQ': { start: 57, end: 62 }, 'MUFG': { start: 8, end: 7 }, 'COIN': { start: 50, end: 72 } },
      2020: { 'BTC-USD': { start: 7200, end: 28990 }, 'MSTR': { start: 15.5, end: 42.5 }, 'TSLA': { start: 83, end: 705 }, 'SQ': { start: 62, end: 222 }, 'MUFG': { start: 7, end: 10 }, 'COIN': { start: 72, end: 180 } },
      2021: { 'BTC-USD': { start: 28990, end: 46200 }, 'MSTR': { start: 42.5, end: 57.3 }, 'TSLA': { start: 705, end: 352 }, 'SQ': { start: 222, end: 161 }, 'MUFG': { start: 10, end: 12 }, 'COIN': { start: 180, end: 252 } },
      2022: { 'BTC-USD': { start: 46200, end: 16530 }, 'MSTR': { start: 57.3, end: 20.6 }, 'TSLA': { start: 352, end: 123 }, 'SQ': { start: 161, end: 58 }, 'MUFG': { start: 12, end: 9 }, 'COIN': { start: 252, end: 35 } },
      2023: { 'BTC-USD': { start: 16530, end: 42260 }, 'MSTR': { start: 20.6, end: 69 }, 'TSLA': { start: 123, end: 248 }, 'SQ': { start: 58, end: 78 }, 'MUFG': { start: 9, end: 11 }, 'COIN': { start: 35, end: 140 } },
      2024: { 'BTC-USD': { start: 42260, end: 98000 }, 'MSTR': { start: 69, end: 135 }, 'TSLA': { start: 248, end: 235 }, 'SQ': { start: 78, end: 82 }, 'MUFG': { start: 11, end: 13 }, 'COIN': { start: 140, end: 170 } },
      2025: { 'BTC-USD': { start: 98000, end: 87556 }, 'MSTR': { start: 300.01, end: 172.19 }, 'TSLA': { start: 235, end: 218 }, 'SQ': { start: 82, end: 80 }, 'MUFG': { start: 13, end: 12 }, 'COIN': { start: 170, end: 160 } }
    }
  }
};

// --- 2. HELPERS ---

const calculateFairPrice = (days) => days <= 0 ? 0 : MODEL_COEFF * Math.pow(days, MODEL_EXPONENT);
const formatPrice = (val) => !val ? '-' : val > 1000 ? `$${val.toLocaleString(undefined, {maximumFractionDigits: 0})}` : `$${val.toFixed(2)}`;
const formatCurrency = (val) => val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`;

const fetchWithRetry = async (url, maxRetries = 3, initialDelay = 1000) => {
    let delay = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; 
        }
    }
};

const downsampleSeries = (data, step = 1) => {
  if (step <= 1) return data;
  return data.filter((_, idx) => idx % step === 0 || idx === data.length - 1);
};


// --- 3. BASE COMPONENTS (Defined first to avoid ReferenceError) ---

const Button = ({ children, variant = "primary", className = "", onClick }) => {
  const baseStyle = "inline-flex items-center justify-center px-6 py-3 border text-base font-medium rounded-sm transition-all duration-200 shadow-sm";
  const variants = {
    primary: "border-transparent text-slate-900 bg-amber-500 hover:bg-amber-400 focus:ring-2 focus:ring-offset-2 focus:ring-amber-500",
    secondary: "border-slate-600 text-slate-200 bg-transparent hover:bg-slate-800 hover:border-slate-500 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500",
    outline: "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Section = ({ children, className = "", id = "" }) => (
  <div id={id} className={`py-20 px-4 sm:px-6 lg:px-8 ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle, light = false }) => (
  <div className="mb-12">
    <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-slate-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <div className={`mt-4 w-24 h-1 ${light ? 'bg-amber-500' : 'bg-slate-900'}`}></div>
    )}
  </div>
);

const ImageWithFallback = ({ src, fallback, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className}
      onError={() => setImgSrc(fallback)} 
    />
  );
};

// --- 4. LAYOUT COMPONENTS ---

const Navbar = ({ currentView, setView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navLinks = [
    { label: 'Home', view: 'home' },
    { label: 'Data & Models', view: 'data' },
    { label: 'About This Project', view: 'executives' },
    { label: 'FAQ', view: 'home', section: 'faq' },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
            <Factory className="h-8 w-8 text-amber-500 mr-3" />
            <span className="text-white text-xl font-bold tracking-tight">The Sound Treasury <span className="text-slate-400 font-light">Institute</span></span>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setView(link.view);
                    if(link.section) setTimeout(() => {
                         const el = document.getElementById(link.section);
                         if(el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className={`${currentView === link.view ? 'text-amber-500' : 'text-slate-300 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setView(link.view);
                  setIsOpen(false);
                }}
                className="text-slate-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 mt-auto w-full">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 pb-8 border-b border-slate-800 text-center">
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          This is a personal research project. It is not a business, advisory service, or commercial offering.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="col-span-1 md:col-span-2">
           <div className="flex items-center mb-4">
            <Factory className="h-6 w-6 text-amber-600 mr-2" />
            <span className="text-white text-lg font-bold">The Sound Treasury Institute</span>
          </div>
          <p className="text-sm text-slate-500 max-w-sm">
            Strategy, data, and frameworks for industrial businesses facing rising monetary and credit uncertainty.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>info@soundmoneytreasury.org</li>
            <li>Omaha, NE</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-900 pt-8 text-xs text-slate-600 space-y-4">
        <h5 className="text-slate-500 font-bold uppercase tracking-wider">Disclaimer</h5>
        <p>The information on this website is provided for educational and informational purposes only and does not constitute investment, legal, tax, or accounting advice.</p>
        <p>Nothing on this site is an offer to buy or sell any security, commodity, or other financial instrument.</p>
        <p className="mt-4">&copy; {new Date().getFullYear()} The Sound Treasury Institute. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

// --- 5. PAGE VIEWS ---

const HomeView = ({ setView }) => (
  <>
    <div className="relative bg-slate-900 overflow-hidden min-h-[600px] flex items-center">
      <div className="absolute inset-0">
        <ImageWithFallback 
          src={HERO_IMAGE_LOCAL} 
          fallback={HERO_FALLBACK}
          alt="Modern Industrial Chemical Facility" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
        <div className="lg:w-2/3">
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl mb-6 drop-shadow-lg">
            Industrial Capital, <br className="hidden md:block" />
            <span className="text-amber-500">Rewired</span> for a New Monetary Era
          </h1>
          <p className="mt-4 text-xl text-slate-200 max-w-3xl leading-relaxed drop-shadow-md">
            Strategy, data, and frameworks designed for industrial and chemical businesses navigating rising monetary and credit uncertainty.
          </p>
          <p className="text-lg text-amber-500 font-medium mt-4 drop-shadow">
            Independent research on long-horizon capital and treasury resilience.
          </p>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm border-t border-slate-700/50 pt-6">
            <div className="flex items-center space-x-3">
              <HardHat className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Built by operators, not influencers</span>
            </div>
            <div className="flex items-center space-x-3">
              <Factory className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Designed for capital-intensive businesses</span>
            </div>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-300 font-medium">Focused on balance-sheet resilience</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Section className="bg-white">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <SectionTitle title="Who We Are" />
          <div className="text-lg text-slate-600 mb-6 space-y-4">
            <p>We focus on one intersection: <strong className="text-slate-900">industrial and chemical businesses × corporate treasury × long-horizon capital resilience.</strong></p>
            <p>We speak the language of uptime, safety, and reliability; working capital, capex, and ROIC; boards, lenders, and regulators.</p>
          </div>
          <div className="bg-slate-50 p-6 border-l-4 border-amber-500">
            <p className="font-semibold text-slate-900">We are not an asset manager and we don’t sell trading products.</p>
            <p className="text-slate-600 mt-2">Our job is simpler and harder: Help serious operators design balance sheets that can survive—and take advantage of—a more unstable monetary and credit environment.</p>
          </div>
        </div>
        <div className="bg-slate-100 p-8 rounded-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">The Operator's Reality</h3>
          <ul className="space-y-4">
            {["Rising raw material volatility", "Unpredictable cost of capital", "Long-cycle CaPex vs Short-cycle Rates", "Pension and liability matching"].map((item, i) => (
              <li key={i} className="flex items-center text-slate-700">
                <div className="h-2 w-2 bg-amber-500 rounded-full mr-3"></div>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-50 border-t border-slate-200">
      <SectionTitle title="What We Do" />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200 hover:border-amber-400 transition-colors">
          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
            <FileText className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Executive Primers</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">Short, direct briefings for CEOs, CFOs, and boards on how the current monetary regime impacts industrial businesses.</p>
          <span className="text-amber-600 text-sm font-semibold">No jargon. No ideology.</span>
        </div>
        <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200 hover:border-amber-400 transition-colors">
          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
            <ShieldCheck className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Treasury Frameworks</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">Structured ways to stress-test balance sheets against inflation and credit stress, and frame new approaches within fiduciary constraints.</p>
          <span className="text-amber-600 text-sm font-semibold">Protect the engine.</span>
        </div>
        <div onClick={() => setView('data')} className="cursor-pointer bg-white p-8 rounded-sm shadow-sm border border-slate-200 hover:border-amber-400 transition-colors">
          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
            <BarChart3 className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Data & Dashboards</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">Long-horizon views, valuation regime models for hard assets, and sector benchmarks. Designed so you can see assumptions.</p>
          <span className="text-amber-600 text-sm font-semibold">Adapt to your environment.</span>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-900 text-white">
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <SectionTitle title="Why This Matters Now" light={true} />
          <div className="text-lg text-slate-300 mb-8 space-y-4 max-w-prose">
            <p>Industrial and chemical businesses are built on long cycles: multi-year capex programs, long-term supply agreements, and balance sheets that must survive credit cycles.</p>
            <p>These are not entities that can pivot quarterly.</p>
          </div>
          <div className="space-y-6">
            <div className="flex"><TrendingUp className="h-6 w-6 text-amber-500 mt-1 mr-4 shrink-0" /><div><h4 className="font-bold text-white">The Backdrop is Shifting</h4><p className="text-slate-400 text-sm mt-1">Aggressive policy moves, volatile real yields, and pressure on long-term obligations.</p></div></div>
            <div className="flex"><Anchor className="h-6 w-6 text-amber-500 mt-1 mr-4 shrink-0" /><div><h4 className="font-bold text-white">A New Stable Anchor</h4><p className="text-slate-400 text-sm mt-1">A resilient balance sheet gives you a more stable anchor for reserves and changes how you think about retained earnings.</p></div></div>
            <div className="flex"><Activity className="h-6 w-6 text-amber-500 mt-1 mr-4 shrink-0" /><div><h4 className="font-bold text-white">Intelligent Conversation</h4><p className="text-slate-400 text-sm mt-1">We exist to make the conversation with boards and owners intelligent, data-driven, and grounded in reality.</p></div></div>
          </div>
        </div>
        <div className="relative h-full min-h-[400px] bg-slate-800 rounded-sm border border-slate-700 p-1 flex flex-col justify-center overflow-hidden">
            <ImageWithFallback 
              src={MONOCHROME_IMAGE_LOCAL} 
              fallback={MONOCHROME_FALLBACK}
              alt="Industrial Resilience" 
              className="w-full h-full object-cover rounded-sm opacity-90 hover:opacity-100 transition-opacity duration-500"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded backdrop-blur-sm">
               <p className="text-white text-xs font-serif italic">"The goal isn’t to bet the company. The goal is to extend your planning horizon."</p>
            </div>
        </div>
      </div>
    </Section>

    <Section className="bg-white">
      <SectionTitle title="Who We Work With" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "CEOs & Founders", desc: "Of industrial and chemical companies." },
          { title: "CFOs & Treasury", desc: "Leaders responsible for liquidity and risk." },
          { title: "Board Members", desc: "Owners who think in decades, not quarters." },
          { title: "Investors", desc: "Seeking a hard-asset lens on capital-intensive business." },
        ].map((item, i) => (
            <div key={i} className="border-t-4 border-slate-200 pt-4">
                <h4 className="font-bold text-lg text-slate-900">{item.title}</h4>
                <p className="text-slate-600 mt-2 text-sm">{item.desc}</p>
            </div>
        ))}
      </div>
      <div className="mt-12 text-center p-8 bg-slate-50 rounded-lg max-w-3xl mx-auto">
          <p className="text-lg text-slate-800 font-medium">If you’re responsible for real assets, real people, and real P&Ls—and you’re re-thinking how your balance sheet is built—we built this for you.</p>
      </div>
    </Section>

    <Section className="bg-slate-100">
      <div className="max-w-4xl mx-auto">
        <SectionTitle title="How We Work" />
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">1</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Clarify Your Reality</h3>
                    <p className="text-slate-600 mt-2">Start with your actual balance sheet, cash flows, and constraints—no theoretical templates.</p>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">2</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Map the Options</h3>
                    <p className="text-slate-600 mt-2">Use data and frameworks to explore how different reserve and hard-asset strategies could behave under a range of scenarios.</p>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">3</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Equip the Decision-Makers</h3>
                    <p className="text-slate-600 mt-2">Help boards, lenders, and key executives see the trade-offs clearly so whatever you decide is informed, defensible, and aligned.</p>
                </div>
            </div>
        </div>
      </div>
    </Section>

    <Section id="faq" className="bg-white">
      <SectionTitle title="Frequently Asked Questions" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Do you recommend Bitcoin?</h4>
                <p className="text-slate-600 text-sm">No. We don’t recommend assets. This project is strictly research-focused and explores long-horizon capital resilience across inflation, credit stress, liquidity, and multi-decade industrial cycles.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Is this investment advice?</h4>
                <p className="text-slate-600 text-sm">No. All content on this site is for educational and informational purposes only. We do not provide individualized investment, legal, tax, or accounting advice.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Do you manage assets or run a fund?</h4>
                <p className="text-slate-600 text-sm">No. We do not manage assets, run a fund, or solicit capital. Our focus is on research, education, and strategic frameworks.</p>
            </div>
        </div>
        <div className="space-y-8">
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Why focus on industrial and chemical businesses?</h4>
                <p className="text-slate-600 text-sm">These businesses are capital-intensive, long-cycle, and highly sensitive to both monetary policy and commodity dynamics. They stand to benefit the most from stronger balance-sheet architecture.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Are you trying to convince every company to adopt this?</h4>
                <p className="text-slate-600 text-sm">No. Some balance sheets and ownership structures are not a good fit. Our goal is to help you see the trade-offs clearly so that if you say “yes” or “no,” it’s for the right reasons.</p>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Can we reuse your models and charts?</h4>
                <p className="text-slate-600 text-sm">In general, yes, with proper attribution. If you want to incorporate them into internal board materials, we encourage you to cite the source and keep the methodology visible.</p>
            </div>
        </div>
      </div>
    </Section>
  </>
);

const ExecutivesView = ({ setView }) => (
  <>
    <div className="bg-slate-900 py-24 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-amber-900/30 border border-amber-700 text-amber-500 text-xs font-bold tracking-wider uppercase mb-6">
            About This Project
        </span>
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl max-w-4xl mx-auto mb-6">
          A Hard-Money Lens for <br /><span className="text-slate-400">Industrial Balance Sheets</span>
        </h1>
        <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
          A direct, data-driven view of how Bitcoin behaves over long horizons—and how it can (and cannot) fit into the treasury and capital structure of industrial and chemical businesses.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={() => setView('data')}>View the Models & Dashboards</Button>
          <Button variant="secondary" onClick={() => document.getElementById('exec-overview').scrollIntoView({behavior:'smooth'})}>
            Read the Executive Overview
          </Button>
        </div>
        <p className="mt-8 text-sm text-slate-500">Built for leaders responsible for real assets, real people, and real P&Ls.</p>
      </div>
    </div>

    <Section id="exec-overview" className="bg-white">
      <SectionTitle title="What This Is (and Isn't)" />
      <div className="grid md:grid-cols-2 gap-0 border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 p-10 border-b md:border-b-0 md:border-r border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2 text-green-600" /> What This Is
          </h3>
          <ul className="space-y-4">
            {[
              "A practitioner’s framework for hard monetary assets.",
              "Long-horizon data and models.",
              "Connecting industrial reality with monetary reality.",
              "A resource to circulate internally to boards."
            ].map((item, i) => (
              <li key={i} className="flex items-start text-slate-700">
                <span className="text-green-600 font-bold mr-3">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-10">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <X className="w-6 h-6 mr-2 text-red-500" /> What This Is Not
          </h3>
          <ul className="space-y-4">
            {[
              "Not trading tips, memes, or predictions.",
              "Not a fund pitch or ask for capital.",
              "Not a recommendation to 'go all in'.",
              "Not a substitute for your legal/tax teams."
            ].map((item, i) => (
              <li key={i} className="flex items-start text-slate-700">
                <span className="text-red-500 font-bold mr-3">×</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Why CEOs, CFOs, and Boards Are Looking at Bitcoin</h2>
        <div className="prose prose-lg text-slate-600">
          <p className="mb-4">Senior leaders in industrial and chemical businesses are starting to ask:</p>
          <ul className="list-disc pl-6 mb-8 space-y-2 bg-white p-6 rounded-md shadow-sm border border-slate-200">
            <li>What happens to our cash, reserves, and pensions if monetary expansion continues at this pace?</li>
            <li>How do we protect long-term obligations in a world of volatile real yields?</li>
            <li>Is there a role for a hard, digitally native asset with a transparent issuance schedule alongside our fiat reserves?</li>
          </ul>
          <p className="mb-6">Bitcoin will not fix operations, culture, or strategy. But as a hard monetary asset, it can serve as a long-duration store of value, change the conversation around retained earnings, and provide a contrast to purely fiat-based reserves in board-level risk discussions.</p>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-900 text-white">
      <SectionTitle title="How It Can Fit" subtitle light={true} />
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-slate-800 p-8 rounded border-t-4 border-amber-500">
          <h3 className="text-xl font-bold mb-4">1. Strategic Reserves</h3>
          <p className="text-slate-400 text-sm mb-4">A modest, clearly-sized allocation alongside cash and short-duration instruments.</p>
          <ul className="text-sm text-slate-300 space-y-2"><li>• Preserves liquidity</li><li>• Anchor for long-term value</li><li>• Governed by strict thresholds</li></ul>
        </div>
        <div className="bg-slate-800 p-8 rounded border-t-4 border-amber-500">
          <h3 className="text-xl font-bold mb-4">2. Optionality Pool</h3>
          <p className="text-slate-400 text-sm mb-4">A separate “optionality bucket” funded from retained earnings.</p>
          <ul className="text-sm text-slate-300 space-y-2"><li>• Explicitly risk capital</li><li>• 5–10+ year horizons</li><li>• Build long-term resilience</li></ul>
        </div>
        <div className="bg-slate-800 p-8 rounded border-t-4 border-amber-500">
          <h3 className="text-xl font-bold mb-4">3. Board-Level Lens</h3>
          <p className="text-slate-400 text-sm mb-4">Even before purchasing, the analysis itself creates value.</p>
          <ul className="text-sm text-slate-300 space-y-2"><li>• Forces clarity on time horizons</li><li>• Highlights hidden fiat risks</li><li>• Sharpens treasury strategy</li></ul>
        </div>
      </div>
    </Section>

    <Section className="bg-white">
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <SectionTitle title="The Models Behind Our View" />
          <div className="space-y-8">
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Long-Horizon Fair-Value</h4>
              <p className="text-slate-600 mt-2">We use power-law models to estimate a long-term “fair value” trajectory. These models are evaluated in log space, where Bitcoin’s behavior is statistically meaningful.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Lower-Valuation Regimes</h4>
              <p className="text-slate-600 mt-2">We pay attention to periods when market price is in the lowest band relative to the model. Historically, these are the most favorable entry points for accumulators.</p>
            </div>
          </div>
          <div className="mt-8">
            <Button onClick={() => setView('data')}>Open the Hard-Money Dashboard</Button>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-6 flex flex-col items-center justify-center">
             <div className="w-full h-64 relative border-l border-b border-slate-300">
                <div className="absolute bottom-0 left-0 w-full h-full p-4">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                        <path d="M0,50 Q20,40 50,20 T100,5" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                        <path d="M0,50 L10,45 L15,48 L25,35 L30,40 L40,25 L50,15 L60,20 L70,10 L80,12 L90,5 L100,2" fill="none" stroke="#f59e0b" strokeWidth="2" />
                    </svg>
                </div>
             </div>
             <p className="text-xs text-slate-500 mt-4 text-center">Interactive charts allow you to stress-test assumptions and compare against industrial indices.</p>
        </div>
      </div>
    </Section>

    <Section className="bg-slate-100">
      <SectionTitle title="Questions for Your Next Board Meeting" />
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
        <ul className="space-y-6">
          {[
            "What portion of our balance sheet is truly long-term capital versus working capital?",
            "How are we currently protecting that long-term capital from monetary debasement?",
            "Have we explicitly considered a small, governed allocation to a hard monetary asset?",
            "If not, is that because we evaluated it and declined, or simply haven’t had the discussion?",
            "What governance and risk limits would we require before considering any allocation?"
          ].map((q, i) => (
            <li key={i} className="flex items-start">
               <span className="text-amber-500 font-bold mr-4 text-xl">?</span>
               <span className="text-slate-800 font-medium text-lg">{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  </>
);

const DataModelsView = () => {
  const hasCachedPowerLaw = Array.isArray(POWER_LAW_CACHE.data) && POWER_LAW_CACHE.data.length > 0;
  const cachedStats = POWER_LAW_CACHE.stats;
  const cacheIsFresh = hasCachedPowerLaw && (Date.now() - POWER_LAW_CACHE.fetchedAt) < CACHE_TTL_MS;
  const [activeTab, setActiveTab] = useState('powerLaw'); 
  const [activeSector, setActiveSector] = useState<keyof typeof SECTORS>('chemicals');
  const [plData, setPlData] = useState(POWER_LAW_CACHE.data || []);
  const [plLoading, setPlLoading] = useState(!hasCachedPowerLaw);
  const [plError, setPlError] = useState(null);
  const [plDataSource, setPlDataSource] = useState(cachedStats ? `${cachedStats.dataSource}${cacheIsFresh ? ' (cached)' : ''}` : 'Initializing...');
  const [compData, setCompData] = useState([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState(null);
  const [scoreboard, setScoreboard] = useState([]); 
  const [yScale, setYScale] = useState('log');
  const [xScale, setXScale] = useState('date');
  const [currentPrice, setCurrentPrice] = useState(cachedStats?.currentPrice || null);
  const [currentFairPrice, setCurrentFairPrice] = useState(cachedStats?.currentFairPrice || null);
  const [stdDev, setStdDev] = useState(cachedStats?.stdDev || 0);
  const [rSquared, setRSquared] = useState(cachedStats?.rSquared || 0);

  const formatXAxis = (val) => {
    if (xScale === 'date') return new Date(val).getFullYear().toString();
    const date = new Date(GENESIS_DATE + val * ONE_DAY_MS);
    return date.getFullYear().toString();
  };

  const formatTooltipDate = (label) => {
    const date = xScale === 'date' ? new Date(label) : new Date(GENESIS_DATE + label * ONE_DAY_MS);
    return date.toLocaleDateString();
  };

  // Data fetching helper (uses global fetchWithRetry)
  const fetchCoinCapData = async () => {
      const json = await fetchWithRetry('https://api.coincap.io/v2/assets/bitcoin/history?interval=d1');
      if (!json.data) throw new Error('Invalid CoinCap Data');
      return json.data.map(d => ({ date: d.time, price: parseFloat(d.priceUsd) }));
  };

  const fetchYahooData = async (symbol, interval = '1d', range = 'max') => {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&_=${new Date().getTime()}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Yahoo Proxy Error`);
    const wrapper = await response.json();
    if (!wrapper.contents) throw new Error(`Invalid Proxy Data`);
    const json = JSON.parse(wrapper.contents);
    if (!json.chart?.result?.[0]) throw new Error(`Invalid Yahoo Data`);
    const result = json.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0].close || [];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes;
    return timestamps.map((ts, index) => ({ date: ts * 1000, price: adjClose[index] }));
  };

  const fetchCoinGeckoData = async () => {
    const json = await fetchWithRetry('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily');
    return json.prices.map(([ts, price]) => ({ date: ts, price: price }));
  };

  const fetchFromSource = (label, runner) => runner().then(data => ({ source: label, data }));

  const fetchBestDataSource = () => Promise.any([
    fetchFromSource('CoinCap API', fetchCoinCapData),
    fetchFromSource('Yahoo Finance', () => fetchYahooData('BTC-USD')),
    fetchFromSource('CoinGecko', fetchCoinGeckoData)
  ]);

  const hydrateFromCache = (labelSuffix = ' (cached)') => {
    if (!POWER_LAW_CACHE.data) return false;
    setPlData(POWER_LAW_CACHE.data);
    if (POWER_LAW_CACHE.stats) {
      const stats = POWER_LAW_CACHE.stats;
      setStdDev(stats.stdDev);
      setRSquared(stats.rSquared);
      setCurrentPrice(stats.currentPrice);
      setCurrentFairPrice(stats.currentFairPrice);
      setPlDataSource(`${stats.dataSource}${labelSuffix}`);
    } else {
      setPlDataSource('Cached');
    }
    return true;
  };

  const loadPlDemoData = () => {
    const demoData = [];
    const now = Date.now();
    const targetDateMs = new Date(`${PROJECT_TO_YEAR}-12-31`).getTime();
    const daysTotal = (targetDateMs - GENESIS_DATE) / ONE_DAY_MS;
    const fakeStdDev = 0.6; 
    setStdDev(fakeStdDev);
    setRSquared(0.92);

    for (let i = 500; i < daysTotal; i += 30) {
      const timestamp = GENESIS_DATE + (i * ONE_DAY_MS);
      const fair = calculateFairPrice(i);
      let simulatedPrice = null;
      if (timestamp <= now) {
          const cycle = Math.sin(i / 600) * 1.5; 
          const noise = (Math.random() - 0.5) * 0.2;
          simulatedPrice = fair * Math.exp(cycle + noise);
      }
      demoData.push({
        date: timestamp,
        price: simulatedPrice,
        fairPrice: fair,
        daysSinceGenesis: i,
        upperBand: fair * Math.exp(3 * fakeStdDev),
        lowerBand: fair * Math.exp(-1 * fakeStdDev)
      });
    }
    setPlData(demoData);
    const lastReal = demoData.filter(d => d.price !== null).pop();
    if(lastReal) {
        setCurrentPrice(lastReal.price);
        setCurrentFairPrice(lastReal.fairPrice);
    }
  };

  const fetchPowerLawData = async () => {
    const isCacheFresh = POWER_LAW_CACHE.data && (Date.now() - POWER_LAW_CACHE.fetchedAt) < CACHE_TTL_MS;
    if (isCacheFresh) {
      hydrateFromCache(' (cached)');
      setPlError(null);
      setPlLoading(false);
      return;
    }

    setPlLoading(true);
    setPlError(null);
    if (POWER_LAW_CACHE.data && !isCacheFresh) {
      hydrateFromCache(' (stale)');
    }

    try {
      const { source: sourceName, data: rawPoints } = await fetchBestDataSource();

      let processedData = rawPoints.map(pt => {
        if (pt.price === null || pt.price === undefined) return null;
        const daysSinceGenesis = (pt.date - GENESIS_DATE) / ONE_DAY_MS;
        const fairPrice = daysSinceGenesis > 0 ? calculateFairPrice(daysSinceGenesis) : 0;
        return { date: pt.date, price: pt.price, fairPrice, daysSinceGenesis };
      }).filter(d => d !== null && d.price > 0 && d.fairPrice > 0 && d.daysSinceGenesis > 1);

      if (processedData.length === 0) throw new Error('No valid data');

      const logResiduals = processedData.map(d => Math.log(d.price) - Math.log(d.fairPrice));
      const meanResidual = logResiduals.reduce((sum, val) => sum + val, 0) / logResiduals.length;
      const squaredDiffs = logResiduals.map(val => Math.pow(val - meanResidual, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
      const newStdDev = Math.sqrt(variance);
      setStdDev(newStdDev);
      setPlDataSource(sourceName);

      const lastPoint = processedData[processedData.length - 1];
      setCurrentPrice(lastPoint.price);
      setCurrentFairPrice(lastPoint.fairPrice);

      const targetDateMs = new Date(`${PROJECT_TO_YEAR}-12-31`).getTime();
      const futureData = [];
      let nextDateMs = lastPoint.date + ONE_DAY_MS;

      while (nextDateMs <= targetDateMs) {
        const daysSinceGenesis = (nextDateMs - GENESIS_DATE) / ONE_DAY_MS;
        const fairPrice = calculateFairPrice(daysSinceGenesis);
        futureData.push({ date: nextDateMs, price: null, fairPrice, daysSinceGenesis });
        nextDateMs += ONE_DAY_MS;
      }

      const combinedFull = [...processedData, ...futureData].map(d => ({
        ...d,
        upperBand: d.fairPrice * Math.exp(3 * newStdDev), 
        lowerBand: d.fairPrice * Math.exp(-1 * newStdDev),
      }));

      const combined = downsampleSeries(combinedFull, POWER_LAW_DOWNSAMPLE_STEP);

      const logActuals = processedData.map(d => Math.log(d.price));
      const meanLogActual = logActuals.reduce((a, b) => a + b, 0) / logActuals.length;
      const ssTot = logActuals.reduce((acc, val) => acc + Math.pow(val - meanLogActual, 2), 0);
      const ssRes = processedData.reduce((acc, d) => acc + Math.pow(Math.log(d.price) - Math.log(d.fairPrice), 2), 0);
      const newRSquared = 1 - (ssRes / ssTot);
      setRSquared(newRSquared);

      POWER_LAW_CACHE.data = combined;
      POWER_LAW_CACHE.stats = {
        stdDev: newStdDev,
        rSquared: newRSquared,
        currentPrice: lastPoint.price,
        currentFairPrice: lastPoint.fairPrice,
        dataSource: sourceName,
      };
      POWER_LAW_CACHE.fetchedAt = Date.now();

      setPlData(combined);

    } catch (err) {
      console.error(err);
      const hasBackup = Array.isArray(POWER_LAW_CACHE.data) && POWER_LAW_CACHE.data.length > 0;
      if (hasBackup) {
        setPlError(`Live data unavailable. Showing last cached data.`);
        hydrateFromCache(' (cached)');
      } else {
        setPlError(`Live data unavailable. Using simulated data.`);
        setPlDataSource('Demo Data (Simulation)');
        loadPlDemoData();
      }
    } finally {
      setPlLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    const sectorConfig = SECTORS[activeSector];
    if (!sectorConfig) return;

    setCompLoading(true);
    setCompError(null);
    try {
      const historyData: Record<number, Record<string, any>> = sectorConfig.staticHistory 
        ? JSON.parse(JSON.stringify(sectorConfig.staticHistory)) 
        : {};

      const result = processComparisonData(historyData, sectorConfig.assets);
      setCompData(result.years);
      setScoreboard(result.scoreboard);
    } catch (err) {
      setCompError("Failed to load comparison data.");
    } finally {
      setCompLoading(false);
    }
  };

  const processComparisonData = (historyData: Record<number, Record<string, any>>, assets: typeof SECTORS['chemicals']['assets']) => {
      const years = [];
      const wins = {};
      assets.forEach(a => wins[a.symbol] = 0);
      
      for (let year = START_YEAR; year <= 2025; year++) {
          const yearReturns = [];
          const yearData = historyData[year];

          if (yearData) {
              assets.forEach(asset => {
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

      const calculateStats = (symbol) => {
          const getPrice = (year, type) => historyData[year] ? historyData[year][symbol]?.[type] : null;
          const currentEnd = getPrice(2025, 'end');
          const p2 = getPrice(2023, 'end');
          const cagr2 = (p2 && currentEnd) ? (Math.pow(currentEnd / p2, 1/2) - 1) * 100 : null;
          const p3 = getPrice(2022, 'end');
          const cagr3 = (p3 && currentEnd) ? (Math.pow(currentEnd / p3, 1/3) - 1) * 100 : null;
          const p5 = getPrice(2020, 'end');
          const cagr5 = (p5 && currentEnd) ? (Math.pow(currentEnd / p5, 1/5) - 1) * 100 : null;
          let startYear10 = 2016;
          let years10 = 10;
          let label10 = "10Y";
          if (symbol === 'DOW') { startYear10 = 2019; years10 = 2025 - 2019 + 1; label10 = "6Y"; }
          const p10 = getPrice(startYear10, 'start');
          const cagr10 = (p10 && currentEnd) ? (Math.pow(currentEnd / p10, 1/years10) - 1) * 100 : null;
          const totalReturn = (p10 && currentEnd) ? ((currentEnd - p10) / p10) * 100 : null;
          return { cagr2, cagr3, cagr5, cagr10, label10, totalReturn };
      };

      const sortedScoreboard = Object.entries(wins).map(([symbol, count]) => {
            const asset = assets.find(a => a.symbol === symbol);
            const stats = calculateStats(symbol);
            return { ...asset, count, ...stats };
      }).sort((a, b) => b.count - a.count);

      return { years, scoreboard: sortedScoreboard };
  };

  useEffect(() => { fetchPowerLawData(); }, []);
  useEffect(() => { if (activeTab === 'comparison') { fetchComparisonData(); } }, [activeTab, activeSector]);

  const downloadPlCSV = () => {
    if (!plData.length) return;
    const headers = ["Date", "Days", "Price", "Fair Value", "+2 SD", "-1 SD"];
    const rows = plData.map(row => [
      new Date(row.date).toISOString().split('T')[0],
      row.daysSinceGenesis.toFixed(2),
      row.price || "",
      row.fairPrice.toFixed(2),
      row.upperBand.toFixed(2),
      row.lowerBand.toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "btc_power_law.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-grow bg-slate-950 text-slate-200 w-full flex flex-col">
      <div className="w-full px-6 py-8 flex-grow">
        <div className="w-full max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-8 bg-slate-900/50 p-4 rounded-lg border border-slate-800 backdrop-blur-sm">
             <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><LayoutDashboard className="text-amber-500" />Hard Money Dashboard</h2>
                 <div className="h-6 w-px bg-slate-700 mx-2"></div>
                 <div className="flex bg-slate-900 border border-slate-700 rounded-md p-1">
                   <button onClick={() => setActiveTab('powerLaw')} className={`px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'powerLaw' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>Power Law Model</button>
                   <button onClick={() => setActiveTab('comparison')} className={`px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'comparison' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>Industrial Race</button>
                 </div>
                 {activeTab === 'comparison' && (
                  <div className="ml-2">
                    <label className="sr-only" htmlFor="sector-select">Select sector</label>
                    <select
                      id="sector-select"
                      value={activeSector}
                      onChange={(e) => {
                        const nextSector = e.target.value as keyof typeof SECTORS;
                        if (nextSector === activeSector) return;
                        setCompData([]);
                        setScoreboard([]);
                        setActiveSector(nextSector);
                      }}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {(Object.keys(SECTORS) as Array<keyof typeof SECTORS>)
                        .sort((a, b) => SECTORS[a].label.localeCompare(SECTORS[b].label))
                        .map((sectorKey) => (
                        <option key={sectorKey} value={sectorKey}>
                          {SECTORS[sectorKey].label}
                        </option>
                      ))}
                    </select>
                  </div>
                 )}
             </div>
             <button onClick={activeTab === 'powerLaw' ? fetchPowerLawData : fetchComparisonData} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" title="Refresh Data"><RefreshCcw size={18} /></button>
          </div>

          {activeTab === 'powerLaw' ? (
             <div className="space-y-6 animate-in fade-in duration-500 w-full">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-white border-l-4 border-amber-500 pl-4">Research Dashboard: Long-Horizon Reserve Models</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Actual Price</p><div className="text-2xl font-bold text-white">{currentPrice ? `$${currentPrice.toLocaleString()}` : '---'}</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Fair Value (Model)</p><div className="text-2xl font-bold text-blue-400">{currentFairPrice ? `$${Math.round(currentFairPrice).toLocaleString()}` : '---'}</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Deviation</p><div className={`text-2xl font-bold ${((currentPrice && currentFairPrice) ? ((currentPrice - currentFairPrice) / currentFairPrice) * 100 : 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{((currentPrice && currentFairPrice) ? ((currentPrice - currentFairPrice) / currentFairPrice) * 100 : 0) > 0 ? '+' : ''}{((currentPrice && currentFairPrice) ? ((currentPrice - currentFairPrice) / currentFairPrice) * 100 : 0).toFixed(1)}%</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Std Dev (σ)</p><div className="text-2xl font-bold text-purple-400">{stdDev.toFixed(3)}</div><div className="text-[10px] text-slate-500">Log-price residuals</div></div>
                  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm"><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">R-Squared (R²)</p><div className="text-2xl font-bold text-cyan-400">{rSquared.toFixed(4)}</div><div className="text-[10px] text-slate-500">Model Fit (Log-Log)</div></div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 px-2 w-full">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Database size={14} />Source: <span className={`${plDataSource.includes('Demo') ? 'text-yellow-500' : 'text-green-400'} font-medium`}>{plDataSource}</span></div>
                  <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span>Y-Axis</span><div className="flex bg-slate-900 border border-slate-800 rounded overflow-hidden"><button onClick={() => setYScale('log')} className={`px-2 py-1 ${yScale === 'log' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Log</button><button onClick={() => setYScale('linear')} className={`px-2 py-1 ${yScale === 'linear' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Lin</button></div></div></div>
                      <div className="flex flex-col items-end gap-1"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><span>X-Axis</span><div className="flex bg-slate-900 border border-slate-800 rounded overflow-hidden"><button onClick={() => setXScale('log-days')} className={`px-2 py-1 ${xScale === 'log-days' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Log</button><button onClick={() => setXScale('date')} className={`px-2 py-1 ${xScale === 'date' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>Time</button></div></div></div>
                  </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[60vh] min-h-[600px] shadow-2xl relative flex flex-col w-full">
                  <div className="flex justify-between items-center mb-2 px-2">
                      <h2 className="text-sm font-semibold text-slate-400">BTC Power Law Projection (2009 - {PROJECT_TO_YEAR})</h2>
                      <div className="flex gap-4 text-xs">
                          <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400/50"/> +3σ (Upper)</span>
                          <span className="flex items-center gap-1 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400"/> Model</span>
                          <span className="flex items-center gap-1 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400/50"/> -1σ (Lower)</span>
                      </div>
                  </div>
                  {plLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3"><Loader2 className="animate-spin" size={32} /><p>Fetching Power Law data...</p></div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={plData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                      <XAxis dataKey={xScale === 'date' ? 'date' : 'daysSinceGenesis'} tickFormatter={formatXAxis} stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={50} type="number" scale={xScale === 'date' ? 'time' : 'log'} domain={['dataMin', 'dataMax']} allowDataOverflow={true}/>
                      <YAxis scale={yScale} domain={['auto', 'auto']} tickFormatter={formatCurrency} stroke="#64748b" tick={{ fontSize: 11 }} width={60} allowDataOverflow={true}/>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }} labelFormatter={formatTooltipDate} formatter={(value, name) => { if (value === null) return ['-', name]; let label = name; if (name === 'upperBand') label = 'Upper Band (+3σ)'; if (name === 'lowerBand') label = 'Lower Band (-1σ)'; return [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, label]; }}/>
                      <Line type="monotone" dataKey="upperBand" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} name="upperBand" />
                      <Line type="monotone" dataKey="lowerBand" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} name="lowerBand" />
                      <Line type="monotone" dataKey="fairPrice" stroke="#60a5fa" strokeWidth={2} dot={false} name="Fair Value" isAnimationActive={false} />
                      <Line type="monotone" dataKey="price" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Actual Price" isAnimationActive={false} connectNulls={false} />
                      </ComposedChart>
                  </ResponsiveContainer>
                  )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-400 bg-slate-900/30 p-6 rounded-xl border border-slate-800 w-full">
                  <div><h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Settings size={14} /> Model Settings</h3><ul className="space-y-1 list-disc list-inside text-slate-500 text-xs"><li>Coeff: {MODEL_COEFF}</li><li>Exponent: {MODEL_EXPONENT}</li></ul></div>
                  <div className="flex items-end justify-end"><button onClick={downloadPlCSV} className="flex items-center gap-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-md transition-colors border border-slate-700"><Download size={14} /> Export CSV</button></div>
              </div>
             </div>
          ) : (
              <div className="space-y-8 animate-in fade-in duration-500 w-full">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-white border-l-4 border-amber-500 pl-4">Industry Cycle Comparison: {START_YEAR}–2025</h2></div>
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl text-center"><h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">{SECTORS[activeSector].icon}Bitcoin vs. {SECTORS[activeSector].label}</h2><p className="text-slate-400 text-sm max-w-2xl mx-auto">Year-over-Year (YoY) growth comparison starting from {START_YEAR}. Tracks Bitcoin against leading {SECTORS[activeSector].label.toLowerCase()} operators.</p></div>
              {compLoading && (<div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4"><Loader2 className="animate-spin" size={48} /><p>Crunching historical data for 6 assets...</p></div>)}
              {compError && (<div className="bg-yellow-900/20 border border-yellow-700/50 text-yellow-200 p-6 rounded-lg text-center"><AlertCircle className="mx-auto mb-2" size={32} />{compError}</div>)}
              {!compLoading && (
                  <>
                  <div className="grid grid-cols-1 gap-6 w-full">
                      {compData.map((yearData) => (
                      <div key={yearData.year} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                          <span className="font-bold text-white text-lg">{yearData.year}</span>
                          {yearData.winner && (<span className="text-xs font-medium px-2 py-1 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 flex items-center gap-1"><Trophy size={12} />Winner: {yearData.winner.name}</span>)}
                          </div>
                          <div className="p-4"><div className="flex flex-col gap-2">
                              {yearData.returns.map((item, idx) => (
                              <div key={item.symbol} className="relative flex items-center h-10">
                                  <div className="w-24 text-xs font-medium text-slate-400 shrink-0 truncate pr-2 flex flex-col justify-center"><span>{item.name}</span></div>
                                  <div className="w-28 text-[10px] text-slate-500 shrink-0 flex flex-col justify-center mr-2 border-l border-slate-800 pl-2 leading-tight">
                                      {item.startPrice !== null ? (<><div className="flex justify-between"><span className="text-slate-600 mr-1">Start:</span><span className="text-slate-300">{formatPrice(item.startPrice)}</span></div><div className="flex justify-between"><span className="text-slate-600 mr-1">End:</span><span className="text-slate-300">{formatPrice(item.endPrice)}</span></div></>) : <span className="text-slate-700">--</span>}
                                  </div>
                                  <div className="flex-1 h-6 bg-slate-800/50 rounded-r-sm relative overflow-hidden flex items-center">
                                  {item.value !== null ? (<><div className="h-full absolute left-0 top-0 opacity-80 transition-all duration-500" style={{ width: `${Math.min(Math.abs(item.value), 100)}%`, backgroundColor: item.value >= 0 ? item.color : '#ef4444' }}/><span className="relative z-10 ml-2 text-xs font-bold text-white drop-shadow-md">{item.value > 0 ? '+' : ''}{item.value.toFixed(1)}%</span></>) : (<span className="ml-2 text-xs text-slate-600 italic">N/A</span>)}
                                  </div>
                              </div>
                              ))}
                          </div></div>
                      </div>
                      ))}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8 w-full">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4"><Trophy className="text-yellow-500" />{SECTORS[activeSector].label} Scoreboard ({START_YEAR} - Present)</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                          {Array.isArray(scoreboard) && scoreboard.map((item, index) => (
                          <div key={item.symbol} className={`relative p-4 rounded-lg border flex flex-col items-center text-center ${index === 0 ? 'bg-yellow-900/10 border-yellow-500/50' : 'bg-slate-800/30 border-slate-700'}`}>
                              {index === 0 && <div className="absolute -top-3 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">CHAMPION</div>}
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mb-2 shadow-lg" style={{ backgroundColor: item.color }}>{item.symbol === 'BTC-USD' ? '₿' : item.symbol[0]}</div>
                              <div className="text-2xl font-bold text-white">{item.count}</div>
                              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Wins</div>
                              <div className="text-xs font-medium text-slate-300 mt-2 truncate w-full" title={item.name}>{item.name}</div>
                              <div className="mt-3 pt-3 border-t border-slate-700 w-full text-[10px] space-y-1">
                                  <div className="flex justify-between text-slate-400 items-center"><span>2Y CAGR:</span><span className={item.cagr2 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr2 !== null ? `${item.cagr2.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center"><span>3Y CAGR:</span><span className={item.cagr3 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr3 !== null ? `${item.cagr3.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center"><span>5Y CAGR:</span><span className={item.cagr5 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr5 !== null ? `${item.cagr5.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center"><span title={item.symbol === 'DOW' ? 'Since 2019' : '10 Year'}>{item.symbol === 'DOW' ? '6Y' : '10Y'} CAGR:</span><span className={item.cagr10 >= 0 ? 'text-green-400' : 'text-red-400'}>{item.cagr10 !== null ? `${item.cagr10.toFixed(1)}%` : 'N/A'}</span></div>
                                  <div className="flex justify-between text-slate-400 items-center border-t border-slate-800 pt-1 mt-1"><span>Total:</span><span className={item.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>{item.totalReturn !== null ? `${item.totalReturn.toFixed(0)}%` : 'N/A'}</span></div>
                              </div>
                          </div>
                          ))}
                      </div>
                  </div>
                  </>
              )}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 6. APP (Defined Last) ---

const App = () => {
  const [currentView, setView] = useState('home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  return (
    <>
    <style>{`
      :root { max-width: none !important; }
      body { display: block !important; min-width: 0 !important; place-items: unset !important; }
      #root { max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; width: 100% !important; }
    `}</style>
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-amber-200 flex flex-col">
      <Navbar currentView={currentView} setView={setView} />
      
      <main className="flex-grow flex flex-col w-full relative">
        {currentView === 'home' && <HomeView setView={setView} />}
        {currentView === 'executives' && <ExecutivesView setView={setView} />}
        {currentView === 'data' && <DataModelsView />}
      </main>
      
      <Footer />
    </div>
    </>
  );
};

export default App;

