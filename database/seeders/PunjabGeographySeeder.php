<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Division;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use Illuminate\Database\Seeder;

/**
 * Seeds the real, official Punjab local-government hierarchy — Divisions,
 * Districts, Tehsils, and Union Councils — from database/data/punjab_union_councils.json,
 * itself parsed from the Government of Punjab's official
 * "List of Union Councils Name & No. Tehsil-District-Division wise 14.03.2023" spreadsheet.
 *
 * Data-quality notes (source file, not this seeder):
 * - The "Multan Division" sheet had the entire "Sargodha Division" sheet's rows
 *   (Sargodha/Khushab/Mianwali/Bhakkar districts) erroneously duplicated at its tail —
 *   verified byte-for-byte identical to the correctly-attributed Sargodha Division sheet
 *   and excluded during parsing.
 * - A handful of tehsils (e.g. Sialkot, Murree) contain a second, unlabeled block of UCs
 *   whose numbering restarts from 1 with no textual marker distinguishing it from the
 *   first block. Where the second block's names were explicitly marked "Urban" (e.g.
 *   Gujrat, Sahiwal), it was split into a separate "<Tehsil> (Urban)" tehsil — a real
 *   signal from the source text. Where no such marker existed, the UCs were kept in the
 *   original tehsil and renumbered sequentially to stay unique; the original printed
 *   number is preserved in the `code` column (e.g. "orig-no-3").
 *
 * Idempotent — safe to re-run; existing rows are matched by their natural keys
 * (division name; district name within division; tehsil name within district;
 * UC number within tehsil) and updated rather than duplicated.
 */
class PunjabGeographySeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/punjab_union_councils.json');
        abort_unless(file_exists($path), 500, "Missing seed data file: {$path}");

        $rows = json_decode(file_get_contents($path), true);

        $divisionIds = [];
        $districtIds = [];
        $tehsilIds = [];

        foreach ($rows as $row) {
            $divisionKey = $row['division'];
            if (! isset($divisionIds[$divisionKey])) {
                $divisionIds[$divisionKey] = Division::firstOrCreate(['name' => $row['division']])->id;
            }

            $districtKey = $divisionKey.'|'.$row['district'];
            if (! isset($districtIds[$districtKey])) {
                $districtIds[$districtKey] = District::firstOrCreate(
                    ['division_id' => $divisionIds[$divisionKey], 'name' => $row['district']]
                )->id;
            }

            $tehsilKey = $districtKey.'|'.$row['tehsil'];
            if (! isset($tehsilIds[$tehsilKey])) {
                $tehsilIds[$tehsilKey] = Tehsil::firstOrCreate(
                    ['district_id' => $districtIds[$districtKey], 'name' => $row['tehsil']]
                )->id;
            }
        }

        $this->command?->info('Divisions: '.count($divisionIds).' | Districts: '.count($districtIds).' | Tehsils: '.count($tehsilIds));

        $now = now();
        $ucRows = [];
        foreach ($rows as $row) {
            $tehsilKey = $row['division'].'|'.$row['district'].'|'.$row['tehsil'];

            $ucRows[] = [
                'tehsil_id' => $tehsilIds[$tehsilKey],
                'uc_no' => $row['uc_no'],
                'name' => $row['uc_name'],
                'code' => $row['orig_uc_no'] !== null ? 'orig-no-'.$row['orig_uc_no'] : null,
                'address' => null,
                'lat' => null,
                'lng' => null,
                'geofence_radius' => 150,
                'active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($ucRows, 500) as $chunk) {
            UnionCouncil::upsert(
                $chunk,
                ['tehsil_id', 'uc_no'],
                ['name', 'code', 'address']
            );
        }

        $this->command?->info('Union Councils: '.count($ucRows));
    }
}
