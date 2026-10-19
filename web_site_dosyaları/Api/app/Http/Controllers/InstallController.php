<?php

namespace App\Http\Controllers;

use App\Services\InstallationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class InstallController extends Controller
{
    protected InstallationService $installationService;

    public function __construct(InstallationService $installationService)
    {
        $this->installationService = $installationService;
    }

    /**
     * Check installation status
     */
    public function check(): JsonResponse
    {
        $isInstalled = $this->installationService->isInstalled();

        return response()->json([
            'status' => true,
            'installed' => $isInstalled,
        ]);
    }

    /**
     * Test database connection
     */
    public function testConnection(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'host' => 'required|string',
            'port' => 'required|integer|min:1|max:65535',
            'database' => 'required|string',
            'username' => 'required|string',
            'password' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Geçersiz veri',
                'errors' => $validator->errors(),
            ], 422);
        }

        $result = $this->installationService->testConnection($request->all());

        return response()->json($result);
    }

    /**
     * Run installation
     */
    public function install(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'database' => 'required|array',
            'database.host' => 'required|string',
            'database.port' => 'required|integer|min:1|max:65535',
            'database.database' => 'required|string',
            'database.username' => 'required|string',
            'database.password' => 'nullable|string',
            'admin' => 'required|array',
            'admin.name' => 'required|string|min:3',
            'admin.email' => 'required|email',
            'admin.password' => 'required|string|min:8',
            'admin.password_confirmation' => 'required|same:admin.password',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Geçersiz veri',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if already installed
        if ($this->installationService->isInstalled()) {
            return response()->json([
                'status' => false,
                'message' => 'Sistem zaten kurulmuş',
            ], 400);
        }

        $result = $this->installationService->install(
            $request->input('database'),
            $request->input('admin')
        );

        if ($result['success']) {
            return response()->json([
                'status' => true,
                'message' => $result['message'],
            ]);
        }

        return response()->json([
            'status' => false,
            'message' => $result['message'],
        ], 500);
    }
}
