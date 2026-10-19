<?php

namespace App\Jobs;

use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportStudentsFromExcelJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * File path.
     *
     * @var string
     */
    protected string $filePath;

    /**
     * User ID who initiated the import.
     *
     * @var int
     */
    protected int $userId;

    /**
     * Tenant ID.
     *
     * @var int
     */
    protected int $tenantId;

    /**
     * Create a new job instance.
     *
     * @param  string  $filePath
     * @param  int  $userId
     * @param  int  $tenantId
     */
    public function __construct(string $filePath, int $userId, int $tenantId)
    {
        $this->filePath = $filePath;
        $this->userId = $userId;
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        try {
            // Tenant context'ini ayarla
            auth()->loginUsingId($this->userId);
            session(['tenant_id' => $this->tenantId]);

            $spreadsheet = IOFactory::load(storage_path('app/' . $this->filePath));
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // İlk satır başlık, atla
            $headers = array_shift($rows);

            $imported = 0;
            $errors = [];

            DB::beginTransaction();

            foreach ($rows as $index => $row) {
                try {
                    $data = $this->mapRowToData($row, $headers);

                    // Validation
                    if (empty($data['name'])) {
                        $errors[] = "Satır " . ($index + 2) . ": İsim gereklidir.";
                        continue;
                    }

                    // Öğrenciyi oluştur veya güncelle
                    Student::updateOrCreate(
                        [
                            'tenant_id' => $this->tenantId,
                            'school_no' => $data['school_no'] ?? null,
                        ],
                        [
                            'name' => $data['name'],
                            'tc_no' => $data['tc_no'] ?? null,
                            'city_id' => $data['city_id'] ?? null,
                            'district_id' => $data['district_id'] ?? null,
                            'emergency_contact_info' => $data['emergency_contact_info'] ?? null,
                        ]
                    );

                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Satır " . ($index + 2) . ": " . $e->getMessage();
                }
            }

            DB::commit();

            Log::info('Öğrenci import işlemi tamamlandı', [
                'imported' => $imported,
                'errors' => count($errors),
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
            ]);

            // İleride kullanıcıya notification gönderilebilir
            // $user = User::find($this->userId);
            // $user->notify(new ImportCompletedNotification($imported, $errors));

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Öğrenci import hatası', [
                'file_path' => $this->filePath,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Map row data to student data.
     *
     * @param  array  $row
     * @param  array  $headers
     * @return array
     */
    protected function mapRowToData(array $row, array $headers): array
    {
        $data = [];

        foreach ($headers as $index => $header) {
            $value = $row[$index] ?? null;

            switch (strtolower(trim($header))) {
                case 'isim':
                case 'name':
                    $data['name'] = $value;
                    break;
                case 'okul no':
                case 'school_no':
                    $data['school_no'] = $value;
                    break;
                case 'tc no':
                case 'tc_no':
                    $data['tc_no'] = $value;
                    break;
                case 'il':
                case 'city':
                    // İl adından ID bul
                    if ($value) {
                        $city = \App\Models\City::where('name', $value)->first();
                        $data['city_id'] = $city?->id;
                    }
                    break;
                case 'ilçe':
                case 'district':
                    // İlçe adından ID bul
                    if ($value && isset($data['city_id'])) {
                        $district = \App\Models\District::where('name', $value)
                            ->where('city_id', $data['city_id'])
                            ->first();
                        $data['district_id'] = $district?->id;
                    }
                    break;
            }
        }

        return $data;
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Öğrenci import job kalıcı olarak başarısız oldu', [
            'file_path' => $this->filePath,
            'user_id' => $this->userId,
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);
    }
}
