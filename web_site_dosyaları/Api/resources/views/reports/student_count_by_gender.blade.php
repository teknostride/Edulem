<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Kız-Erkek Öğrenci Sayıları</title>
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
            text-align: center;
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
        <div>
            <strong>Toplam Öğrenci:</strong> {{ $data['total_students'] }}
        </div>
        <div>
            <strong>Erkek:</strong> {{ $data['male_count'] }}
        </div>
        <div>
            <strong>Kız:</strong> {{ $data['female_count'] }}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Cinsiyet</th>
                <th>Sayı</th>
                <th>Yüzde</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Erkek</td>
                <td>{{ $data['male_count'] }}</td>
                <td>{{ $data['total_students'] > 0 ? number_format(($data['male_count'] / $data['total_students']) * 100, 2, ',', '.') : '0' }}%</td>
            </tr>
            <tr>
                <td>Kız</td>
                <td>{{ $data['female_count'] }}</td>
                <td>{{ $data['total_students'] > 0 ? number_format(($data['female_count'] / $data['total_students']) * 100, 2, ',', '.') : '0' }}%</td>
            </tr>
            <tr>
                <td><strong>Toplam</strong></td>
                <td><strong>{{ $data['total_students'] }}</strong></td>
                <td><strong>100%</strong></td>
            </tr>
        </tbody>
    </table>
</body>
</html>
