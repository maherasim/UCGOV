<?php

namespace Database\Seeders;

use App\Models\Tehsil;
use App\Models\UnionCouncil;
use Illuminate\Database\Seeder;

class UnionCouncilSeeder extends Seeder
{
    protected array $localityTemplates = [
        '%s City',
        'Chak %d/WB',
        'Model Town %s',
        '%s Cantt',
        'New %s',
        'Chak %d',
    ];

    public function run(): void
    {
        Tehsil::all()->each(function (Tehsil $tehsil) {
            $existing = $tehsil->unionCouncils()->count();
            $target = 4;

            if ($existing >= $target) {
                return;
            }

            $nextUcNo = ($tehsil->unionCouncils()->max('uc_no') ?? 0) + 1;

            for ($i = $existing; $i < $target; $i++) {
                $template = $this->localityTemplates[$i % count($this->localityTemplates)];
                $name = str_contains($template, '%d')
                    ? sprintf($template, random_int(10, 99))
                    : sprintf($template, $tehsil->name);

                UnionCouncil::create([
                    'tehsil_id' => $tehsil->id,
                    'uc_no' => $nextUcNo,
                    'name' => $name,
                    'code' => 'UC-' . $tehsil->id . '-' . $nextUcNo,
                    'address' => $tehsil->name,
                    'geofence_radius' => 150,
                    'active' => true,
                ]);

                $nextUcNo++;
            }
        });
    }
}
