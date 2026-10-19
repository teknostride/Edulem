<?php
$user = App\Models\User::whereHas('role', function($q) { $q->where('name', 'Öğrenci İşleri'); })->first();
$req = new Illuminate\Http\Request();
$req->setUserResolver(function() use ($user) { return $user; });
$d = app(App\Http\Controllers\DashboardController::class);
$resp = $d->stats($req);
file_put_contents('debug_output.json', $resp->getContent());
echo "DONE\n";
