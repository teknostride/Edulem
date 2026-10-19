<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Devamsızlık Raporu</title>
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
        .status-present {
            color: green;
            font-weight: bold;
        }
        .status-absent {
            color: red;
            font-weight: bold;
        }
        .status-late {
            color: orange;
            font-weight: bold;
        }
        .status-excused {
            color: blue;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Kurum' }} - Devamsızlık Raporu</h1>
        <p>Oluşturulma Tarihi: {{ $generatedAt }}</p>
    </div>

    @if(isset($data['statistics']))
    <div class="statistics">
        <div class="stat-item">
            <strong>{{ $data['statistics']['present_count'] }}</strong>
            <span>Geldi</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['absent_count'] }}</strong>
            <span>Gelmedi</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['late_count'] }}</strong>
            <span>Geç Geldi</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['excused_count'] }}</strong>
            <span>Mazeretli</span>
        </div>
        <div class="stat-item">
            <strong>{{ $data['statistics']['total_count'] }}</strong>
            <span>Toplam</span>
        </div>
    </div>
    @endif

    <table>
        <thead>
            <tr>
                <th>Tarih</th>
                <th>Öğrenci</th>
                <th>Okul No</th>
                <th>Ders</th>
                <th>Durum</th>
                <th>Notlar</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['attendances'] ?? [] as $attendance)
                <tr>
                    <td>{{ $attendance->date->format('d.m.Y') }}</td>
                    <td>{{ $attendance->student?->name ?? '-' }}</td>
                    <td>{{ $attendance->student?->school_no ?? '-' }}</td>
                    <td>{{ $attendance->schedule?->lesson?->name ?? 'Ders' }}</td>
                    <td>
                        @if($attendance->status === 'present')
                            <span class="status-present">Geldi</span>
                        @elseif($attendance->status === 'absent')
                            <span class="status-absent">Gelmedi</span>
                        @elseif($attendance->status === 'late')
                            <span class="status-late">Geç Geldi</span>
                        @elseif($attendance->status === 'excused')
                            <span class="status-excused">Mazeretli</span>
                        @else
                            {{ $attendance->status }}
                        @endif
                    </td>
                    <td>{{ $attendance->notes ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center;">Kayıt bulunamadı.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>Toplam Kayıt: {{ count($data['attendances'] ?? []) }}</p>
        <p>Sayfa 1 / 1</p>
    </div>
</body>
</html>
