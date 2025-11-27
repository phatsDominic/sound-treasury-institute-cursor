// A simplified static dataset to load instantly while live data fetches
// This prevents the "forever loading" state on first visit
// We generate a determinstic curve that looks like BTC history for the initial render
import { GENESIS_DATE, ONE_DAY_MS, MODEL_COEFF, MODEL_EXPONENT } from './powerLaw';

export const generateStaticBtcHistory = () => {
  const points = [];
  const now = Date.now();
  // Start from 2010-07-17 (First major price data)
  const startDate = new Date('2010-07-17').getTime(); 
  let price = 0.09;
  
  for (let t = startDate; t <= now; t += ONE_DAY_MS) {
    // A simple deterministic random walk with drift to mimic BTC price roughly
    // This is JUST for the initial <1s render so the screen isn't empty
    // It will be replaced by real data or cache almost immediately
    
    // We use a sine wave + exponential trend to approximate the shape
    const days = (t - GENESIS_DATE) / ONE_DAY_MS;
    const trend = Math.pow(days, MODEL_EXPONENT) * MODEL_COEFF; // The power law itself
    
    // Add some "market cycle" waves
    const cycle = Math.sin(days / 600) * 1.5; 
    
    // Add volatility
    const noise = Math.cos(days / 50) * 0.3;
    
    price = trend * Math.exp(cycle + noise);
    
    points.push({ date: t, price });
  }
  return points;
};

