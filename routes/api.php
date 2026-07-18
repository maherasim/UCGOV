<?php

use App\Http\Controllers\Api\AdlgAiController;
use App\Http\Controllers\Api\AdlgController;
use App\Http\Controllers\Api\AdlgDashboardController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DklicDocumentController;
use App\Http\Controllers\Api\DklicKnowledgeController;
use App\Http\Controllers\Api\DvCaseController;
use App\Http\Controllers\Api\GeographyController;
use App\Http\Controllers\Api\InquiryController;
use App\Http\Controllers\Api\LbrCaseController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasskeyController;
use App\Http\Controllers\Api\PerformaController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileSubmissionController;
use App\Http\Controllers\Api\SecretaryController;
use App\Http\Controllers\Api\TehsilController;
use App\Http\Controllers\Api\UnionCouncilController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);
    Route::post('/profile/complete-first-login', [ProfileController::class, 'completeFirstLogin']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);

    Route::get('/passkeys', [PasskeyController::class, 'index']);
    Route::get('/passkeys/register-options', [PasskeyController::class, 'registerOptions']);
    Route::post('/passkeys', [PasskeyController::class, 'register']);
    Route::delete('/passkeys/{passkey}', [PasskeyController::class, 'destroy']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

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

        Route::get('/union-councils', [UnionCouncilController::class, 'indexForAdmin']);

        Route::get('/secretaries', [SecretaryController::class, 'indexForAdmin']);
        Route::get('/secretaries/{secretary}', [SecretaryController::class, 'showForAdmin']);

        Route::get('/audit-log', [AuditLogController::class, 'index']);
        Route::get('/audit-log-export', [AuditLogController::class, 'export']);

        Route::get('/inquiries', [InquiryController::class, 'index']);
        Route::get('/inquiries/{inquiry}', [InquiryController::class, 'show']);
        Route::post('/inquiries/{inquiry}/report', [InquiryController::class, 'uploadReport']);

        Route::get('/newsletters', [NewsletterController::class, 'index']);
        Route::post('/newsletters', [NewsletterController::class, 'store']);
        Route::get('/newsletters/{newsletter}/responses', [NewsletterController::class, 'responses']);

        Route::get('/profile-submissions', [ProfileSubmissionController::class, 'index']);

        Route::post('/users/{user}/reset-password', [ProfileController::class, 'resetPassword']);

        Route::get('/dklic-documents', [DklicDocumentController::class, 'index']);
        Route::post('/dklic-documents', [DklicDocumentController::class, 'store']);
        Route::patch('/dklic-documents/{document}/archive', [DklicDocumentController::class, 'archive']);
        Route::get('/dklic-documents/export', [DklicDocumentController::class, 'export']);
    });

    Route::middleware('role:adlg')->prefix('adlg')->group(function () {
        Route::get('/dashboard', [AdlgDashboardController::class, 'index']);
        Route::post('/ai/ask', [AdlgAiController::class, 'ask']);

        Route::get('/union-councils', [UnionCouncilController::class, 'index']);
        Route::post('/union-councils', [UnionCouncilController::class, 'store']);
        Route::put('/union-councils/{unionCouncil}', [UnionCouncilController::class, 'update']);

        Route::get('/secretaries', [SecretaryController::class, 'index']);
        Route::post('/secretaries', [SecretaryController::class, 'store']);
        Route::put('/secretaries/{secretary}', [SecretaryController::class, 'update']);
        Route::patch('/secretaries/{secretary}/toggle-active', [SecretaryController::class, 'toggleActive']);
        Route::post('/secretaries/{secretary}/reset-password', [SecretaryController::class, 'resetPassword']);
        Route::post('/secretaries/{secretary}/charges', [SecretaryController::class, 'assignAdditionalCharge']);
        Route::delete('/secretaries/{secretary}/charges/{unionCouncil}', [SecretaryController::class, 'removeAdditionalCharge']);

        Route::get('/cases', [DvCaseController::class, 'index']);
        Route::get('/cases/{case}', [DvCaseController::class, 'show']);
        Route::post('/cases/{case}/mark-seen', [DvCaseController::class, 'markSeen']);
        Route::post('/cases/{case}/issue-notice', [DvCaseController::class, 'issueNotice']);
        Route::post('/cases/{case}/pass-decision', [DvCaseController::class, 'passDecision']);
        Route::post('/cases/{case}/proceedings', [DvCaseController::class, 'addProceeding']);
        Route::get('/cases/{case}/notesheet', [DvCaseController::class, 'notesheet']);
        Route::get('/cases/{case}/full-file', [DvCaseController::class, 'fullCaseFile']);
        Route::get('/cases-export', [DvCaseController::class, 'export']);

        Route::get('/newsletters', [NewsletterController::class, 'indexForAdlg']);
        Route::post('/newsletters/{newsletter}/respond', [NewsletterController::class, 'respond']);

        Route::get('/inquiries', [InquiryController::class, 'indexForAdlg']);
        Route::post('/inquiries', [InquiryController::class, 'store']);

        Route::get('/attendance', [AttendanceController::class, 'indexForAdlg']);
        Route::get('/attendance/analytics-export', [AttendanceController::class, 'analyticsExportForAdlg']);
        Route::get('/movement-log', [AttendanceController::class, 'movementIndexForAdlg']);
        Route::get('/movement-log/export', [AttendanceController::class, 'movementExportForAdlg']);
        Route::get('/live-locations', [AttendanceController::class, 'liveLocations']);

        Route::get('/reports', [DailyReportController::class, 'indexForAdlg']);
        Route::patch('/reports/{report}/mark-reviewed', [DailyReportController::class, 'markReviewed']);

        Route::get('/performas', [PerformaController::class, 'indexForAdlg']);
        Route::post('/performas', [PerformaController::class, 'store']);
        Route::get('/performas/{performa}/responses', [PerformaController::class, 'responses']);
        Route::get('/performas/{performa}/responses/export', [PerformaController::class, 'exportResponses']);
        Route::get('/performas/{performa}/template', [PerformaController::class, 'downloadTemplateForAdlg']);

        Route::get('/dklic-documents', [DklicKnowledgeController::class, 'index']);
        Route::post('/dklic-documents/{document}/view', [DklicKnowledgeController::class, 'view']);
        Route::post('/dklic-documents/{document}/download', [DklicKnowledgeController::class, 'download']);
        Route::post('/dklic-documents/{document}/bookmark', [DklicKnowledgeController::class, 'toggleBookmark']);
        Route::post('/dklic-documents/{document}/acknowledge', [DklicKnowledgeController::class, 'acknowledge']);
        Route::post('/dklic-ai/ask', [DklicKnowledgeController::class, 'askAi']);

        Route::get('/lbr-cases', [LbrCaseController::class, 'indexForAdlg']);
        Route::get('/lbr-cases-export', [LbrCaseController::class, 'export']);
        Route::get('/lbr-cases/{lbrCase}', [LbrCaseController::class, 'showForAdlg']);
        Route::post('/lbr-cases/{lbrCase}/review', [LbrCaseController::class, 'review']);
        Route::get('/lbr-cases/{lbrCase}/notesheet', [LbrCaseController::class, 'notesheet']);
    });

    Route::middleware('role:sec')->prefix('sec')->group(function () {
        Route::get('/attendance/webauthn-options', [AttendanceController::class, 'webauthnOptions']);
        Route::post('/attendance/mark-in', [AttendanceController::class, 'markIn']);
        Route::get('/attendance', [AttendanceController::class, 'myHistory']);
        Route::post('/attendance/log-movement', [AttendanceController::class, 'logMovement']);
        Route::post('/attendance/live-location', [AttendanceController::class, 'updateLiveLocation']);

        Route::post('/reports', [DailyReportController::class, 'store']);
        Route::get('/reports', [DailyReportController::class, 'myHistory']);

        Route::get('/performas', [PerformaController::class, 'indexForSecretary']);
        Route::post('/performas/{performa}/respond-form', [PerformaController::class, 'respondForm']);
        Route::post('/performas/{performa}/respond-excel', [PerformaController::class, 'respondExcel']);
        Route::get('/performas/{performa}/template', [PerformaController::class, 'downloadTemplateForSecretary']);

        Route::get('/cases', [DvCaseController::class, 'indexForSecretary']);
        Route::get('/cases/{case}', [DvCaseController::class, 'showForSecretary']);
        Route::post('/cases', [DvCaseController::class, 'storeForSecretary']);
        Route::post('/cases/{case}/constitute-arbitration', [DvCaseController::class, 'constituteArbitration']);
        Route::post('/cases/{case}/proceedings', [DvCaseController::class, 'addProceeding']);
        Route::get('/cases/{case}/notesheet', [DvCaseController::class, 'notesheet']);
        Route::get('/cases/{case}/full-file', [DvCaseController::class, 'fullCaseFile']);

        Route::get('/dklic-documents', [DklicKnowledgeController::class, 'index']);
        Route::post('/dklic-documents/{document}/view', [DklicKnowledgeController::class, 'view']);
        Route::post('/dklic-documents/{document}/download', [DklicKnowledgeController::class, 'download']);
        Route::post('/dklic-documents/{document}/bookmark', [DklicKnowledgeController::class, 'toggleBookmark']);
        Route::post('/dklic-documents/{document}/acknowledge', [DklicKnowledgeController::class, 'acknowledge']);
        Route::post('/dklic-ai/ask', [DklicKnowledgeController::class, 'askAi']);

        Route::get('/lbr-cases', [LbrCaseController::class, 'indexForSecretary']);
        Route::get('/lbr-cases/{lbrCase}', [LbrCaseController::class, 'showForSecretary']);
        Route::post('/lbr-cases', [LbrCaseController::class, 'storeForSecretary']);
        Route::post('/lbr-cases/{lbrCase}/register-certificate', [LbrCaseController::class, 'registerCertificate']);
        Route::get('/lbr-cases/{lbrCase}/notesheet', [LbrCaseController::class, 'notesheet']);
    });
});
