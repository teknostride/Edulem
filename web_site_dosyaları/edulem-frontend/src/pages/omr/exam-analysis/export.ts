import type { ResultRow } from './types';
import { format2, toNum } from './utils';
import * as XLSX from 'xlsx';

export type CourseHeaderItem = { course_id: number; course_name: string };

type PrintMetaItem = { label: string; value: string };
type PrintStatItem = { label: string; value: string | number };

export type ResultsPrintOptions = {
  logoUrl?: string | null;
  headerTitle?: string;
  headerSubtitleLeft?: string;
  headerSubtitleRight?: string;
  meta?: PrintMetaItem[];
  statsTitle?: string;
  stats?: PrintStatItem[];
  courses?: CourseHeaderItem[];
};

export type ResultsCsvOptions = {
  title?: string;
  meta?: PrintMetaItem[];
  statsTitle?: string;
  stats?: PrintStatItem[];
  courses?: CourseHeaderItem[];
};

const resolveCourses = (results: ResultRow[], explicitCourses?: CourseHeaderItem[]): CourseHeaderItem[] => {
  const filtered = (explicitCourses ?? []).filter((c) => c && c.course_id > 0);
  if (filtered.length > 0) return filtered;

  const courseMap = new Map<number, string>();
  results.forEach((r) => {
    if (r.course_scores) {
      Object.entries(r.course_scores).forEach(([cid, sc]: [string, any]) => {
        const numId = Number(sc?.course_id ?? cid);
        if (numId > 0 && !courseMap.has(numId)) {
          courseMap.set(numId, String(sc?.course_name ?? `Ders ${numId}`));
        }
      });
    }
  });
  return Array.from(courseMap.entries()).map(([course_id, course_name]) => ({ course_id, course_name }));
};

export const exportResultsXlsx = (filename: string, results: ResultRow[], options?: ResultsCsvOptions) => {
  const title = String(options?.title ?? '').trim();
  const meta = (options?.meta ?? []).filter((x) => x && x.label && x.value);
  const statsTitle = String(options?.statsTitle ?? '').trim();
  const stats = (options?.stats ?? []).filter((x) => x && x.label);

  const courses = resolveCourses(results, options?.courses);

  const header: string[] = ['Sıra', 'Öğrenci', 'Sınıf', 'Okul No'];
  courses.forEach((c) => {
    header.push(`${c.course_name} (D)`);
    header.push(`${c.course_name} (Y)`);
    header.push(`${c.course_name} (Net)`);
  });
  header.push('Top. Doğru', 'Top. Yanlış', 'Top. Net', 'Puan');

  const rows = results
    .slice()
    .sort((a, b) => toNum(a.rank) - toNum(b.rank))
    .map((r) => {
      const scores = Object.values(r.course_scores ?? {});
      const totalCorrect = scores.reduce((acc, s) => acc + toNum(s?.correct), 0);
      const totalWrong = scores.reduce((acc, s) => acc + toNum(s?.wrong), 0);

      const row: (string | number)[] = [
        toNum(r.rank) || '',
        r.student?.name ?? '',
        r.student?.classroom?.name ?? '',
        r.student?.school_no ?? r.student_no ?? '',
      ];

      courses.forEach((c) => {
        const sc = (r.course_scores as any)?.[c.course_id] ?? (r.course_scores as any)?.[String(c.course_id)];
        row.push(toNum(sc?.correct));
        row.push(toNum(sc?.wrong));
        row.push(Number(format2(toNum(sc?.net))));
      });

      row.push(totalCorrect);
      row.push(totalWrong);
      row.push(Number(format2(toNum(r.total_net))));
      row.push(Number(format2(toNum(r.total_point))));

      return row;
    });

  const aoa: (string | number)[][] = [];
  if (title) aoa.push([title]);
  meta.forEach((m) => aoa.push([`${m.label}: ${m.value}`]));
  if (stats.length > 0) {
    const st = statsTitle ? `${statsTitle}: ` : '';
    aoa.push([st + stats.map((s) => `${s.label}=${s.value}`).join(' | ')]);
  }
  if (aoa.length > 0) aoa.push([]);

  aoa.push(header);
  rows.forEach((r) => aoa.push(r));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  const cols = [
    { wch: 6 },
    { wch: 26 },
    { wch: 10 },
    { wch: 10 },
  ];
  courses.forEach(() => {
    cols.push({ wch: 12 }, { wch: 12 }, { wch: 12 });
  });
  cols.push({ wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 10 });
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sıralama');
  XLSX.writeFile(wb, filename);
};

export const exportResultsCsv = (filename: string, results: ResultRow[], options?: ResultsCsvOptions) => {
  const courses = resolveCourses(results, options?.courses);
  const header: string[] = ['Sıra', 'Öğrenci', 'Sınıf', 'Okul No'];
  courses.forEach((c) => {
    header.push(`${c.course_name} (D)`);
    header.push(`${c.course_name} (Y)`);
    header.push(`${c.course_name} (Net)`);
  });
  header.push('Top. Doğru', 'Top. Yanlış', 'Top. Net', 'Puan');

  const delimiter = '\t';

  const rows = results
    .slice()
    .sort((a, b) => toNum(a.rank) - toNum(b.rank))
    .map((r) => {
      const scores = Object.values(r.course_scores ?? {});
      const totalCorrect = scores.reduce((a, s) => a + toNum(s?.correct), 0);
      const totalWrong = scores.reduce((a, s) => a + toNum(s?.wrong), 0);
      const net = toNum(r.total_net);
      const point = toNum(r.total_point);

      const row: string[] = [
        String(toNum(r.rank) || ''),
        r.student?.name ?? '',
        r.student?.classroom?.name ?? '',
        r.student?.school_no ?? r.student_no ?? '',
      ];

      courses.forEach((c) => {
        const sc = (r.course_scores as any)?.[c.course_id] ?? (r.course_scores as any)?.[String(c.course_id)];
        row.push(String(toNum(sc?.correct)));
        row.push(String(toNum(sc?.wrong)));
        row.push(format2(toNum(sc?.net)));
      });

      row.push(String(totalCorrect));
      row.push(String(totalWrong));
      row.push(format2(net));
      row.push(format2(point));

      return row;
    });

  const escapeCell = (v: unknown) => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(delimiter) || s.includes('\n') || s.includes('\r')) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const title = String(options?.title ?? '').trim();
  const meta = (options?.meta ?? []).filter((x) => x && x.label && x.value);
  const statsTitle = String(options?.statsTitle ?? '').trim();
  const stats = (options?.stats ?? []).filter((x) => x && x.label);

  const infoLines: string[] = [];
  if (title) infoLines.push(title);
  meta.forEach((m) => infoLines.push(`${m.label}: ${m.value}`));
  if (stats.length > 0) {
    const st = statsTitle ? `${statsTitle}: ` : '';
    infoLines.push(st + stats.map((s) => `${s.label}=${s.value}`).join(' | '));
  }

  const dataLines = [header, ...rows].map((r) => r.map(escapeCell).join(delimiter));
  const lines = [
    ...infoLines,
    infoLines.length > 0 ? '' : '',
    ...dataLines,
  ].filter((x) => x !== null && x !== undefined);

  const tsv = lines.join('\r\n');

  const encodeUtf16Le = (s: string) => {
    const buf = new ArrayBuffer(s.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < s.length; i++) {
      view.setUint16(i * 2, s.charCodeAt(i), true);
    }
    return new Uint8Array(buf);
  };

  const bom = new Uint8Array([0xFF, 0xFE]);
  const payload = encodeUtf16Le(tsv);
  const blob = new Blob([bom, payload], { type: 'text/tab-separated-values;charset=utf-16le;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const openResultsPrintView = (title: string, results: ResultRow[], options?: ResultsPrintOptions) => {
  const w = window.open('', '_blank');
  if (!w) return;

  const headerTitle = options?.headerTitle ?? title;
  const meta = (options?.meta ?? []).filter((x) => x && x.label);
  const stats = (options?.stats ?? []).filter((x) => x && x.label);
  const statsTitle = options?.statsTitle ?? 'KATILIM';

  const courses = resolveCourses(results, options?.courses);

  const rowsHtml = results
    .slice()
    .sort((a, b) => toNum(a.rank) - toNum(b.rank))
    .map((r) => {
      const scores = Object.values(r.course_scores ?? {});
      const totalCorrect = scores.reduce((a, s) => a + toNum(s?.correct), 0);
      const totalWrong = scores.reduce((a, s) => a + toNum(s?.wrong), 0);
      const net = toNum(r.total_net);
      const point = toNum(r.total_point);

      const courseTds = courses.map((c) => {
        const sc = (r.course_scores as any)?.[c.course_id] ?? (r.course_scores as any)?.[String(c.course_id)];
        const d = toNum(sc?.correct);
        const y = toNum(sc?.wrong);
        const n = toNum(sc?.net);
        return `
          <td style="text-align:center;">${d}</td>
          <td style="text-align:center; color:#dc2626;">${y}</td>
          <td style="text-align:center; font-weight:600; color:#2563eb;">${format2(n)}</td>
        `;
      }).join('');

      return `
        <tr>
          <td style="text-align:center; font-weight:600;">${toNum(r.rank) || ''}</td>
          <td style="white-space:nowrap; font-weight:500;">${r.student?.name ?? ''}</td>
          <td style="text-align:center;">${r.student?.classroom?.name ?? ''}</td>
          <td style="text-align:center;">${r.student?.school_no ?? r.student_no ?? ''}</td>
          ${courseTds}
          <td style="text-align:center; font-weight:700; background:#f8fafc;">${totalCorrect}</td>
          <td style="text-align:center; font-weight:700; color:#dc2626; background:#f8fafc;">${totalWrong}</td>
          <td style="text-align:center; font-weight:700; color:#2563eb; background:#f8fafc;">${format2(net)}</td>
          <td style="text-align:center; font-weight:700; color:#059669; background:#f0fdf4;">${format2(point)}</td>
        </tr>
      `;
    })
    .join('');

  const theadHtml = courses.length > 0
    ? `
      <thead>
        <tr>
          <th rowspan="2" style="width:36px; text-align:center;">Sıra</th>
          <th rowspan="2" style="min-width:130px;">Öğrenci</th>
          <th rowspan="2" style="width:55px; text-align:center;">Sınıf</th>
          <th rowspan="2" style="width:60px; text-align:center;">Okul No</th>
          ${courses.map((c) => `
            <th colspan="3" style="text-align:center; background:#e2e8f0; font-size:10px; border-bottom:1px solid #94a3b8;">${c.course_name}</th>
          `).join('')}
          <th colspan="3" style="text-align:center; background:#cbd5e1; font-size:10px; border-bottom:1px solid #94a3b8;">TOPLAM</th>
          <th rowspan="2" style="width:55px; text-align:center; background:#dcfce7;">Puan</th>
        </tr>
        <tr>
          ${courses.map(() => `
            <th style="width:22px; text-align:center; font-size:9px;">D</th>
            <th style="width:22px; text-align:center; font-size:9px;">Y</th>
            <th style="width:28px; text-align:center; font-size:9px;">Net</th>
          `).join('')}
          <th style="width:24px; text-align:center; font-size:9px; background:#f1f5f9;">D</th>
          <th style="width:24px; text-align:center; font-size:9px; background:#f1f5f9;">Y</th>
          <th style="width:30px; text-align:center; font-size:9px; background:#f1f5f9;">Net</th>
        </tr>
      </thead>
    `
    : `
      <thead>
        <tr>
          <th style="width:50px;">Sıra</th>
          <th>Öğrenci</th>
          <th style="width:80px;">Sınıf</th>
          <th style="width:70px;">Okul No</th>
          <th style="width:55px;">Doğru</th>
          <th style="width:55px;">Yanlış</th>
          <th style="width:55px;">Net</th>
          <th style="width:55px;">Puan</th>
        </tr>
      </thead>
    `;

  const metaHtml = meta.length === 0
    ? ''
    : `
      <div class="meta">
        ${meta.map((m) => `<div class="meta-row"><span class="meta-label">${m.label}:</span> <span class="meta-value">${m.value}</span></div>`).join('')}
      </div>
    `;

  const statsHtml = stats.length === 0
    ? ''
    : `
      <div class="stats">
        <div class="stats-title">${statsTitle}</div>
        <div class="stats-grid">
          ${stats.map((s) => `
            <div class="stat">
              <div class="stat-label">${s.label}:</div>
              <div class="stat-value">${s.value}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

  const logoHtml = options?.logoUrl
    ? `<img class="logo" src="${options.logoUrl}" alt="logo" />`
    : '';

  const subtitleHtml = (options?.headerSubtitleLeft || options?.headerSubtitleRight)
    ? `
      <div class="subtitles">
        <div class="subtitle-left">${options?.headerSubtitleLeft ?? ''}</div>
        <div class="subtitle-right">${options?.headerSubtitleRight ?? ''}</div>
      </div>
    `
    : '';

  const generatedAt = new Date();
  const generatedAtText = generatedAt.toLocaleString('tr-TR');

  w.document.open();
  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: landscape;
            margin: 8mm 6mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 10px;
            color: #111827;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 10px;
          }
          .header {
            display: grid;
            grid-template-columns: 140px 1fr 200px;
            gap: 10px;
            align-items: center;
            margin-bottom: 8px;
          }
          .logo { max-width: 140px; max-height: 55px; object-fit: contain; }
          .title { text-align: center; }
          .title h1 { font-size: 15px; margin: 0; font-weight: 700; color: #0f172a; }
          .subtitles { display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-top: 3px; }
          .meta { font-size: 10px; color: #334155; margin: 4px 0 8px 0; display: flex; flex-wrap: wrap; gap: 16px; }
          .meta-row { display: flex; gap: 4px; }
          .meta-label { font-weight: 600; }
          .stats { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; background: #f8fafc; }
          .stats-title { font-size: 10px; font-weight: 700; text-align: center; margin-bottom: 4px; letter-spacing: .4px; color: #334155; }
          .stats-grid { display: flex; justify-content: space-around; gap: 8px; }
          .stat { display: flex; gap: 4px; font-size: 10px; }
          .stat-label { color: #64748b; font-weight: 600; }
          .stat-value { color: #0f172a; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th, td { border: 1px solid #cbd5e1; padding: 3px 4px; }
          th { font-weight: 700; color: #0f172a; vertical-align: middle; }
          tbody tr:nth-child(even) td { background: #f8fafc; }
          tbody tr:nth-child(odd) td { background: #ffffff; }
          .footer { margin-top: 8px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 0; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-wrap">${logoHtml}</div>
          <div class="title">
            <h1>${headerTitle}</h1>
            ${subtitleHtml}
          </div>
          <div class="stats-wrap">${statsHtml}</div>
        </div>
        ${metaHtml}
        <table>
          ${theadHtml}
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <div>Oluşturulma: ${generatedAtText}</div>
          <div>EduLem Ölçme ve Değerlendirme Sistemi</div>
        </div>
        <script>
          const waitForImages = () => {
            const imgs = Array.from(document.images || []);
            if (imgs.length === 0) return Promise.resolve();
            return Promise.all(imgs.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = () => resolve(null);
                img.onerror = () => resolve(null);
              });
            }));
          };
          window.onload = async () => {
            try { await waitForImages(); } catch { }
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  w.document.close();
};
