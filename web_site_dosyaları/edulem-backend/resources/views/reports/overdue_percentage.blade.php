<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Geciken Yüzdelik Raporu</title>
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
        .summary-item {
            text-align: center;
        }
        .summary-item strong {
            display: block;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .percentage {
            font-size: 24px;
            font-weight: bold;
            color: #d32f2f;
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
        <p>Oluşturulma: {{ $generatedAt }}</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <strong>Toplam Taksit</strong>
            <span>{{ $data['total_installments'] }}</span>
        </div>
        <div class="summary-item">
            <strong>Toplam Tutar</strong>
            <span>{{ number_format($data['total_amount'], 2, ',', '.') }} ₺</span>
        </div>
        <div class="summary-item">
            <strong>Geciken Tutar</strong>
            <span>{{ number_format($data['overdue_amount'], 2, ',', '.') }} ₺</span>
        </div>
        <div class="summary-item">
            <strong>Geciken Yüzde</strong>
            <span class="percentage">%{{ number_format($data['overdue_percentage'], 2, ',', '.') }}</span>
        </div>
    </div>

    <h2>Geciken Taksitler</h2>
    <table>
        <thead>
            <tr>
                <th>Öğrenci</th>
                <th>Taksit Sayısı</th>
                <th>Başlangıç Tarihi</th>
                <th>Tutar</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['installments'] as $installment)
            <tr>
                <td>{{ $installment->student?->name ?? 'Öğrenci' }}</td>
                <td>{{ $installment->installment_count ?? '' }}</td>
                <td>{{ $installment->start_date->format('d.m.Y') }}</td>
                <td>{{ number_format($installment->installment_amount, 2, ',', '.') }} ₺</td>
            </tr>
            @empty
            <tr>
                <td colspan="4" style="text-align: center;">Geciken taksit bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
