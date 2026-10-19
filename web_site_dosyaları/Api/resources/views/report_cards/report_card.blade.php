<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Karne - {{ $data['student']->name }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: #fff;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .header .school-info {
            font-size: 14px;
            color: #555;
        }
        .student-info {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .student-info table {
            width: 100%;
            border-collapse: collapse;
        }
        .student-info td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .student-info td:first-child {
            font-weight: bold;
            width: 40%;
        }
        .grades-section {
            margin-bottom: 30px;
        }
        .grades-section h2 {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
        }
        .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .grades-table th,
        .grades-table td {
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
        }
        .grades-table th {
            background: #3498db;
            color: #fff;
            font-weight: bold;
        }
        .grades-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .statistics {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background: #ecf0f1;
            border-radius: 5px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-item .label {
            font-size: 11px;
            color: #7f8c8d;
            margin-bottom: 5px;
        }
        .stat-item .value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }
        .attendance-section {
            margin-bottom: 30px;
        }
        .attendance-table {
            width: 100%;
            border-collapse: collapse;
        }
        .attendance-table th,
        .attendance-table td {
            padding: 10px;
            text-align: center;
            border: 1px solid #ddd;
        }
        .attendance-table th {
            background: #27ae60;
            color: #fff;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #2c3e50;
            text-align: center;
            font-size: 10px;
            color: #7f8c8d;
        }
        .semester-badge {
            display: inline-block;
            padding: 5px 15px;
            background: #3498db;
            color: #fff;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>ÖĞRENCİ KARNESİ</h1>
            <div class="school-info">
                <strong>{{ $tenant->name ?? 'Okul Adı' }}</strong><br>
                {{ $tenant->address ?? '' }}
            </div>
            <div class="semester-badge">
                {{ $data['semester_name'] }} - {{ $data['academic_year']->name ?? 'Akademik Yıl' }}
            </div>
        </div>

        <!-- Student Info -->
        <div class="student-info">
            <table>
                <tr>
                    <td>Öğrenci Adı Soyadı:</td>
                    <td>{{ $data['student']->name }}</td>
                </tr>
                <tr>
                    <td>Okul Numarası:</td>
                    <td>{{ $data['student']->school_no ?? 'Belirtilmemiş' }}</td>
                </tr>
                <tr>
                    <td>TC Kimlik No:</td>
                    <td>{{ $data['student']->tc_no ?? 'Belirtilmemiş' }}</td>
                </tr>
                <tr>
                    <td>Sınıf:</td>
                    <td>{{ $data['classroom']->name ?? 'Belirtilmemiş' }}</td>
                </tr>
                <tr>
                    <td>Akademik Yıl:</td>
                    <td>{{ $data['academic_year']->name ?? 'Belirtilmemiş' }}</td>
                </tr>
            </table>
        </div>

        <!-- Statistics -->
        <div class="statistics">
            <div class="stat-item">
                <div class="label">Toplam Not Sayısı</div>
                <div class="value">{{ $data['statistics']['total_grades'] }}</div>
            </div>
            <div class="stat-item">
                <div class="label">Ortalama</div>
                <div class="value">{{ number_format($data['statistics']['average_grade'], 2) }}</div>
            </div>
            <div class="stat-item">
                <div class="label">En Yüksek</div>
                <div class="value">{{ number_format($data['statistics']['max_grade'], 2) }}</div>
            </div>
            <div class="stat-item">
                <div class="label">En Düşük</div>
                <div class="value">{{ number_format($data['statistics']['min_grade'], 2) }}</div>
            </div>
        </div>

        <!-- Grades by Lesson -->
        <div class="grades-section">
            <h2>Ders Notları</h2>
            @foreach($data['grades_by_lesson'] as $lessonName => $lessonGrades)
                <h3 style="margin-top: 15px; margin-bottom: 10px; color: #34495e;">{{ $lessonName }}</h3>
                <table class="grades-table">
                    <thead>
                        <tr>
                            <th>Sınav Adı</th>
                            <th>Tür</th>
                            <th>Tarih</th>
                            <th>Not</th>
                            <th>Puan</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($lessonGrades as $grade)
                            <tr>
                                <td>{{ $grade->exam->name ?? 'Bilinmeyen Sınav' }}</td>
                                <td>
                                    @if($grade->grade_type === 'written') Yazılı
                                    @elseif($grade->grade_type === 'oral') Sözlü
                                    @elseif($grade->grade_type === 'quiz') Quiz
                                    @elseif($grade->grade_type === 'kds') KDS
                                    @elseif($grade->grade_type === 'uds') ÜDS
                                    @elseif($grade->grade_type === 'checkup') CheckUp
                                    @else {{ $grade->grade_type }}
                                    @endif
                                </td>
                                <td>{{ $grade->exam->exam_date ? $grade->exam->exam_date->format('d.m.Y') : '-' }}</td>
                                <td><strong>{{ number_format($grade->grade, 2) }}</strong></td>
                                <td>{{ $grade->score ? number_format($grade->score, 2) : '-' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endforeach
        </div>

        <!-- Attendance -->
        <div class="attendance-section">
            <h2>Devamsızlık Bilgileri</h2>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Toplam</th>
                        <th>Devam</th>
                        <th>Devamsız</th>
                        <th>Geç</th>
                        <th>Mazeretli</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ $data['attendance_stats']['total'] }}</td>
                        <td>{{ $data['attendance_stats']['present'] }}</td>
                        <td>{{ $data['attendance_stats']['absent'] }}</td>
                        <td>{{ $data['attendance_stats']['late'] }}</td>
                        <td>{{ $data['attendance_stats']['excused'] }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Bu karne {{ $generatedAt }} tarihinde oluşturulmuştur.</p>
            <p>{{ $tenant->name ?? 'Okul Adı' }} - Tüm hakları saklıdır.</p>
        </div>
    </div>
</body>
</html>
