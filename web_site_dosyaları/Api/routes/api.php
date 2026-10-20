<?php



use App\Http\Controllers\StudentController;

use App\Http\Controllers\CounselingController;

use App\Http\Controllers\MessageController;

use App\Http\Controllers\AnnouncementController;

use App\Http\Controllers\ExamController;

use App\Http\Controllers\GradeController;

use App\Http\Controllers\HomeworkController;

use App\Http\Controllers\QuestionBankController;

use App\Http\Controllers\QuestionBankTopicController;

use App\Http\Controllers\CurriculumTrackingController;

use App\Http\Controllers\OnlineExamController;

use App\Http\Controllers\FileController;

use App\Http\Controllers\Portal\StudentPortalController;

use Illuminate\Http\Request;

use App\Http\Controllers\TutoringSessionController;

use App\Http\Controllers\SmsTemplateController;

use App\Http\Controllers\ScheduledSmsController;

use App\Http\Controllers\SmsReportController;

use App\Http\Controllers\SmsBlacklistController;

use App\Http\Controllers\SmsBirthdayController;

use App\Http\Controllers\OnlineSurveyController;

use App\Http\Controllers\FormSurveyController;

use App\Http\Controllers\MealMenuController;

use App\Http\Controllers\DutyScheduleController;

use App\Http\Controllers\AppointmentController;

use App\Http\Controllers\ActivityController;

use App\Http\Controllers\BulletinController;

use App\Http\Controllers\InternalMessageController;

use App\Http\Controllers\CalendarEventController;

use App\Http\Controllers\LeadController;

use App\Http\Controllers\AchievementCertificateController;

use App\Http\Controllers\ContractController;

use App\Http\Controllers\ScholarshipController;

use App\Http\Controllers\ScholarshipExamController;

use App\Http\Controllers\StaffAssignmentController;

use App\Http\Controllers\MeasurementController;

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AppVersionController;



// Test Announcements (no auth required) - EN DIŞTA

Route::prefix('v1/test-announcements')->group(function () {

    Route::get('/', [AnnouncementController::class, 'index']);

    Route::get('/unread-count', [AnnouncementController::class, 'unreadCount']);

});
Route::get('app/version', [AppVersionController::class, 'index']);
Route::get('v1/app/version', [AppVersionController::class, 'index']);



/*

|--------------------------------------------------------------------------

| API Routes

|--------------------------------------------------------------------------

|

| Here is where you can register API routes for your application. These

| routes are loaded by the RouteServiceProvider and all of them will

| be assigned to the "api" middleware group. Make something great!

|

*/



Route::prefix('v1')->group(function () {

    // Public auth routes (login/register) - auth:sanctum OLMADAN

    Route::prefix('auth')->group(function () {

        Route::post('/login', [App\Http\Controllers\AuthController::class, 'login']);

        Route::post('/register', [App\Http\Controllers\AuthController::class, 'register']);

    });



    Route::get('/restore-perms', function () {

        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'Database\\Seeders\\RoleSeeder']);

        return response()->json(['message' => 'Role and permissions restored successfully.']);

    });

    Route::get('/clear-cache', function () {
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        return response()->json(['status' => true, 'message' => 'Önbellek temizlendi.']);
    });



    // Korunan rotalar (auth:sanctum + eager.auth: role ilişkisini tek seferde yükle)

    Route::get('/test-teacher-schedule', function () {

    $user = \App\Models\User::where('role_id', 5)->first();

    if (!$user) return response()->json(['error' => 'No teacher found']);

    auth()->login($user);



    try {

        $ctrl = app(DutyScheduleController::class);

        $res1 = $ctrl->index();

    } catch (\Throwable $e) {

        return response()->json(['error' => 'DutySchedule index failed: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine()]);

    }



    try {

        request()->merge(['role_id' => 5]);

        $ctrl2 = app(\App\Http\Controllers\UserController::class);

        $res2 = $ctrl2->index();

    } catch (\Throwable $e) {

        return response()->json(['error' => 'UserController index failed: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine()]);

    }



    return response()->json(['success' => true]);
});

Route::get('/test-fcm', function () {
    try {
        $modelExists = class_exists(\App\Models\DeviceToken::class);
        $tokens = $modelExists ? \App\Models\DeviceToken::all() : collect([]);
        $targetFile = storage_path('app/firebase-credentials.json');
        if (!file_exists($targetFile)) {
            $b64 = 'ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiZWR1bGVtLTUwMDIyIiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiMzg3NDYwZThmZWE1NDEwOWM1ZTU2Nzk0ZTFlNjJiOTM0ODFhZjBmNSIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZRSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2N3Z2dTakFnRUFBb0lCQVFDcUhsSktrOFdRdzFNb1xuTCtlTnZsZ0pwak1RMGNtcTJzUG9oME43cGE3V2JoQ1lqb3pTMUtRcnluZWg3Y1c0OUI0bVNIN0hpRzIvaE9yd1xuTXZTeG12K1g4eFY3YndRendlVllIWHhyRDk2Tjd3ZmYxQTN1eWJ2Wk5yK0ozbEZnR2EwRityY0sxTVhZSC9EaVxuY2p5YkdMU3FiNlBUTGFkd2JtQ0tDUElOMEdFS3QzaHBwU3RxTVpjaWNEZzJjQjh1UWNsMlNVSnJ2cjJ4d0IvQVxuazdOYVlQVnVXUXlMSGRJd1pDU1V0R1Urekpic09xeTUzNmVsTHViYWtxRFBzUEFabW81UGh5VFJnQk42eFZNYlxuOWkvdTh2bmVEcWJRUWZPczR2ZGJOV05pQkRyRXpEMGZPSXJLQ2xlTlpUY0VseXlKeVdSaFBLT0NKWlVZcDIwdVxuUVROcTFLQVBBZ01CQUFFQ2dnRUFDUWNKSFI2d2wza2llUURPT2pOZVRSTUJwV1F1WGlhMEF5dFluazNOMkFzelxubzVhaVREM1oxcVdDRzdWQzQreGlOaGJCMy82U1NiS2YvN0hKNEoyU1ljdWtFbXNCVGFNb2M1d25vRXdtMkNlT1xucG9iMlB6UmZKQUh5YXNqQjNTMXhhS1daVlh6clJKWWlxcjRRdWloOTZrOC9xUDJvSEpKaWR1S0hGY3JORFV3QVxuKzVIcnlGTEp3NEV1UlpsN005NUNLKzBGUVNOcFdVMnV2VnBNMHcvNm1hZlM0Yk85MzZvN2c3d3Y0NXlGdVJ5VVxuNmNGY0VQYkIrbjVyUWMxYU0yOUZrY3FQc1ZOMjZ1ejJhUHk3S2crNjlPc3lYd3pmTGM4N21MRDNBanNBYkloNlxuQ0JHYk54T1lDaUxSV010OHFObzV3VjVhZjU4MGtwUkwwd0E3eGlUd1lRS0JnUURidGtybXpaSGRTYlk2UXJFdFxuWGRkSlRMOEtYMW0zT3N0MDFUMTlmaGYzMStFNDhFVVBtV0ZmTCtOWnVGczR0UkJEdFIySWtLbksxY1lYQjMrZ1xuelQ2cXVzY0NtZU8xM3ZSN3JQVXgyS1hZdk5ESWJ2VFhEeTlhb3U0c05vdllaWlZXc0tTbURUQzh2UnlyejFIS1xuRDRvV3B0NEo4R2R2V1RBTmJFRk5GenlCMndLQmdRREdOeVdET2xwcFZBTHFVSHJ2WkZqSVBOWVFxZGE1c1o3cVxuc0F0OXZCRUZ4dmgxTEY2QURxVG5vaFVPU2NINnRINUdaYUFveWd3c0RqRWJyWE9vS1ZmS2dnOXM0ZlUwRklNOVxuWlVqOUVFd3IwQlJHSHAzem4wcHREd2dRVENMVmJ6WW51WmF4djhpd3ZKTVRUUTh5MmV5ckVCdjN4cDNnSU9VZlxuS2RXNHBOOXkzUUtCZ0JRa1NnbU9udWlpY1VvMkF2Z2R1amJHQ2wxeEVGQnoyMk1DaVhpUHJyTFIzNXZRcXdRYlxuRTRvZVljRS8zVno5ZkZnNHFsUnlycDRocXQ5Qm1MbXRGeW1mcGM3ZlBMalhqNkltNFBPSTRPdFZvKzQ3L2NZWlxuWmtYdzJkVER5MTR6TWRXWXEvOXRCaUxIVTNHTXQvckdJZXFoc1lsSHVMUEVnVnM1cVdMZjFuUXhBb0dBTGY4T1xuRFcyMUhVd0pnU1k3NE9HQVdMY0ZWY2lUczNPc1ZQbVZNUkE3UXdQeEUvKy96aWVYek1pbjZqRGplckgzdTQ1SlxucEMxK3RacDFldDY5UUFDWUJyNDNwaVNwS2ZTNG43NnBPVkJXM0xQa2dJRUtWa1pZbHdZdDhObzZHeDA3aSt4ZFxuTTlJMVdBM3FjMGdtaHI1YlZUYmZ4cGVvZXlJbkNSeEVKQnplWFdFQ2dZRUEwZG9QMWRubHpGVmRucXZ4aXJJRlxuaWR2QzhmeGZtZURybnFGOGJxdmRtZVY2RU9FdGFRY01XeTJWMVE0Ni9XSllkbkZ0dFUrOVB1VFdaY2toeHZyV1xuUnhHNWFZQ1BoSzVTVkJKZDZvT1dUQnJwOW1zRllzN1F0Z2tzVXdvQjR4Z21NU3RpWjhIRy9uNHhiYmdaUitMY1xuZ0IrR3l2MjdWRHFSdlM1SmtvOE9JSGc9XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAiZmlyZWJhc2UtYWRtaW5zZGstZmJzdmNAZWR1bGVtLTUwMDIyLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjEwMDM0MjE4OTg5OTQ2MDQ0MjE1NSIsCiAgImF1dGhfdXJpIjogImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwKICAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwKICAiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsCiAgImNsaWVudF94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvZmlyZWJhc2UtYWRtaW5zZGstZmJzdmMlNDBlZHVsZW0tNTAwMjIuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K';
            @file_put_contents($targetFile, base64_decode($b64));
        }

        $credentialsPath = $targetFile;
        $credentialsExists = file_exists($credentialsPath);
        $credentialsValid = false;
        $projectId = null;
        $clientEmail = null;
        if ($credentialsExists) {
            $json = json_decode(file_get_contents($credentialsPath), true);
            $projectId = $json['project_id'] ?? null;
            $clientEmail = $json['client_email'] ?? null;
            $credentialsValid = !empty($json['private_key']) && !empty($clientEmail);
        }

        $storageAppFiles = file_exists(storage_path('app')) ? array_diff(scandir(storage_path('app')), ['.', '..']) : [];

        $directFcmResult = null;
        if (request()->has('send_test')) {
            $targetUserId = (int) request('user_id', ($tokens->last()?->user_id ?? 26));
            $targetToken = \App\Models\DeviceToken::where('user_id', $targetUserId)->latest()->first();
            if ($targetToken && $credentialsValid) {
                $client = new \GuzzleHttp\Client(['timeout' => 10]);
                $credentials = json_decode(file_get_contents($credentialsPath), true);
                $now = time();
                $header = ['alg' => 'RS256', 'typ' => 'JWT'];
                $claim = [
                    'iss' => $credentials['client_email'],
                    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                    'aud' => 'https://oauth2.googleapis.com/token',
                    'iat' => $now,
                    'exp' => $now + 3600,
                ];
                $b64h = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($header)));
                $b64c = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($claim)));
                openssl_sign($b64h . '.' . $b64c, $sig, $credentials['private_key'], 'SHA256');
                $jwt = $b64h . '.' . $b64c . '.' . str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($sig));
                
                $tokenRes = $client->post('https://oauth2.googleapis.com/token', [
                    'form_params' => [
                        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        'assertion' => $jwt,
                    ],
                    'http_errors' => false,
                ]);
                $tokenJson = json_decode((string)$tokenRes->getBody(), true);
                $accessToken = $tokenJson['access_token'] ?? null;
                
                if ($accessToken) {
                    $fcmRes = $client->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                        'headers' => [
                            'Authorization' => "Bearer {$accessToken}",
                            'Content-Type' => 'application/json',
                        ],
                        'json' => [
                            'message' => [
                                'token' => $targetToken->token,
                                'notification' => [
                                    'title' => 'EduLem Test Bildirimi 🔔',
                                    'body' => 'Bu bir test bildirimidir!',
                                ],
                                'data' => ['type' => 'test'],
                                'android' => [
                                    'priority' => 'high',
                                    'notification' => [
                                        'channel_id' => 'messages_channel',
                                        'sound' => 'default',
                                    ],
                                ],
                            ],
                        ],
                        'http_errors' => false,
                    ]);
                    $directFcmResult = [
                        'google_http_status' => $fcmRes->getStatusCode(),
                        'google_response' => json_decode((string)$fcmRes->getBody(), true) ?? (string)$fcmRes->getBody(),
                        'target_user_id' => $targetUserId,
                        'target_token_sample' => substr($targetToken->token, 0, 15) . '...',
                    ];
                } else {
                    $directFcmResult = [
                        'oauth_error' => (string)$tokenRes->getBody(),
                    ];
                }
            }
        }

        return response()->json([
            'status' => 'ok',
            'direct_fcm_result' => $directFcmResult,
            'model_device_token_exists' => $modelExists,
            'firebase_credentials_exists' => $credentialsExists,
            'firebase_credentials_path' => $credentialsPath,
            'storage_app_existing_files' => array_values($storageAppFiles),
            'firebase_credentials_valid' => $credentialsValid,
            'firebase_project_id' => $projectId,
            'firebase_client_email' => $clientEmail,
            'message_controller_has_fcm' => str_contains(@file_get_contents(app_path('Http/Controllers/MessageController.php')), 'FcmService'),
            'hamza_user' => \App\Models\User::where('first_name', 'like', '%Hamza%')->orWhere('name', 'like', '%Hamza%')->first(['id', 'first_name', 'last_name', 'name']),
            'device_tokens' => $tokens->map(function ($t) {
                $u = \App\Models\User::find($t->user_id);
                return [
                    'id' => $t->id,
                    'user_id' => $t->user_id,
                    'user_name' => $u ? trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? '')) ?: $u->name : 'Bilinmeyen',
                    'user_type' => $t->user_type,
                    'platform' => $t->platform,
                    'token' => substr($t->token, 0, 15) . '...',
                    'created_at' => (string) $t->created_at,
                ];
            }),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], 200);
    }
});

Route::middleware('auth:sanctum')->group(function () {

        // Cihaz Bildirim Token'ları (FCM Push Notifications)
        if (class_exists(\App\Http\Controllers\DeviceTokenController::class)) {
            Route::post('/user/device-token', [\App\Http\Controllers\DeviceTokenController::class, 'store']);
            Route::delete('/user/device-token', [\App\Http\Controllers\DeviceTokenController::class, 'destroy']);
        }

        // Layout init — header/sidebar badge + özet verileri tek istekte

        Route::get('/layout/init', [\App\Http\Controllers\LayoutController::class, 'init']);



        // Dashboard

        Route::get('/dashboard/stats', [\App\Http\Controllers\DashboardController::class, 'stats']);

        Route::get('/search', [\App\Http\Controllers\SearchController::class, 'index']);



        // Files

        Route::prefix('files')->group(function () {

            Route::post('/upload', [FileController::class, 'upload']);

            Route::get('/', [FileController::class, 'index']);

            Route::get('/{id}/download', [FileController::class, 'download']);

            Route::delete('/{id}', [FileController::class, 'destroy']);

        });



        // Academic Years

        Route::prefix('academic-years')->group(function () {

            Route::post('/', [\App\Http\Controllers\AcademicYearController::class, 'store']);

            Route::get('/', [\App\Http\Controllers\AcademicYearController::class, 'index']);

            Route::get('/{academicYear}', [\App\Http\Controllers\AcademicYearController::class, 'show']);

            Route::get('/{academicYear}/statistics', [\App\Http\Controllers\AcademicYearController::class, 'statistics']);

            Route::put('/{academicYear}', [\App\Http\Controllers\AcademicYearController::class, 'update']);

            Route::delete('/{academicYear}', [\App\Http\Controllers\AcademicYearController::class, 'destroy']);

        });



        // Seasons

        Route::prefix('seasons')->group(function () {

            Route::get('/', [\App\Http\Controllers\SeasonController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\SeasonController::class, 'store']);

            Route::get('/{season}', [\App\Http\Controllers\SeasonController::class, 'show']);

            Route::put('/{season}', [\App\Http\Controllers\SeasonController::class, 'update']);

            Route::patch('/{season}/activate', [\App\Http\Controllers\SeasonController::class, 'activate']);

            Route::delete('/{season}', [\App\Http\Controllers\SeasonController::class, 'destroy']);

        });



        // Users

        Route::prefix('users')->group(function () {

            Route::get('/', [\App\Http\Controllers\UserController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\UserController::class, 'store']);

            Route::post('/export', [\App\Http\Controllers\UserController::class, 'export']);

            Route::get('/{id}', [\App\Http\Controllers\UserController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\UserController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\UserController::class, 'destroy']);

        });



        // Permissions

        Route::prefix('permissions')->group(function () {

            Route::get('/', [\App\Http\Controllers\PermissionController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\PermissionController::class, 'store']);

            Route::get('/{permission}', [\App\Http\Controllers\PermissionController::class, 'show']);

            Route::put('/{permission}', [\App\Http\Controllers\PermissionController::class, 'update']);

            Route::delete('/{permission}', [\App\Http\Controllers\PermissionController::class, 'destroy']);

        });



        // Roles

        Route::prefix('roles')->group(function () {

            Route::get('/', [\App\Http\Controllers\RoleController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\RoleController::class, 'store']);

            Route::get('/{role}', [\App\Http\Controllers\RoleController::class, 'show']);

            Route::put('/{role}', [\App\Http\Controllers\RoleController::class, 'update']);

            Route::delete('/{role}', [\App\Http\Controllers\RoleController::class, 'destroy']);

            Route::put('/{role}/page-visibility', [\App\Http\Controllers\RoleController::class, 'updatePageVisibility']);

        });



        // Messages

        Route::prefix('messages')->group(function () {

            Route::get('/conversations', [MessageController::class, 'getConversations']);

            Route::get('/messages', [MessageController::class, 'getMessages']);

            Route::post('/send', [MessageController::class, 'sendMessage']);

            Route::get('/unread-count', [MessageController::class, 'getUnreadCount']);

            Route::put('/{id}/read', [MessageController::class, 'markAsRead']);

            Route::delete('/conversations/{userId}', [MessageController::class, 'deleteConversation']);

            Route::delete('/{id}', [MessageController::class, 'deleteMessage']);

        });



        // Time Slots

        Route::prefix('time-slots')->group(function () {

            Route::get('/', [\App\Http\Controllers\TimeSlotController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\TimeSlotController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\TimeSlotController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\TimeSlotController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\TimeSlotController::class, 'destroy']);

        });



        // Measurement (Ölçme Değerlendirme)

        Route::prefix('measurement')->group(function () {

            Route::get('/trials', [MeasurementController::class, 'trialsIndex']);

            Route::post('/trials', [MeasurementController::class, 'trialsStore']);

            Route::get('/trials/{id}', [MeasurementController::class, 'trialsShow']);

            Route::put('/trials/{id}', [MeasurementController::class, 'trialsUpdate']);

            Route::delete('/trials/{id}', [MeasurementController::class, 'trialsDestroy']);



            Route::post('/trials/{trialId}/booklets', [MeasurementController::class, 'bookletsStore']);

            Route::put('/trials/{trialId}/booklets/{bookletId}', [MeasurementController::class, 'bookletsUpdate']);



            Route::get('/trials/{trialId}/analysis', [MeasurementController::class, 'analysis']);

            Route::get('/trials/{trialId}/results', [MeasurementController::class, 'resultsIndex']);

            Route::post('/trials/{trialId}/imports/optical', [MeasurementController::class, 'importOptical']);

        });



        // Schedules

        Route::prefix('schedules')->group(function () {

            Route::get('/', [\App\Http\Controllers\ScheduleController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\ScheduleController::class, 'store']);

            Route::match(['POST', 'PUT', 'DELETE'], '/reset', [\App\Http\Controllers\ScheduleController::class, 'resetClassroom']);

            Route::get('/{schedule}', [\App\Http\Controllers\ScheduleController::class, 'show']);

            Route::put('/{schedule}', [\App\Http\Controllers\ScheduleController::class, 'update']);

            Route::delete('/{schedule}', [\App\Http\Controllers\ScheduleController::class, 'destroy']);

        });



        // Teacher Meetings

        Route::prefix('teacher-meetings')->group(function () {

            Route::get('/meetings', [\App\Http\Controllers\TeacherMeetingController::class, 'meetings']);

            Route::get('/private-notes', [\App\Http\Controllers\TeacherMeetingController::class, 'privateNotes']);

            Route::get('/appointments', [\App\Http\Controllers\TeacherMeetingController::class, 'appointments']);

            Route::get('/classrooms', [\App\Http\Controllers\TeacherMeetingController::class, 'classrooms']);

            Route::get('/classrooms/{classroomId}/students', [\App\Http\Controllers\TeacherMeetingController::class, 'classroomStudents']);

            Route::post('/', [\App\Http\Controllers\TeacherMeetingController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\TeacherMeetingController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\TeacherMeetingController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\TeacherMeetingController::class, 'destroy']);

        });



        // Meetings (Admin/Manager Read)

        Route::get('/meetings', [\App\Http\Controllers\MeetingsController::class, 'index']);

        Route::get('/meetings/stats', [\App\Http\Controllers\MeetingsController::class, 'stats']);



        // Students

        Route::prefix('students')->group(function () {

            Route::post('/', [StudentController::class, 'store']);

            Route::get('/', [StudentController::class, 'index']);

            Route::get('/import-template', [StudentController::class, 'downloadImportTemplate']);

            Route::post('/import', [StudentController::class, 'importFromTemplate']);

            Route::post('/bulk-copy-from-season', [StudentController::class, 'bulkCopyFromSeason']);

            Route::post('/bulk-delete', [StudentController::class, 'bulkDelete']);

            Route::post('/delete-all', [StudentController::class, 'deleteAll']);

            Route::post('/export', [StudentController::class, 'export']);

            Route::post('/validate-tc', [StudentController::class, 'validateTc']);

            Route::patch('/{id}/toggle-active', [StudentController::class, 'toggleActive']);
            Route::post('/{id}/reset-password', [StudentController::class, 'resetPassword']);

            Route::get('/teacher/classrooms', [StudentController::class, 'teacherClassrooms']);

            Route::get('/teacher/filter-data', [StudentController::class, 'teacherFilterData']);

            Route::get('/teacher/students', [StudentController::class, 'teacherAllStudents']);

            Route::get('/teacher/classrooms/{classroom}/students', [StudentController::class, 'teacherStudentsByClassroom']);

            Route::get('/{id}', [StudentController::class, 'show']);
            Route::get('/{id}/omr-exams', [StudentController::class, 'omrExams']);

            Route::put('/{id}', [StudentController::class, 'update']);

            Route::delete('/{id}', [StudentController::class, 'destroy']);

        });



        // Mevcut kullanıcı profili (ad, soyad, e-posta, şifre – users tablosuna yazar)
        Route::get('/profile', [App\Http\Controllers\AuthController::class, 'getProfile']);
        Route::put('/profile', [App\Http\Controllers\AuthController::class, 'updateProfile']);

        Route::prefix('user')->group(function () {
            Route::get('/profile', [App\Http\Controllers\AuthController::class, 'getProfile']);
            Route::put('/profile', [App\Http\Controllers\AuthController::class, 'updateProfile']);
            Route::get('/classrooms', [App\Http\Controllers\ClassroomController::class, 'userClassrooms']);
        });



        // Tenant Profile (kurum bilgileri)

        Route::prefix('tenant')->group(function () {

            Route::get('/profile', [\App\Http\Controllers\TenantController::class, 'profile']);

            Route::post('/profile', [\App\Http\Controllers\TenantController::class, 'updateProfile']);

            Route::put('/profile', [\App\Http\Controllers\TenantController::class, 'updateProfile']);

            Route::delete('/profile', [\App\Http\Controllers\TenantController::class, 'deleteProfile']);

            Route::get('/statistics', [\App\Http\Controllers\TenantController::class, 'statistics']);

        });



        // Mobile App Version Management (Kurucu / Admin)

        Route::put('/app/version', [AppVersionController::class, 'update']);

        Route::post('/app/version', [AppVersionController::class, 'update']);



        // Campuses

        Route::prefix('campuses')->group(function () {

            Route::get('/', [\App\Http\Controllers\CampusController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\CampusController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\CampusController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\CampusController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\CampusController::class, 'destroy']);

        });



        // Education Levels

        Route::prefix('education-levels')->group(function () {

            Route::get('/', [\App\Http\Controllers\EducationLevelController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\EducationLevelController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'destroy']);

        });



        // Lessons

        Route::prefix('lessons')->group(function () {

            Route::get('/', [\App\Http\Controllers\LessonController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\LessonController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\LessonController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\LessonController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\LessonController::class, 'destroy']);

            Route::get('/{id}/teachers', [\App\Http\Controllers\LessonController::class, 'teachers']);

        });



        // Locations

        Route::prefix('locations')->group(function () {

            Route::get('/cities', [\App\Http\Controllers\LocationController::class, 'cities']);

            Route::get('/districts/{city}', [\App\Http\Controllers\LocationController::class, 'districts']);

        });



        // Education Levels

        Route::prefix('education-levels')->group(function () {

            Route::get('/', [\App\Http\Controllers\EducationLevelController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\EducationLevelController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'destroy']);

        });



        // Classrooms

        Route::prefix('classrooms')->group(function () {

            Route::get('/', [\App\Http\Controllers\ClassroomController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\ClassroomController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\ClassroomController::class, 'show']);
            Route::post('/bulk-copy-from-season', [\App\Http\Controllers\ClassroomController::class, 'bulkCopyFromSeason']);

            Route::put('/{id}', [\App\Http\Controllers\ClassroomController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\ClassroomController::class, 'destroy']);

        });



        // Branches

        Route::prefix('branches')->group(function () {

            Route::get('/', [\App\Http\Controllers\BranchController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\BranchController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\BranchController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\BranchController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\BranchController::class, 'destroy']);

        });



        // Notifications

        Route::prefix('notifications')->group(function () {

            Route::get('/', [\App\Http\Controllers\NotificationController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\NotificationController::class, 'store']);

            Route::get('/{id}', [\App\Http\Controllers\NotificationController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\NotificationController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\NotificationController::class, 'destroy']);

            Route::put('/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);

            Route::get('/unread-count', [\App\Http\Controllers\NotificationController::class, 'unreadCount']);

        });



        // Announcements — sabit yollar /{id} ve /{id}/read'tan ÖNCE olmalı

        Route::prefix('announcements')->group(function () {

            Route::get('/', [AnnouncementController::class, 'index']);

            Route::post('/', [AnnouncementController::class, 'store']);

            Route::post('/bulk-trash', [AnnouncementController::class, 'bulkTrash']);

            Route::get('/unread-count', [AnnouncementController::class, 'unreadCount']);

            Route::get('/statistics', [AnnouncementController::class, 'statistics']);

            Route::put('/read-all', [AnnouncementController::class, 'markAllAsRead']);

            Route::get('/{id}', [AnnouncementController::class, 'show']);

            Route::put('/{id}', [AnnouncementController::class, 'update']);

            Route::delete('/{id}', [AnnouncementController::class, 'destroy']);

            Route::put('/{id}/read', [AnnouncementController::class, 'markAsRead']);

            Route::put('/{id}/star', [AnnouncementController::class, 'star']);

            Route::put('/{id}/important', [AnnouncementController::class, 'important']);

        });



        // Activities

        Route::prefix('activities')->group(function () {

            Route::get('/', [ActivityController::class, 'index']);

            Route::post('/', [ActivityController::class, 'store']);

            Route::get('/statistics', [ActivityController::class, 'getStatistics']);

            Route::get('/{activity}', [ActivityController::class, 'show']);

            Route::put('/{activity}', [ActivityController::class, 'update']);

            Route::delete('/{activity}', [ActivityController::class, 'destroy']);

            Route::post('/{activity}/approve', [ActivityController::class, 'approve']);

            Route::post('/{activity}/like', [ActivityController::class, 'like']);

            Route::post('/participants', [ActivityController::class, 'addParticipant']);

            Route::delete('/participants/{activityParticipant}', [ActivityController::class, 'removeParticipant']);

        });



        // Bulletins

        Route::prefix('bulletins')->group(function () {

            Route::get('/', [BulletinController::class, 'index']);

            Route::post('/', [BulletinController::class, 'store']);

            Route::get('/portfolio/{studentId}', [BulletinController::class, 'getStudentPortfolio']);

            Route::get('/{bulletin}', [BulletinController::class, 'show']);

            Route::put('/{bulletin}', [BulletinController::class, 'update']);

            Route::delete('/{bulletin}', [BulletinController::class, 'destroy']);

            Route::post('/{bulletin}/publish', [BulletinController::class, 'publishToGuardian']);

            Route::post('/{bulletin}/portfolio', [BulletinController::class, 'addToPortfolio']);

        });



        Route::prefix('bulletin-templates')->group(function () {

            Route::get('/', [\App\Http\Controllers\BulletinTemplateController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\BulletinTemplateController::class, 'store']);

            Route::get('/{bulletinTemplate}', [\App\Http\Controllers\BulletinTemplateController::class, 'show']);

            Route::put('/{bulletinTemplate}', [\App\Http\Controllers\BulletinTemplateController::class, 'update']);

            Route::delete('/{bulletinTemplate}', [\App\Http\Controllers\BulletinTemplateController::class, 'destroy']);

        });



        // Internal Messages

        Route::prefix('internal-messages')->group(function () {

            Route::get('/', [InternalMessageController::class, 'index']);

            Route::post('/', [InternalMessageController::class, 'store']);

            Route::get('/unread-count', [InternalMessageController::class, 'unreadCount']);

            Route::get('/{message}', [InternalMessageController::class, 'show']);

            Route::delete('/{message}', [InternalMessageController::class, 'destroy']);

            Route::put('/{message}/read', [InternalMessageController::class, 'markAsRead']);

        });



        // Calendar Events

        Route::prefix('calendar-events')->group(function () {

            Route::get('/', [CalendarEventController::class, 'index']);

            Route::post('/', [CalendarEventController::class, 'store']);

            Route::get('/user-calendar', [CalendarEventController::class, 'getUserCalendar']);

            Route::post('/sync-staff', [CalendarEventController::class, 'syncStaffAssignments']);

            Route::post('/sync-appointments', [CalendarEventController::class, 'syncAppointments']);

            Route::get('/{calendarEvent}', [CalendarEventController::class, 'show']);

            Route::put('/{calendarEvent}', [CalendarEventController::class, 'update']);

            Route::delete('/{calendarEvent}', [CalendarEventController::class, 'destroy']);

            Route::post('/participants', [CalendarEventController::class, 'addParticipant']);

            Route::delete('/participants/{calendarEventParticipant}', [CalendarEventController::class, 'removeParticipant']);

            Route::put('/participants/{calendarEventParticipant}/status', [CalendarEventController::class, 'updateParticipantStatus']);

        });



        // Test Announcements (no auth required)

        Route::prefix('test-announcements')->group(function () {

            Route::get('/', [AnnouncementController::class, 'index']);

            Route::get('/unread-count', [AnnouncementController::class, 'unreadCount']);

        });



        // Counseling

        Route::prefix('counseling')->group(function () {

            Route::get('/students', [CounselingController::class, 'getStudents']);

            Route::post('/students', [CounselingController::class, 'createStudent']);

            Route::get('/sessions', [CounselingController::class, 'getSessions']);

            Route::post('/sessions', [CounselingController::class, 'createSession']);

            Route::get('/statistics', [CounselingController::class, 'getStatistics']);

            Route::get('/counselors', [CounselingController::class, 'getCounselors']);



            // Notes

            Route::get('/notes', [CounselingController::class, 'getNotes']);

            Route::post('/notes', [CounselingController::class, 'createNote']);

            Route::put('/notes/{id}', [CounselingController::class, 'updateNote']);

            Route::delete('/notes/{id}', [CounselingController::class, 'deleteNote']);



            // Records

            Route::get('/records/stats', [\App\Http\Controllers\CounselingRecordController::class, 'stats']);

            Route::get('/records/{record}/pdf', [\App\Http\Controllers\CounselingRecordController::class, 'pdf']);

            Route::apiResource('records', \App\Http\Controllers\CounselingRecordController::class);

        });



        // OMR Exams

        Route::prefix('omr')->group(function () {

            // Courses

            Route::get('/courses', [\App\Http\Controllers\OmrController::class, 'coursesIndex']);

            Route::post('/courses', [\App\Http\Controllers\OmrController::class, 'coursesStore']);

            Route::put('/courses/{id}', [\App\Http\Controllers\OmrController::class, 'coursesUpdate']);

            Route::delete('/courses/{id}', [\App\Http\Controllers\OmrController::class, 'coursesDestroy']);



            // Topics

            Route::get('/courses/{courseId}/topics', [\App\Http\Controllers\OmrController::class, 'topicsIndex']);

            Route::post('/courses/{courseId}/topics', [\App\Http\Controllers\OmrController::class, 'topicsStore']);

            Route::post('/courses/{courseId}/topics/bulk', [\App\Http\Controllers\OmrController::class, 'topicsBulkStore']);

            Route::put('/courses/{courseId}/topics/{id}', [\App\Http\Controllers\OmrController::class, 'topicsUpdate']);

            Route::delete('/courses/{courseId}/topics/{id}', [\App\Http\Controllers\OmrController::class, 'topicsDestroy']);



            // Templates

            Route::get('/templates', [\App\Http\Controllers\OmrController::class, 'templatesIndex']);

            Route::post('/templates', [\App\Http\Controllers\OmrController::class, 'templatesStore']);

            Route::get('/templates/{id}', [\App\Http\Controllers\OmrController::class, 'templatesShow']);

            Route::put('/templates/{id}', [\App\Http\Controllers\OmrController::class, 'templatesUpdate']);

            Route::delete('/templates/{id}', [\App\Http\Controllers\OmrController::class, 'templatesDestroy']);



            // Exams
            Route::get('/exams/{id}/answer-keys/template', [\App\Http\Controllers\OmrController::class, 'downloadAnswerKeyTemplate']);
            Route::get('/exams', [\App\Http\Controllers\OmrController::class, 'examsIndex']);

            Route::post('/exams', [\App\Http\Controllers\OmrController::class, 'examsStore']);

            Route::post('/exams/merge', [\App\Http\Controllers\OmrController::class, 'examsMerge']);

            Route::get('/exams/{id}', [\App\Http\Controllers\OmrController::class, 'examsShow']);

            Route::put('/exams/{id}', [\App\Http\Controllers\OmrController::class, 'examsUpdate']);

            Route::delete('/exams/{id}', [\App\Http\Controllers\OmrController::class, 'examsDestroy']);

            

            // Exam Specific actions

            Route::post('/exams/{id}/import/preview', [\App\Http\Controllers\OmrController::class, 'importPreview']);

            Route::post('/exams/{id}/import/auto-match', [\App\Http\Controllers\OmrController::class, 'importAutoMatch']);

            Route::post('/exams/{id}/import/finalize', [\App\Http\Controllers\OmrController::class, 'importFinalize']);

            Route::get('/exams/{id}/students/search', [\App\Http\Controllers\OmrController::class, 'studentsSearch']);

            Route::get('/exams/{id}/results', [\App\Http\Controllers\OmrController::class, 'resultsIndex']);

            Route::post('/exams/{id}/results/recalculate', [\App\Http\Controllers\OmrController::class, 'resultsRecalculate']);

            Route::put('/exams/{id}/results/{resultId}', [\App\Http\Controllers\OmrController::class, 'resultUpdate']);

            Route::delete('/exams/{id}/results/{resultId}', [\App\Http\Controllers\OmrController::class, 'resultDestroy']);

            Route::get('/exams/{id}/analytics', [\App\Http\Controllers\OmrController::class, 'analytics']);

            Route::get('/exams/{id}/analytics/class', [\App\Http\Controllers\OmrController::class, 'analyticsClass']);

            Route::get('/exams/{id}/analytics/student', [\App\Http\Controllers\OmrController::class, 'analyticsStudent']);

            Route::get('/exams/{id}/analytics/correlation', [\App\Http\Controllers\OmrController::class, 'analyticsCorrelation']);

            Route::get('/exams/{id}/analytics/compare', [\App\Http\Controllers\OmrController::class, 'analyticsCompare']);

            Route::get('/exams/{id}/report-card', [\App\Http\Controllers\OmrController::class, 'reportCardExam']);

            Route::get('/exams/{id}/report-card/bulk', [\App\Http\Controllers\OmrController::class, 'reportCardBulkExam']);

            Route::get('/exams/{id}/sms-recipients', [\App\Http\Controllers\OmrController::class, 'examSmsRecipients']);
            Route::post('/exams/{id}/send-sms', [\App\Http\Controllers\OmrController::class, 'sendExamSms']);


            // Exam Configure (Phase B)

            Route::post('/exams/{id}/courses/sync', [\App\Http\Controllers\OmrController::class, 'examCoursesSync']);

            Route::post('/exams/{id}/answer-keys', [\App\Http\Controllers\OmrController::class, 'answerKeysBulkSave']);


            Route::post('/exams/{id}/answer-keys/import', [\App\Http\Controllers\OmrController::class, 'importAnswerKeysFromExcel']);

            Route::post('/exams/{id}/configure/finalize', [\App\Http\Controllers\OmrController::class, 'examConfigureFinalize']);





            // Sessions

            Route::get('/sessions', [\App\Http\Controllers\OmrController::class, 'sessionsIndex']);

            Route::post('/sessions', [\App\Http\Controllers\OmrController::class, 'sessionsStore']);

            Route::get('/sessions/{id}', [\App\Http\Controllers\OmrController::class, 'sessionsShow']);

            Route::delete('/sessions/{id}', [\App\Http\Controllers\OmrController::class, 'sessionsDestroy']);

            Route::post('/sessions/{id}/recalculate', [\App\Http\Controllers\OmrController::class, 'sessionsRecalculate']);

            Route::get('/sessions/{id}/report-card', [\App\Http\Controllers\OmrController::class, 'reportCardSession']);

            Route::get('/sessions/{id}/report-card/bulk', [\App\Http\Controllers\OmrController::class, 'reportCardBulkSession']);

            Route::get('/teacher-exams', [\App\Http\Controllers\OmrController::class, 'teacherExamsIndex']);

        });



        // Portal Assessment Routes
        Route::prefix('portal/assessment')->group(function () {
            Route::get('/exams', [\App\Http\Controllers\OmrController::class, 'portalExamsIndex']);
            Route::get('/exams/{id}/result', [\App\Http\Controllers\OmrController::class, 'portalExamResult']);
            Route::get('/exams/{id}/analytics', [\App\Http\Controllers\OmrController::class, 'portalAnalytics']);
            Route::get('/sessions', [\App\Http\Controllers\OmrController::class, 'portalSessionsIndex']);
            Route::get('/sessions/{id}/result', [\App\Http\Controllers\OmrController::class, 'portalSessionResult']);
        });



        // Exams

        Route::prefix('exams')->group(function () {

            Route::get('/', [ExamController::class, 'index']);

            Route::post('/', [ExamController::class, 'store']);

            Route::get('/{exam}', [ExamController::class, 'show']);

            Route::put('/{exam}', [ExamController::class, 'update']);

            Route::delete('/{exam}', [ExamController::class, 'destroy']);

            Route::post('/{exam}/upload-optical', [ExamController::class, 'uploadOpticalForm']);

            Route::post('/{exam}/process-optical', [ExamController::class, 'processOpticalForm']);

            Route::post('/{exam}/arrange-classrooms', [ExamController::class, 'arrangeClassrooms']);

            Route::get('/{exam}/arrangement-lists', [ExamController::class, 'getArrangementLists']);

            Route::delete('/{exam}/clear-arrangement', [ExamController::class, 'clearArrangement']);

            Route::post('/{exam}/generate-entry-document', [ExamController::class, 'generateEntryDocument']);

            Route::get('/{exam}/download-entry-document/{studentId}', [ExamController::class, 'downloadEntryDocument'])->name('api.v1.exams.entry-document.download');

        });



        // Grades

        Route::prefix('grades')->group(function () {

            Route::get('/', [GradeController::class, 'index']);

            Route::post('/', [GradeController::class, 'store']);

            Route::post('/bulk', [GradeController::class, 'bulkStore']);

            Route::get('/{grade}', [GradeController::class, 'show']);

            Route::put('/{grade}', [GradeController::class, 'update']);

            Route::delete('/{grade}', [GradeController::class, 'destroy']);

            Route::post('/report-card/generate', [GradeController::class, 'generateReportCard']);

            Route::get('/report-card/download', [GradeController::class, 'downloadReportCard'])->name('api.v1.grades.report-card.download');

        });



        // Attendances (yoklama)

        Route::prefix('attendances')->group(function () {

            Route::get('/daily', [\App\Http\Controllers\AttendanceController::class, 'dailyTracking']);

            Route::get('/', [\App\Http\Controllers\AttendanceController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\AttendanceController::class, 'store']);

            Route::post('/bulk', [\App\Http\Controllers\AttendanceController::class, 'bulkStore']);

            Route::get('/statistics/student/{studentId}', [\App\Http\Controllers\AttendanceController::class, 'studentStatistics']);

            Route::get('/statistics/teacher/{teacherId}', [\App\Http\Controllers\AttendanceController::class, 'teacherStatistics']);

            Route::get('/{id}', [\App\Http\Controllers\AttendanceController::class, 'show']);

            Route::put('/{id}', [\App\Http\Controllers\AttendanceController::class, 'update']);

            Route::delete('/{id}', [\App\Http\Controllers\AttendanceController::class, 'destroy']);

        });



        // Homework

        Route::prefix('homework')->group(function () {

            Route::get('/', [HomeworkController::class, 'index']);

            Route::get('/create-options', [HomeworkController::class, 'createOptions']);

            Route::get('/classrooms/{classroom}/students', [HomeworkController::class, 'classroomStudents']);

            Route::post('/', [HomeworkController::class, 'store']);

            Route::get('/{homework}/control', [HomeworkController::class, 'control']);

            Route::put('/{homework}/control', [HomeworkController::class, 'saveControl']);

            Route::post('/{homework}/toggle-archive', [HomeworkController::class, 'toggleArchive']);

            Route::get('/{homework}', [HomeworkController::class, 'show']);

            Route::put('/{homework}', [HomeworkController::class, 'update']);

            Route::delete('/{homework}', [HomeworkController::class, 'destroy']);

            Route::post('/submit', [HomeworkController::class, 'submit']);

            Route::post('/grade/{submission}', [HomeworkController::class, 'grade']);

            Route::get('/student-performance/{studentId}', [HomeworkController::class, 'studentPerformance']);

            Route::get('/teacher-performance/{teacherId}', [HomeworkController::class, 'teacherPerformance']);

        });



        // Tutoring & Private Lessons

        Route::prefix('tutoring')->group(function () {

            Route::get('/', [TutoringSessionController::class, 'index']);

            Route::post('/', [TutoringSessionController::class, 'store']);

            Route::get('/statistics', [TutoringSessionController::class, 'getStatistics']);

            Route::get('/{tutoringSession}', [TutoringSessionController::class, 'show']);

            Route::put('/{tutoringSession}', [TutoringSessionController::class, 'update']);

            Route::delete('/{tutoringSession}', [TutoringSessionController::class, 'destroy']);

            Route::post('/{tutoringSession}/students', [TutoringSessionController::class, 'addStudent']);

            Route::delete('/{tutoringSession}/students', [TutoringSessionController::class, 'removeStudent']);

            Route::post('/{tutoringSession}/attendance', [TutoringSessionController::class, 'takeAttendance']);

            Route::post('/{tutoringSession}/bulk-attendance', [TutoringSessionController::class, 'bulkAttendance']);

        });



        // SMS Center

        Route::prefix('sms')->group(function () {
            Route::get('/settings', [ScheduledSmsController::class, 'getSettings']);
            Route::post('/settings', [ScheduledSmsController::class, 'saveSettings']);
            Route::match(['get', 'post'], '/user-info', [ScheduledSmsController::class, 'userInfo']);
            Route::post('/test', [ScheduledSmsController::class, 'testConnection']);
            Route::get('/birthday-settings', [SmsBirthdayController::class, 'getSettings']);
            Route::post('/birthday-settings', [SmsBirthdayController::class, 'updateSettings']);
            Route::post('/birthday-settings/send-today', [SmsBirthdayController::class, 'sendToday']);

            // Templates

            Route::prefix('templates')->group(function () {

                Route::get('/', [SmsTemplateController::class, 'index']);

                Route::post('/', [SmsTemplateController::class, 'store']);

                Route::get('/{smsTemplate}', [SmsTemplateController::class, 'show']);

                Route::put('/{smsTemplate}', [SmsTemplateController::class, 'update']);

                Route::delete('/{smsTemplate}', [SmsTemplateController::class, 'destroy']);

                Route::post('/{smsTemplate}/render', [SmsTemplateController::class, 'render']);

            });



            // Scheduled / Bulk SMS

            Route::prefix('scheduled')->group(function () {

                Route::get('/', [ScheduledSmsController::class, 'index']);

                Route::post('/', [ScheduledSmsController::class, 'store']);

                Route::get('/{scheduledSms}', [ScheduledSmsController::class, 'show']);

                Route::post('/{scheduledSms}/cancel', [ScheduledSmsController::class, 'cancel']);

                Route::delete('/{scheduledSms}', [ScheduledSmsController::class, 'destroy']);

            });



            // Reports / History

            Route::prefix('reports')->group(function () {

                Route::get('/', [SmsReportController::class, 'index']);

                Route::get('/{smsReport}', [SmsReportController::class, 'show']);

                Route::delete('/{smsReport}', [SmsReportController::class, 'destroy']);

            });



            // Blacklist

            Route::prefix('blacklist')->group(function () {

                Route::get('/', [SmsBlacklistController::class, 'index']);

                Route::post('/', [SmsBlacklistController::class, 'store']);

                Route::get('/check', [SmsBlacklistController::class, 'check']);

                Route::get('/{smsBlacklist}', [SmsBlacklistController::class, 'show']);

                Route::delete('/{smsBlacklist}', [SmsBlacklistController::class, 'destroy']);

            });

        });



        // Surveys & Forms

        Route::prefix('surveys')->group(function () {

            // Online Surveys

            Route::prefix('online')->group(function () {

                Route::get('/', [OnlineSurveyController::class, 'index']);

                Route::post('/', [OnlineSurveyController::class, 'store']);

                Route::get('/{onlineSurvey}', [OnlineSurveyController::class, 'show']);

                Route::put('/{onlineSurvey}', [OnlineSurveyController::class, 'update']);

                Route::delete('/{onlineSurvey}', [OnlineSurveyController::class, 'destroy']);



                Route::post('/questions', [OnlineSurveyController::class, 'addQuestion']);

                Route::put('/questions/{onlineSurveyQuestion}', [OnlineSurveyController::class, 'updateQuestion']);

                Route::delete('/questions/{onlineSurveyQuestion}', [OnlineSurveyController::class, 'deleteQuestion']);



                Route::post('/{onlineSurvey}/responses', [OnlineSurveyController::class, 'submitResponse']);

                Route::get('/{onlineSurvey}/statistics', [OnlineSurveyController::class, 'getStatistics']);

                Route::get('/{onlineSurvey}/statistics/pdf', [OnlineSurveyController::class, 'downloadStatisticsPdf']);

                Route::get('/{onlineSurvey}/analysis', [OnlineSurveyController::class, 'getAnalysis']);

                Route::get('/{onlineSurvey}/analysis/pdf', [OnlineSurveyController::class, 'downloadAnalysisPdf']);

            });



            // Form Surveys

            Route::prefix('forms')->group(function () {

                Route::get('/', [FormSurveyController::class, 'index']);

                Route::post('/', [FormSurveyController::class, 'store']);

                Route::get('/{formSurvey}', [FormSurveyController::class, 'show']);

                Route::put('/{formSurvey}', [FormSurveyController::class, 'update']);

                Route::delete('/{formSurvey}', [FormSurveyController::class, 'destroy']);



                Route::post('/{formSurvey}/responses', [FormSurveyController::class, 'submitResponse']);

                Route::get('/{formSurvey}/statistics', [FormSurveyController::class, 'getStatistics']);

                Route::get('/{formSurvey}/analysis', [FormSurveyController::class, 'getAnalysis']);



                Route::post('/{formSurvey}/generate-optical', [FormSurveyController::class, 'generateOpticalForm']);

                Route::get('/{formSurvey}/download-optical/{file}', [FormSurveyController::class, 'downloadOpticalForm'])->name('form-surveys.download-optical-form');



                Route::post('/{formSurvey}/generate-report-card', [FormSurveyController::class, 'generatePersonnelReportCard']);

                Route::get('/{formSurvey}/download-report-card/{file}', [FormSurveyController::class, 'downloadReportCard'])->name('form-surveys.download-report-card');

            });

        });



        // Files

        Route::prefix('files')->group(function () {

            Route::post('/upload', [FileController::class, 'upload']);

            Route::get('/', [FileController::class, 'index']);

            Route::get('/{id}/download', [FileController::class, 'download']);

            Route::delete('/{id}', [FileController::class, 'destroy']);

        });



        // Question Bank

        Route::prefix('question-bank')->group(function () {

            Route::get('/', [QuestionBankController::class, 'index']);

            Route::post('/', [QuestionBankController::class, 'store']);

            Route::get('/topics', [QuestionBankTopicController::class, 'index']);

            Route::post('/topics', [QuestionBankTopicController::class, 'store']);

            Route::get('/statistics', [QuestionBankController::class, 'getStatistics']);

            Route::get('/prepare-booklet', [QuestionBankController::class, 'prepareBooklet']);

            Route::get('/prepare-practice-test', [QuestionBankController::class, 'preparePracticeTest']);

            Route::get('/prepare-topic-test', [QuestionBankController::class, 'prepareTopicTest']);

            Route::get('/{questionBank}', [QuestionBankController::class, 'show']);

            Route::put('/{questionBank}', [QuestionBankController::class, 'update']);

            Route::delete('/{questionBank}', [QuestionBankController::class, 'destroy']);

            Route::get('/{questionBank}/check-reuse', [QuestionBankController::class, 'checkReuse']);

            Route::post('/{questionBank}/record-usage', [QuestionBankController::class, 'recordUsage']);

        });



        Route::prefix('question-bank-topics')->group(function () {

            Route::get('/', [QuestionBankTopicController::class, 'index']);

            Route::post('/', [QuestionBankTopicController::class, 'store']);

            Route::get('/{questionBankTopic}', [QuestionBankTopicController::class, 'show']);

            Route::put('/{questionBankTopic}', [QuestionBankTopicController::class, 'update']);

            Route::delete('/{questionBankTopic}', [QuestionBankTopicController::class, 'destroy']);

        });



        // Curriculum Tracking

        Route::prefix('curriculum-tracking')->group(function () {

            Route::get('/', [CurriculumTrackingController::class, 'index']);

            Route::post('/', [CurriculumTrackingController::class, 'store']);

            Route::get('/compare', [CurriculumTrackingController::class, 'compareClassrooms']);

            Route::get('/report/topics', [CurriculumTrackingController::class, 'getTopicReport']);

            Route::get('/classroom/{classroomId}', [CurriculumTrackingController::class, 'getClassroomList']);

            Route::get('/teacher/{teacherId}', [CurriculumTrackingController::class, 'getTeacherList']);

            Route::get('/{curriculumTracking}', [CurriculumTrackingController::class, 'show']);

            Route::put('/{curriculumTracking}', [CurriculumTrackingController::class, 'update']);

            Route::delete('/{curriculumTracking}', [CurriculumTrackingController::class, 'destroy']);

        });



        // Meal Menu

        Route::prefix('meal-menus')->group(function () {

            Route::get('/template', [MealMenuController::class, 'downloadTemplate']);

            Route::post('/import', [MealMenuController::class, 'import']);

            Route::get('/', [MealMenuController::class, 'index']);

            Route::post('/', [MealMenuController::class, 'store']);

            Route::get('/{mealMenu}', [MealMenuController::class, 'show'])->whereNumber('mealMenu');

            Route::put('/{mealMenu}', [MealMenuController::class, 'update'])->whereNumber('mealMenu');

            Route::delete('/{mealMenu}', [MealMenuController::class, 'destroy'])->whereNumber('mealMenu');

            Route::post('/{mealMenu}/copy', [MealMenuController::class, 'copyToClassrooms'])->whereNumber('mealMenu');

        });



        Route::prefix('meal-attendance')->group(function () {

            Route::post('/', [MealMenuController::class, 'recordAttendance']);

            Route::get('/statistics', [MealMenuController::class, 'getAttendanceStatistics']);

        });



        // Duty Schedules

        Route::prefix('duty-schedules')->group(function () {

            Route::get('/', [DutyScheduleController::class, 'index']);

            Route::post('/', [DutyScheduleController::class, 'store']);

            Route::post('/check-conflict', [DutyScheduleController::class, 'checkConflict']);

            Route::post('/bulk-clear', [DutyScheduleController::class, 'bulkClear']);

            Route::post('/swap', [DutyScheduleController::class, 'swap']);

            Route::get('/{dutySchedule}', [DutyScheduleController::class, 'show']);

            Route::put('/{dutySchedule}', [DutyScheduleController::class, 'update']);

            Route::delete('/{dutySchedule}', [DutyScheduleController::class, 'destroy']);

        });



        // Appointments

        Route::prefix('appointments')->group(function () {

            Route::get('/', [AppointmentController::class, 'index']);

            Route::post('/', [AppointmentController::class, 'store']);

            Route::get('/{appointment}', [AppointmentController::class, 'show']);

            Route::put('/{appointment}', [AppointmentController::class, 'update']);

            Route::delete('/{appointment}', [AppointmentController::class, 'destroy']);

        });



        // Leads (CRM)

        Route::apiResource('leads', LeadController::class);



        // Achievement Certificates

        Route::prefix('achievement-certificates')->group(function () {

            Route::get('/', [AchievementCertificateController::class, 'index']);

            Route::post('/', [AchievementCertificateController::class, 'store']);

            Route::get('/{achievementCertificate}', [AchievementCertificateController::class, 'show']);

            Route::put('/{achievementCertificate}', [AchievementCertificateController::class, 'update']);

            Route::delete('/{achievementCertificate}', [AchievementCertificateController::class, 'destroy']);

            Route::post('/{achievementCertificate}/publish', [AchievementCertificateController::class, 'publishToGuardian']);

            Route::post('/{achievementCertificate}/portfolio', [AchievementCertificateController::class, 'addToPortfolio']);

        });



        // Contracts

        Route::prefix('contracts')->group(function () {

            Route::get('/', [ContractController::class, 'index']);

            Route::post('/', [ContractController::class, 'store']);

            Route::get('/{contract}', [ContractController::class, 'show']);

            Route::put('/{contract}', [ContractController::class, 'update']);

            Route::delete('/{contract}', [ContractController::class, 'destroy']);

            Route::post('/generate-pdf', [ContractController::class, 'generatePdf']);

            Route::get('/download-pdf', [ContractController::class, 'downloadPdf']);

        });



        // Scholarship Exams

        Route::prefix('scholarship-exams')->group(function () {

            Route::get('/', [ScholarshipExamController::class, 'index']);

            Route::post('/', [ScholarshipExamController::class, 'store']);

            Route::prefix('entry-templates')->group(function () {

                Route::get('/', [\App\Http\Controllers\ScholarshipExamEntryTemplateController::class, 'index']);

                Route::post('/', [\App\Http\Controllers\ScholarshipExamEntryTemplateController::class, 'store']);

                Route::get('/{scholarshipExamEntryTemplate}', [\App\Http\Controllers\ScholarshipExamEntryTemplateController::class, 'show']);

                Route::put('/{scholarshipExamEntryTemplate}', [\App\Http\Controllers\ScholarshipExamEntryTemplateController::class, 'update']);

                Route::delete('/{scholarshipExamEntryTemplate}', [\App\Http\Controllers\ScholarshipExamEntryTemplateController::class, 'destroy']);

            });



            Route::get('/{scholarshipExam}', [ScholarshipExamController::class, 'show'])->whereNumber('scholarshipExam');

            Route::put('/{scholarshipExam}', [ScholarshipExamController::class, 'update'])->whereNumber('scholarshipExam');

            Route::delete('/{scholarshipExam}', [ScholarshipExamController::class, 'destroy'])->whereNumber('scholarshipExam');

            Route::get('/{scholarshipExam}/statistics', [ScholarshipExamController::class, 'getStatistics'])->whereNumber('scholarshipExam');

            Route::get('/{scholarshipExam}/applications', [ScholarshipExamController::class, 'getApplications'])->whereNumber('scholarshipExam');

            Route::post('/applications', [ScholarshipExamController::class, 'createApplication']);

            Route::post('/applications/{application}/process', [ScholarshipExamController::class, 'processApplication']);

            Route::post('/{scholarshipExam}/generate-entry-document', [ScholarshipExamController::class, 'generateEntryDocument'])->whereNumber('scholarshipExam');

            Route::get('/{scholarshipExam}/download-entry-document/{application}', [ScholarshipExamController::class, 'downloadEntryDocument'])->whereNumber('scholarshipExam')->name('api.v1.scholarship-exams.entry-document.download');

            Route::post('/{scholarshipExam}/seating/generate', [ScholarshipExamController::class, 'generateSeating'])->whereNumber('scholarshipExam');

        });



        // Staff Assignments (Task Management)

        Route::prefix('staff-assignments')->group(function () {

            Route::get('/', [StaffAssignmentController::class, 'index']);

            Route::post('/', [StaffAssignmentController::class, 'store']);

            Route::get('/calendar-events', [StaffAssignmentController::class, 'getCalendarEvents']);

            Route::get('/{staffAssignment}', [StaffAssignmentController::class, 'show']);

            Route::put('/{staffAssignment}', [StaffAssignmentController::class, 'update']);

            Route::delete('/{staffAssignment}', [StaffAssignmentController::class, 'destroy']);

            Route::post('/{staffAssignment}/completion', [StaffAssignmentController::class, 'updateCompletion']);

            Route::get('/{staffAssignment}/available-questions', [StaffAssignmentController::class, 'getAvailableQuestions']);

            Route::post('/{staffAssignment}/select-questions', [StaffAssignmentController::class, 'selectQuestions']);

            Route::get('/{staffAssignment}/selected-questions', [StaffAssignmentController::class, 'getSelectedQuestions']);

        });



        // Online Exams

        Route::prefix('online-exams')->group(function () {

            Route::get('/', [OnlineExamController::class, 'index']);

            Route::post('/', [OnlineExamController::class, 'store']);

            Route::get('/{onlineExam}', [OnlineExamController::class, 'show']);

            Route::put('/{onlineExam}', [OnlineExamController::class, 'update']);

            Route::delete('/{onlineExam}', [OnlineExamController::class, 'destroy']);

            Route::post('/{onlineExam}/start', [OnlineExamController::class, 'startAttempt']);

            Route::post('/{attempt}/save-answer', [OnlineExamController::class, 'saveAnswer']);

            Route::post('/{attempt}/submit', [OnlineExamController::class, 'submitAttempt']);

            Route::get('/{onlineExam}/current-attempt', [OnlineExamController::class, 'getCurrentAttempt']);

        });

        // Legacy Guardian Portal routes -> forward directly to StudentPortalController
        Route::prefix('portal/guardian')->group(function () {
            Route::get('/profile', [StudentPortalController::class, 'getProfile']);
            Route::get('/dashboard', [StudentPortalController::class, 'dashboard']);
            Route::post('/change-password', [StudentPortalController::class, 'changePassword']);
        });



        // Student Portal

        Route::prefix('portal/student')->group(function () {

            Route::get('/profile', [StudentPortalController::class, 'getProfile']);

            Route::put('/profile', [StudentPortalController::class, 'updateProfile']);

            Route::get('/dashboard', [StudentPortalController::class, 'dashboard']);

            Route::get('/schedule', [StudentPortalController::class, 'getSchedule']);

            Route::get('/homework', [StudentPortalController::class, 'getHomework']);

            Route::get('/homework/{homework}', [StudentPortalController::class, 'getHomeworkDetail']);

            Route::get('/homework-report', [StudentPortalController::class, 'getHomeworkControlReport']);

            Route::get('/attendance', [StudentPortalController::class, 'getAttendance']);

            Route::get('/announcements', [StudentPortalController::class, 'getAnnouncements']);

            Route::get('/grades', [StudentPortalController::class, 'getGrades']);

            Route::post('/change-password', [StudentPortalController::class, 'changePassword']);

            Route::post('/switch-sibling', [StudentPortalController::class, 'switchSibling']);

            Route::get('/calendar', [StudentPortalController::class, 'getCalendar']);

            Route::get('/tutoring', [StudentPortalController::class, 'getTutoringSessions']);

            Route::get('/online-exams', [StudentPortalController::class, 'getOnlineExams']);

            Route::get('/guidance-notes', [StudentPortalController::class, 'getGuidanceNotes']);

            Route::get('/meal-menus', [StudentPortalController::class, 'getMealMenus']);

            Route::get('/bulletins', [StudentPortalController::class, 'getBulletins']);

            Route::get('/activities', [StudentPortalController::class, 'getActivities']);

            Route::get('/surveys', [StudentPortalController::class, 'getSurveys']);

        });



        // Scholarships

        Route::prefix('scholarships')->group(function () {

            Route::get('/', [ScholarshipController::class, 'index']);

            Route::post('/', [ScholarshipController::class, 'store']);

            Route::post('/archive-all', [ScholarshipController::class, 'archiveAll']);

            Route::post('/{scholarship}/restore', [ScholarshipController::class, 'restore']);

            Route::get('/statistics', [ScholarshipController::class, 'statistics']);

            Route::get('/students-by-classroom/{classroom}', [ScholarshipController::class, 'getStudentsByClassroom']);

            Route::post('/register-selected-students', [ScholarshipController::class, 'registerSelectedStudents']);

            Route::post('/register-entire-class', [ScholarshipController::class, 'registerEntireClass']);



            Route::get('/{scholarship}/entry-document', [ScholarshipController::class, 'downloadEntryDocument'])->whereNumber('scholarship');



            Route::get('/{scholarship}', [ScholarshipController::class, 'show'])->whereNumber('scholarship');

            Route::put('/{scholarship}', [ScholarshipController::class, 'update'])->whereNumber('scholarship');

            Route::delete('/{scholarship}', [ScholarshipController::class, 'destroy'])->whereNumber('scholarship');

        });



        // Scholarship Document Templates (Bursluluk Kayıt Belgesi Şablonları)

        Route::prefix('scholarship-document-templates')->group(function () {

            Route::get('/', [\App\Http\Controllers\ScholarshipDocumentTemplateController::class, 'index']);

            Route::post('/', [\App\Http\Controllers\ScholarshipDocumentTemplateController::class, 'store']);

            Route::get('/{scholarshipDocumentTemplate}', [\App\Http\Controllers\ScholarshipDocumentTemplateController::class, 'show']);

            Route::put('/{scholarshipDocumentTemplate}', [\App\Http\Controllers\ScholarshipDocumentTemplateController::class, 'update']);

            Route::delete('/{scholarshipDocumentTemplate}', [\App\Http\Controllers\ScholarshipDocumentTemplateController::class, 'destroy']);

        });



    });



    // Student Portal Public Routes

    Route::post('portal/student/login', [StudentPortalController::class, 'login']);

});



// Super Admin & SaaS Headquarters Routes
Route::prefix('v1/super-admin')->group(function () {

    // Public routes (no auth required for login)
    Route::prefix('auth')->group(function () {
        Route::post('/login', [\App\Http\Controllers\SuperAdmin\AuthController::class, 'login']);
    });

    // Protected routes for EduLem HQ Personnel (auth:sanctum + EnsureSaasStaff)
    Route::middleware(['auth:sanctum', \App\Http\Middleware\EnsureSaasStaff::class])->group(function () {

        // Authentication & Profile
        Route::post('/auth/logout', [\App\Http\Controllers\SuperAdmin\AuthController::class, 'logout']);
        Route::get('/auth/me', [\App\Http\Controllers\SuperAdmin\AuthController::class, 'me']);

        // SaaS Dashboard Statistics
        Route::get('/statistics', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'statistics']);

        // Tenants (Okul / Kurum) Management
        Route::prefix('tenants')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'destroy']);
            Route::patch('/{id}/toggle-status', [\App\Http\Controllers\SuperAdmin\TenantController::class, 'toggleStatus']);

            // Okul Modül Lisansları (*lem modülleri aç/kapa ve özel fiyat)
            Route::get('/{tenantId}/licenses', [\App\Http\Controllers\SuperAdmin\TenantLicenseController::class, 'index']);
            Route::post('/{tenantId}/licenses/toggle', [\App\Http\Controllers\SuperAdmin\TenantLicenseController::class, 'toggle']);
            Route::put('/{tenantId}/licenses/{licenseId}/price', [\App\Http\Controllers\SuperAdmin\TenantLicenseController::class, 'updatePrice']);

            // Okul Ödemeleri & Taksitleri
            Route::get('/{tenantId}/payments', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'index']);
            Route::post('/{tenantId}/payments', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'store']);
        });

        // Canlı Destek / Okula Sızma Girişi
        Route::post('/impersonate/{tenantId}', [\App\Http\Controllers\SuperAdmin\ImpersonationController::class, 'impersonate']);

        // EduLem Modül Kataloğu (QuizLem, KeyLem, ClassLem vb.)
        Route::prefix('modules')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdmin\SaasModuleController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\SuperAdmin\SaasModuleController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\SuperAdmin\SaasModuleController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\SuperAdmin\SaasModuleController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\SaasModuleController::class, 'destroy']);
            Route::patch('/{id}/toggle-status', [\App\Http\Controllers\SuperAdmin\SaasModuleController::class, 'toggleStatus']);
        });

        // Finans, Gelir/Gider & Ödemeler
        Route::prefix('finance')->group(function () {
            Route::get('/dashboard', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'financeDashboard']);
        });

        Route::prefix('payments')->group(function () {
            Route::post('/', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'destroy']);
            Route::post('/{id}/mark-paid', [\App\Http\Controllers\SuperAdmin\TenantPaymentController::class, 'markPaid']);
        });

        // EduLem Şirket Giderleri (Hosting, SMS, Maaş, Sunucu vs.)
        Route::prefix('expenses')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdmin\SaasExpenseController::class, 'index']);
            Route::get('/summary', [\App\Http\Controllers\SuperAdmin\SaasExpenseController::class, 'summary']);
            Route::post('/', [\App\Http\Controllers\SuperAdmin\SaasExpenseController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\SuperAdmin\SaasExpenseController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\SuperAdmin\SaasExpenseController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\SaasExpenseController::class, 'destroy']);
        });

        // EduLem Şirket Personeli Yönetimi (Teknik Destek, Finans, Satış)
        Route::prefix('staff')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdmin\SaasStaffController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\SuperAdmin\SaasStaffController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\SuperAdmin\SaasStaffController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\SuperAdmin\SaasStaffController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\SaasStaffController::class, 'destroy']);
            Route::patch('/{id}/toggle-status', [\App\Http\Controllers\SuperAdmin\SaasStaffController::class, 'toggleStatus']);
        });

    });

});

