<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

abstract class ApiResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $user = $request->user();
        
        if (!$user) {
            return $this->getPublicFields();
        }

        // Field-Level Security: Kullanıcının rolüne göre alanları filtrele
        $role = $user->role ?? null;
        
        // SuperAdmin ve Genel Müdür tüm alanları görebilir
        $isSuperAdmin = ($user instanceof \App\Models\User && method_exists($user, 'isSuperAdmin')) ? $user->isSuperAdmin() : false;
        
        if ($isSuperAdmin || $role?->name === 'general_manager') {
            return $this->getAdminFields();
        }
        
        return match ($role?->name ?? 'default') {
            'teacher' => $this->getTeacherFields(),
            'accountant' => $this->getAccountantFields(),
            'guidance' => $this->getGuidanceFields(),
            'school_principal', 'campus_manager' => $this->getAdminFields(),
            default => $this->getPublicFields(),
        };
    }

    /**
     * Get public fields (visible to all authenticated users).
     *
     * @return array<string, mixed>
     */
    abstract protected function getPublicFields(): array;

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        return $this->getPublicFields();
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
     * Get guidance-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getGuidanceFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get admin-specific fields (all fields).
     *
     * @return array<string, mixed>
     */
    protected function getAdminFields(): array
    {
        return $this->getAllFields();
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    abstract protected function getAllFields(): array;

    /**
     * Filter fields based on user role and permissions.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function filterFields(array $data): array
    {
        $request = request();
        $user = $request->user();
        
        if (!$user) {
            $allowedFields = $this->getPublicFields();
        } else {
            $role = $user->role ?? null;
            
            // SuperAdmin ve Genel Müdür tüm alanları görebilir
            $isSuperAdmin = ($user instanceof \App\Models\User && method_exists($user, 'isSuperAdmin')) ? $user->isSuperAdmin() : false;

            if ($isSuperAdmin || $role?->name === 'general_manager') {
                $allowedFields = $this->getAdminFields();
            } else {
                $allowedFields = match ($role?->name ?? 'default') {
                    'teacher' => $this->getTeacherFields(),
                    'accountant' => $this->getAccountantFields(),
                    'guidance' => $this->getGuidanceFields(),
                    'school_principal', 'campus_manager' => $this->getAdminFields(),
                    default => $this->getPublicFields(),
                };
            }
        }
        
        // Sadece izin verilen field'ları döndür
        return array_intersect_key($data, array_flip($allowedFields));
    }
}
