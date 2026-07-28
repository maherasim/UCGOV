<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\SecretaryProfile;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Scheduled every 5 minutes, 9AM-5PM Mon-Sat (matching the platform's work
 * week — see ConnectivityMonitor.jsx). A secretary's phone can't report its
 * own internet outage (no connectivity = no way to tell the server), so this
 * flips the detection around: if a secretary who marked attendance today
 * hasn't sent a location ping in 5+ minutes, the ADLG is pushed a "gone
 * silent" alert instead. Debounced via silent_alert_sent_at — only the first
 * stale check in a streak notifies; a fresh ping (see
 * AttendanceController::updateLiveLocation()) clears the flag.
 */
class CheckSilentSecretaries extends Command
{
    protected $signature = 'attendance:check-silent-secretaries';

    protected $description = "Push the ADLG when an on-duty secretary's app has gone silent (no location ping) for 5+ minutes";

    // TESTING: 1 minute for now — bump back to 5 (or whatever the client wants) before going live.
    protected const SILENCE_THRESHOLD_MINUTES = 1;

    public function handle(PushNotificationService $push): int
    {
        $now = Carbon::now();

        if (! in_array($now->dayOfWeek, [1, 2, 3, 4, 5, 6], true) || $now->hour < 9 || $now->hour >= 17) {
            $this->info('Outside working hours — skipping.');

            return self::SUCCESS;
        }

        $onDutySecretaryIds = AttendanceRecord::where('attendance_date', $now->toDateString())
            ->pluck('secretary_id');

        $staleThreshold = $now->copy()->subMinutes(self::SILENCE_THRESHOLD_MINUTES);

        $profiles = SecretaryProfile::whereIn('user_id', $onDutySecretaryIds)
            ->whereNull('silent_alert_sent_at')
            ->where(function ($query) use ($staleThreshold) {
                $query->whereNull('live_updated_at')->orWhere('live_updated_at', '<', $staleThreshold);
            })
            ->with(['user', 'unionCouncil'])
            ->get();

        foreach ($profiles as $profile) {
            if (! $profile->user) {
                continue;
            }

            $profile->update(['silent_alert_sent_at' => $now]);

            $push->notifyAdlgAboutSecretary(
                $profile->user,
                $profile->unionCouncil,
                "{$profile->user->name} hasn't reported their location in a while — they may have lost internet connectivity.",
                'SECRETARY_SILENT',
            );
        }

        $this->info("Silence check complete — {$profiles->count()} secretary(ies) flagged.");

        return self::SUCCESS;
    }
}
