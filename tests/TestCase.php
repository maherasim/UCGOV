<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Simulate a same-origin SPA request so Sanctum's EnsureFrontendRequestsAreStateful
     * middleware starts a session — without a Referer header it treats requests as
     * stateless and `$request->session()` throws inside session-based auth endpoints.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', config('app.url'));
    }
}
