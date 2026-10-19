<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScholarshipDocumentTemplateRequest;
use App\Http\Requests\UpdateScholarshipDocumentTemplateRequest;
use App\Http\Resources\ScholarshipDocumentTemplateResource;
use App\Models\ScholarshipDocumentTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ScholarshipDocumentTemplateController extends ApiController
{
    public function index(): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;

        $query = ScholarshipDocumentTemplate::query()
            ->where('tenant_id', $tenantId)
            ->with(['classrooms.educationLevel'])
            ->latest('id');

        $templates = $query->paginate(request('per_page', 50));

        return $this->success([
            'templates' => ScholarshipDocumentTemplateResource::collection($templates),
            'pagination' => [
                'current_page' => $templates->currentPage(),
                'last_page' => $templates->lastPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
            ],
        ], 'Belge şablonları başarıyla listelendi.');
    }

    public function store(StoreScholarshipDocumentTemplateRequest $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $data = $request->validated();

        $classroomIds = array_values(array_unique($data['classroom_ids'] ?? []));

        $conflict = DB::table('scholarship_document_template_classroom as sdtc')
            ->join('scholarship_document_templates as sdt', 'sdt.id', '=', 'sdtc.template_id')
            ->where('sdt.tenant_id', $tenantId)
            ->whereNull('sdt.deleted_at')
            ->whereIn('sdtc.classroom_id', $classroomIds)
            ->exists();

        if ($conflict) {
            return $this->error('Seçilen sınıflardan en az biri için zaten bir belge şablonu bulunmaktadır. Her sınıf için sadece 1 şablon olabilir.', [], 422);
        }

        return DB::transaction(function () use ($tenantId, $data, $classroomIds) {
            $template = ScholarshipDocumentTemplate::create([
                'tenant_id' => $tenantId,
                'name' => $data['name'] ?? null,
                'exam_entry_date' => $data['exam_entry_date'],
                'exam_entry_time' => $data['exam_entry_time'] ?? null,
                'school_name' => $data['school_name'],
                'exam_address' => $data['exam_address'],
                'notes' => $data['notes'] ?? null,
            ]);

            $template->classrooms()->sync($classroomIds);

            return $this->success(
                new ScholarshipDocumentTemplateResource($template->load(['classrooms.educationLevel'])),
                'Belge şablonu başarıyla oluşturuldu.',
                201
            );
        });
    }

    public function show(ScholarshipDocumentTemplate $scholarshipDocumentTemplate): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;

        if ((int) $scholarshipDocumentTemplate->tenant_id !== (int) $tenantId) {
            return $this->error('Şablon bulunamadı.', [], 404);
        }

        return $this->success(new ScholarshipDocumentTemplateResource($scholarshipDocumentTemplate->load(['classrooms.educationLevel'])));
    }

    public function update(UpdateScholarshipDocumentTemplateRequest $request, ScholarshipDocumentTemplate $scholarshipDocumentTemplate): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        if ((int) $scholarshipDocumentTemplate->tenant_id !== (int) $tenantId) {
            return $this->error('Şablon bulunamadı.', [], 404);
        }

        $data = $request->validated();

        if (array_key_exists('classroom_ids', $data)) {
            $classroomIds = array_values(array_unique($data['classroom_ids'] ?? []));

            $conflict = DB::table('scholarship_document_template_classroom as sdtc')
                ->join('scholarship_document_templates as sdt', 'sdt.id', '=', 'sdtc.template_id')
                ->where('sdt.tenant_id', $tenantId)
                ->whereNull('sdt.deleted_at')
                ->where('sdt.id', '!=', $scholarshipDocumentTemplate->id)
                ->whereIn('sdtc.classroom_id', $classroomIds)
                ->exists();

            if ($conflict) {
                return $this->error('Seçilen sınıflardan en az biri için zaten bir belge şablonu bulunmaktadır. Her sınıf için sadece 1 şablon olabilir.', [], 422);
            }
        }

        return DB::transaction(function () use ($scholarshipDocumentTemplate, $data) {
            $scholarshipDocumentTemplate->update($data);

            if (array_key_exists('classroom_ids', $data)) {
                $scholarshipDocumentTemplate->classrooms()->sync(array_values(array_unique($data['classroom_ids'] ?? [])));
            }

            return $this->success(
                new ScholarshipDocumentTemplateResource($scholarshipDocumentTemplate->fresh()->load(['classrooms.educationLevel'])),
                'Belge şablonu başarıyla güncellendi.'
            );
        });
    }

    public function destroy(ScholarshipDocumentTemplate $scholarshipDocumentTemplate): JsonResponse
    {
        $tenantId = request()->user()->tenant_id;

        if ((int) $scholarshipDocumentTemplate->tenant_id !== (int) $tenantId) {
            return $this->error('Şablon bulunamadı.', [], 404);
        }

        $scholarshipDocumentTemplate->delete();

        return $this->success(null, 'Belge şablonu başarıyla silindi.');
    }
}
