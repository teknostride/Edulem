<?php

namespace App\Http\Controllers;

use App\Actions\CreateMealMenuAction;
use App\Http\Requests\StoreMealMenuRequest;
use App\Http\Requests\StoreMealAttendanceRequest;
use App\Http\Resources\MealMenuResource;
use App\Http\Resources\MealAttendanceResource;
use App\Models\MealMenu;
use App\Models\MealAttendance;
use App\Services\ActivityLogService;
use App\Services\MealMenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Http\Request;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;

class MealMenuController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected MealMenuService $mealMenuService;

    public function __construct(
        ActivityLogService $activityLogService,
        MealMenuService $mealMenuService
    ) {
        $this->activityLogService = $activityLogService;
        $this->mealMenuService = $mealMenuService;
    }

    /**
     * Display a listing of meal menus.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', MealMenu::class);

        $query = MealMenu::with(['classroom', 'creator']);

        // Filtreleme
        if (request()->has('menu_date_from')) {
            $query->where('menu_date', '>=', request('menu_date_from'));
        }

        if (request()->has('menu_date_to')) {
            $query->where('menu_date', '<=', request('menu_date_to'));
        }

        if (request()->has('meal_type')) {
            $query->where('meal_type', request('meal_type'));
        }

        if (request()->has('classroom_id')) {
            $query->where('classroom_id', request('classroom_id'));
        }

        if (request()->has('student_id')) {
            $studentId = request('student_id');
            $query->where(function ($q) use ($studentId) {
                $q->whereNull('classroom_id')
                    ->orWhereJsonContains('target_student_ids', $studentId)
                    ->orWhereHas('classroom', function ($classQ) use ($studentId) {
                        $classQ->whereHas('students', function ($studentQ) use ($studentId) {
                            $studentQ->where('students.id', $studentId);
                        });
                    });
            });
        }

        if (request()->has('published_only')) {
            $query->where('is_published', true);
        }

        // Sıralama
        $query->orderBy('menu_date', 'desc')
            ->orderBy('meal_type');

        $menus = $query->paginate(request('per_page', 50));

        return $this->success([
            'menus' => MealMenuResource::collection($menus),
            'pagination' => [
                'current_page' => $menus->currentPage(),
                'last_page' => $menus->lastPage(),
                'per_page' => $menus->perPage(),
                'total' => $menus->total(),
            ],
        ], 'Yemek menüleri başarıyla listelendi.');
    }

    /**
     * Store a newly created meal menu.
     */
    public function store(StoreMealMenuRequest $request, CreateMealMenuAction $action): JsonResponse
    {
        Gate::authorize('create', MealMenu::class);

        try {
            $validated = $request->validated();

            // Toplu ekleme: start_date ve end_date verilmişse
            if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
                $startDate = \Carbon\Carbon::parse($validated['start_date']);
                $endDate = \Carbon\Carbon::parse($validated['end_date']);
                $daysOfWeek = $validated['days_of_week'] ?? [1, 2, 3, 4, 5]; // Varsayılan Pazartesi-Cuma
                $count = 0;
                $lastMenu = null;

                $current = $startDate->copy();
                while ($current->lte($endDate)) {
                    if (empty($daysOfWeek) || in_array($current->isoWeekday(), $daysOfWeek)) {
                        $singleData = $validated;
                        $singleData['menu_date'] = $current->format('Y-m-d');
                        unset($singleData['start_date'], $singleData['end_date'], $singleData['days_of_week']);
                        
                        $menu = $action->execute($singleData);
                        $lastMenu = $menu;
                        $count++;
                    }
                    $current->addDay();
                }

                if ($count === 0) {
                    return $this->error('Seçilen tarih aralığında ve günlerde menü oluşturulabilecek gün bulunamadı.', [], 422);
                }

                return $this->success(
                    $lastMenu ? new MealMenuResource($lastMenu) : null,
                    "Toplam {$count} gün için yemek menüsü başarıyla kaydedildi.",
                    201
                );
            }

            // Tekil gün ekleme
            $menu = $action->execute($validated);

            return $this->success(new MealMenuResource($menu), 'Yemek menüsü başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified meal menu.
     */
    public function show(MealMenu $mealMenu): JsonResponse
    {
        Gate::authorize('view', $mealMenu);

        $mealMenu->load(['classroom', 'creator', 'attendances.student']);

        return $this->success(new MealMenuResource($mealMenu));
    }

    /**
     * Update the specified meal menu.
     */
    public function update(StoreMealMenuRequest $request, MealMenu $mealMenu): JsonResponse
    {
        Gate::authorize('update', $mealMenu);

        try {
            $mealMenu->update($request->validated());
            $this->activityLogService->logUpdate($mealMenu);

            return $this->success(new MealMenuResource($mealMenu->fresh()), 'Yemek menüsü başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified meal menu.
     */
    public function destroy(MealMenu $mealMenu): JsonResponse
    {
        Gate::authorize('delete', $mealMenu);

        $this->activityLogService->logDelete($mealMenu);
        $mealMenu->delete();

        return $this->success(null, 'Yemek menüsü başarıyla silindi.');
    }

    /**
     * Copy menu to other classrooms.
     */
    public function copyToClassrooms(MealMenu $mealMenu): JsonResponse
    {
        Gate::authorize('create', MealMenu::class);

        $targetClassroomIds = request('classroom_ids', []);

        if (empty($targetClassroomIds) || !is_array($targetClassroomIds)) {
            return $this->error('Sınıf ID\'leri gereklidir.', [], 400);
        }

        try {
            $copiedMenus = $this->mealMenuService->copyToClassrooms($mealMenu, $targetClassroomIds);

            return $this->success(
                MealMenuResource::collection($copiedMenus),
                count($copiedMenus) . ' sınıfa menü başarıyla kopyalandı.',
                201
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Record meal attendance.
     */
    public function recordAttendance(StoreMealAttendanceRequest $request): JsonResponse
    {
        Gate::authorize('create', MealAttendance::class);

        try {
            // Duplicate kontrolü
            $existing = MealAttendance::where('meal_menu_id', $request->meal_menu_id)
                ->where('student_id', $request->student_id)
                ->where('attendance_date', $request->attendance_date)
                ->where('meal_type', $request->meal_type)
                ->first();

            if ($existing) {
                // Güncelle
                $existing->update([
                    'status' => $request->status,
                    'notes' => $request->notes ?? null,
                ]);
                $this->activityLogService->logUpdate($existing);

                return $this->success(new MealAttendanceResource($existing->load(['student', 'mealMenu'])), 'Yemek yoklama kaydı başarıyla güncellendi.');
            }

            // Yeni kayıt
            $attendance = MealAttendance::create([
                'meal_menu_id' => $request->meal_menu_id,
                'student_id' => $request->student_id,
                'attendance_date' => $request->attendance_date,
                'meal_type' => $request->meal_type,
                'status' => $request->status,
                'notes' => $request->notes ?? null,
                'recorded_by' => auth()->id(),
            ]);

            $this->activityLogService->logCreate($attendance);

            return $this->success(new MealAttendanceResource($attendance->load(['student', 'mealMenu'])), 'Yemek yoklama kaydı başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get meal attendance statistics.
     */
    public function getAttendanceStatistics(): JsonResponse
    {
        Gate::authorize('viewAny', MealAttendance::class);

        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));
        $mealType = request('meal_type');

        $query = MealAttendance::whereBetween('attendance_date', [$dateFrom, $dateTo]);

        if ($mealType) {
            $query->where('meal_type', $mealType);
        }

        $total = $query->count();
        $present = $query->where('status', 'present')->count();
        $absent = $query->where('status', 'absent')->count();
        $excused = $query->where('status', 'excused')->count();

        $byMealType = MealAttendance::whereBetween('attendance_date', [$dateFrom, $dateTo])
            ->selectRaw('meal_type, COUNT(*) as total, SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_count')
            ->groupBy('meal_type')
            ->pluck('present_count', 'meal_type');

        return $this->success([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total' => $total,
            'present' => $present,
            'absent' => $absent,
            'excused' => $excused,
            'by_meal_type' => $byMealType,
        ], 'Yemek yoklama istatistikleri başarıyla getirildi.');
    }

    /**
     * Download an Excel template for bulk meal menu import.
     */
    public function downloadTemplate(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        Gate::authorize('create', MealMenu::class);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        $sheet->setTitle('Yemek_Menusu_Sablonu');

        // Headers
        $sheet->setCellValue('A1', 'Tarih (Yıl-Ay-Gün)');
        $sheet->setCellValue('B1', 'Öğün Türü (kahvaltı, öğle, akşam, ara öğün)');
        $sheet->setCellValue('C1', 'Yemek / Ürün 1');
        $sheet->setCellValue('D1', 'Yemek / Ürün 2');
        $sheet->setCellValue('E1', 'Yemek / Ürün 3');
        $sheet->setCellValue('F1', 'Yemek / Ürün 4');
        $sheet->setCellValue('G1', 'Yemek / Ürün 5');
        $sheet->setCellValue('H1', 'Yemek / Ürün 6');
        $sheet->setCellValue('I1', 'Yemek / Ürün 7');
        $sheet->setCellValue('J1', 'Yemek / Ürün 8');

        // Styling headers
        $headerStyleArray = [
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFFFF'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF3B82F6'],
            ],
        ];
        $sheet->getStyle('A1:J1')->applyFromArray($headerStyleArray);
        
        // Auto size columns
        foreach (range('A', 'J') as $columnID) {
            $sheet->getColumnDimension($columnID)->setAutoSize(true);
        }

        // Örnek Satır 1: Kahvaltı
        $sheet->setCellValue('A2', date('Y-m-d'));
        $sheet->setCellValue('B2', 'kahvaltı');
        $sheet->setCellValue('C2', 'Haşlanmış Yumurta');
        $sheet->setCellValue('D2', 'Beyaz Peynir & Kaşar');
        $sheet->setCellValue('E2', 'Siyah ve Yeşil Zeytin');
        $sheet->setCellValue('F2', 'Bal & Tereyağı');
        $sheet->setCellValue('G2', 'Domates, Salatalık');
        $sheet->setCellValue('H2', 'Ekmek, Çay / Süt');

        // Örnek Satır 2: Öğle Yemeği
        $sheet->setCellValue('A3', date('Y-m-d'));
        $sheet->setCellValue('B3', 'öğle');
        $sheet->setCellValue('C3', 'Mercimek Çorbası');
        $sheet->setCellValue('D3', 'Orman Kebabı');
        $sheet->setCellValue('E3', 'Pirinç Pilavı');
        $sheet->setCellValue('F3', 'Mevsim Salata');
        $sheet->setCellValue('G3', 'Meyve');

        $directory = storage_path('app/public/templates');
        if (!file_exists($directory)) {
            mkdir($directory, 0777, true);
        }

        $fileName = 'yemek_menusu_sablonu.xlsx';
        $path = $directory . '/' . $fileName;

        $writer = new Xlsx($spreadsheet);
        $writer->save($path);

        return response()->download($path, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Import meal menus from Excel file.
     */
    public function import(Request $request): JsonResponse
    {
        Gate::authorize('create', MealMenu::class);

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:4096'
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            $importedCount = 0;
            $headerSkipped = false;
            $tenantId = auth()->user()->tenant_id ?? 1;

            // Türkçe ve İngilizce öğün türü eşleştirmesi
            $typeMap = [
                'breakfast' => 'breakfast',
                'kahvaltı' => 'breakfast',
                'kahvalti' => 'breakfast',
                'sabah' => 'breakfast',
                'lunch' => 'lunch',
                'öğle' => 'lunch',
                'öğlen' => 'lunch',
                'ogle' => 'lunch',
                'öğle yemeği' => 'lunch',
                'ogle yemegi' => 'lunch',
                'dinner' => 'dinner',
                'akşam' => 'dinner',
                'aksam' => 'dinner',
                'akşam yemeği' => 'dinner',
                'aksam yemegi' => 'dinner',
                'snack' => 'snack',
                'ara öğün' => 'snack',
                'ara ogun' => 'snack',
                'ikindi' => 'snack',
            ];

            foreach ($rows as $index => $row) {
                // Header (A1) satırı ise atla
                if (!$headerSkipped) {
                    $headerSkipped = true;
                    continue;
                }

                $dateString = trim($row['A'] ?? '');
                $rawMealType = mb_strtolower(trim($row['B'] ?? ''), 'UTF-8');

                if (empty($dateString) || empty($rawMealType)) {
                    continue; // Boş veya eksik satırları atla
                }

                $mealType = $typeMap[$rawMealType] ?? null;
                if (!$mealType) {
                    continue; // Tanımlanamayan öğün türü
                }
                
                // Excel seri tarihi veya metin tarihi çözümleme
                try {
                    if (is_numeric($dateString) && (float)$dateString > 30000 && (float)$dateString < 70000) {
                        $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateString)->format('Y-m-d');
                    } else {
                        $date = Carbon::parse($dateString)->format('Y-m-d');
                    }
                } catch (\Exception $ex) {
                    continue; // Geçersiz tarih formatı
                }

                $meals = [];
                foreach (['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as $col) {
                    $mealName = trim($row[$col] ?? '');
                    if (!empty($mealName)) {
                        $meals[] = ['name' => $mealName];
                    }
                }

                if (empty($meals)) {
                    continue; // Yemek girilmemiş
                }

                // Upsert logic - Tüm okul için bu menüyü güncelle veya oluştur
                $menu = MealMenu::where('tenant_id', $tenantId)
                    ->where('menu_date', $date)
                    ->where('meal_type', $mealType)
                    ->whereNull('classroom_id')
                    ->first();

                if ($menu) {
                    $menu->update([
                        'meals' => $meals,
                        'is_published' => true,
                    ]);
                    $this->activityLogService->logUpdate($menu);
                } else {
                    $menu = MealMenu::create([
                        'tenant_id' => $tenantId,
                        'menu_date' => $date,
                        'meal_type' => $mealType,
                        'meals' => $meals,
                        'is_published' => true,
                        'created_by' => auth()->id(),
                    ]);
                    $this->activityLogService->logCreate($menu);
                }

                $importedCount++;
            }

            return $this->success(null, $importedCount . ' adet menü başarıyla sisteme aktarıldı.', 200);

        } catch (\Exception $e) {
            return $this->error('İçe aktarma sırasında bir hata oluştu: ' . $e->getMessage(), [], 400);
        }
    }
}
