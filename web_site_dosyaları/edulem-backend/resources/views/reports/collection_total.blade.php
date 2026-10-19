<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Tahsilat Toplam Raporu</title>
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
            <strong>Toplam Tahsilat:</strong> {{ number_format($data['total_collection'], 2, ',', '.') }} ₺
        </div>
        <div>
            <strong>Toplam İşlem:</strong> {{ $data['total_count'] }}
        </div>
    </div>

    <h2>Ödeme Yöntemlerine Göre Dağılım</h2>
    <table>
        <thead>
            <tr>
                <th>Ödeme Yöntemi</th>
                <th>Tutar</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['by_method'] as $method => $amount)
            <tr>
                <td>{{ $method }}</td>
                <td>{{ number_format($amount, 2, ',', '.') }} ₺</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Detaylı Tahsilat Listesi</h2>
    <table>
        <thead>
            <tr>
                <th>Tarih</th>
                <th>Öğrenci</th>
                <th>Tutar</th>
                <th>Ödeme Yöntemi</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['payments'] as $payment)
            <tr>
                <td>{{ $payment->payment_date->format('d.m.Y') }}</td>
                <td>{{ $payment->student?->name ?? 'Öğrenci' }}</td>
                <td>{{ number_format($payment->amount, 2, ',', '.') }} ₺</td>
                <td>{{ $payment->payment_method }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="4" style="text-align: center;">Tahsilat kaydı bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
