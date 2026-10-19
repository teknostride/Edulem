<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Sınıf Doluluk Raporu</title>
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
        .high-occupancy {
            background-color: #ffebee;
        }
        .low-occupancy {
            background-color: #e8f5e9;
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
        <div>
            <strong>Toplam Sınıf:</strong> {{ $data['total_classrooms'] }}
        </div>
        <div>
            <strong>Toplam Kapasite:</strong> {{ $data['total_capacity'] }}
        </div>
        <div>
            <strong>Toplam Öğrenci:</strong> {{ $data['total_students'] }}
        </div>
        <div>
            <strong>Ortalama Doluluk:</strong> %{{ number_format($data['average_occupancy'], 2, ',', '.') }}
        </div>
    </div>

    <h2>Sınıf Detayları</h2>
    <table>
        <thead>
            <tr>
                <th>Sınıf</th>
                <th>Kapasite</th>
                <th>Mevcut</th>
                <th>Boş</th>
                <th>Doluluk %</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['classrooms'] as $classroom)
            <tr class="{{ $classroom['occupancy_rate'] > 90 ? 'high-occupancy' : ($classroom['occupancy_rate'] < 50 ? 'low-occupancy' : '') }}">
                <td>{{ $classroom['classroom_name'] }}</td>
                <td>{{ $classroom['capacity'] }}</td>
                <td>{{ $classroom['current'] }}</td>
                <td>{{ $classroom['available'] }}</td>
                <td>%{{ number_format($classroom['occupancy_rate'], 2, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
