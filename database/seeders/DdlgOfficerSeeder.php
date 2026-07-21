<?php

namespace Database\Seeders;

use App\Models\DdlgProfile;
use App\Models\District;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds real DDLG (Deputy Director Local Government) officer accounts from
 * database/data/punjab_ddlgs.json, parsed from "Punjab_DDLGs_by_District-1.xlsx"
 * (Vacancy position of DDLGs & ADLGs, July-26) and matched against the District
 * records created by PunjabGeographySeeder.
 *
 * Data-quality notes (source file, not this seeder):
 * - Two source names are abbreviated differently than PunjabGeographySeeder's District
 *   rows ("Bahawalnagar" → "B.Nagar", "T.T.Singh" → "T.T Singh") — resolved via the
 *   $DISTRICT_ALIASES map below rather than fuzzy matching, to keep the match exact.
 * - 3 of 40 rows still don't resolve to a District and are skipped: Wazirabad, Murree,
 *   and Talagang exist only as Tehsils of an older parent district (Hafizabad,
 *   Rawalpindi, Chakwal respectively) — since a DDLG post is scoped to a whole District
 *   here, mapping it onto the parent district would incorrectly merge two distinct
 *   real-world DDLG posts into one district's scope.
 * - 1 row (Murree) has no officer name in the source at all — a genuinely vacant post,
 *   no account created.
 * - Many DDLG posts are held as an additional charge by an existing ADLG officer (the
 *   source lists them as "Mr. X, ADLG Y"). A separate DDLG login is still created for
 *   that person — this app is one-role-per-account, so the same real person ends up
 *   with two separate accounts for their two duties.
 *
 * Idempotent and non-destructive: a District that already has a DdlgProfile (whether
 * from a prior run of this seeder or a real DDLG created through the app) is left
 * untouched and reported as skipped, never overwritten or duplicated.
 */
class DdlgOfficerSeeder extends Seeder
{
    /** Source district name => actual District.name in PunjabGeographySeeder. */
    protected const DISTRICT_ALIASES = [
        'Bahawalnagar' => 'B.Nagar',
        'T.T.Singh' => 'T.T Singh',
    ];

    public function run(): void
    {
        $path = database_path('data/punjab_ddlgs.json');
        abort_unless(file_exists($path), 500, "Missing seed data file: {$path}");

        $rows = json_decode(file_get_contents($path), true);

        $created = 0;
        $alreadyAssigned = 0;
        $vacant = 0;
        $missingDistrict = 0;

        foreach ($rows as $row) {
            if ($row['status'] !== 'active') {
                $vacant++;

                continue;
            }

            // District names are unique province-wide, so matching on name alone is safe —
            // division-scoping isn't needed and would just add friction against the DB's
            // "X Division" naming (the source file has bare division names like "Bahawalpur").
            $districtName = self::DISTRICT_ALIASES[$row['district']] ?? $row['district'];
            $district = District::where('name', $districtName)->first();

            if (! $district) {
                $missingDistrict++;
                $this->command?->warn("No District match for {$row['division']} | {$row['district']} (row {$row['source_row']}) — skipped.");

                continue;
            }

            if (DdlgProfile::where('district_id', $district->id)->exists()) {
                $alreadyAssigned++;

                continue;
            }

            $username = 'ddlg.'.Str::slug($district->name).'.'.$district->id;

            $user = User::create([
                'role' => 'ddlg',
                'name' => $row['officer_name'],
                'username' => $username,
                'password' => '1234',
                'cnic' => null,
                'phone' => $row['phone'],
                'active' => true,
                'bio_enrolled' => true,
                'first_login' => true,
            ]);

            DdlgProfile::create([
                'user_id' => $user->id,
                'district_id' => $district->id,
            ]);

            $created++;
        }

        $this->command?->info(
            "DDLG officers created: {$created} | already assigned (skipped): {$alreadyAssigned} | ".
            "vacant posts (no account): {$vacant} | unmatched district (skipped): {$missingDistrict}"
        );
    }
}
