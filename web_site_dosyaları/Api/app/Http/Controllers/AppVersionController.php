<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AppVersionController extends Controller
{
    /**
     * Return the latest app version information.
     */
    public function index(): JsonResponse
    {
        $setting = Setting::first();
        $latest = $setting->app_version ?? '1.0.0';
        $minRequired = $setting->min_required_version ?? '1.0.0';

        return response()->json([
            'latest_version' => $latest,
            'min_required_version' => $minRequired,
        ]);
    }

    /**
     * Update the app version information (for Kurucu / Owner / Admin).
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Yetkisiz erişim.',
            ], 401);
        }

        // Allow kurucu, owner, admin, superadmin
        $roleName = strtolower(trim($user->role->name ?? ''));
        $isAuthorized = $user->is_superadmin || in_array($roleName, ['owner', 'kurucu', 'admin', 'genel müdür', 'founder'], true);

        if (!$isAuthorized) {
            return response()->json([
                'success' => false,
                'message' => 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.',
            ], 403);
        }

        $validated = $request->validate([
            'latest_version' => ['required', 'string', 'max:50'],
            'min_required_version' => ['required', 'string', 'max:50'],
        ]);

        $latest = trim($validated['latest_version']);
        $minRequired = trim($validated['min_required_version']);

        $setting = Setting::first();
        if (!$setting) {
            Setting::create([
                'key' => 'app_version_config',
                'value' => 'app_version',
                'app_version' => $latest,
                'min_required_version' => $minRequired,
            ]);
        } else {
            Setting::query()->update([
                'app_version' => $latest,
                'min_required_version' => $minRequired,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Edulem mobil uygulama sürüm bilgileri başarıyla güncellendi.',
            'latest_version' => $latest,
            'min_required_version' => $minRequired,
            'data' => [
                'latest_version' => $latest,
                'min_required_version' => $minRequired,
            ],
        ]);
    }
}
?>