<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Scholarship extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'tc_kimlik',
        'ad_soyad',
        'okul_adi',
        'classroom_id',
        'sinif_adi',
        'veli_ad_soyad',
        'dogum_tarihi',
        'veli_iletisim',
        'durum',
    ];

    protected $casts = [
        'dogum_tarihi' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $attributes = [
        'durum' => 'aktif',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function classroom()
    {
        return $this->belongsTo(Classroom::class);
    }

    // Aktif kayıtları getir
    public function scopeActive($query)
    {
        return $query->where('durum', 'aktif');
    }

    // Pasif (arşiv) kayıtları getir
    public function scopeInactive($query)
    {
        return $query->where('durum', 'pasif');
    }

    // TC kimlik no ile arama
    public function scopeByTcKimlik($query, $tcKimlik)
    {
        return $query->where('tc_kimlik', $tcKimlik);
    }

    // Ada göre arama
    public function scopeByName($query, $name)
    {
        return $query->where('ad_soyad', 'like', "%{$name}%");
    }

    // Veli adına göre arama
    public function scopeByParentName($query, $parentName)
    {
        return $query->where('veli_ad_soyad', 'like', "%{$parentName}%");
    }

    // Veli telefonuna göre arama
    public function scopeByParentPhone($query, $parentPhone)
    {
        return $query->where('veli_iletisim', 'like', "%{$parentPhone}%");
    }

    // Sınıf düzeyine göre filtrele
    public function scopeBySinifAdi($query, $sinifAdi)
    {
        return $query->where('sinif_adi', $sinifAdi);
    }

    // Sınıf ID'sine göre filtrele
    public function scopeByClassroomId($query, $classroomId)
    {
        return $query->where('classroom_id', $classroomId);
    }

    // Sınıfa göre arama (hem classroom_id hem de sinif_adi)
    public function scopeByClass($query, $classId = null, $sinifAdi = null)
    {
        if ($classId) {
            $query->where('classroom_id', $classId);
        } elseif ($sinifAdi) {
            $query->where('sinif_adi', $sinifAdi)->whereNull('classroom_id');
        }
        
        return $query;
    }

    // Ada göre sırala
    public function scopeOrderByName($query)
    {
        return $query->orderBy('ad_soyad');
    }

    // Oluşturulma tarihine göre sırala
    public function scopeOrderByCreated($query, $direction = 'desc')
    {
        return $query->orderBy('created_at', $direction);
    }

    // Formatlı doğum tarihi
    public function getFormattedDogumTarihiAttribute()
    {
        return $this->dogum_tarihi ? $this->dogum_tarihi->format('d.m.Y') : null;
    }

    // Formatlı veli telefonu
    public function getFormattedVeliIletisimAttribute()
    {
        return $this->veli_iletisim;
    }

    // Durum metni
    public function getDurumTextAttribute()
    {
        return $this->durum === 'aktif' ? 'Aktif' : 'Arşiv';
    }

    // Aynı TC kimlik ile kayıt kontrolü
    public static function existsByTcKimlik($tenantId, $tcKimlik, $excludeId = null)
    {
        $query = static::where('tenant_id', $tenantId)
            ->where('tc_kimlik', $tcKimlik)
            ->where('durum', 'aktif');
            
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return $query->exists();
    }

    // Aynı ad-soyad ile kayıt kontrolü
    public static function existsByName($tenantId, $adSoyad, $excludeId = null)
    {
        $query = static::where('tenant_id', $tenantId)
            ->whereRaw('LOWER(TRIM(ad_soyad)) = LOWER(TRIM(?))', [$adSoyad])
            ->where('durum', 'aktif');
            
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return $query->first();
    }
}
