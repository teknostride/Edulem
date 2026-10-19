<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Finansal Rapor</title>
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
        .header p {
            margin: 5px 0;
            font-size: 12px;
        }
        .statistics {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-item strong {
            display: block;
            font-size: 16px;
            color: #4472C4;
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
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 10px;
            color: #666;
        }
        .amount {
            text-align: right;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Kurum' }} - Finansal Rapor</h1>
        <p>Oluşturulma Tarihi: {{ $generatedAt }}</p>
    </div>

    @if(isset($data['statistics']))
    <div class="statistics">
        <div class="stat-item">
            <strong>{{ number_format($data['statistics']['total_amount'], 2, ',', '.') }} ₺</strong>
            <span>Toplam Tutar</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['completed_count'] }}</strong>
            <span>Tamamlanan</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['pending_count'] }}</strong>
            <span>Beklemede</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['total_count'] }}</strong>
            <span>Toplam İşlem</span>
        </div>
    </div>
    @endif

    <table>
        <thead>
            <tr>
                <th>Tarih</th>
                <th>Öğrenci</th>
                <th>Okul No</th>
                <th>Tutar</th>
                <th>Ödeme Yöntemi</th>
                <th>Durum</th>
                <th>Taksit No</th>
                <th>Açıklama</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['payments'] ?? [] as $payment)
                <tr>
                    <td>{{ $payment->payment_date->format('d.m.Y') }}</td>
                    <td>{{ $payment->student?->name ?? '-' }}</td>
                    <td>{{ $payment->student?->school_no ?? '-' }}</td>
                    <td class="amount">{{ number_format($payment->amount, 2, ',', '.') }} ₺</td>
                    <td>
                        @if($payment->payment_method === 'cash')
                            Nakit
                        @elseif($payment->payment_method === 'credit_card')
                            Kredi Kartı
                        @elseif($payment->payment_method === 'bank_transfer')
                            Havale/EFT
                        @elseif($payment->payment_method === 'online')
                            Online
                        @else
                            {{ $payment->payment_method }}
                        @endif
                    </td>
                    <td>
                        @if($payment->status === 'completed')
                            <span style="color: green;">Tamamlandı</span>
                        @elseif($payment->status === 'pending')
                            <span style="color: orange;">Beklemede</span>
                        @else
                            <span style="color: red;">İptal</span>
                        @endif
                    </td>
                    <td>{{ $payment->installment?->installment_no ?? '-' }}</td>
                    <td>{{ $payment->notes ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" style="text-align: center;">Kayıt bulunamadı.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>Toplam Kayıt: {{ count($data['payments'] ?? []) }}</p>
        <p>Sayfa 1 / 1</p>
    </div>
</body>
</html>
