<?php

use App\Http\Controllers\Api\AdlgController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GeographyController;
use App\Http\Controllers\Api\InquiryController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileSubmissionController;
use App\Http\Controllers\Api\TehsilController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/profile', [ProfileController::class, 'update']);

    Route::middleware('role:sa')->prefix('admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);

        Route::get('/divisions', [GeographyController::class, 'divisions']);
        Route::post('/divisions', [GeographyController::class, 'storeDivision']);
        Route::put('/divisions/{division}', [GeographyController::class, 'updateDivision']);
        Route::delete('/divisions/{division}', [GeographyController::class, 'destroyDivision']);

        Route::get('/districts', [GeographyController::class, 'districts']);
        Route::post('/districts', [GeographyController::class, 'storeDistrict']);
        Route::put('/districts/{district}', [GeographyController::class, 'updateDistrict']);
        Route::delete('/districts/{district}', [GeographyController::class, 'destroyDistrict']);

        Route::get('/tehsils', [TehsilController::class, 'index']);
        Route::post('/tehsils', [TehsilController::class, 'store']);
        Route::put('/tehsils/{tehsil}', [TehsilController::class, 'update']);
        Route::delete('/tehsils/{tehsil}', [TehsilController::class, 'destroy']);

        Route::get('/adlgs', [AdlgController::class, 'index']);
        Route::post('/adlgs', [AdlgController::class, 'store']);
        Route::put('/adlgs/{adlg}', [AdlgController::class, 'update']);
        Route::patch('/adlgs/{adlg}/toggle-active', [AdlgController::class, 'toggleActive']);

        Route::get('/audit-log', [AuditLogController::class, 'index']);

        Route::get('/inquiries', [InquiryController::class, 'index']);
        Route::get('/inquiries/{inquiry}', [InquiryController::class, 'show']);
        Route::post('/inquiries/{inquiry}/report', [InquiryController::class, 'uploadReport']);

        Route::get('/newsletters', [NewsletterController::class, 'index']);
        Route::post('/newsletters', [NewsletterController::class, 'store']);

        Route::get('/profile-submissions', [ProfileSubmissionController::class, 'index']);

        Route::post('/users/{user}/reset-password', [ProfileController::class, 'resetPassword']);
    });
});
