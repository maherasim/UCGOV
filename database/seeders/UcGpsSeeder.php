<?php

namespace Database\Seeders;

use App\Models\Tehsil;
use App\Models\UnionCouncil;
use Illuminate\Database\Seeder;

/**
 * Backfills lat/lng GPS coordinates onto the already-seeded Union Councils, from
 * database/data/punjab_uc_gps.json — parsed from the Government of Punjab's
 * "UC GPS Coordinates" spreadsheet (3,909 rows) and matched against the Tehsil/UC
 * records created by PunjabGeographySeeder.
 *
 * Data-quality notes (source file, not this seeder):
 * - The spreadsheet's own "Tehsil" column is frequently wrong (e.g. rows for Tandlianwala
 *   UCs labelled "Samundari", rows for Shakargarh UCs labelled "Zafarwal"). The matching
 *   script instead trusts the UC number embedded in the "UC Name" column (which is
 *   district-wide sequential, same convention as PunjabGeographySeeder's `uc_no`) and,
 *   where that's ambiguous between two tehsils, the trailing "..., <Tehsil>" segment of the
 *   UC Name text — which is consistently reliable even when the dedicated column isn't.
 * - Several rows use district/tehsil names in a different convention than the UC geography
 *   (e.g. "Toba Tek Singh" for "T.T Singh", "Mandi Bahauddin" for "M.B.Din", "Dera Ghazi
 *   Khan"/"Rahim Yar Khan" spelled out in full) — reconciled the same way as AdlgOfficerSeeder.
 * - 53 rows are for tehsils with no match anywhere in the UC geography (Khushab Sadar,
 *   Bahawalnagar Sadar) — same known source-spreadsheet gap documented in AdlgOfficerSeeder.
 * - 108 rows had an unusable coordinate value (literal "Please enter correct lat/long" text,
 *   a duplicate value repeated for both lat and lng, or a garbled number with no safe
 *   reconstruction) and were dropped rather than guessed.
 * - 117 rows had latitude and longitude entered in the wrong order; detected by checking
 *   which order falls inside Pakistan's bounding box, and corrected.
 * - 53 rows collided on the same (tehsil, uc_no) target — all in Sialkot, Sahiwal, and
 *   Gujrat, the same tehsils PunjabGeographySeeder already flagged as having a second,
 *   originally-restarting UC-number block in the source data. The first occurrence was
 *   kept; the rest were dropped rather than silently overwritten.
 * - Net effect: 3,695 of the 4,015 seeded Union Councils (92%) get real coordinates from
 *   this seeder. The remaining 8% simply have no usable source data and keep lat/lng null.
 *
 * Idempotent and additive-only: matches existing UnionCouncil rows by
 * (tehsil natural key, uc_no) and updates only lat/lng — never creates or deletes a UC.
 */
class UcGpsSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/punjab_uc_gps.json');
        abort_unless(file_exists($path), 500, "Missing seed data file: {$path}");

        $rows = json_decode(file_get_contents($path), true);

        $updated = 0;
        $missingTehsil = 0;
        $missingUc = 0;

        foreach ($rows as $row) {
            $tehsil = Tehsil::whereHas('district', function ($q) use ($row) {
                $q->where('name', $row['district'])
                    ->whereHas('division', fn ($q2) => $q2->where('name', $row['division']));
            })->where('name', $row['tehsil'])->first();

            if (! $tehsil) {
                $missingTehsil++;

                continue;
            }

            $uc = UnionCouncil::where('tehsil_id', $tehsil->id)->where('uc_no', $row['uc_no'])->first();

            if (! $uc) {
                $missingUc++;

                continue;
            }

            $uc->update(['lat' => $row['lat'], 'lng' => $row['lng']]);
            $updated++;
        }

        $this->command?->info(
            "Union Councils updated with coordinates: {$updated} | ".
            "unmatched tehsil: {$missingTehsil} | unmatched uc_no within tehsil: {$missingUc}"
        );
    }
}
