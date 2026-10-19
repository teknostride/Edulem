<?php

namespace App\Console\Commands;

use App\Actions\CreateStudentAction;
use App\Models\Student;
use Illuminate\Console\Command;

class MigrateEmergencyContactToGuardian extends Command
{
    protected $signature = 'students:migrate-emergency-to-guardian {--tenant_id=} {--dry-run}';

    protected $description = 'If student emergency_contact_info looks like a parent (mother/father) or a guardian contact, migrate it into guardians and clear emergency_contact_info.';

    public function handle(): int
    {
        $tenantId = $this->option('tenant_id');
        $dryRun = (bool) $this->option('dry-run');

        $query = Student::query();
        if ($tenantId !== null && $tenantId !== '') {
            $query->where('tenant_id', (int) $tenantId);
        }

        $processed = 0;
        $migrated = 0;
        $clearedOnly = 0;
        $skippedNoEmergency = 0;
        $skippedMissingPhone = 0;

        $this->info('Starting...');
        if ($dryRun) {
            $this->warn('Dry-run mode: no database changes will be made.');
        }

        $action = new CreateStudentAction();

        $query->with([
            'guardians' => function ($q) {
                $q->withPivot('id', 'relation_type', 'is_legal_guardian')
                    ->orderBy('guardian_student.id');
            },
        ])->orderBy('id')->chunk(200, function ($students) use (&$processed, &$migrated, &$clearedOnly, &$skippedNoEmergency, &$skippedMissingPhone, $dryRun, $action) {
            foreach ($students as $student) {
                $processed++;

                $emergency = null;
                if (is_array($student->emergency_contact_info)) {
                    $emergency = $student->emergency_contact_info;
                } else {
                    // In some legacy rows, emergency_contact_info may not cast correctly (stored as JSON string or other).
                    $rawEmergency = $student->getRawOriginal('emergency_contact_info');
                    if (is_string($rawEmergency) && trim($rawEmergency) !== '') {
                        $decoded = json_decode($rawEmergency, true);
                        if (is_array($decoded)) {
                            $emergency = $decoded;
                        }
                    }
                }
                if (empty($emergency)) {
                    $skippedNoEmergency++;
                    continue;
                }

                $emergencyName = trim((string) data_get($emergency, 'name'));
                $emergencyPhone = trim((string) data_get($emergency, 'phone'));
                $emergencyRelation = trim((string) data_get($emergency, 'relation'));

                if ($emergencyPhone === '') {
                    $skippedMissingPhone++;
                    continue;
                }

                $fatherExists = $student->guardians->contains(function ($g) {
                    $rel = $this->normalizeRelationType($g->pivot->relation_type ?? $g->relation_type ?? null);
                    return $rel === 'father';
                });
                $motherExists = $student->guardians->contains(function ($g) {
                    $rel = $this->normalizeRelationType($g->pivot->relation_type ?? $g->relation_type ?? null);
                    return $rel === 'mother';
                });

                $emRel = $this->normalizeRelationType($emergencyRelation !== '' ? $emergencyRelation : $emergencyName);

                // If emergency is clearly mother/father: move it to guardians if missing, then clear emergency.
                // Otherwise: save as guardian (other) but keep emergency as-is (per requested flow).
                $targetRel = 'other';
                if ($emRel === 'father' || $emRel === 'mother') {
                    $targetRel = $emRel;
                }

                $shouldClearEmergency = $targetRel === 'father' || $targetRel === 'mother';

                $shouldAddGuardian = true;
                if ($targetRel === 'father' && $fatherExists) {
                    $shouldAddGuardian = false;
                }
                if ($targetRel === 'mother' && $motherExists) {
                    $shouldAddGuardian = false;
                }

                $studentSlug = $this->makeEmailLocalPartFromStudentName((string) ($student->name ?? ''));
                $fallbackEmail = $studentSlug !== '' ? ($studentSlug . '@gmail.com') : null;

                $guardiansPayload = [];
                foreach ($student->guardians as $g) {
                    $guardiansPayload[] = [
                        'tc_no' => $g->tc_no,
                        'email' => $g->email,
                        'name' => $g->name,
                        'phone' => $g->phone,
                        'job' => $g->job,
                        'relation_type' => $this->normalizeRelationType($g->pivot->relation_type ?? null),
                        'is_legal_guardian' => (bool) ($g->pivot->is_legal_guardian ?? false),
                    ];
                }

                if ($shouldAddGuardian) {
                    $guardiansPayload[] = [
                        'tc_no' => null,
                        // syncGuardiansForStudent requires tc_no (11 digits) OR email. If emergency contact has no tc/email,
                        // generate a deterministic email from student name.
                        'email' => $fallbackEmail,
                        'name' => $emergencyName,
                        'phone' => $emergencyPhone,
                        'job' => null,
                        'relation_type' => $targetRel,
                        'is_legal_guardian' => in_array($targetRel, ['father', 'mother', 'guardian'], true),
                    ];
                }

                if (! $dryRun) {
                    $action->syncGuardiansForStudent($student, $guardiansPayload);

                    if ($shouldClearEmergency) {
                        // Clear only if the related parent guardian exists now (either already existed, or was just added)
                        $student->load('guardians');
                        $nowFatherExists = $student->guardians->contains(function ($g) {
                            $rel = $this->normalizeRelationType($g->pivot->relation_type ?? $g->relation_type ?? null);
                            return $rel === 'father';
                        });
                        $nowMotherExists = $student->guardians->contains(function ($g) {
                            $rel = $this->normalizeRelationType($g->pivot->relation_type ?? $g->relation_type ?? null);
                            return $rel === 'mother';
                        });
                        $parentOk = $targetRel === 'father' ? $nowFatherExists : ($targetRel === 'mother' ? $nowMotherExists : false);
                        if ($parentOk) {
                            $student->emergency_contact_info = null;
                            $student->save();
                        }
                    }
                }

                if ($shouldAddGuardian) {
                    $migrated++;
                } else {
                    $clearedOnly++;
                }
            }
        });

        $this->newLine();
        $this->info('Done.');
        $this->line('Processed students: ' . $processed);
        $this->line('Migrated emergency -> guardian: ' . $migrated);
        $this->line('Cleared emergency only (parent already exists): ' . $clearedOnly);
        $this->line('Skipped (no emergency): ' . $skippedNoEmergency);
        $this->line('Skipped (emergency phone missing): ' . $skippedMissingPhone);

        return Command::SUCCESS;
    }

    private function normalizeRelationType($value): string
    {
        $raw = mb_strtolower(trim((string) ($value ?? '')), 'UTF-8');
        if ($raw === '') {
            return 'other';
        }

        // remove spaces/punctuation but keep Turkish letters (as requested elsewhere)
        $clean = preg_replace('/[^\p{L}\p{N}]+/u', '', $raw) ?? '';

        // Normalize some common Turkish chars to match keywords
        $ascii = str_replace(['ı', 'İ'], 'i', $clean);
        $ascii = str_replace(['ğ', 'Ğ'], 'g', $ascii);
        $ascii = str_replace(['ü', 'Ü'], 'u', $ascii);
        $ascii = str_replace(['ş', 'Ş'], 's', $ascii);
        $ascii = str_replace(['ö', 'Ö'], 'o', $ascii);
        $ascii = str_replace(['ç', 'Ç'], 'c', $ascii);

        if (in_array($ascii, ['father', 'baba', 'dad'], true)) {
            return 'father';
        }
        if (in_array($ascii, ['mother', 'anne', 'mom'], true)) {
            return 'mother';
        }
        if (in_array($ascii, ['guardian', 'vasi', 'veli'], true)) {
            return 'guardian';
        }

        // If the emergency relation is unknown, keep it as other.
        return 'other';
    }
}
