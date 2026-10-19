<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Aylık Sınav Katılım Raporu</title>
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
            <strong>Toplam Sınav:</strong> {{ $data['total_exams'] }}
        </div>
        <div>
            <strong>Toplam Katılım:</strong> {{ $data['total_participation'] }}
        </div>
        <div>
            <strong>Ortalama Katılım:</strong> %{{ number_format($data['average_participation_rate'], 2, ',', '.') }}
        </div>
    </div>

    <h2>Sınav Detayları</h2>
    <table>
        <thead>
            <tr>
                <th>Sınav</th>
                <th>Tarih</th>
                <th>Toplam Öğrenci</th>
                <th>Katılan</th>
                <th>Katılım %</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['exams'] as $exam)
            <tr>
                <td>{{ $exam['exam_name'] }}</td>
                <td>{{ $exam['exam_date'] }}</td>
                <td>{{ $exam['total_students'] }}</td>
                <td>{{ $exam['participated'] }}</td>
                <td>%{{ number_format($exam['participation_rate'], 2, ',', '.') }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center;">Sınav bulunamadı.</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
