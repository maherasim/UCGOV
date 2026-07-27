<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdlgReportsFetchTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Config::set('database.default', 'mysql');
        Config::set('database.connections.mysql.host', '127.0.0.1');
        Config::set('database.connections.mysql.port', '3306');
        Config::set('database.connections.mysql.database', 'ucgov');
        Config::set('database.connections.mysql.username', 'root');
        Config::set('database.connections.mysql.password', '');
        DB::purge('mysql');
        DB::setDefaultConnection('mysql');
        $this->withHeaders(['Accept' => 'application/json']);
    }

    public function test_adlg_reports_endpoint(): void
    {
        $adlg = User::where('role', 'adlg')->firstOrFail();
        Sanctum::actingAs($adlg);

        $resp = $this->getJson('/api/adlg/reports');
        dump('status: '.$resp->status());
        dump($resp->json());
    }
}
