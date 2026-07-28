<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\DeviceToken;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FirebaseNotification;
use Throwable;

/**
 * Thin push-notification abstraction so callers (the attendance reminder
 * command, future case-update pushes, etc.) don't need to know the FCM
 * plumbing — send a title/body/data payload to a user's registered devices.
 */
class PushNotificationService
{
    public function isConfigured(): bool
    {
        return filled(config('services.firebase.project_id')) && is_file((string) config('services.firebase.credentials'));
    }

    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = DeviceToken::where('user_id', $user->id)->pluck('token', 'id');

        if ($tokens->isEmpty()) {
            return;
        }

        if (! $this->isConfigured()) {
            Log::info('[PushNotificationService] Firebase not configured yet — skipping push.', [
                'user_id' => $user->id,
                'title' => $title,
                'tokens' => $tokens->count(),
            ]);

            return;
        }

        try {
            $messaging = (new Factory())
                ->withServiceAccount(config('services.firebase.credentials'))
                ->createMessaging();

            $message = CloudMessage::new()
                ->withNotification(FirebaseNotification::create($title, $body))
                ->withData(array_map('strval', $data));

            $report = $messaging->sendMulticast($message, $tokens->values()->all());

            // Prune tokens FCM says are dead — keeps the table from accumulating
            // stale entries for uninstalled apps / reissued tokens.
            $deadTokens = array_merge($report->unknownTokens(), $report->invalidTokens());
            if (! empty($deadTokens)) {
                DeviceToken::whereIn('token', $deadTokens)->delete();
            }
        } catch (Throwable $e) {
            Log::warning('[PushNotificationService] Failed to send push.', [
                'user_id' => $user->id,
                'title' => $title,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Shared "something's wrong with this secretary's field presence" alert —
     * used by geofence/location-disabled reporting (AttendanceController) and
     * the silent-secretary staleness check (CheckSilentSecretaries command).
     * Writes a CaseNotification + AuditLog and pushes the tehsil's ADLG.
     */
    public function notifyAdlgAboutSecretary(User $secretary, ?UnionCouncil $uc, string $message, string $type): void
    {
        if (! $uc) {
            return;
        }

        $adlgId = optional($uc->tehsil->adlgProfiles()->first())->user_id;
        if (! $adlgId) {
            return;
        }

        CaseNotification::create([
            'to_user_id' => $adlgId,
            'from_user_id' => $secretary->id,
            'type' => $type,
            'message' => "\u{1F4CD} {$message}",
        ]);

        AuditLog::create([
            'user_id' => $secretary->id,
            'action' => $type,
            'entity_type' => 'SecretaryProfile',
            'entity_id' => $secretary->secretaryProfile->id,
            'note' => $message,
        ]);

        $adlg = User::find($adlgId);
        if ($adlg) {
            $this->sendToUser($adlg, 'Field alert', $message, ['type' => $type]);
        }
    }
}
