<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Gelecek Öğrenci Ödemeleri</title>
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
            <strong>Toplam Tutar:</strong> {{ number_format($data['total_amount'], 2, ',', '.') }} ₺
        </div>
        <div>
            <strong>Toplam Taksit:</strong> {{ $data['total_count'] }}
        </div>
    </div>

    <h2>Aylık Dağılım</h2>
    <table>
        <thead>
            <tr>
                <th>Ay</th>
                <th>Taksit Sayısı</th>
                <th>Toplam Tutar</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['by_month'] as $month => $info)
            <tr>
                <td>{{ \Carbon\Carbon::parse($month . '-01')->format('F Y') }}</td>
                <td>{{ $info['count'] }}</td>
                <td>{{ number_format($info['total'], 2, ',', '.') }} ₺</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Detaylı Taksit Listesi</h2>
    <table>
        <thead>
            <tr>
                <th>Başlangıç Tarihi</th>
                <th>Öğrenci</th>
                <th>Taksit Sayısı</th>
                <th>Tutar</th>
                <th>Durum</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['installments'] as $installment)
            <tr>
                <td>{{ $installment->start_date->format('d.m.Y') }}</td>
                <td>{{ $installment->student?->name ?? 'Öğrenci' }}</td>
                <td>{{ $installment->installment_count ?? '' }}</td>
                <td>{{ number_format($installment->installment_amount, 2, ',', '.') }} ₺</td>
                <td>{{ $installment->status === 'completed' ? 'Tamamlandı' : 'Aktif' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center;">Gelecek ödeme bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
