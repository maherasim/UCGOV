<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Requires the server's real cron to run `php artisan schedule:run` every
        // minute — see the deploy notes; this alone does nothing without that.
        $schedule->command('attendance:send-reminders')->dailyAt('09:10')->timezone('Asia/Karachi');
        // TESTING: every minute to match the 1-minute threshold — switch back to
        // everyFiveMinutes() when CheckSilentSecretaries::SILENCE_THRESHOLD_MINUTES goes back to 5.
        $schedule->command('attendance:check-silent-secretaries')->everyMinute()->between('09:00', '17:00')->timezone('Asia/Karachi');
    })
    ->create();
