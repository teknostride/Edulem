<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Aylık Giderler Raporu</title>
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
        <p>Dönem: {{ $data['period']['month_name'] }}</p>
        <p>Oluşturulma: {{ $generatedAt }}</p>
    </div>

    <div class="summary">
        <div>
            <strong>Toplam Gider:</strong> {{ number_format($data['total_expenses'], 2, ',', '.') }} ₺
        </div>
        <div>
            <strong>Toplam İşlem:</strong> {{ $data['total_count'] }}
        </div>
    </div>

    <h2>Kategorilere Göre Dağılım</h2>
    <table>
        <thead>
            <tr>
                <th>Kategori</th>
                <th>İşlem Sayısı</th>
                <th>Toplam Tutar</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['by_category'] as $category)
            <tr>
                <td>{{ $category['category_name'] }}</td>
                <td>{{ $category['count'] }}</td>
                <td>{{ number_format($category['total'], 2, ',', '.') }} ₺</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Detaylı Gider Listesi</h2>
    <table>
        <thead>
            <tr>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Açıklama</th>
                <th>Tutar</th>
                <th>Ödenen</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['expenses'] as $expense)
            <tr>
                <td>{{ $expense->expense_date->format('d.m.Y') }}</td>
                <td>{{ $expense->category ?? 'Kategori Yok' }}</td>
                <td>{{ $expense->description ?? $expense->title }}</td>
                <td>{{ number_format($expense->amount, 2, ',', '.') }} ₺</td>
                <td>{{ $expense->paidBy?->name ?? '' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center;">Gider kaydı bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
