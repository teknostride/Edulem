<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class GuidanceStudentScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::user();

        if (!$user || !$user->role || $user->role->name !== 'guidance') {
            return;
        }

        // Rehber öğretmen sadece sorumlu olduğu öğrencileri görebilir
        // İleride guidance_students pivot tablosu eklendiğinde:
        // $builder->whereHas('guidanceStudents', function ($query) use ($user) {
        //     $query->where('guidance_teacher_id', $user->id);
        // });

        // Şimdilik user_id ile filtreleme (eğer model'de guidance_teacher_id varsa)
        if ($model->getTable() === 'students') {
            // Rehber öğretmen sadece kendisine atanmış öğrencileri görebilir
            // $builder->where('guidance_teacher_id', $user->id);
            // Şimdilik tüm öğrencileri görebilir (ileride pivot tablo eklenecek)
        }
    }
}
