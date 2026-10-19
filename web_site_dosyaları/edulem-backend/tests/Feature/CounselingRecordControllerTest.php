<?php

namespace Tests\Feature;

use App\Models\CounselingRecord;
use App\Models\Role;
use App\Models\Student;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CounselingRecordControllerTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Role $guidanceRole;
    private Role $managerRole;
    private Role $studentAffairsRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();

        $this->guidanceRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Rehberlik',
            'display_name' => 'Rehberlik',
            'description' => 'Rehberlik rolü',
            'is_system' => false,
        ]);

        $this->managerRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Müdür',
            'display_name' => 'Müdür',
            'description' => 'Müdür rolü',
            'is_system' => false,
        ]);

        $this->studentAffairsRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Öğrenci İşleri',
            'display_name' => 'Öğrenci İşleri',
            'description' => 'Öğrenci işleri rolü',
            'is_system' => false,
        ]);

        // ActivityLogService fallback uses user_id=1 when Auth::user() is null.
        // Ensure user id=1 exists to prevent FK errors during model factory creates.
        User::factory()->create([
            'id' => 1,
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->guidanceRole->id,
        ]);
    }

    public function test_guidance_user_sees_only_own_records(): void
    {
        $guidanceUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->guidanceRole->id,
        ]);

        $otherGuidance = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->guidanceRole->id,
        ]);

        $student = Student::factory()->create(['tenant_id' => $this->tenant->id]);

        $ownPrivate = CounselingRecord::create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'counselor_id' => $guidanceUser->id,
            'subject' => 'Özel görüşme',
            'meeting_at' => now()->subHour(),
            'content' => 'Özel içerik',
            'is_private' => true,
        ]);

        $ownShared = CounselingRecord::create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'counselor_id' => $guidanceUser->id,
            'subject' => 'Paylaşılan görüşme',
            'meeting_at' => now(),
            'content' => 'Paylaşılan içerik',
            'is_private' => false,
        ]);

        CounselingRecord::create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'counselor_id' => $otherGuidance->id,
            'subject' => 'Başka danışman',
            'meeting_at' => now()->addHour(),
            'content' => 'Görünmemeli',
            'is_private' => false,
        ]);

        $response = $this->actingAs($guidanceUser, 'sanctum')
            ->getJson('/api/v1/counseling/records');

        $response->assertStatus(200)
            ->assertJsonPath('status', true);

        $recordIds = collect($response->json('data.records'))->pluck('id')->all();

        $this->assertCount(2, $recordIds);
        $this->assertContains($ownPrivate->id, $recordIds);
        $this->assertContains($ownShared->id, $recordIds);
    }

    public function test_admin_user_sees_only_non_private_records(): void
    {
        $guidanceUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->guidanceRole->id,
        ]);

        $adminUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->managerRole->id,
        ]);

        $student = Student::factory()->create(['tenant_id' => $this->tenant->id]);

        $privateRecord = CounselingRecord::create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'counselor_id' => $guidanceUser->id,
            'subject' => 'Özel',
            'meeting_at' => now()->subHour(),
            'content' => 'Sadece rehber',
            'is_private' => true,
        ]);

        $sharedRecord = CounselingRecord::create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'counselor_id' => $guidanceUser->id,
            'subject' => 'Paylaşılan',
            'meeting_at' => now(),
            'content' => 'İdare görebilir',
            'is_private' => false,
        ]);

        $response = $this->actingAs($adminUser, 'sanctum')
            ->getJson('/api/v1/counseling/records');

        $response->assertStatus(200)
            ->assertJsonPath('status', true);

        $recordIds = collect($response->json('data.records'))->pluck('id')->all();

        $this->assertCount(1, $recordIds);
        $this->assertContains($sharedRecord->id, $recordIds);
        $this->assertNotContains($privateRecord->id, $recordIds);
    }

    public function test_student_affairs_user_cannot_access_module(): void
    {
        $studentAffairsUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->studentAffairsRole->id,
        ]);

        $response = $this->actingAs($studentAffairsUser, 'sanctum')
            ->getJson('/api/v1/counseling/records');

        $response->assertStatus(403)
            ->assertJsonPath('status', false);
    }

    public function test_store_rejects_student_from_other_tenant(): void
    {
        $guidanceUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $this->guidanceRole->id,
        ]);

        $otherTenant = Tenant::factory()->create();
        $otherTenantStudent = Student::factory()->create([
            'tenant_id' => $otherTenant->id,
        ]);

        $response = $this->actingAs($guidanceUser, 'sanctum')
            ->postJson('/api/v1/counseling/records', [
                'student_id' => $otherTenantStudent->id,
                'subject' => 'Tenant dışı deneme',
                'meeting_at' => now()->toDateTimeString(),
                'content' => 'Bu kayıt oluşturulmamalı',
                'is_private' => true,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('status', false);
    }
}
