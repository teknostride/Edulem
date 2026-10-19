<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sınav Giriş Belgesi</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; }
        .title { text-align: center; font-size: 24px; font-weight: 700; color: #f97316; margin: 0; }
        .subtitle { text-align: center; font-size: 18px; font-weight: 600; margin: 6px 0 0 0; }
        .hr { height: 3px; background: #f97316; margin: 14px 0 18px 0; }
        h2 { font-size: 14px; color: #f97316; margin: 18px 0 8px 0; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 6px 8px; vertical-align: top; }
        .label { color: #6b7280; font-size: 11px; margin-bottom: 3px; }
        .value { border: 1px solid #e5e7eb; background: #f9fafb; padding: 8px 10px; border-radius: 6px; }
        .note { margin-top: 18px; border-left: 6px solid #f59e0b; background: #fffbeb; padding: 12px 14px; }
        .note h3 { margin: 0 0 6px 0; font-size: 13px; color: #92400e; }
        .note ul { margin: 0; padding-left: 18px; }
        .note li { margin: 2px 0; }
        .muted { color: #6b7280; }
    </style>
</head>
<body>
    <div>
        <div class="title">SINAV GİRİŞ BELGESİ</div>
        <div class="subtitle">{{ $template->school_name }}</div>
        <div class="hr"></div>

        <h2>Öğrenci Bilgileri</h2>
        <table class="grid">
            <tr>
                <td style="width:50%">
                    <div class="label">Adı Soyadı</div>
                    <div class="value">{{ $scholarship->ad_soyad }}</div>
                </td>
                <td style="width:50%">
                    <div class="label">T.C. Kimlik No</div>
                    <div class="value">{{ $scholarship->tc_kimlik }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Doğum Tarihi</div>
                    <div class="value">{{ $scholarship->dogum_tarihi ? $scholarship->dogum_tarihi->format('d.m.Y') : '-' }}</div>
                </td>
                <td>
                    <div class="label">Sınıf</div>
                    <div class="value">{{ $scholarship->sinif_adi ?? ($classroom ? (($classroom->educationLevel?->name ? $classroom->educationLevel->name.' - ' : '').$classroom->name) : '-') }}</div>
                </td>
            </tr>
        </table>

        <h2>Sınav Bilgileri</h2>
        <table class="grid">
            <tr>
                <td style="width:50%">
                    <div class="label">Sınav Tarihi</div>
                    <div class="value">{{ $template->exam_entry_date ? \Carbon\Carbon::parse($template->exam_entry_date)->format('d.m.Y') : '-' }}</div>
                </td>
                <td style="width:50%">
                    <div class="label">Sınav Saati</div>
                    <div class="value">{{ $template->exam_entry_time ? substr((string)$template->exam_entry_time,0,5) : '-' }}</div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="label">Sınav Adresi</div>
                    <div class="value">{!! nl2br(e($template->exam_address)) !!}</div>
                </td>
            </tr>
        </table>

        <h2>Veli Bilgileri</h2>
        <table class="grid">
            <tr>
                <td style="width:50%">
                    <div class="label">Veli Adı Soyadı</div>
                    <div class="value">{{ $scholarship->veli_ad_soyad }}</div>
                </td>
                <td style="width:50%">
                    <div class="label">Veli İletişim</div>
                    <div class="value">{{ $scholarship->veli_iletisim }}</div>
                </td>
            </tr>
        </table>

        <div class="note">
            <h3>ÖNEMLİ NOTLAR:</h3>
            @php
                $notesRaw = trim((string)($template->notes ?? ''));
                $notes = $notesRaw !== ''
                    ? array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $notesRaw) ?: [])))
                    : [];
            @endphp
            <ul>
                @if(count($notes) > 0)
                    @foreach($notes as $n)
                        <li>{{ $n }}</li>
                    @endforeach
                @else
                    <li>Bu belgeyi sınava girerken yanınızda bulundurunuz.</li>
                    <li>Sınav giriş saatinden en az 15 dakika önce sınav yerinde bulununuz.</li>
                    <li>Yanınızda kimlik belgenizi (Nüfus Cüzdanı veya T.C. Kimlik Kartı) bulundurunuz.</li>
                @endif
            </ul>
            <div class="muted" style="margin-top:8px;">Oluşturulma: {{ $generatedAt }}</div>
        </div>
    </div>
</body>
</html>
