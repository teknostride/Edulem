<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapor E-postası</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4472C4;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
        }
        .info-box {
            background-color: white;
            padding: 15px;
            border-left: 4px solid #4472C4;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapor E-postası</h1>
    </div>
    
    <div class="content">
        <p>Sayın <strong>{{ $recipientName }}</strong>,</p>
        
        <p>Aşağıdaki rapor sizin için hazırlanmıştır:</p>
        
        <div class="info-box">
            <p><strong>Rapor Tipi:</strong> {{ $reportName }}</p>
            <p><strong>Format:</strong> {{ strtoupper($format) }}</p>
            <p><strong>Oluşturulma Tarihi:</strong> {{ $generatedAt }}</p>
        </div>
        
        <p>Rapor e-postanıza ekli dosya olarak gönderilmiştir.</p>
        
        <p>İyi çalışmalar dileriz.</p>
    </div>
    
    <div class="footer">
        <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
        <p>&copy; {{ date('Y') }} Premium Edu SaaS - Tüm hakları saklıdır.</p>
    </div>
</body>
</html>
