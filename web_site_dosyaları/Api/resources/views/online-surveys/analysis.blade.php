<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Anket Analizi</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 6px 0; }
        h2 { font-size: 14px; margin: 14px 0 6px 0; }
        .muted { color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
        th { background: #f5f5f5; text-align: left; }
        .answer { margin-bottom: 4px; }
    </style>
</head>
<body>
    <h1>{{ $survey->title }}</h1>
    <div class="muted">Rapor Türü: {{ $analysisType === 'individual' ? 'Bireysel Cevaplar' : 'Genel Dağılım' }} | Tarih: {{ $generatedAt }}</div>

    @if($analysisType === 'general')
        @foreach($analysis as $idx => $item)
            <h2>{{ ($idx + 1) }}. {{ data_get($item, 'question') }}</h2>
            <div class="muted">Toplam: {{ data_get($item, 'total_answers', 0) }}</div>
            <table>
                <thead>
                    <tr>
                        <th>Cevaplar (örnek)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            @foreach(array_slice((array) data_get($item, 'answers', []), 0, 30) as $a)
                                <div class="answer">{{ is_array($a) ? data_get($a, 'answer') : $a }}</div>
                            @endforeach
                        </td>
                    </tr>
                </tbody>
            </table>
        @endforeach
    @else
        <table>
            <thead>
                <tr>
                    <th>Katılımcı</th>
                    <th>Tür</th>
                    <th>Tarih</th>
                    <th>Cevap Detayı</th>
                </tr>
            </thead>
            <tbody>
                @foreach($analysis as $row)
                    <tr>
                        <td>{{ data_get($row, 'respondent.name', 'Bilinmiyor') }}</td>
                        <td>{{ data_get($row, 'respondent_type') }}</td>
                        <td>{{ data_get($row, 'submitted_at') }}</td>
                        <td>
                            @foreach((array) data_get($row, 'answers_detailed', []) as $a)
                                <div class="answer">
                                    <strong>{{ data_get($a, 'question') }}</strong>: {{ data_get($a, 'answer') }}
                                </div>
                            @endforeach
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
