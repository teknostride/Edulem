<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>Konu Analizli Sınav Sonuç Belgesi</title>
<style>
@page {
  size: A4 portrait;
  margin: 6mm 7mm 6mm 7mm;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: "DejaVu Sans", sans-serif;
}
body {
  font-family: "DejaVu Sans", sans-serif;
  color: #0f172a;
  background: #ffffff;
  font-size: 7pt;
  line-height: 1.2;
}

.page {
  width: 100%;
  position: relative;
}
.page-break {
  page-break-after: always;
}

table {
  width: 100%;
  border-collapse: collapse;
}

.tc { text-align: center; }
.tl { text-align: left; }
.tr { text-align: right; }
.fw-bold { font-weight: bold; }

/* ─── GENEL TABLO ÇERÇEVELERİ ─── */
.bordered-table {
  width: 100%;
  border-collapse: collapse;
  border: 0.6pt solid #71717a;
}
.bordered-table th,
.bordered-table td {
  border: 0.5pt solid #71717a;
  vertical-align: middle;
}

/* ─── 1. BAŞLIK ─── */
.doc-title {
  text-align: center;
  font-weight: bold;
  font-size: 11pt;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  color: #0f172a;
  text-transform: uppercase;
}

/* ─── 2. ÖĞRENCİ VE SINAV BİLGİ TABLOSU ─── */
.info-table {
  margin-bottom: 4px;
}
.info-table td {
  padding: 2.5px 4px;
  font-size: 6.8pt;
}
.info-label {
  background: #f1f5f9;
  color: #334155;
  font-weight: bold;
}
.info-val {
  background: #ffffff;
  color: #0f172a;
}

/* ─── 3. DERSLER & CEVAP ANAHTARI BİRLEŞİK TABLOSU ─── */
.main-exam-table {
  margin-bottom: 0px;
}
.main-exam-table th {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: bold;
  font-size: 6.8pt;
  padding: 2px 2px;
  text-align: center;
}
.main-exam-table td {
  padding: 1.5px 2px;
  font-size: 6.8pt;
}
.main-exam-table .course-name {
  font-weight: 600;
  text-align: left;
  padding-left: 4px;
}
.main-exam-table .total-row td {
  font-weight: bold;
  background: #f8fafc;
}

/* Monospace soru numaraları ve cevap karakterleri */
.mono-header {
  font-family: "DejaVu Sans Mono", monospace !important;
  font-size: 5.6pt !important;
  letter-spacing: 0.5px;
  text-align: center;
  white-space: nowrap;
  color: #334155;
}
.mono-answers {
  font-family: "DejaVu Sans Mono", monospace !important;
  font-size: 5.8pt !important;
  letter-spacing: 0.5px;
  text-align: center;
  white-space: nowrap;
}
.ans-label {
  font-size: 6pt;
  color: #334155;
  white-space: nowrap;
  padding-left: 2px;
}

/* ─── 4. PUAN VE DERECE ALANI (SOL ALTA YERLEŞİK) ─── */
.score-wrapper {
  width: 100%;
  margin-top: 3px;
  margin-bottom: 4px;
}
.score-box-cell {
  width: 53.5%;
  vertical-align: top;
}
.score-inner-table {
  width: 100%;
  border-collapse: collapse;
}
.score-badge {
  width: 36%;
  border: 0.6pt solid #71717a;
  text-align: center;
  vertical-align: middle;
  background: #f8fafc;
  padding: 3px;
}
.score-badge-type {
  font-size: 7.5pt;
  font-weight: bold;
  color: #475569;
  margin-bottom: 1px;
}
.score-badge-val {
  font-size: 13pt;
  font-weight: bold;
  color: #0f172a;
}
.rank-grid-td {
  width: 64%;
  padding-left: 4px;
  vertical-align: top;
}
.rank-grid-table {
  width: 100%;
  border-collapse: collapse;
  border: 0.6pt solid #71717a;
}
.rank-grid-table td {
  border: 0.5pt solid #71717a;
  padding: 1.5px 3px;
  font-size: 6.5pt;
}
.rank-grid-table .header-row td {
  background: #f1f5f9;
  font-weight: bold;
  text-align: center;
}
.rank-grid-table .lbl {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
}

/* ─── 5. KONU / KAZANIM ANALİZİ (ÇİFT SÜTUN) ─── */
.topics-container {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2px;
}
.topic-col-td {
  vertical-align: top;
}
.topic-table {
  width: 100%;
  border-collapse: collapse;
  border: 0.6pt solid #71717a;
  table-layout: fixed;
}
.topic-table th {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: bold;
  font-size: 6.5pt;
  padding: 1.5px 2px;
  border: 0.5pt solid #71717a;
}
.topic-table td {
  border: 0.5pt solid #71717a;
  padding: 1.2px 2px;
  font-size: 6.2pt;
  line-height: 1.15;
  vertical-align: middle;
}
.topic-table .topic-title {
  text-align: left;
  padding-left: 2px;
  overflow: hidden;
  word-wrap: break-word;
}
.topic-table .summary-row td {
  font-weight: bold;
  background: #f8fafc;
}
</style>
</head>
<body>

@foreach($cards as $index => $card)
<div class="page {{ $index < count($cards) - 1 ? 'page-break' : '' }}">

  <!-- 1. BAŞLIK -->
  <div class="doc-title">
    KONU ANALİZLİ SINAV SONUÇ BELGESİ
  </div>

  <!-- 2. ÖĞRENCİ VE SINAV BİLGİ TABLOSU -->
  <table class="bordered-table info-table">
    <tr>
      <td class="info-label" style="width: 11%;">Öğrenci Adı</td>
      <td class="info-val fw-bold" style="width: 25%;">{{ $card['student_name'] }}</td>
      <td class="info-label" style="width: 8%;">Numara</td>
      <td class="info-val tc" style="width: 9%;">{{ $card['student_no'] ?? '—' }}</td>
      <td class="info-label" style="width: 7%;">Şube</td>
      <td class="info-val tc" style="width: 8%;">{{ $card['classroom'] ?? '—' }}</td>
      <td class="info-label" style="width: 7%;">Okul</td>
      <td class="info-val" style="width: 25%;">{{ $card['school_name'] ?? $tenantName ?? 'Okul' }}</td>
    </tr>
    <tr>
      <td class="info-label">Sınav Adı</td>
      <td class="info-val fw-bold">{{ $card['session_name'] }}</td>
      <td class="info-label">Alan</td>
      <td class="info-val tc">{{ $card['field'] ?? '' }}</td>
      <td class="info-label">Sınav Tarihi</td>
      <td class="info-val tc">{{ $card['exam_date'] ?? '' }}</td>
      <td class="info-label">Kitapçık</td>
      <td class="info-val tc fw-bold">{{ $card['booklet'] ?? 'A' }}</td>
    </tr>
  </table>

  <!-- 3. DERSLER & CEVAP ANAHTARI BİRLEŞİK TABLO -->
  <table class="bordered-table main-exam-table">
    <thead>
      <tr>
        <th rowspan="3" style="width: 17%;">DERSLER</th>
        <th rowspan="3" style="width: 6%;">Soru<br>Sayısı</th>
        <th rowspan="3" style="width: 5.5%;">Doğru</th>
        <th rowspan="3" style="width: 5.5%;">Yanlış</th>
        <th rowspan="3" style="width: 6.5%;">Net</th>
        <th rowspan="3" style="width: 6.5%;">Başarı<br>%</th>
        <th colspan="5" style="width: 53%;" class="tc">Soru Numarası</th>
      </tr>
      <tr>
        <th rowspan="2" style="width: 9%;" class="tc"></th>
        <th style="width: 11%;" class="tc">1-10</th>
        <th style="width: 11%;" class="tc">11-20</th>
        <th style="width: 11%;" class="tc">21-30</th>
        <th style="width: 11%;" class="tc">31-40</th>
      </tr>
      <tr>
        <th class="mono-header">1 2 3 4 5 6 7 8 9 0</th>
        <th class="mono-header">1 2 3 4 5 6 7 8 9 0</th>
        <th class="mono-header">1 2 3 4 5 6 7 8 9 0</th>
        <th class="mono-header">1 2 3 4 5 6 7 8 9 0</th>
      </tr>
    </thead>
    <tbody>
      @foreach($card['course_rows'] as $cr)
      <tr>
        <td rowspan="2" class="course-name">{{ $cr['course_name'] }}</td>
        <td rowspan="2" class="tc">{{ $cr['question_count'] }}</td>
        <td rowspan="2" class="tc">{{ $cr['correct'] ?? 0 }}</td>
        <td rowspan="2" class="tc">{{ $cr['wrong'] ?? 0 }}</td>
        <td rowspan="2" class="tc">{{ $cr['net_formatted'] ?? '0,00' }}</td>
        <td rowspan="2" class="tc">{{ $cr['success_rate_formatted'] ?? '0,00' }}</td>
        <td class="ans-label">Cevap Anahtarı</td>
        <td class="mono-answers">{{ $cr['key_blocks'][0] ?? '' }}</td>
        <td class="mono-answers">{{ $cr['key_blocks'][1] ?? '' }}</td>
        <td class="mono-answers">{{ $cr['key_blocks'][2] ?? '' }}</td>
        <td class="mono-answers">{{ $cr['key_blocks'][3] ?? '' }}</td>
      </tr>
      <tr>
        <td class="ans-label">Öğrenci Cevabı</td>
        <td class="mono-answers">{{ $cr['student_blocks'][0] ?? '' }}</td>
        <td class="mono-answers">{{ $cr['student_blocks'][1] ?? '' }}</td>
        <td class="mono-answers">{{ $cr['student_blocks'][2] ?? '' }}</td>
        <td class="mono-answers">{{ $cr['student_blocks'][3] ?? '' }}</td>
      </tr>
      @endforeach

      <!-- Toplam Satırı -->
      <tr class="total-row">
        <td class="course-name fw-bold">Toplam</td>
        <td class="tc fw-bold">{{ $card['total_questions'] }}</td>
        <td class="tc fw-bold">{{ $card['total_correct'] }}</td>
        <td class="tc fw-bold">{{ $card['total_wrong'] }}</td>
        <td class="tc fw-bold">{{ $card['total_net_formatted'] }}</td>
        <td class="tc fw-bold">{{ $card['total_success_rate_formatted'] }}</td>
        <td colspan="5" style="background: #ffffff; border-right: none; border-bottom: none;"></td>
      </tr>
    </tbody>
  </table>

  <!-- 4. PUAN VE DERECE ALANI (SOL ALTA YERLEŞİK) -->
  <table class="score-wrapper">
    <tr>
      <td class="score-box-cell">
        <table class="score-inner-table">
          <tr>
            <td class="score-badge">
              <div class="score-badge-type">{{ $card['exam_type'] ?? 'LGS' }}</div>
              <div class="score-badge-val">{{ $card['total_point_formatted'] }}</div>
            </td>
            <td class="rank-grid-td">
              <table class="rank-grid-table">
                <tr class="header-row">
                  <td style="border: none; background: #ffffff; width: 38%;"></td>
                  <td style="width: 31%;">Şube</td>
                  <td style="width: 31%;">Okul</td>
                </tr>
                <tr>
                  <td class="lbl">Katılımcı Sayısı</td>
                  <td class="tc">{{ $card['class_total'] ?? '—' }}</td>
                  <td class="tc">{{ $card['school_total'] ?? '—' }}</td>
                </tr>
                <tr>
                  <td class="lbl">Ortalama</td>
                  <td class="tc">{{ $card['class_avg_formatted'] }}</td>
                  <td class="tc">{{ $card['school_avg_formatted'] }}</td>
                </tr>
                <tr>
                  <td class="lbl fw-bold">Derece</td>
                  <td class="tc fw-bold">{{ $card['class_rank'] ?? '—' }}</td>
                  <td class="tc fw-bold">{{ $card['school_rank'] ?? '—' }}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
      <td style="width: 46.5%;"></td>
    </tr>
  </table>

  <!-- 5. KONU / KAZANIM ANALİZİ (ÇİFT SÜTUNLU YAPI) -->
  <table class="topics-container">
    <tr>
      <!-- SOL SÜTUN -->
      <td class="topic-col-td" style="width: 49.5%; padding-right: 3px;">
        <table class="topic-table">
          <thead>
            <tr>
              <th style="width: 68%;" class="tl">Konu Adı</th>
              <th style="width: 8%;" class="tc">Sayı</th>
              <th style="width: 8%;" class="tc">Doğ</th>
              <th style="width: 8%;" class="tc">Yan</th>
              <th style="width: 8%;" class="tc">%</th>
            </tr>
          </thead>
          <tbody>
            @if(!empty($card['topic_summary']['count']))
            <tr class="summary-row">
              <td class="topic-title fw-bold">{{ $card['session_name'] }}</td>
              <td class="tc fw-bold">{{ $card['topic_summary']['count'] }}</td>
              <td class="tc fw-bold">{{ $card['topic_summary']['correct'] }}</td>
              <td class="tc fw-bold">{{ $card['topic_summary']['wrong'] }}</td>
              <td class="tc fw-bold">{{ $card['topic_summary']['percent'] }}</td>
            </tr>
            @endif

            @forelse($card['topics_left'] as $t)
            <tr>
              <td class="topic-title"> - {{ $t['name'] }}</td>
              <td class="tc">{{ $t['count'] }}</td>
              <td class="tc">{{ $t['correct'] }}</td>
              <td class="tc">{{ $t['wrong'] }}</td>
              <td class="tc">{{ $t['percent'] }}</td>
            </tr>
            @empty
            @if(empty($card['topic_summary']['count']))
            <tr>
              <td colspan="5" class="tc" style="padding: 10px; color: #64748b;">Konu/kazanım verisi bulunamadı.</td>
            </tr>
            @endif
            @endforelse
          </tbody>
        </table>
      </td>

      <!-- SAĞ SÜTUN -->
      <td class="topic-col-td" style="width: 50.5%; padding-left: 3px;">
        <table class="topic-table">
          <thead>
            <tr>
              <th style="width: 68%;" class="tl">Konu Adı</th>
              <th style="width: 8%;" class="tc">Sayı</th>
              <th style="width: 8%;" class="tc">Doğ</th>
              <th style="width: 8%;" class="tc">Yan</th>
              <th style="width: 8%;" class="tc">%</th>
            </tr>
          </thead>
          <tbody>
            @foreach($card['topics_right'] as $t)
            <tr>
              <td class="topic-title"> - {{ $t['name'] }}</td>
              <td class="tc">{{ $t['count'] }}</td>
              <td class="tc">{{ $t['correct'] }}</td>
              <td class="tc">{{ $t['wrong'] }}</td>
              <td class="tc">{{ $t['percent'] }}</td>
            </tr>
            @endforeach
          </tbody>
        </table>
      </td>
    </tr>
  </table>

</div>
@endforeach

</body>
</html>
