<?php

namespace App\Http\Controllers;

use App\Http\Resources\CityResource;
use App\Http\Resources\DistrictResource;
use App\Models\City;
use App\Models\District;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;

class LocationController extends ApiController
{
    /**
     * Get all cities (with cache).
     *
     * @param  \App\Services\CacheService  $cacheService
     * @return \Illuminate\Http\JsonResponse
     */
    public function cities(CacheService $cacheService): JsonResponse
    {
        try {
            $cities = $cacheService->getCities();
            return $this->success(CityResource::collection($cities), 'İller başarıyla getirildi.');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Cities fetch error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            return $this->error('İller getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get districts by city ID (bağımlı seçim - with cache).
     *
     * @param  int  $cityId
     * @param  \App\Services\CacheService  $cacheService
     * @return \Illuminate\Http\JsonResponse
     */
    public function districts(int $cityId, CacheService $cacheService): JsonResponse
    {
        try {
            $districts = $cacheService->getDistricts($cityId);
            return $this->success(DistrictResource::collection($districts), 'İlçeler başarıyla getirildi.');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Districts fetch error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            return $this->error('İlçeler getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
