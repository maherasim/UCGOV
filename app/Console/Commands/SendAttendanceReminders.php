<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Scheduled ~09:10 daily (Mon-Sat, matching the platform's work week) — pushes a
 * reminder to every Secretary who hasn't marked attendance yet today. Registered
 * in bootstrap/app.php's withSchedule(); requires the server's real cron to be
 * hitting `php artisan schedule:run` every minute, or this never fires at all.
 */
class SendAttendanceReminders extends Command
{
    protected $signature = 'attendance:send-reminders';

    protected $description = "Push a reminder to every Secretary who hasn't marked attendance yet today";

    public function handle(PushNotificationService $push): int
    {
        $today = Carbon::today();

        if (! $push->isWithinBusinessHours()) {
            $this->info('Outside working hours — skipping.');

            return self::SUCCESS;
        }

        $markedSecretaryIds = AttendanceRecord::where('attendance_date', $today->toDateString())
            ->pluck('secretary_id');

        $pending = User::where('role', 'sec')
            ->where('active', true)
            ->whereNotIn('id', $markedSecretaryIds)
            ->get();

        foreach ($pending as $secretary) {
            $push->sendToUser(
                $secretary,
                'Mark your attendance',
                "Good morning, {$secretary->name} — don't forget to mark today's attendance.",
                ['type' => 'attendance_reminder'],
            );
        }

        $this->info("Reminder pass complete — {$pending->count()} secretary(ies) hadn't marked attendance.");

        return self::SUCCESS;
    }
}
