<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    /**
     * Log a create action.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return \App\Models\ActivityLog
     */
    public function logCreate(Model $model): ActivityLog
    {
        $user = $this->getCurrentUser();
        $impersonatorId = $this->getImpersonatorId();

        return ActivityLog::create([
            'tenant_id' => $this->getTenantId($model, $user),
            'user_id' => $user?->id ?? 1, // Test ortamı için fallback
            'impersonator_id' => $impersonatorId,
            'action' => 'create',
            'entity_type' => get_class($model),
            'entity_id' => $model->id,
            'old_values' => null,
            'new_values' => $this->getModelAttributes($model),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log an update action.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return \App\Models\ActivityLog
     */
    public function logUpdate(Model $model): ?ActivityLog
    {
        $user = $this->getCurrentUser();
        $impersonatorId = $this->getImpersonatorId();

        $oldValues = [];
        $newValues = [];

        foreach ($model->getDirty() as $key => $value) {
            // Hassas bilgileri loglama
            if (in_array($key, $this->getHiddenAttributes($model))) {
                continue;
            }

            $oldValues[$key] = $model->getOriginal($key);
            $newValues[$key] = $value;
        }

        // Eğer değişiklik yoksa log kaydetme
        if (empty($newValues)) {
            return null;
        }

        return ActivityLog::create([
            'tenant_id' => $this->getTenantId($model, $user),
            'user_id' => $user?->id ?? 1, // Test ortamı için fallback
            'impersonator_id' => $impersonatorId,
            'action' => 'update',
            'entity_type' => get_class($model),
            'entity_id' => $model->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log a delete action.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return \App\Models\ActivityLog
     */
    public function logDelete(Model $model): ActivityLog
    {
        $user = $this->getCurrentUser();
        $impersonatorId = $this->getImpersonatorId();

        return ActivityLog::create([
            'tenant_id' => $this->getTenantId($model, $user),
            'user_id' => $user?->id ?? 1, // Test ortamı için fallback
            'impersonator_id' => $impersonatorId,
            'action' => 'delete',
            'entity_type' => get_class($model),
            'entity_id' => $model->id,
            'old_values' => $this->getModelAttributes($model),
            'new_values' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log a login action.
     *
     * @param  \App\Models\User  $user
     * @return \App\Models\ActivityLog
     */
    public function logLogin($user): ActivityLog
    {
        try {
            return ActivityLog::create([
                'tenant_id' => $user->tenant_id, // SuperAdmin için null olabilir
                'user_id' => $user->id,
                'impersonator_id' => null,
                'action' => 'login',
                'entity_type' => get_class($user),
                'entity_id' => $user->id,
                'old_values' => null,
                'new_values' => [
                    'login_at' => now()->toDateTimeString(),
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            // Log hatası login'i engellemesin
            \Log::error('Activity log error: ' . $e->getMessage());
            // Hata durumunda null döndür (login devam etsin)
            return null;
        }
    }

    /**
     * Log a logout action.
     *
     * @param  \App\Models\User  $user
     * @return \App\Models\ActivityLog
     */
    public function logLogout($user): ActivityLog
    {
        $impersonatorId = $this->getImpersonatorId();

        return ActivityLog::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'impersonator_id' => $impersonatorId,
            'action' => 'logout',
            'entity_type' => get_class($user),
            'entity_id' => $user->id,
            'old_values' => null,
            'new_values' => [
                'logout_at' => now()->toDateTimeString(),
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log a financial change.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @param  string  $action
     * @param  array  $financialData
     * @return \App\Models\ActivityLog
     */
    public function logFinancialChange(Model $model, string $action, array $financialData): ActivityLog
    {
        $user = $this->getCurrentUser();
        $impersonatorId = $this->getImpersonatorId();

        return ActivityLog::create([
            'tenant_id' => $this->getTenantId($model, $user),
            'user_id' => $user?->id ?? 1, // Test ortamı için fallback
            'impersonator_id' => $impersonatorId,
            'action' => "financial_{$action}",
            'entity_type' => get_class($model),
            'entity_id' => $model->id,
            'old_values' => $financialData['old'] ?? null,
            'new_values' => $financialData['new'] ?? null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Get current user.
     *
     * @return \App\Models\User|null
     */
    protected function getCurrentUser()
    {
        // Impersonation durumunda target user'ı döndür
        if (session('impersonating') && session('impersonated_user_id')) {
            return \App\Models\User::find(session('impersonated_user_id'));
        }

        $user = Auth::user();
        // Student (portal öğrenci) users tablosunda olmadığı için null döndür
        if ($user instanceof \App\Models\Student) {
            return null;
        }

        return $user;
    }

    /**
     * Get impersonator ID.
     *
     * @return int|null
     */
    protected function getImpersonatorId(): ?int
    {
        return session('impersonating') ? session('impersonator_id') : null;
    }

    /**
     * Get tenant ID.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @param  \App\Models\User|null  $user
     * @return int|null
     */
    protected function getTenantId(Model $model, $user): ?int
    {
        // Model'de tenant_id varsa onu kullan
        if (isset($model->tenant_id)) {
            return $model->tenant_id;
        }

        // User'dan al
        if ($user && $user->tenant_id) {
            return $user->tenant_id;
        }

        return null;
    }

    /**
     * Get model attributes for logging.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return array
     */
    protected function getModelAttributes(Model $model): array
    {
        $attributes = [];
        $loggableAttributes = method_exists($model, 'getLoggableAttributes') 
            ? $model->getLoggableAttributes() 
            : ($model->fillable ?? []);
        
        $hiddenAttributes = method_exists($model, 'getHiddenFromLogs') 
            ? $model->getHiddenFromLogs() 
            : ['password', 'remember_token'];

        foreach ($loggableAttributes as $attribute) {
            if (!in_array($attribute, $hiddenAttributes) && isset($model->$attribute)) {
                $attributes[$attribute] = $model->$attribute;
            }
        }

        return $attributes;
    }

    /**
     * Get hidden attributes for a model.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return array
     */
    protected function getHiddenAttributes(Model $model): array
    {
        return method_exists($model, 'getHiddenFromLogs') 
            ? $model->getHiddenFromLogs() 
            : ['password', 'remember_token'];
    }
}
