<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Scheduled every 10 minutes from 10:30 onward, Mon-Sat — pushes every ADLG who
 * hasn't yet downloaded today's attendance analytics a reminder to do so. Mirrors
 * the timing/intent of the web dashboard's AttendanceAnalyticsPopup.jsx (which is
 * only ever a browser-side popup) but reaches their phone, and — unlike that
 * one-shot popup — keeps nagging until they actually download, then stops
 * automatically (see analyticsExportForAdlg()'s last_analytics_download_at write).
 */
class SendAttendanceAnalyticsReminder extends Command
{
    protected $signature = 'attendance:send-analytics-reminder';

    protected $description = "Push every ADLG who hasn't downloaded today's attendance analytics yet, until they do";

    public function handle(PushNotificationService $push): int
    {
        $today = Carbon::today();

        if (! in_array($today->dayOfWeek, [1, 2, 3, 4, 5, 6], true)) {
            $this->info('Not a working day — skipping.');

            return self::SUCCESS;
        }

        $adlgs = User::where('role', 'adlg')
            ->where('active', true)
            ->whereHas('adlgProfile', function ($query) use ($today) {
                $query->whereNull('last_analytics_download_at')
                    ->orWhere('last_analytics_download_at', '<', $today);
            })
            ->with('adlgProfile.tehsil')
            ->get();

        foreach ($adlgs as $adlg) {
            $tehsil = $adlg->adlgProfile?->tehsil?->name;

            $push->sendToUser(
                $adlg,
                "Today's Attendance Analytics",
                $tehsil
                    ? "Please download today's attendance analytics for Tehsil {$tehsil}."
                    : "Please download today's attendance analytics.",
                ['type' => 'attendance_analytics_reminder'],
            );
        }

        $this->info("Analytics reminder pass complete — {$adlgs->count()} ADLG(s) still haven't downloaded today.");

        return self::SUCCESS;
    }
}
