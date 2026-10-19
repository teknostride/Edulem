<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TeacherClassroomScope implements Scope
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

        if (!$user || !$user->role || $user->role->name !== 'teacher') {
            return;
        }

        // Öğretmen sadece kendi sınıf/ders kayıtlarını görebilir
        // İleride teacher_classrooms pivot tablosu eklendiğinde:
        // $builder->whereHas('classrooms', function ($query) use ($user) {
        //     $query->where('teacher_id', $user->id);
        // });

        // Şimdilik user_id ile filtreleme (eğer model'de teacher_id varsa)
        if ($model->getTable() === 'attendances' || $model->getTable() === 'grades') {
            // Öğretmen sadece kendi girdiği kayıtları görebilir
            $builder->where('teacher_id', $user->id);
        }
    }
}
