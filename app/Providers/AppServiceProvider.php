<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Laravel\Passkeys\Passkeys;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        // We call the registration/verification Actions directly from our own
        // controllers (enrollment lives in ProfileController, attendance step-up
        // verification in AttendanceController) instead of the package's own
        // password.confirm-gated routes, which don't fit this SPA's flows.
        Passkeys::ignoreRoutes();
    }
}
