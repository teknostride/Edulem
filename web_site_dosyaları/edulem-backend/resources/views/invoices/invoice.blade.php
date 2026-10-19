<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fatura - {{ $invoice->invoice_no }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
        }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .info-box {
            flex: 1;
        }
        .info-box h3 {
            margin-top: 0;
            font-size: 14px;
            color: #666;
        }
        .info-box p {
            margin: 5px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .items-table .text-right {
            text-align: right;
        }
        .total-section {
            text-align: right;
            margin-top: 20px;
        }
        .total-row {
            margin: 5px 0;
            font-size: 14px;
        }
        .total-amount {
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #333;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
        }
        .status-pending {
            background-color: #ffc107;
            color: #000;
        }
        .status-paid {
            background-color: #28a745;
            color: #fff;
        }
        .status-overdue {
            background-color: #dc3545;
            color: #fff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>FATURA</h1>
        <p>{{ $invoice->tenant->name ?? 'Kurum Adı' }}</p>
    </div>

    <div class="invoice-info">
        <div class="info-box">
            <h3>Fatura Bilgileri</h3>
            <p><strong>Fatura No:</strong> {{ $invoice->invoice_no }}</p>
            <p><strong>Fatura Tipi:</strong> 
                @if($invoice->invoice_type === 'tuition') Öğrenim Ücreti
                @elseif($invoice->invoice_type === 'registration') Kayıt Ücreti
                @elseif($invoice->invoice_type === 'material') Materyal Ücreti
                @else Diğer
                @endif
            </p>
            <p><strong>Vade Tarihi:</strong> {{ $invoice->due_date->format('d.m.Y') }}</p>
            <p><strong>Durum:</strong> 
                <span class="status-badge status-{{ $invoice->status }}">
                    @if($invoice->status === 'pending') Beklemede
                    @elseif($invoice->status === 'paid') Ödendi
                    @elseif($invoice->status === 'overdue') Vadesi Geçti
                    @else İptal
                    @endif
                </span>
            </p>
        </div>

        <div class="info-box">
            <h3>Öğrenci Bilgileri</h3>
            <p><strong>Ad Soyad:</strong> {{ $invoice->student->name }}</p>
            <p><strong>Okul No:</strong> {{ $invoice->student->school_no ?? 'N/A' }}</p>
            <p><strong>TC Kimlik No:</strong> {{ $invoice->student->tc_no ?? 'N/A' }}</p>
        </div>
    </div>

    @if($invoice->description)
    <div style="margin-bottom: 20px;">
        <h3>Açıklama</h3>
        <p>{{ $invoice->description }}</p>
    </div>
    @endif

    @if($invoice->items && count($invoice->items) > 0)
    <table class="items-table">
        <thead>
            <tr>
                <th>Açıklama</th>
                <th class="text-right">Miktar</th>
                <th class="text-right">Birim Fiyat</th>
                <th class="text-right">Toplam</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
            <tr>
                <td>{{ $item['description'] }}</td>
                <td class="text-right">{{ number_format($item['quantity'], 2) }}</td>
                <td class="text-right">{{ number_format($item['unit_price'], 2) }} ₺</td>
                <td class="text-right">{{ number_format($item['quantity'] * $item['unit_price'], 2) }} ₺</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <div class="total-section">
        <div class="total-row">
            <strong>Toplam Tutar:</strong>
        </div>
        <div class="total-amount">
            {{ number_format($invoice->amount, 2) }} ₺
        </div>
    </div>

    @if($invoice->paid_at)
    <div style="margin-top: 30px; text-align: right;">
        <p><strong>Ödeme Tarihi:</strong> {{ $invoice->paid_at->format('d.m.Y H:i') }}</p>
    </div>
    @endif

    <div class="footer">
        <p>Bu belge elektronik ortamda oluşturulmuştur.</p>
        <p>Oluşturulma Tarihi: {{ $invoice->created_at->format('d.m.Y H:i') }}</p>
    </div>
</body>
</html>
