<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <title>Kullanıcı Listesi</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
        .header { margin-bottom: 12px; }
        .title { font-size: 16px; font-weight: 700; margin: 0; }
        .meta { font-size: 10px; color: #6b7280; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
        th { background: #f3f4f6; font-weight: 700; text-align: left; }
        tr:nth-child(even) td { background: #fafafa; }
    </style>
</head>
<body>
<div class="header">
    <p class="title">Kullanıcı Listesi</p>
    <div class="meta">
        {{ $tenant ? ($tenant->name ?? '') : '' }}
        @if(!empty($generatedAt))
            - {{ $generatedAt }}
        @endif
    </div>
</div>

<table>
    <thead>
    <tr>
        @foreach(($data['headers'] ?? []) as $h)
            <th>{{ $h }}</th>
        @endforeach
    </tr>
    </thead>
    <tbody>
    @foreach(($data['rows'] ?? []) as $r)
        <tr>
            @foreach($r as $cell)
                <td>{{ $cell }}</td>
            @endforeach
        </tr>
    @endforeach
    </tbody>
</table>
</body>
</html>
