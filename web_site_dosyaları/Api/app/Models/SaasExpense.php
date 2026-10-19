<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaasExpense extends Model
{
    use HasFactory;

    protected $table = 'saas_expenses';

    protected $fillable = [
        'category',
        'title',
        'amount',
        'expense_date',
        'receipt_no',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
        ];
    }
}
