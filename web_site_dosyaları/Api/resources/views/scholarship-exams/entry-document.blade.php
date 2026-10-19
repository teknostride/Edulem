<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bursluluk Sınavı Giriş Belgesi</title>
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
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
        }
        .header h2 {
            margin: 5px 0;
            font-size: 16px;
        }
        .info-section {
            margin: 20px 0;
        }
        .info-row {
            margin: 8px 0;
            display: flex;
        }
        .info-label {
            font-weight: bold;
            width: 150px;
        }
        .info-value {
            flex: 1;
        }
        .exam-details {
            background-color: #f5f5f5;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid #ddd;
        }
        .exam-details h3 {
            margin-top: 0;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .barcode {
            text-align: center;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            letter-spacing: 2px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ optional($template)->school_name ?? $tenant->name ?? 'OKUL ADI' }}</h1>
        <h2>BURSLULUK SINAVI GİRİŞ BELGESİ</h2>
    </div>

    <div class="info-section">
        <div class="info-row">
            <div class="info-label">Başvuru Numarası:</div>
            <div class="info-value"><strong>{{ $application->application_number }}</strong></div>
        </div>
        <div class="info-row">
            <div class="info-label">Ad Soyad:</div>
            <div class="info-value">{{ $application->name }}</div>
        </div>
        @if($application->student)
        <div class="info-row">
            <div class="info-label">Okul Numarası:</div>
            <div class="info-value">{{ $application->student->school_no }}</div>
        </div>
        @endif
        <div class="info-row">
            <div class="info-label">Telefon:</div>
            <div class="info-value">{{ $application->phone }}</div>
        </div>
        @if($application->email)
        <div class="info-row">
            <div class="info-label">E-posta:</div>
            <div class="info-value">{{ $application->email }}</div>
        </div>
        @endif
    </div>

    <div class="exam-details">
        <h3>Sınav Bilgileri</h3>
        <div class="info-row">
            <div class="info-label">Sınav Adı:</div>
            <div class="info-value">{{ $exam->title }}</div>
        </div>
        @if((optional($template)->exam_address ?? null) || ($exam->description ?? null))
        <div class="info-row">
            <div class="info-label">Sınav Adresi:</div>
            <div class="info-value">{{ optional($template)->exam_address ?? $exam->description }}</div>
        </div>
        @endif
        <div class="info-row">
            <div class="info-label">Sınav Tarihi:</div>
            <div class="info-value">{{ $exam->exam_date?->format('d.m.Y') ?? 'Belirtilmemiş' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Sınav Saati:</div>
            <div class="info-value">{{ $application->session_time ?? $exam->exam_time ?? 'Belirtilmemiş' }}</div>
        </div>
        @if($application->classroom)
        <div class="info-row">
            <div class="info-label">Derslik:</div>
            <div class="info-value">{{ $application->classroom->name }}</div>
        </div>
        @endif
        @if($application->seat_number)
        <div class="info-row">
            <div class="info-label">Sıra Numarası:</div>
            <div class="info-value">{{ $application->seat_number }}</div>
        </div>
        @endif
        @if($application->optical_form_code)
        <div class="info-row">
            <div class="info-label">Optik Form Kodu:</div>
            <div class="info-value"><strong>{{ $application->optical_form_code }}</strong></div>
        </div>
        @endif
    </div>

    @if($application->optical_form_code)
    <div class="barcode">
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Optik Form Kodu</div>
        <div style="font-size: 20px; letter-spacing: 3px;">{{ $application->optical_form_code }}</div>
    </div>
    @endif

    <div class="footer">
        <p>Bu belge {{ $generatedAt }} tarihinde oluşturulmuştur.</p>
        <p>Lütfen sınav günü bu belgeyi yanınızda bulundurunuz.</p>
    </div>
</body>
</html>
