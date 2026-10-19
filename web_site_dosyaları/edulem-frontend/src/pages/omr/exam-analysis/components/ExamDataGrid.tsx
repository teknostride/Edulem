import React, { useMemo, useState } from 'react';
import type { ResultRow } from '../types';
import { toNum, calculateZScore, calculateTScore, calculateASP, calculateStats, scaleTo500, getCourseWeight, getCourseSoftBg } from '../utils';

const getTotals = (r: ResultRow) => {
  const scores = Object.values(r.course_scores ?? {});
  const correct = scores.reduce((a, s) => a + toNum(s?.correct), 0);
  const wrong = scores.reduce((a, s) => a + toNum(s?.wrong), 0);
  const net = scores.reduce((a, s) => a + toNum(s?.net), 0);
  return { correct, wrong, net };
};

// Calculate T-Score based final score for a student
const calculateTScoreFinal = (
  row: ResultRow,
  courseHeaders: { course_id: number; course_name: string }[],
  allResults: ResultRow[]
): number => {
  // Build dynamic config with auto-calculated mean/std from all students
  const configs: Record<number, { weight: number; mean: number; stdDev: number; maxQuestions: number }> = {};

  courseHeaders.forEach((c) => {
    // Get all nets for this course
    const nets: number[] = [];
    allResults.forEach((r) => {
      const score = r.course_scores?.[c.course_id];
      if (score) {
        nets.push(toNum(score.net));
      }
    });

    const stats = calculateStats(nets);
    // Use course-specific weight based on course name
    configs[c.course_id] = {
      weight: getCourseWeight(c.course_name),
      mean: stats.mean,
      stdDev: stats.stdDev,
      maxQuestions: Math.max(...nets, 0) || 20,
    };
  });

  // Calculate min/max TASP boundaries
  let minTASP = 0;
  let maxTASP = 0;
  Object.values(configs).forEach((cfg) => {
    const zMin = calculateZScore(0, cfg.mean, cfg.stdDev);
    const tMin = calculateTScore(zMin);
    minTASP += calculateASP(tMin, cfg.weight);

    const zMax = calculateZScore(cfg.maxQuestions, cfg.mean, cfg.stdDev);
    const tMax = calculateTScore(zMax);
    maxTASP += calculateASP(tMax, cfg.weight);
  });

  // Calculate student's TASP
  let studentTASP = 0;
  courseHeaders.forEach((c) => {
    const score = row.course_scores?.[c.course_id];
    if (score && configs[c.course_id]) {
      const net = toNum(score.net);
      const cfg = configs[c.course_id];
      const z = calculateZScore(net, cfg.mean, cfg.stdDev);
      const t = calculateTScore(z);
      studentTASP += calculateASP(t, cfg.weight);
    }
  });

  // Scale to 100-500
  return scaleTo500(studentTASP, minTASP, maxTASP);
};

export default function ExamDataGrid({
  results,
  loading,
  courseHeaders,
  compactDefault,
  tScoreResults,
}: {
  results: ResultRow[];
  loading: boolean;
  courseHeaders: { course_id: number; course_name: string }[];
  compactDefault?: boolean;
  tScoreResults?: (ResultRow & { tScore: number; tasp: number; tScoreRank: number })[];
}) {
  const [compact, setCompact] = useState(Boolean(compactDefault));

  const rows = useMemo(() => {
    // Use pre-calculated T-Score results if available
    const sourceResults = tScoreResults?.length ? tScoreResults : results;
    
    return sourceResults
      .slice()
      .map((r, idx) => {
        const t = getTotals(r);
        // Use pre-calculated T-Score or calculate if not available
        const finalScore = 'tScore' in r && typeof r.tScore === 'number' ? r.tScore : calculateTScoreFinal(r, courseHeaders, results);
        const rank = 'tScoreRank' in r && typeof r.tScoreRank === 'number' ? r.tScoreRank : idx + 1;
        return {
          raw: r,
          name: r.student?.name ?? r.student_no ?? '—',
          correct: t.correct,
          wrong: t.wrong,
          net: t.net,
          point: finalScore, // Use T-Score calculated final score
          rank: rank,
        };
      })
      .sort((a, b) => b.point - a.point); // Sort by T-Score
  }, [results, courseHeaders, tScoreResults]);

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-light d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Öğrenci Listesi</h6>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
              id="compactSwitch"
            />
            <label className="form-check-label small" htmlFor="compactSwitch">Kompakt</label>
          </div>
          <div className="small text-muted">{results.length} kayıt</div>
        </div>
      </div>
      <div className="card-body p-0">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary"></div>
          </div>
        ) : (
          <div className="table-responsive">
            <table
              className="table table-sm table-hover align-middle mb-0"
              style={{ tableLayout: compact ? 'fixed' : 'auto', fontSize: 11 }}
            >
              <thead>
                <tr>
                  <th rowSpan={2} className="text-center" style={{ width: 52 }}>Sıra</th>
                  <th rowSpan={2} style={{ minWidth: 180 }}>Öğrenci</th>
                  {courseHeaders.map((c) => {
                    const bg = getCourseSoftBg(c.course_name);
                    const style = bg
                      ? { minWidth: compact ? 60 : 120, background: bg }
                      : { minWidth: compact ? 60 : 120 };
                    return (
                      <th
                        key={c.course_id}
                        colSpan={compact ? 1 : 3}
                        className="text-center"
                        style={style}
                      >
                        <span className="text-truncate d-inline-block" style={{ maxWidth: compact ? 60 : 120 }}>
                          {c.course_name}
                        </span>
                      </th>
                    );
                  })}
                  <th colSpan={compact ? 1 : 3} className="text-center" style={{ minWidth: compact ? 60 : 120 }}>Toplam</th>
                  <th rowSpan={2} className="text-center" style={{ width: 82 }}>Puan</th>
                </tr>
                <tr>
                  {courseHeaders.map((c) => {
                    const bg = getCourseSoftBg(c.course_name);
                    const thStyle = bg ? { background: bg } : undefined;
                    return compact ? (
                      <th key={`${c.course_id}-n`} className="text-center" style={thStyle}>Net</th>
                    ) : (
                      <React.Fragment key={`${c.course_id}-frag`}>
                        <th className="text-center" style={{ width: 40, ...(thStyle ?? {}) }}>D</th>
                        <th className="text-center" style={{ width: 40, ...(thStyle ?? {}) }}>Y</th>
                        <th className="text-center" style={{ width: 54, ...(thStyle ?? {}) }}>Net</th>
                      </React.Fragment>
                    );
                  })}
                  {compact ? (
                    <th className="text-center">Net</th>
                  ) : (
                    <React.Fragment key="total-frag">
                      <th className="text-center" style={{ width: 40 }}>D</th>
                      <th className="text-center" style={{ width: 40 }}>Y</th>
                      <th className="text-center" style={{ width: 54 }}>Net</th>
                    </React.Fragment>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.raw.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f6f7f9' }}>
                    <td className="text-center fw-bold">{r.rank || '—'}</td>
                    <td>
                      <div className="fw-semibold text-truncate" style={{ maxWidth: compact ? 180 : 260 }}>
                        {r.name}
                      </div>
                      <div className="text-muted text-truncate" style={{ maxWidth: compact ? 180 : 260 }}>
                        {r.raw.student?.classroom?.name ?? '—'} · {r.raw.student?.school_no ?? r.raw.student_no ?? '—'}
                      </div>
                    </td>
                    {courseHeaders.map((c) => {
                      const bg = getCourseSoftBg(c.course_name);
                      const cellStyle = bg ? { background: bg } : undefined;
                      const s = (r.raw.course_scores ?? {})[c.course_id];
                      const correct = toNum(s?.correct);
                      const wrong = toNum(s?.wrong);
                      const net = toNum(s?.net);
                      return compact ? (
                        <td key={`${r.raw.id}-${c.course_id}-n`} className="text-center fw-semibold" style={cellStyle}>
                          {net.toFixed(2)}
                        </td>
                      ) : (
                        <React.Fragment key={`${r.raw.id}-${c.course_id}-frag`}>
                          <td className="text-center" style={cellStyle}>{correct}</td>
                          <td className="text-center" style={cellStyle}>{wrong}</td>
                          <td className="text-center fw-semibold" style={cellStyle}>{net.toFixed(2)}</td>
                        </React.Fragment>
                      );
                    })}
                    {compact ? (
                      <td key={`${r.raw.id}-total`} className="text-center fw-bold">{r.net.toFixed(2)}</td>
                    ) : (
                      <React.Fragment key={`${r.raw.id}-total-frag`}>
                        <td className="text-center">{r.correct}</td>
                        <td className="text-center">{r.wrong}</td>
                        <td className="text-center fw-bold">{r.net.toFixed(2)}</td>
                      </React.Fragment>
                    )}
                    <td className="text-center">{r.point.toFixed(2)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={2 + courseHeaders.length * (compact ? 1 : 3) + (compact ? 2 : 4)} className="text-muted small py-4 text-center">
                      Sonuç bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
