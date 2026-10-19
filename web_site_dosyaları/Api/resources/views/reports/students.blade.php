<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Öğrenci Listesi Raporu</title>
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
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name ?? 'Kurum' }} - Öğrenci Listesi Raporu</h1>
        <p>Oluşturulma Tarihi: {{ $generatedAt }}</p>
    </div>

    <table>
        <thead>
            <tr>
                @if(isset($data['export']['headers']) && is_array($data['export']['headers']))
                    @foreach($data['export']['headers'] as $header)
                        <th>{{ $header }}</th>
                    @endforeach
                @else
                    <th>Okul No</th>
                    <th>TC No</th>
                    <th>Ad Soyad</th>
                    <th>İl</th>
                    <th>İlçe</th>
                    <th>Veli 1</th>
                    <th>Veli 2</th>
                    <th>Acil Durum Telefon</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @if(isset($data['export']['rows']) && is_array($data['export']['rows']))
                @forelse($data['export']['rows'] as $row)
                    <tr>
                        @foreach($row as $cell)
                            <td>{{ $cell !== null && $cell !== '' ? $cell : '-' }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ isset($data['export']['headers']) && is_array($data['export']['headers']) ? count($data['export']['headers']) : 1 }}" style="text-align: center;">Kayıt bulunamadı.</td>
                    </tr>
                @endforelse
            @else
                @forelse($data['students'] as $student)
                    <tr>
                        <td>{{ $student->school_no ?? '-' }}</td>
                        <td>{{ $student->tc_no ?? '-' }}</td>
                        <td>{{ $student->name }}</td>
                        <td>{{ $student->city?->name ?? '-' }}</td>
                        <td>{{ $student->district?->name ?? '-' }}</td>
                        <td>{{ $student->guardians->first()?->name ?? '-' }}</td>
                        <td>{{ $student->guardians->skip(1)->first()?->name ?? '-' }}</td>
                        <td>{{ $student->emergency_contact_info['phone'] ?? '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="8" style="text-align: center;">Kayıt bulunamadı.</td>
                    </tr>
                @endforelse
            @endif
        </tbody>
    </table>

    <div class="footer">
        <p>Toplam Kayıt: {{ $data['students']->count() }}</p>
        <p>Sayfa 1 / 1</p>
    </div>
</body>
</html>
