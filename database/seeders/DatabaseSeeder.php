<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Dev/demo login only — rotate or remove before this touches production.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'role' => 'sa',
                'name' => 'System Administrator',
                'email' => 'superadmin@gmail.com',
                'password' => '123456',
                'active' => true,
                'bio_enrolled' => true,
                'first_login' => false,
            ]
        );

        // Real Punjab geography (Divisions/Districts/Tehsils/Union Councils) from the
        // Government of Punjab's official Union Councils spreadsheet — see
        // PunjabGeographySeeder for data-quality notes. Fake demo Secretaries/Cases are
        // deliberately not seeded here: real ADLG/Secretary accounts get created through
        // the app itself. GeographySeeder/UnionCouncilSeeder/SecretarySeeder/DvCaseSeeder
        // still exist for local demo use — run them manually via
        // `php artisan db:seed --class=SecretarySeeder` etc. if you want sample data.
        $this->call([
            PunjabGeographySeeder::class,
        ]);
    }
}
