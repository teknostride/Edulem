<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class HomeworkResource extends ApiResource
{
    /**
     * Kurucu, Müdür, Müdür Yardımcısı tam alanları görsün (takip modu).
     */
    public function toArray($request): array
    {
        $user = $request->user();
        $roleName = $user && $user->role ? $user->role->name : null;

        if ($user && in_array($roleName, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik'], true)) {
            return $this->getTeacherFields();
        }

        if ($user && in_array($roleName, ['owner', 'Kurucu', 'Kurum Sahibi', 'institution_owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true)) {
            return $this->getAllFields();
        }

        $fields = parent::toArray($request);

        // Öğrenci veya veli sorguluyorsa kişiselleştirilmiş değerlendirme bilgilerini ekle
        $studentId = null;
        if ($user instanceof \App\Models\Student) {
            $studentId = $user->id;
        } elseif ($user instanceof \App\Models\Guardian) {
            $requestedStudentId = (int) $request->input('student_id', 0);
            if ($requestedStudentId > 0) {
                $studentId = $requestedStudentId;
            } else {
                $studentId = $user->students()->where('tenant_id', $this->tenant_id)->value('students.id');
            }
        }

        if ($studentId) {
            $assignment = $this->assignments()->where('student_id', $studentId)->first();
            $submission = $this->submissions()->where('student_id', $studentId)->first();
            $isChecked = !empty($assignment?->review_status);
            $isOverdue = $this->due_date && \Illuminate\Support\Carbon::parse($this->due_date)->endOfDay()->isPast();

            $statusLabel = match ($assignment?->review_status) {
                'done' => 'Yapıldı',
                'completed' => 'Tamamlandı',
                'partial' => 'Eksik',
                'not_done' => 'Yapılmadı',
                'absent' => 'Gelmedi',
                'missing' => 'Gelmedi',
                default => 'Değerlendirilmedi',
            };

            $fields['is_checked'] = $isChecked;
            $fields['review_status'] = $assignment?->review_status;
            $fields['teacher_note'] = $assignment?->teacher_note;
            $fields['status_label'] = $statusLabel;
            $fields['status'] = $isChecked ? ($assignment?->review_status ?? 'submitted') : ($isOverdue ? 'overdue' : 'pending');

            $fields['review'] = [
                'status' => $assignment?->review_status,
                'status_label' => $statusLabel,
                'teacher_note' => $assignment?->teacher_note,
                'reviewed_at' => $assignment?->reviewed_at?->format('Y-m-d H:i'),
            ];

            if ($submission) {
                $fields['submission'] = [
                    'id' => $submission->id,
                    'status' => $submission->status,
                    'submitted_at' => $submission->submitted_at?->format('Y-m-d H:i'),
                    'grade' => $submission->score,
                    'selected_topic' => $submission->project_topic_id !== null && isset($this->project_topics[$submission->project_topic_id])
                        ? $this->project_topics[$submission->project_topic_id]
                        : null,
                ];
            }
        }

        return $fields;
    }

    /**
     * Get public fields (visible to all authenticated users).
     *
     * @return array<string, mixed>
     */
    protected function getPublicFields(): array
    {
        $fields = [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'assignment_mode' => $this->assignment_mode,
            'due_date' => $this->due_date ? $this->due_date->format('Y-m-d') : null,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
            'is_checked' => (bool) ($this->is_checked ?? false),
            'checked_assignments_count' => (int) ($this->checked_assignments_count ?? 0),
            'graded_count' => (int) ($this->graded_count ?? 0),
            'total_students' => (int) ($this->assignments_count ?? 0),
        ];

        if ($this->relationLoaded('lesson') && $this->lesson) {
            $fields['lesson'] = [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
                'code' => $this->lesson->code,
            ];
            $fields['lesson_id'] = $this->lesson->id;
        }

        if ($this->relationLoaded('classroom') && $this->classroom) {
            $fields['classroom'] = [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
            ];
            $fields['classroom_id'] = $this->classroom->id;
        }

        if ($this->relationLoaded('teacher') && $this->teacher) {
            $fields['teacher'] = [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ];
            $fields['teacher_id'] = $this->teacher->id;
        }

        if ($this->relationLoaded('file') && $this->file) {
            $fields['file'] = [
                'id' => $this->file->id,
                'name' => $this->file->original_name ?? $this->file->name,
                'url' => $this->file->url ?? ($this->file->path ? asset('storage/' . $this->file->path) : null),
                'path' => $this->file->path,
            ];
        }

        $fields['is_online'] = (bool) $this->is_online;
        $fields['is_project'] = (bool) $this->is_project;
        if ($this->is_project && !empty($this->project_topics)) {
            $fields['project_topics'] = $this->project_topics;
        }

        return $fields;
    }

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('lesson') && $this->lesson) {
            $fields['lesson'] = [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
                'code' => $this->lesson->code,
            ];
            $fields['lesson_id'] = $this->lesson->id;
        }
        
        if ($this->relationLoaded('classroom') && $this->classroom) {
            $fields['classroom'] = [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
            ];
            $fields['classroom_id'] = $this->classroom->id;
        }

        if ($this->relationLoaded('assignments')) {
            $fields['assigned_student_ids'] = $this->assignments->pluck('student_id')->map(fn ($id) => (int) $id)->values()->all();
        }
        
        $fields['description'] = $this->description;
        
        return $fields;
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('lesson') && $this->lesson) {
            $fields['lesson'] = [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
                'code' => $this->lesson->code,
            ];
            $fields['lesson_id'] = $this->lesson->id;
        }
        
        if ($this->relationLoaded('classroom') && $this->classroom) {
            $fields['classroom'] = [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
            ];
            $fields['classroom_id'] = $this->classroom->id;
        }
        
        if ($this->relationLoaded('teacher') && $this->teacher) {
            $fields['teacher'] = [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ];
        }
        
        if ($this->relationLoaded('file') && $this->file) {
            $fields['file'] = [
                'id' => $this->file->id,
                'name' => $this->file->original_name,
                'path' => $this->file->path,
            ];
        }
        
        $fields['description'] = $this->description;
        $fields['is_online'] = $this->is_online;
        $fields['is_online_homework'] = $this->isOnline();
        if ($this->is_online) {
            $fields['question_ids'] = $this->question_ids;
        }
        $fields['is_project'] = $this->is_project;
        $fields['is_project_homework'] = $this->isProject();
        if ($this->is_project) {
            $fields['project_topics'] = $this->project_topics;
        }
        if ($this->relationLoaded('submissions')) {
            $fields['submissions_count'] = $this->submissions->count();
        }
        if (isset($this->submissions_count)) {
            $fields['submissions_count'] = $this->submissions_count;
        }
        if (isset($this->graded_count)) {
            $fields['graded_count'] = $this->graded_count;
        }
        if (isset($this->submissions_max_graded_at) && $this->submissions_max_graded_at) {
            $fields['last_graded_at'] = \Carbon\Carbon::parse($this->submissions_max_graded_at)->format('Y-m-d H:i:s');
        }
        if (isset($this->assignments_max_reviewed_at) && $this->assignments_max_reviewed_at) {
            $fields['last_graded_at'] = \Carbon\Carbon::parse($this->assignments_max_reviewed_at)->format('Y-m-d H:i:s');
        }
        if (isset($this->has_teacher_notes_count)) {
            $fields['has_teacher_notes'] = (int) $this->has_teacher_notes_count > 0;
        }
        if (isset($this->checked_assignments_count)) {
            $fields['checked_assignments_count'] = (int) $this->checked_assignments_count;
        }
        if ($this->relationLoaded('assignments')) {
            $fields['assigned_student_ids'] = $this->assignments->pluck('student_id')->map(fn ($id) => (int) $id)->values()->all();
        }
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');

        return $fields;
    }
}
