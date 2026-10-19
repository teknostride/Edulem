<?php

namespace App\Services;

use App\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileStorageService
{
    /**
     * Upload a file to storage.
     *
     * @param  \Illuminate\Http\UploadedFile  $uploadedFile
     * @param  string  $type
     * @param  string|null  $relatedType
     * @param  int|null  $relatedId
     * @param  string  $disk
     * @return \App\Models\File
     */
    public function upload(
        UploadedFile $uploadedFile,
        string $type,
        ?string $relatedType = null,
        ?int $relatedId = null,
        string $disk = 's3'
    ): File {
        $user = auth()->user();
        $tenantId = $user->tenant_id;

        // Tenant bazlı klasör yapısı
        $folder = $this->getFolderPath($type, $tenantId);
        
        // Dosya adı oluştur (unique)
        $fileName = $this->generateFileName($uploadedFile);
        $filePath = $folder . '/' . $fileName;

        // Dosyayı yükle
        $path = Storage::disk($disk)->putFileAs($folder, $uploadedFile, $fileName);

        // Metadata'yı veritabanına kaydet
        $file = File::create([
            'tenant_id' => $tenantId,
            'name' => $fileName,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'path' => $path,
            'disk' => $disk,
            'mime_type' => $uploadedFile->getMimeType(),
            'size' => $uploadedFile->getSize(),
            'type' => $type,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
            'uploaded_by' => $user->id,
        ]);

        return $file;
    }

    /**
     * Get file download URL (signed URL for S3).
     *
     * @param  \App\Models\File  $file
     * @param  int  $expirationMinutes
     * @return string
     */
    public function getDownloadUrl(File $file, int $expirationMinutes = 60): string
    {
        if ($file->disk === 's3') {
            // S3 signed URL
            return Storage::disk('s3')->temporaryUrl(
                $file->path,
                now()->addMinutes($expirationMinutes)
            );
        }

        // Local storage için public URL
        return Storage::disk($file->disk)->url($file->path);
    }

    /**
     * Delete file from storage and database.
     *
     * @param  \App\Models\File  $file
     * @return bool
     */
    public function delete(File $file): bool
    {
        // Storage'dan sil
        if (Storage::disk($file->disk)->exists($file->path)) {
            Storage::disk($file->disk)->delete($file->path);
        }

        // Veritabanından sil
        return $file->delete();
    }

    /**
     * Get folder path for tenant and file type.
     *
     * @param  string  $type
     * @param  int  $tenantId
     * @return string
     */
    protected function getFolderPath(string $type, int $tenantId): string
    {
        return "tenants/{$tenantId}/{$type}/" . now()->format('Y/m');
    }

    /**
     * Generate unique file name.
     *
     * @param  \Illuminate\Http\UploadedFile  $file
     * @return string
     */
    protected function generateFileName(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $sanitizedBaseName = Str::slug($baseName);
        
        return $sanitizedBaseName . '_' . Str::random(10) . '_' . time() . '.' . $extension;
    }
}
