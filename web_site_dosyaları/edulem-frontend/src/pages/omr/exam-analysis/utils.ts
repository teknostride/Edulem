export const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const format2 = (v: unknown): string => toNum(v).toFixed(2);

export const normalizePercent100 = (v: unknown): number => {
  const raw = toNum(v);
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.min(100, Math.max(0, pct));
};

export const normalizeRatio01 = (v: unknown): number => {
  const raw = toNum(v);
  const r = raw > 1 ? raw / 100 : raw;
  return Math.min(1, Math.max(0, r));
};

export const sortBy = <T,>(
  rows: T[],
  getValue: (r: T) => number | string,
  dir: 'asc' | 'desc'
): T[] => {
  const next = [...rows];
  next.sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);

    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'tr', { numeric: true });

    return dir === 'asc' ? cmp : -cmp;
  });
  return next;
};

export const clampUniqueIds = (ids: number[]): number[] => {
  const set = new Set<number>();
  for (const id of ids) {
    if (Number.isFinite(id) && id > 0) set.add(id);
  }
  return [...set];
};

// ============================================================================
// T-SCORE CALCULATION FUNCTIONS
// ============================================================================

export type TScoreConfig = {
  weight: number;
  mean: number;
  stdDev: number;
  maxQuestions: number;
};

export type CourseScore = {
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

export type TScoreResult = {
  zScore: number;
  tScore: number;
  asp: number;
  net: number;
};

/**
 * Calculate Net Score
 * LGS: Net = correct - (wrong / 3)
 * YKS: Net = correct - (wrong / 4)
 */
export function calculateNet(correct: number, wrong: number, examType: 'lgs' | 'yks' = 'lgs'): number {
  const penalty = examType === 'yks' ? 4 : 3;
  const net = correct - (wrong / penalty);
  return net;
}

/**
 * Calculate Z-Score: Z = (Net - Mean) / StdDev
 */
export function calculateZScore(net: number, mean: number, stdDev: number): number {
  const effectiveStdDev = stdDev > 0 ? stdDev : 1.0;
  return (net - mean) / effectiveStdDev;
}

/**
 * Calculate T-Score: T = 50 + (10 * Z)
 */
export function calculateTScore(zScore: number): number {
  return 50 + (10 * zScore);
}

/**
 * Calculate Weighted Standard Score (ASP): ASP = T * weight
 */
export function calculateASP(tScore: number, weight: number): number {
  return tScore * weight;
}

/**
 * Calculate Min TASP (all nets = 0)
 */
export function calculateMinTASP(configs: Record<number, TScoreConfig>): number {
  let minTASP = 0;
  for (const cfg of Object.values(configs)) {
    const z = calculateZScore(0, cfg.mean, cfg.stdDev);
    const t = calculateTScore(z);
    const asp = calculateASP(t, cfg.weight);
    minTASP += asp;
  }
  return minTASP;
}

/**
 * Calculate Max TASP (all nets = maxQuestions)
 */
export function calculateMaxTASP(configs: Record<number, TScoreConfig>): number {
  let maxTASP = 0;
  for (const cfg of Object.values(configs)) {
    const z = calculateZScore(cfg.maxQuestions, cfg.mean, cfg.stdDev);
    const t = calculateTScore(z);
    const asp = calculateASP(t, cfg.weight);
    maxTASP += asp;
  }
  return maxTASP;
}

/**
 * Scale to 100-500 range
 * Final = 100 + ((TASP - MinTASP) / (MaxTASP - MinTASP)) * 400
 */
export function scaleTo500(tasp: number, minTASP: number, maxTASP: number): number {
  const range = maxTASP - minTASP;
  if (range <= 0) return 300;
  const score = 100 + ((tasp - minTASP) / range) * 400;
  return Math.max(100, Math.min(500, score));
}

/**
 * Calculate OBP for YKS
 */
export function calculateOBP(diplomaGrade: number, isBrokenOBP: boolean): number {
  const obp = diplomaGrade * 5;
  const multiplier = isBrokenOBP ? 0.06 : 0.12;
  const addedPoints = obp * multiplier;
  const finalScore = obp + addedPoints;
  return Math.min(560, finalScore);
}

/**
 * Calculate statistics from array of values
 */
export function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 3 };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean: Number(mean.toFixed(4)),
    stdDev: stdDev > 0.1 ? Number(stdDev.toFixed(4)) : 3
  };
}

/**
 * Get course weight based on course name
 * Türkçe, Matematik, Fen Bilimleri: 4
 * İnkılap, Din, İngilizce: 1
 */
export function getCourseWeight(courseName: string): number {
  const name = courseName.toLowerCase().trim();
  
  // Weight 4 courses
  if (name.includes('türkçe') || name.includes('matematik') || name.includes('fen')) {
    return 4;
  }
  
  // Weight 1 courses (default)
  return 1;
}

export function getCourseOrderIndex(courseName: string): number {
  const raw = String(courseName ?? '').toLowerCase().trim();
  const name = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replaceAll('â', 'a')
    .replaceAll('î', 'i')
    .replaceAll('û', 'u');

  if (name.includes('turkce')) return 1;
  // tolerate common misspellings like "inkl*ap" (e.g. "inkl ap", "inklap")
  if (name.includes('inkilap') || name.includes('inklap')) return 2;
  if (name.includes('din kulturu') || name.includes('din kultur') || name.includes('din')) return 3;
  if (name.includes('ingilizce') || name.includes('yabanci dil')) return 4;
  if (name.includes('matematik')) return 5;
  if (name.includes('fen')) return 6;

  return 999;
}

export function compareCoursesByNameOrder(aName: string, bName: string): number {
  const ai = getCourseOrderIndex(aName);
  const bi = getCourseOrderIndex(bName);
  if (ai !== bi) return ai - bi;
  return String(aName ?? '').localeCompare(String(bName ?? ''), 'tr', { numeric: true });
}

export function getCourseSoftBg(courseName: string): string | undefined {
  const raw = String(courseName ?? '').toLowerCase().trim();
  const name = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replaceAll('â', 'a')
    .replaceAll('î', 'i')
    .replaceAll('û', 'u');

  if (name.includes('turkce')) return 'rgba(59, 130, 246, 0.10)';
  if (name.includes('inkilap') || name.includes('inklap')) return 'rgba(249, 115, 22, 0.10)';
  if (name.includes('din kulturu') || name.includes('din kultur') || name.includes('din')) return 'rgba(168, 85, 247, 0.10)';
  if (name.includes('ingilizce') || name.includes('yabanci dil')) return 'rgba(16, 185, 129, 0.10)';
  if (name.includes('matematik')) return 'rgba(234, 179, 8, 0.12)';
  if (name.includes('fen')) return 'rgba(6, 182, 212, 0.10)';

  return undefined;
}
