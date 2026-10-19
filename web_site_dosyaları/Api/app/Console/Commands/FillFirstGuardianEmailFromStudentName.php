<?php

namespace App\Console\Commands;

use App\Models\Student;
use Illuminate\Console\Command;

class FillFirstGuardianEmailFromStudentName extends Command
{
    protected $signature = 'guardians:fill-first-email-from-student-name {--tenant_id=} {--dry-run} {--include-shared : Also overwrite guardian emails even if that guardian is linked to multiple students}';

    protected $description = 'For each student, overwrite the first guardian email as <student_name>@gmail.com (lowercase, Turkish chars preserved).';

    public function handle(): int
    {
        $tenantId = $this->option('tenant_id');
        $dryRun = (bool) $this->option('dry-run');
        $includeShared = (bool) $this->option('include-shared');

        $query = Student::query();
        if ($tenantId !== null && $tenantId !== '') {
            $query->where('tenant_id', (int) $tenantId);
        }

        $updated = 0;
        $skippedNoGuardian = 0;
        $skippedNoName = 0;
        $skippedSharedGuardian = 0;

        $this->info('Starting...');
        if ($dryRun) {
            $this->warn('Dry-run mode: no database changes will be made.');
        }
        if (! $includeShared) {
            $this->warn('Shared guardians will be skipped (guardians linked to multiple students). Use --include-shared to override.');
        }

        $query->with([
            'guardians' => function ($q) {
                $q->withPivot('id', 'relation_type', 'is_legal_guardian')
                    ->orderBy('guardian_student.id');
            },
        ])->orderBy('id')->chunk(200, function ($students) use (&$updated, &$skippedNoGuardian, &$skippedNoName, &$skippedSharedGuardian, $dryRun, $includeShared) {
            foreach ($students as $student) {
                $name = (string) ($student->name ?? '');
                $slug = $this->makeEmailLocalPartFromStudentName($name);

                if ($slug === '') {
                    $skippedNoName++;
                    continue;
                }

                $firstGuardian = $student->guardians->first();
                if (! $firstGuardian) {
                    $skippedNoGuardian++;
                    continue;
                }

                if (! $includeShared) {
                    // Avoid overriding a shared guardian that belongs to multiple students
                    $studentCount = $firstGuardian->students()->count();
                    if ($studentCount > 1) {
                        $skippedSharedGuardian++;
                        continue;
                    }
                }

                $email = $slug . '@gmail.com';

                if (! $dryRun) {
                    $firstGuardian->email = $email;
                    $firstGuardian->save();
                }

                $updated++;

                if ($updated % 500 === 0) {
                    $this->line("Updated: {$updated}");
                }
            }
        });

        $this->newLine();
        $this->info('Done.');
        $this->line('Updated guardians: ' . $updated);
        $this->line('Skipped (no guardian): ' . $skippedNoGuardian);
        $this->line('Skipped (name empty): ' . $skippedNoName);
        $this->line('Skipped (shared guardian): ' . $skippedSharedGuardian);

        return Command::SUCCESS;
    }

    private function makeEmailLocalPartFromStudentName(string $name): string
    {
        $lower = mb_strtolower(trim($name), 'UTF-8');
        $lower = preg_replace('/[^\p{L}\p{N}]+/u', '', $lower) ?? '';

        return $lower;
    }
}
