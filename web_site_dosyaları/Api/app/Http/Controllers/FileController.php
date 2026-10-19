<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Services\FileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileController extends ApiController
{
    /**
     * Upload a file.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Services\FileStorageService  $storageService
     * @return \Illuminate\Http\JsonResponse
     */
    public function upload(Request $request, FileStorageService $storageService): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'type' => 'required|string|in:document,image,report,contract,receipt,homework,question',
            'related_type' => 'sometimes|nullable|string',
            'related_id' => 'sometimes|nullable|integer',
        ]);

        try {
            $file = $storageService->upload(
                $request->file('file'),
                $request->type,
                $request->related_type,
                $request->related_id
            );

            return $this->success([
                'file' => [
                    'id' => $file->id,
                    'name' => $file->original_name,
                    'size' => $file->human_size,
                    'mime_type' => $file->mime_type,
                    'type' => $file->type,
                    'url' => $storageService->getDownloadUrl($file),
                ],
            ], 'Dosya başarıyla yüklendi.', 201);
        } catch (\Exception $e) {
            return $this->error('Dosya yüklenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Download a file.
     *
     * @param  int  $id
     * @param  \App\Services\FileStorageService  $storageService
     * @return \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
     */
    public function download(int $id, FileStorageService $storageService)
    {
        try {
            $file = File::findOrFail($id);

            // Permission kontrolü
            $user = auth()->user();
            if (!$user->isSuperAdmin() && $file->tenant_id !== $user->tenant_id) {
                return $this->error('Bu dosyaya erişim yetkiniz bulunmamaktadır.', [], 403);
            }

            // S3 için signed URL döndür
            if ($file->disk === 's3') {
                $url = $storageService->getDownloadUrl($file, 60);
                return response()->json([
                    'status' => true,
                    'data' => ['download_url' => $url],
                    'message' => 'İndirme linki oluşturuldu.',
                ]);
            }

            // Local storage için dosyayı döndür
            if (!Storage::disk($file->disk)->exists($file->path)) {
                return $this->error('Dosya bulunamadı.', [], 404);
            }

            return Storage::disk($file->disk)->download($file->path, $file->original_name);
        } catch (\Exception $e) {
            return $this->error('Dosya indirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get file list.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $query = File::where('tenant_id', $user->tenant_id);

            // Type filtresi
            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            // Related entity filtresi
            if ($request->has('related_type') && $request->has('related_id')) {
                $query->where('related_type', $request->related_type)
                    ->where('related_id', $request->related_id);
            }

            $files = $query->with('uploader:id,name')
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 20));

            return $this->success([
                'files' => $files->map(function ($file) {
                    return [
                        'id' => $file->id,
                        'name' => $file->original_name,
                        'size' => $file->human_size,
                        'mime_type' => $file->mime_type,
                        'type' => $file->type,
                        'uploaded_by' => $file->uploader?->name,
                        'created_at' => $file->created_at->toDateTimeString(),
                    ];
                }),
                'pagination' => [
                    'current_page' => $files->currentPage(),
                    'last_page' => $files->lastPage(),
                    'per_page' => $files->perPage(),
                    'total' => $files->total(),
                ],
            ], 'Dosyalar başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Dosyalar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete a file.
     *
     * @param  int  $id
     * @param  \App\Services\FileStorageService  $storageService
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id, FileStorageService $storageService): JsonResponse
    {
        try {
            $file = File::findOrFail($id);

            // Permission kontrolü
            $user = auth()->user();
            if (!$user->isSuperAdmin() && $file->tenant_id !== $user->tenant_id) {
                return $this->error('Bu dosyayı silme yetkiniz bulunmamaktadır.', [], 403);
            }

            $storageService->delete($file);

            return $this->success([], 'Dosya başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Dosya silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
