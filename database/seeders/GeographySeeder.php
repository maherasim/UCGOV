<?php

namespace Database\Seeders;

use App\Models\Division;
use Illuminate\Database\Seeder;

/**
 * Representative sample of real Punjab geography (not the full official
 * 9-division/36-district/150-tehsil dataset — deliberately deferred) so the
 * app has enough realistic data to demo cascading dropdowns, search, and
 * pagination. Idempotent via firstOrCreate — safe to re-run, and coexists
 * with anything created manually through the UI.
 */
class GeographySeeder extends Seeder
{
    protected array $tree = [
        'Lahore' => [
            'Lahore' => ['Lahore City', 'Lahore Cantt', 'Model Town'],
            'Kasur' => ['Kasur', 'Pattoki'],
        ],
        'Multan' => [
            'Multan' => ['Multan City', 'Shujabad'],
            'Vehari' => ['Vehari', 'Burewala', 'Mailsi'],
            'Khanewal' => ['Khanewal', 'Kabirwala'],
        ],
        'Faisalabad' => [
            'Faisalabad' => ['Faisalabad City', 'Jaranwala'],
            'Toba Tek Singh' => ['Toba Tek Singh', 'Gojra'],
        ],
        'Rawalpindi' => [
            'Rawalpindi' => ['Rawalpindi', 'Gujar Khan'],
            'Attock' => ['Attock', 'Fateh Jang'],
        ],
        'Gujranwala' => [
            'Gujranwala' => ['Gujranwala City', 'Wazirabad'],
            'Sialkot' => ['Sialkot', 'Daska'],
        ],
    ];

    public function run(): void
    {
        foreach ($this->tree as $divisionName => $districts) {
            $division = Division::firstOrCreate(['name' => $divisionName]);

            foreach ($districts as $districtName => $tehsils) {
                $district = $division->districts()->firstOrCreate(['name' => $districtName]);

                foreach ($tehsils as $tehsilName) {
                    $district->tehsils()->firstOrCreate(['name' => $tehsilName]);
                }
            }
        }
    }
}
