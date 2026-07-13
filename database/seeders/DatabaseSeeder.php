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
                'email' => 'sa@demo.pk',
                'password' => '1234',
                'active' => true,
                'bio_enrolled' => true,
                'first_login' => false,
            ]
        );

        $this->call([
            GeographySeeder::class,
            UnionCouncilSeeder::class,
            SecretarySeeder::class,
            DvCaseSeeder::class,
        ]);
    }
}
