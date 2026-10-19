<?php

namespace App\Http\Controllers;

use App\Models\MeasurementTrial;
use App\Models\MeasurementTrialBooklet;
use App\Models\MeasurementTrialResult;
use App\Services\MeasurementOpticalImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeasurementController extends ApiController
{
    private function ensureManagerAccess(): ?JsonResponse
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        $ok = in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Kampüs Müdürü', 'owner', 'Admin', 'Genel Müdür'], true);
        return $ok ? null : $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
    }

    public function trialsIndex(Request $request): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $query = MeasurementTrial::query()->with(['creator:id,name'])->withCount(['booklets', 'results']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $query->orderByDesc('id');
        $perPage = (int) $request->get('per_page', 50);
        $perPage = $perPage > 0 ? min($perPage, 100) : 50;

        $trials = $query->paginate($perPage);

        return $this->success([
            'trials' => $trials->items(),
            'pagination' => [
                'current_page' => $trials->currentPage(),
                'last_page' => $trials->lastPage(),
                'per_page' => $trials->perPage(),
                'total' => $trials->total(),
            ],
        ]);
    }

    public function trialsStore(Request $request): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'exam_date' => 'nullable|date',
            'status' => 'nullable|in:draft,published,archived',
        ]);

        $user = auth()->user();
        $validated['created_by'] = $user?->id;

        $trial = MeasurementTrial::create($validated);

        return $this->success(['trial' => $trial->fresh()], 'Deneme sınavı oluşturuldu.', 201);
    }

    public function trialsShow(int $id): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $trial = MeasurementTrial::with(['booklets', 'imports', 'creator:id,name'])->findOrFail($id);

        return $this->success(['trial' => $trial]);
    }

    public function trialsUpdate(Request $request, int $id): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $trial = MeasurementTrial::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'exam_date' => 'nullable|date',
            'status' => 'nullable|in:draft,published,archived',
        ]);

        $trial->update($validated);

        return $this->success(['trial' => $trial->fresh()], 'Deneme sınavı güncellendi.');
    }

    public function trialsDestroy(int $id): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $trial = MeasurementTrial::findOrFail($id);
        $trial->delete();

        return $this->success([], 'Deneme sınavı silindi.');
    }

    public function bookletsStore(Request $request, int $trialId): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $trial = MeasurementTrial::findOrFail($trialId);

        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'question_count' => 'required|integer|min:1|max:500',
            'answer_key' => 'nullable',
        ]);

        $user = auth()->user();

        $booklet = MeasurementTrialBooklet::create([
            'trial_id' => $trial->id,
            'name' => $validated['name'],
            'question_count' => (int) $validated['question_count'],
            'answer_key' => $validated['answer_key'] ?? null,
            'created_by' => $user?->id,
        ]);

        return $this->success(['booklet' => $booklet->fresh()], 'Kitapçık oluşturuldu.', 201);
    }

    public function bookletsUpdate(Request $request, int $trialId, int $bookletId): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        MeasurementTrial::findOrFail($trialId);
        $booklet = MeasurementTrialBooklet::where('trial_id', $trialId)->findOrFail($bookletId);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:50',
            'question_count' => 'sometimes|required|integer|min:1|max:500',
            'answer_key' => 'nullable',
        ]);

        $booklet->update($validated);

        return $this->success(['booklet' => $booklet->fresh()], 'Kitapçık güncellendi.');
    }

    public function resultsIndex(Request $request, int $trialId): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        MeasurementTrial::findOrFail($trialId);

        $query = MeasurementTrialResult::query()
            ->with(['student:id,name,school_no,classroom_id', 'booklet:id,name'])
            ->where('trial_id', $trialId);

        if ($request->filled('classroom_id')) {
            $query->whereHas('student', function ($q) use ($request) {
                $q->where('classroom_id', (int) $request->get('classroom_id'));
            });
        }

        $query->orderByDesc('net');

        $perPage = (int) $request->get('per_page', 50);
        $perPage = $perPage > 0 ? min($perPage, 200) : 50;

        $results = $query->paginate($perPage);

        return $this->success([
            'results' => $results->items(),
            'pagination' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
            ],
        ]);
    }

    public function analysis(Request $request, int $trialId): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $validated = $request->validate([
            'classroom_id' => 'nullable|integer',
            'booklet_id' => 'nullable|integer',
            'bin_size' => 'nullable|numeric|min:0.1|max:1000',
        ]);

        $trial = MeasurementTrial::with(['booklets:id,trial_id,name,question_count,answer_key'])->findOrFail($trialId);

        $resultsQuery = MeasurementTrialResult::query()->where('trial_id', $trialId);

        if (!empty($validated['classroom_id'])) {
            $classroomId = (int) $validated['classroom_id'];
            $resultsQuery->whereHas('student', function ($q) use ($classroomId) {
                $q->where('classroom_id', $classroomId);
            });
        }

        if (!empty($validated['booklet_id'])) {
            $resultsQuery->where('booklet_id', (int) $validated['booklet_id']);
        }

        $summary = (clone $resultsQuery)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('AVG(net) as avg_net')
            ->selectRaw('MIN(net) as min_net')
            ->selectRaw('MAX(net) as max_net')
            ->selectRaw('STDDEV_POP(net) as stddev_net')
            ->first();

        $binSize = !empty($validated['bin_size']) ? (float) $validated['bin_size'] : 5.0;
        $binSize = $binSize > 0 ? $binSize : 5.0;

        $distribution = (clone $resultsQuery)
            ->selectRaw('FLOOR(net / ?) as bin_index, COUNT(*) as count', [$binSize])
            ->groupBy('bin_index')
            ->orderBy('bin_index')
            ->get()
            ->map(function ($row) use ($binSize) {
                $start = ((float) $row->bin_index) * $binSize;
                $end = $start + $binSize;
                return [
                    'start' => round($start, 2),
                    'end' => round($end, 2),
                    'count' => (int) $row->count,
                ];
            })
            ->values()
            ->all();

        $questionStats = null;
        if (!empty($validated['booklet_id'])) {
            $bookletId = (int) $validated['booklet_id'];
            $booklet = $trial->booklets->firstWhere('id', $bookletId);
            if (!$booklet) {
                return $this->error('Kitapçık bulunamadı.', [], 404);
            }

            $answerKey = $this->normalizeKey($booklet->answer_key);
            $qCount = count($answerKey);

            $correctCounts = array_fill(0, $qCount, 0);
            $totalCounts = array_fill(0, $qCount, 0);

            (clone $resultsQuery)
                ->where('booklet_id', $bookletId)
                ->select(['id', 'raw_answers'])
                ->orderBy('id')
                ->chunk(500, function ($rows) use (&$correctCounts, &$totalCounts, $answerKey) {
                    foreach ($rows as $r) {
                        $answers = is_array($r->raw_answers) ? $r->raw_answers : [];
                        foreach ($answerKey as $idx => $key) {
                            $a = isset($answers[$idx]) ? strtoupper(trim((string) $answers[$idx])) : '';
                            if ($a === '') {
                                continue;
                            }
                            $totalCounts[$idx]++;
                            if ($a === $key) {
                                $correctCounts[$idx]++;
                            }
                        }
                    }
                });

            $questionStats = [];
            foreach ($answerKey as $idx => $key) {
                $total = (int) $totalCounts[$idx];
                $correct = (int) $correctCounts[$idx];
                $rate = $total > 0 ? round(($correct / $total) * 100, 2) : null;
                $questionStats[] = [
                    'question' => $idx + 1,
                    'answer_key' => $key,
                    'total' => $total,
                    'correct' => $correct,
                    'correct_rate' => $rate,
                ];
            }
        }

        return $this->success([
            'trial' => [
                'id' => $trial->id,
                'name' => $trial->name,
            ],
            'filters' => [
                'classroom_id' => !empty($validated['classroom_id']) ? (int) $validated['classroom_id'] : null,
                'booklet_id' => !empty($validated['booklet_id']) ? (int) $validated['booklet_id'] : null,
                'bin_size' => $binSize,
            ],
            'summary' => [
                'total' => (int) ($summary->total ?? 0),
                'avg_net' => isset($summary->avg_net) ? round((float) $summary->avg_net, 2) : null,
                'stddev_net' => isset($summary->stddev_net) ? round((float) $summary->stddev_net, 2) : null,
                'min_net' => isset($summary->min_net) ? round((float) $summary->min_net, 2) : null,
                'max_net' => isset($summary->max_net) ? round((float) $summary->max_net, 2) : null,
            ],
            'distribution' => $distribution,
            'question_stats' => $questionStats,
            'booklets' => $trial->booklets->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'question_count' => (int) $b->question_count,
            ])->values()->all(),
        ]);
    }

    private function normalizeKey($key): array
    {
        if ($key === null) {
            return [];
        }

        if (is_string($key)) {
            $key = preg_split('/\s+/', trim($key)) ?: [];
        }

        if (!is_array($key)) {
            return [];
        }

        $out = [];
        foreach ($key as $v) {
            $s = strtoupper(trim((string) $v));
            $out[] = in_array($s, ['A', 'B', 'C', 'D', 'E'], true) ? $s : '';
        }

        while (!empty($out) && end($out) === '') {
            array_pop($out);
        }

        return $out;
    }

    public function importOptical(Request $request, int $trialId, MeasurementOpticalImportService $service): JsonResponse
    {
        if ($resp = $this->ensureManagerAccess()) {
            return $resp;
        }

        $trial = MeasurementTrial::with(['booklets'])->findOrFail($trialId);

        $validated = $request->validate([
            'file' => 'required|file|max:10240',
            'booklet_id' => 'nullable|integer',
        ]);

        $booklet = null;
        if (!empty($validated['booklet_id'])) {
            $booklet = MeasurementTrialBooklet::where('trial_id', $trialId)->findOrFail((int) $validated['booklet_id']);
        }

        $user = auth()->user();

        try {
            $result = $service->import($trial, $booklet, $request->file('file'), (int) $user->id);
            return $this->success($result, 'Optik sonuçları içe aktarıldı.');
        } catch (\Throwable $e) {
            return $this->error('Optik içe aktarma hatası: ' . $e->getMessage(), [], 400);
        }
    }
}
