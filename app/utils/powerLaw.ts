export const GENESIS_DATE = new Date('2009-01-03').getTime();
export const ONE_DAY_MS = 1000 * 60 * 60 * 24;
export const PROJECT_TO_YEAR = 2035;
export const MODEL_COEFF = 7.34596586961056e-18;
export const MODEL_EXPONENT = 5.82;

export const calculateFairPrice = (days: number) =>
  days <= 0 ? 0 : MODEL_COEFF * Math.pow(days, MODEL_EXPONENT);

export const downsampleData = <T>(data: T[], targetPoints = 800) => {
  if (!data || data.length <= targetPoints) return data;
  const step = Math.ceil(data.length / targetPoints);
  return data.filter((_, idx) => idx % step === 0 || idx === data.length - 1);
};



