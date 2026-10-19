import { toNum } from './utils';

export type BoxPlotStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
};

export const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const variance = (values: number[]): number => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1);
};

export const stddev = (values: number[]): number => Math.sqrt(variance(values));

export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(100, Math.max(0, p));
  const idx = (clamped / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
};

export const boxPlot = (values: number[]): BoxPlotStats => {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted.length ? sorted[0] : 0;
  const max = sorted.length ? sorted[sorted.length - 1] : 0;
  const q1 = percentile(sorted, 25);
  const median = percentile(sorted, 50);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  return { min, q1, median, q3, max, iqr, lowerFence, upperFence };
};

export const zScore = (x: unknown, m: unknown, s: unknown): number => {
  const xx = toNum(x);
  const mm = toNum(m);
  const ss = toNum(s);
  if (!ss) return 0;
  return (xx - mm) / ss;
};

export const tScore = (z: unknown): number => 50 + 10 * toNum(z);
