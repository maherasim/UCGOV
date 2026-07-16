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

        // Real Punjab geography (Divisions/Districts/Tehsils/Union Councils), real ADLG
        // officers, real UC GPS coordinates, and real UC Secretaries, all from official
        // Government of Punjab source lists — see PunjabGeographySeeder, AdlgOfficerSeeder,
        // UcGpsSeeder, and SecretaryMasterSeeder for data-quality notes. Fake demo Cases are
        // deliberately not seeded here: those get created through the app itself.
        // GeographySeeder/UnionCouncilSeeder/SecretarySeeder/DvCaseSeeder still exist for
        // local demo use — run them manually via `php artisan db:seed --class=DvCaseSeeder`
        // etc. if you want sample data.
        $this->call([
            PunjabGeographySeeder::class,
            AdlgOfficerSeeder::class,
            UcGpsSeeder::class,
            SecretaryMasterSeeder::class,
        ]);
    }
}
