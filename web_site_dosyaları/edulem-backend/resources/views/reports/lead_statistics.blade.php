<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Ön Kayıt İstatistikleri</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .summary {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #4472C4;
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $data['title'] }}</h1>
        <p><strong>{{ $tenant->name ?? 'Kurum' }}</strong></p>
        <p>Dönem: {{ $data['period']['start_date'] }} - {{ $data['period']['end_date'] }}</p>
        <p>Oluşturulma: {{ $generatedAt }}</p>
    </div>

    <div class="summary">
        <div>
            <strong>Toplam Ön Kayıt:</strong> {{ $data['total_leads'] }}
        </div>
    </div>

    <h2>Durum Bazlı Dağılım</h2>
    <table>
        <thead>
            <tr>
                <th>Durum</th>
                <th>Sayı</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['by_status'] as $status => $count)
            <tr>
                <td>{{ $status }}</td>
                <td>{{ $count }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Kaynak Bazlı Dağılım</h2>
    <table>
        <thead>
            <tr>
                <th>Kaynak</th>
                <th>Sayı</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['by_source'] as $source => $count)
            <tr>
                <td>{{ $source ?: 'Belirtilmemiş' }}</td>
                <td>{{ $count }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Detaylı Ön Kayıt Listesi</h2>
    <table>
        <thead>
            <tr>
                <th>Tarih</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Email</th>
                <th>Durum</th>
                <th>Kaynak</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['leads'] as $lead)
            <tr>
                <td>{{ $lead->created_at->format('d.m.Y') }}</td>
                <td>{{ $lead->name }}</td>
                <td>{{ $lead->phone }}</td>
                <td>{{ $lead->email ?? '' }}</td>
                <td>{{ $lead->status }}</td>
                <td>{{ $lead->source ?? '' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="6" style="text-align: center;">Ön kayıt bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
