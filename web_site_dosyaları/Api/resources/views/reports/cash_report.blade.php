<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Kasa Raporu</title>
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
        .header h1 {
            margin: 0;
            font-size: 18px;
        }
        .summary {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item strong {
            display: block;
            font-size: 14px;
            margin-bottom: 5px;
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
            font-weight: bold;
        }
        .income {
            color: green;
        }
        .expense {
            color: red;
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
        <div class="summary-item">
            <strong>Toplam Gelir</strong>
            <span class="income">{{ number_format($data['income']['total'], 2, ',', '.') }} ₺</span>
        </div>
        <div class="summary-item">
            <strong>Toplam Gider</strong>
            <span class="expense">{{ number_format($data['expense']['total'], 2, ',', '.') }} ₺</span>
        </div>
        <div class="summary-item">
            <strong>Net Kasa</strong>
            <span style="font-size: 16px; font-weight: bold;">{{ number_format($data['net_cash'], 2, ',', '.') }} ₺</span>
        </div>
    </div>

    <h2>Gelirler</h2>
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
            @forelse($data['income']['payments'] as $payment)
            <tr>
                <td>{{ $payment->payment_date->format('d.m.Y') }}</td>
                <td>{{ $payment->student?->name ?? 'Öğrenci' }}</td>
                <td class="income">{{ number_format($payment->amount, 2, ',', '.') }} ₺</td>
                <td>{{ $payment->payment_method }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="4" style="text-align: center;">Gelir kaydı bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <h2>Giderler</h2>
    <table>
        <thead>
            <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th>Tutar</th>
                <th>Ödeme Yöntemi</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['expense']['expenses'] as $expense)
            <tr>
                <td>{{ $expense->expense_date->format('d.m.Y') }}</td>
                <td>{{ $expense->description ?? $expense->title }}</td>
                <td class="expense">{{ number_format($expense->amount, 2, ',', '.') }} ₺</td>
                <td>{{ $expense->payment_method ?? 'Nakit' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="4" style="text-align: center;">Gider kaydı bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
