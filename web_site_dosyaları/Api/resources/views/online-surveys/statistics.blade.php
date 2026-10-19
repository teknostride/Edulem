<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Anket İstatistikleri</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 6px 0; }
        .muted { color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
        th { background: #f5f5f5; text-align: left; }
    </style>
</head>
<body>
    <h1>{{ $survey->title }}</h1>
    <div class="muted">Rapor Tarihi: {{ $generatedAt }}</div>

    <table>
        <tr>
            <th>Toplam Katılım</th>
            <td>{{ data_get($stats, 'total_responses', 0) }}</td>
        </tr>
        <tr>
            <th>Anonim Cevaplar</th>
            <td>{{ data_get($stats, 'anonymous_responses', 0) }}</td>
        </tr>
        <tr>
            <th>Anonim Olmayan</th>
            <td>{{ data_get($stats, 'non_anonymous_responses', 0) }}</td>
        </tr>
    </table>

    <h2 style="font-size: 14px; margin: 14px 0 4px 0;">Katılımcı Dağılımı (Tür)</h2>
    <table>
        <thead>
            <tr>
                <th>Tür</th>
                <th>Adet</th>
            </tr>
        </thead>
        <tbody>
        @foreach((array) data_get($stats, 'by_respondent_type', []) as $type => $count)
            <tr>
                <td>{{ $type }}</td>
                <td>{{ $count }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2 style="font-size: 14px; margin: 14px 0 4px 0;">Katılım Dağılımı (Kampüs)</h2>
    <table>
        <thead>
            <tr>
                <th>Kampüs</th>
                <th>Adet</th>
            </tr>
        </thead>
        <tbody>
        @foreach((array) data_get($stats, 'by_campus', []) as $campus => $count)
            <tr>
                <td>{{ $campus }}</td>
                <td>{{ $count }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2 style="font-size: 14px; margin: 14px 0 4px 0;">Katılım Dağılımı (Kademe)</h2>
    <table>
        <thead>
            <tr>
                <th>Kademe</th>
                <th>Adet</th>
            </tr>
        </thead>
        <tbody>
        @foreach((array) data_get($stats, 'by_education_level', []) as $level => $count)
            <tr>
                <td>{{ $level }}</td>
                <td>{{ $count }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</body>
</html>
