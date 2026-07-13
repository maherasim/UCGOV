<?php

namespace Database\Seeders;

use App\Models\SecretaryProfile;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Assigns a secretary to most (not all) seeded UCs, deliberately leaving some
 * vacant to exercise that state in the UI, matching the prototype's design.
 */
class SecretarySeeder extends Seeder
{
    protected array $names = [
        'Muhammad Ali Khan', 'Kashif Hussain', 'Nadia Bibi', 'Sadia Perveen', 'Rana Imran',
        'Zeeshan Khalid', 'Adnan Sattar', 'Rashid Mahmood', 'Naveed Akhtar', 'Bilal Hassan',
        'Farah Deeba', 'Shazia Kanwal', 'Rabia Iqbal', 'Sana Malik', 'Hina Sultana',
        'Waqas Ahmed', 'Faisal Iqbal', 'Mehwish Ali', 'Bushra Yasmin', 'Tariq Latif',
    ];

    public function run(): void
    {
        $ucs = UnionCouncil::whereDoesntHave('secretaryProfile')->get();
        $nameIndex = 0;

        foreach ($ucs as $uc) {
            // Leave ~1 in 4 UCs vacant.
            if (random_int(1, 4) === 4) {
                continue;
            }

            $name = $this->names[$nameIndex % count($this->names)];
            $nameIndex++;

            $username = 'sec.' . Str::slug($uc->name) . '.' . $uc->id;

            $user = User::updateOrCreate(
                ['username' => $username],
                [
                    'role' => 'sec',
                    'name' => $name,
                    'password' => '1234',
                    'cnic' => $this->fakeCnic(),
                    'phone' => $this->fakePhone(),
                    'active' => true,
                    'bio_enrolled' => true,
                    'first_login' => false,
                ]
            );

            SecretaryProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'union_council_id' => $uc->id,
                    'profile_completed_at' => now(),
                ]
            );
        }
    }

    protected function fakeCnic(): string
    {
        return sprintf('%05d-%07d-%d', random_int(30000, 39999), random_int(1000000, 9999999), random_int(0, 9));
    }

    protected function fakePhone(): string
    {
        return sprintf('03%02d-%07d', random_int(0, 49), random_int(1000000, 9999999));
    }
}
