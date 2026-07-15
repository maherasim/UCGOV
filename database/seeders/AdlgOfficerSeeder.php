<?php

namespace Database\Seeders;

use App\Models\AdlgProfile;
use App\Models\Tehsil;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds real ADLG (Assistant Director Local Government) officer accounts from
 * database/data/punjab_adlgs.json, itself parsed from the Government of Punjab's
 * "ADLGs Punjab" list (July 2026) and reconciled against the real Tehsil records
 * created by PunjabGeographySeeder.
 *
 * Data-quality notes (source file, not this seeder):
 * - Three posts have no matching Tehsil anywhere in the March-2023 UC geography and are
 *   excluded from the JSON entirely: Khushab (Sadar) tehsil, Bahawalnagar (Sadar) tehsil,
 *   and Kot Addu's "Chowk Sarwar Shaheed" sub-tehsil — none were captured as a distinct
 *   tehsil block in the source UC spreadsheet, so no real Union Councils exist under them.
 * - Three districts in the ADLG list (Wazirabad, Murree, Talagang) are modelled as tehsils
 *   of an older parent district in the UC geography (Hafizabad/Gujrat Division, Rawalpindi,
 *   and Chakwal respectively) — the JSON already resolves these to the correct tehsil.
 * - One contact number (row 52, ADLG Murree) didn't match the app's phone format and was
 *   left blank; the reason is preserved in that row's `remarks`.
 * - 19 posts are "Vacant" in the source (someone else holds it as an additional charge) —
 *   no User account is created for these; `remarks` on the JSON row records who covers it.
 *
 * Idempotent and non-destructive: a Tehsil that already has an AdlgProfile (whether from a
 * prior run of this seeder or a real ADLG created through the app) is left untouched and
 * reported as skipped, never overwritten or duplicated.
 */
class AdlgOfficerSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/punjab_adlgs.json');
        abort_unless(file_exists($path), 500, "Missing seed data file: {$path}");

        $rows = json_decode(file_get_contents($path), true);

        $created = 0;
        $alreadyAssigned = 0;
        $vacant = 0;
        $missingTehsil = 0;

        foreach ($rows as $row) {
            if ($row['status'] !== 'active') {
                $vacant++;

                continue;
            }

            $tehsil = Tehsil::whereHas('district', function ($q) use ($row) {
                $q->where('name', $row['district'])
                    ->whereHas('division', fn ($q2) => $q2->where('name', $row['division']));
            })->where('name', $row['tehsil'])->first();

            if (! $tehsil) {
                $missingTehsil++;
                $this->command?->warn("No Tehsil match for {$row['division']} | {$row['district']} | {$row['tehsil']} (row {$row['source_row']}) — skipped.");

                continue;
            }

            if (AdlgProfile::where('tehsil_id', $tehsil->id)->exists()) {
                $alreadyAssigned++;

                continue;
            }

            $username = 'adlg.'.Str::slug($tehsil->name).'.'.$tehsil->id;

            $user = User::create([
                'role' => 'adlg',
                'name' => $row['officer_name'],
                'username' => $username,
                'password' => '1234',
                'cnic' => null,
                'phone' => $row['phone'],
                'active' => true,
                'bio_enrolled' => true,
                'first_login' => true,
            ]);

            AdlgProfile::create([
                'user_id' => $user->id,
                'tehsil_id' => $tehsil->id,
                'grade' => $row['grade'],
            ]);

            $tehsil->update(['adlg_activated' => true]);

            $created++;
        }

        $this->command?->info(
            "ADLG officers created: {$created} | already assigned (skipped): {$alreadyAssigned} | ".
            "vacant posts (no account): {$vacant} | unmatched tehsil (skipped): {$missingTehsil}"
        );
    }
}
