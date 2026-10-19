<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\OmrResult;
use App\Models\OmrCourse;

$examIds = [6, 7]; // Sözel + Sayısal
$studentId = 6035; // Abdulkadir Sert

// Reproduce applyTScores logic inline
$allResults = OmrResult::whereIn('exam_id', $examIds)->select(['student_id', 'course_scores'])->get();

$courseNetsGlobal = [];
foreach ($allResults as $r) {
    $scores = (array) ($r->course_scores ?? []);
    foreach ($scores as $cid => $s) {
        $cid = (int) $cid;
        $courseNetsGlobal[$cid][] = (float) ($s['net'] ?? 0);
    }
}

$courseNames = OmrCourse::whereIn('id', array_keys($courseNetsGlobal))->pluck('name', 'id');

$configs = [];
foreach ($courseNetsGlobal as $cid => $nets) {
    $count = count($nets);
    $mean  = $count > 0 ? array_sum($nets) / $count : 0;
    $variance = 0;
    foreach ($nets as $n) $variance += pow($n - $mean, 2);
    $stdDev = $count > 0 ? sqrt($variance / $count) : 0;

    $cname = mb_strtolower((string) ($courseNames[$cid] ?? ''), 'UTF-8');
    $weight = 1;
    if (str_contains($cname, 'türkçe') || str_contains($cname, 'matematik') || str_contains($cname, 'fen')) {
        $weight = 4;
    }

    $configs[$cid] = [
        'weight'       => $weight,
        'mean'         => round($mean, 4),
        'stdDev'       => $stdDev > 0.1 ? round($stdDev, 4) : 3.0,
        'maxQuestions'  => $count > 0 ? max($nets) : 20,
        'name'         => $courseNames[$cid] ?? 'Unknown',
    ];
}

echo "=== Course Configs ===\n";
foreach ($configs as $cid => $cfg) {
    echo "  {$cfg['name']} (ID:$cid) | Weight:{$cfg['weight']} | Mean:{$cfg['mean']} | StdDev:{$cfg['stdDev']} | Max:{$cfg['maxQuestions']}\n";
}

$minTASP = 0.0;
$maxTASP = 0.0;
foreach ($configs as $cfg) {
    $zMin = (0 - $cfg['mean']) / $cfg['stdDev'];
    $tMin = 50 + (10 * $zMin);
    $minTASP += $tMin * $cfg['weight'];

    $zMax = ($cfg['maxQuestions'] - $cfg['mean']) / $cfg['stdDev'];
    $tMax = 50 + (10 * $zMax);
    $maxTASP += $tMax * $cfg['weight'];
}

echo "\nMinTASP: " . round($minTASP, 2) . "\n";
echo "MaxTASP: " . round($maxTASP, 2) . "\n";
echo "Range: " . round($maxTASP - $minTASP, 2) . "\n";

// Calculate Abdulkadir's score
$sResults = OmrResult::whereIn('exam_id', $examIds)->where('student_id', $studentId)->get();
$studentNets = [];
foreach ($sResults as $sr) {
    foreach ((array) ($sr->course_scores ?? []) as $cid => $sc) {
        $cid = (int) $cid;
        $studentNets[$cid] = ($studentNets[$cid] ?? 0) + (float) ($sc['net'] ?? 0);
    }
}

echo "\n=== Abdulkadir's Nets ===\n";
foreach ($studentNets as $cid => $net) {
    echo "  Course {$configs[$cid]['name']} (ID:$cid): Net = $net\n";
}

$studentTASP = 0.0;
foreach ($configs as $cid => $cfg) {
    $net = $studentNets[$cid] ?? 0;
    $z   = ($net - $cfg['mean']) / $cfg['stdDev'];
    $t   = 50 + (10 * $z);
    $asp = $t * $cfg['weight'];
    $studentTASP += $asp;
    echo "  Course {$cfg['name']}: Z=" . round($z,3) . " T=" . round($t,2) . " ASP=" . round($asp,2) . "\n";
}

$range = $maxTASP - $minTASP;
$tScore = $range > 0
    ? 100 + (($studentTASP - $minTASP) / $range) * 400
    : 300;
$tScore = max(100, min(500, round($tScore, 2)));

echo "\n=== RESULT ===\n";
echo "StudentTASP: " . round($studentTASP, 2) . "\n";
echo "T-Score (100-500): $tScore\n";
echo "Raw total_point: " . $sResults->sum('total_point') . "\n";
echo "Raw total_net: " . $sResults->sum('total_net') . "\n";
