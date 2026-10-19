<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Sözleşme</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
        }
        .container {
            width: 100%;
            margin: 0 auto;
            border: 1px solid #ccc;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            margin: 0;
            font-weight: bold;
        }
        .header h2 {
            font-size: 18px;
            margin: 5px 0;
        }
        .contract-info {
            margin-bottom: 30px;
        }
        .contract-info table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .contract-info th,
        .contract-info td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
        }
        .contract-info th {
            background-color: #f2f2f2;
            font-weight: bold;
            width: 30%;
        }
        .student-info, .guardian-info {
            margin-bottom: 20px;
        }
        .student-info h3, .guardian-info h3 {
            background-color: #f2f2f2;
            padding: 10px;
            margin: 0 0 10px 0;
            border-left: 4px solid #333;
        }
        .terms {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
        }
        .terms h3 {
            margin-top: 0;
        }
        .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 10px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #777;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $tenant->name ?? 'Okul Yönetim Sistemi' }}</h1>
            <h2>EĞİTİM HİZMET SÖZLEŞMESİ</h2>
            <p><strong>Sözleşme No:</strong> {{ $contract->contract_no }}</p>
            <p><strong>Tarih:</strong> {{ $contract->contract_date->format('d.m.Y') }}</p>
        </div>

        <div class="contract-info">
            <h3>Sözleşme Bilgileri</h3>
            <table>
                <tr>
                    <th>Sözleşme Numarası</th>
                    <td>{{ $contract->contract_no }}</td>
                </tr>
                <tr>
                    <th>Sözleşme Tarihi</th>
                    <td>{{ $contract->contract_date->format('d.m.Y') }}</td>
                </tr>
                <tr>
                    <th>Başlangıç Tarihi</th>
                    <td>{{ $contract->start_date->format('d.m.Y') }}</td>
                </tr>
                <tr>
                    <th>Bitiş Tarihi</th>
                    <td>{{ $contract->end_date->format('d.m.Y') }}</td>
                </tr>
                <tr>
                    <th>Toplam Tutar</th>
                    <td>{{ number_format($contract->total_amount, 2, ',', '.') }} TL</td>
                </tr>
                <tr>
                    <th>Durum</th>
                    <td>
                        @if($contract->status === 'draft')
                            Taslak
                        @elseif($contract->status === 'active')
                            Aktif
                        @elseif($contract->status === 'expired')
                            Süresi Dolmuş
                        @elseif($contract->status === 'cancelled')
                            İptal Edilmiş
                        @else
                            {{ $contract->status }}
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <div class="student-info">
            <h3>Öğrenci Bilgileri</h3>
            <table>
                <tr>
                    <th>Adı Soyadı</th>
                    <td>{{ $student->name }}</td>
                </tr>
                <tr>
                    <th>TC Kimlik No</th>
                    <td>{{ $student->tc_no ?? 'Belirtilmemiş' }}</td>
                </tr>
                <tr>
                    <th>Okul Numarası</th>
                    <td>{{ $student->school_no ?? 'Belirtilmemiş' }}</td>
                </tr>
                @if($student->classroom)
                <tr>
                    <th>Sınıf</th>
                    <td>{{ $student->classroom->name }}</td>
                </tr>
                @endif
                @if($student->academicYear)
                <tr>
                    <th>Akademik Yıl</th>
                    <td>{{ $student->academicYear->name }}</td>
                </tr>
                @endif
            </table>
        </div>

        @if($guardians->count() > 0)
        <div class="guardian-info">
            <h3>Veli Bilgileri</h3>
            @foreach($guardians as $guardian)
            <table style="margin-bottom: 15px;">
                <tr>
                    <th>Adı Soyadı</th>
                    <td>{{ $guardian->name }}</td>
                </tr>
                <tr>
                    <th>TC Kimlik No</th>
                    <td>{{ $guardian->tc_no ?? 'Belirtilmemiş' }}</td>
                </tr>
                <tr>
                    <th>Telefon</th>
                    <td>{{ $guardian->phone ?? 'Belirtilmemiş' }}</td>
                </tr>
                <tr>
                    <th>E-posta</th>
                    <td>{{ $guardian->email ?? 'Belirtilmemiş' }}</td>
                </tr>
                @if($guardian->pivot)
                <tr>
                    <th>Yakınlık Derecesi</th>
                    <td>{{ $guardian->pivot->relation_type ?? 'Belirtilmemiş' }}</td>
                </tr>
                @endif
            </table>
            @endforeach
        </div>
        @endif

        @if($contract->terms)
        <div class="terms">
            <h3>Sözleşme Şartları</h3>
            <div>{!! nl2br(e($contract->terms)) !!}</div>
        </div>
        @endif

        @if($contract->notes)
        <div class="terms">
            <h3>Notlar</h3>
            <div>{!! nl2br(e($contract->notes)) !!}</div>
        </div>
        @endif

        <div class="signature-section">
            <div class="signature-box">
                <p><strong>Kurum Yetkilisi</strong></p>
                <p style="margin-top: 50px;">_________________</p>
                @if($contract->creator)
                <p>{{ $contract->creator->name }}</p>
                @endif
            </div>
            <div class="signature-box">
                <p><strong>Veli İmzası</strong></p>
                <p style="margin-top: 50px;">_________________</p>
                @if($contract->signedByGuardian)
                <p>{{ $contract->signedByGuardian->name }}</p>
                <p>{{ $contract->signed_at ? $contract->signed_at->format('d.m.Y H:i') : '' }}</p>
                @endif
            </div>
        </div>

        <div class="footer">
            <p>Bu sözleşme {{ $generatedAt }} tarihinde otomatik olarak oluşturulmuştur.</p>
            <p>{{ $tenant->name ?? 'Okul Yönetim Sistemi' }}</p>
        </div>
    </div>
</body>
</html>
