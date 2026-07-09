<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_using_username_or_email(): void
    {
        $user = User::factory()->create(['role' => 'sa', 'password' => 'password']);

        $response = $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertOk();

        $this->postJson('/api/login', [
            'login' => $user->email,
            'password' => 'password',
        ])->assertOk();
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create(['password' => 'password']);

        $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'wrong-password',
        ])->assertUnprocessable();

        $this->assertGuest();
    }

    public function test_inactive_users_cannot_authenticate(): void
    {
        $user = User::factory()->create(['password' => 'password', 'active' => false]);

        $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'password',
        ])->assertUnprocessable();

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/logout');

        // Assert against the 'web' guard explicitly: auth:sanctum middleware switches
        // the default guard to 'sanctum' for the rest of the request via shouldUse(),
        // and RequestGuard caches its resolved user for the request's lifetime — so a
        // bare assertGuest() would see that stale pre-logout cache, not the real state.
        $this->assertGuest('web');
        $response->assertNoContent();
    }
}
