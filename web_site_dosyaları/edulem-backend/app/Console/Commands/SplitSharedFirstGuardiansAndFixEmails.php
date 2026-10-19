<?php

namespace App\Console\Commands;

use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SplitSharedFirstGuardiansAndFixEmails extends Command
{
    protected $signature = 'guardians:split-shared-first-and-fix-emails {--tenant_id=} {--dry-run}';

    protected $description = 'Fix wrong 1st-guardian emails caused by shared guardians: if the first guardian is linked to multiple students, clone it per-student and set email to <student_name>@gmail.com (lowercase, Turkish chars preserved).';

    public function handle(): int
    {
        $tenantId = $this->option('tenant_id');
        $dryRun = (bool) $this->option('dry-run');

        $query = Student::query();
        if ($tenantId !== null && $tenantId !== '') {
            $query->where('tenant_id', (int) $tenantId);
        }

        $processed = 0;
        $updatedEmail = 0;
        $clonedGuardians = 0;
        $skippedNoGuardian = 0;
        $skippedNoName = 0;

        $this->info('Starting...');
        if ($dryRun) {
            $this->warn('Dry-run mode: no database changes will be made.');
        }

        $query->with([
            'guardians' => function ($q) {
                $q->withPivot('id', 'relation_type', 'is_legal_guardian')
                    ->orderBy('guardian_student.id');
            },
        ])->orderBy('id')->chunk(200, function ($students) use (&$processed, &$updatedEmail, &$clonedGuardians, &$skippedNoGuardian, &$skippedNoName, $dryRun) {
            foreach ($students as $student) {
                $processed++;

                $slug = $this->makeEmailLocalPartFromStudentName((string) ($student->name ?? ''));
                if ($slug === '') {
                    $skippedNoName++;
                    continue;
                }

                $firstGuardian = $student->guardians->first();
                if (! $firstGuardian) {
                    $skippedNoGuardian++;
                    continue;
                }

                $desiredEmail = $slug . '@gmail.com';

                // If guardian belongs to multiple students, clone it for this student.
                $studentCount = $firstGuardian->students()->count();
                if ($studentCount > 1) {
                    if (! $dryRun) {
                        DB::transaction(function () use ($student, $firstGuardian, $desiredEmail, &$clonedGuardians, &$updatedEmail) {
                            $pivot = $firstGuardian->pivot;

                            $clone = new Guardian();
                            $clone->tc_no = null; // avoid accidental identity conflicts
                            $clone->name = $firstGuardian->name;
                            $clone->phone = $firstGuardian->phone;
                            $clone->email = $desiredEmail;
                            $clone->job = $firstGuardian->job;
                            $clone->password = $firstGuardian->password;
                            $clone->email_verified_at = $firstGuardian->email_verified_at;
                            $clone->portal_token = $firstGuardian->portal_token;
                            $clone->portal_token_expires_at = $firstGuardian->portal_token_expires_at;
                            $clone->is_portal_active = $firstGuardian->is_portal_active;
                            $clone->last_login_at = $firstGuardian->last_login_at;
                            $clone->birth_date = $firstGuardian->birth_date;
                            $clone->wedding_anniversary_date = $firstGuardian->wedding_anniversary_date;
                            $clone->save();

                            // Attach clone with same pivot data
                            $student->guardians()->attach($clone->id, [
                                'relation_type' => $pivot->relation_type ?? 'other',
                                'is_legal_guardian' => (bool) ($pivot->is_legal_guardian ?? false),
                            ]);

                            // Detach the shared guardian from this student only
                            $student->guardians()->detach($firstGuardian->id);

                            $clonedGuardians++;
                            $updatedEmail++;
                        });
                    } else {
                        $clonedGuardians++;
                        $updatedEmail++;
                    }

                    continue;
                }

                // Not shared: just overwrite email.
                if ($firstGuardian->email !== $desiredEmail) {
                    if (! $dryRun) {
                        $firstGuardian->email = $desiredEmail;
                        $firstGuardian->save();
                    }
                    $updatedEmail++;
                }
            }
        });

        $this->newLine();
        $this->info('Done.');
        $this->line('Processed students: ' . $processed);
        $this->line('Updated first-guardian emails: ' . $updatedEmail);
        $this->line('Cloned shared first guardians: ' . $clonedGuardians);
        $this->line('Skipped (no guardian): ' . $skippedNoGuardian);
        $this->line('Skipped (name empty): ' . $skippedNoName);

        return Command::SUCCESS;
    }

    private function makeEmailLocalPartFromStudentName(string $name): string
    {
        $lower = mb_strtolower(trim($name), 'UTF-8');
        $lower = preg_replace('/[^\p{L}\p{N}]+/u', '', $lower) ?? '';

        return $lower;
    }
}
