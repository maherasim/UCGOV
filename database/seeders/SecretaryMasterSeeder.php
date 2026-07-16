<?php

namespace Database\Seeders;

use App\Models\SecretaryProfile;
use App\Models\SecretaryUcCharge;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds real Union Council Secretary accounts from database/data/punjab_secretaries.json,
 * parsed from the Government of Punjab's "Punjab UC Secretaries Master" list (4,077 rows)
 * and matched against the Tehsil/UnionCouncil records created by PunjabGeographySeeder.
 *
 * Data-quality notes (source file, not this seeder):
 * - The file has no Tehsil column, only District + a free-text "UC Name & Address" field —
 *   the UC number was extracted from that text (several districts use non-obvious formats,
 *   e.g. Layyah's "Chak <chak#>/TDA-<uc#>" where the real UC number follows "TDA-", not the
 *   chak number) and cross-checked against Tehsil uc_no ranges. Several districts (Faisalabad,
 *   Gujranwala, Rawalpindi, Sargodha, Gujrat, Sialkot, Sahiwal) have a genuine overlap in the
 *   underlying geography where the Sadar/City tehsil's numbering range subsumes the smaller
 *   tehsils' — resolved using database/data/punjab_uc_gps.json (already-verified real tehsil
 *   data) as a disambiguation oracle, matched by shared locality-name keywords.
 * - 442 rows had no number in the UC name at all (bare place names like "Muslimabad") —
 *   resolved via frequency-weighted fuzzy name matching against the combined geography + GPS
 *   locality-name corpus, requiring a confident, non-ambiguous, non-coincidental match (e.g.
 *   correctly rejects "Jajjah Abbasian" matching "Bindor Abbasian" on a shared regional
 *   clan-name suffix alone). Rows that couldn't be matched with confidence are excluded rather
 *   than guessed — see the seeder's summary output.
 * - Every row's secretary-name field was parsed for cadre/designation annotations (CD, LG,
 *   MC, ZC, TC, TECH, ADJUSTED, ON LEAVE, etc.) and "additional charge" annotations (many
 *   spelling variants — "Add. Charge", "Addl Charge", "Additional", etc.); the latter become
 *   SecretaryUcCharge rows linked to the person's primary UC via matching name + phone number.
 * - 65 rows had a blank secretary name (vacant post) — no account created.
 * - Where the same UC appears with multiple different primary-secretary candidates (real
 *   turnover/duplicate entries in the source — ~541 rows, spread across many districts, not a
 *   parsing artifact), the first occurrence in the sheet is kept and the rest dropped, the
 *   same policy used for the GPS coordinate seeder's Sialkot/Sahiwal/Gujrat duplicates.
 *
 * Idempotent and non-destructive: a UC that already has a SecretaryProfile is left untouched;
 * additional charges use firstOrCreate keyed by (secretary_profile_id, union_council_id).
 */
class SecretaryMasterSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/punjab_secretaries.json');
        abort_unless(file_exists($path), 500, "Missing seed data file: {$path}");

        $data = json_decode(file_get_contents($path), true);

        // Pre-load every lookup once instead of 2 queries per row (~6,700 rows total) — the
        // per-row version worked but took several minutes on remote hosting purely from
        // network round-trip latency, not actual data volume.
        $tehsilIdByKey = Tehsil::with('district')->get()
            ->mapWithKeys(fn ($t) => ["{$t->district->name}|{$t->name}" => $t->id]);

        $ucByKey = UnionCouncil::select('id', 'tehsil_id', 'uc_no', 'name')->get()
            ->mapWithKeys(fn ($uc) => ["{$uc->tehsil_id}|{$uc->uc_no}" => $uc]);

        // Keyed by union_council_id -> secretary_profile_id — doubles as the "already
        // assigned" check and the source for linking additional charges to their owner,
        // whether that profile already existed or gets created in the loop below.
        $profileIdByUcId = SecretaryProfile::whereNotNull('union_council_id')
            ->pluck('id', 'union_council_id')->all();

        $created = 0;
        $alreadyAssigned = 0;
        $missingTehsilOrUc = 0;

        foreach ($data['primaries'] as $row) {
            $tehsilId = $tehsilIdByKey["{$row['district']}|{$row['tehsil']}"] ?? null;
            $uc = $tehsilId ? ($ucByKey["{$tehsilId}|{$row['ucNo']}"] ?? null) : null;

            if (! $uc) {
                $missingTehsilOrUc++;

                continue;
            }

            if (isset($profileIdByUcId[$uc->id])) {
                $alreadyAssigned++;

                continue;
            }

            $username = 'sec.'.Str::slug($uc->name).'.'.$uc->id;

            $user = User::create([
                'role' => 'sec',
                'name' => $row['name'],
                'username' => $username,
                'password' => '1234',
                'cnic' => null,
                'phone' => $row['phone'],
                'active' => true,
                'bio_enrolled' => true,
                'first_login' => true,
            ]);

            $profile = SecretaryProfile::create([
                'user_id' => $user->id,
                'union_council_id' => $uc->id,
            ]);

            $profileIdByUcId[$uc->id] = $profile->id;
            $created++;
        }

        $chargesCreated = 0;
        $chargesSkipped = 0;

        foreach ($data['additionalCharges'] as $row) {
            $ownerTehsilId = $tehsilIdByKey["{$row['ownerDistrict']}|{$row['ownerTehsil']}"] ?? null;
            $ownerUc = $ownerTehsilId ? ($ucByKey["{$ownerTehsilId}|{$row['ownerUcNo']}"] ?? null) : null;
            $ownerProfileId = $ownerUc ? ($profileIdByUcId[$ownerUc->id] ?? null) : null;

            $chargeTehsilId = $tehsilIdByKey["{$row['chargeDistrict']}|{$row['chargeTehsil']}"] ?? null;
            $chargeUc = $chargeTehsilId ? ($ucByKey["{$chargeTehsilId}|{$row['chargeUcNo']}"] ?? null) : null;

            if (! $ownerProfileId || ! $chargeUc) {
                $chargesSkipped++;

                continue;
            }

            SecretaryUcCharge::firstOrCreate(
                ['secretary_profile_id' => $ownerProfileId, 'union_council_id' => $chargeUc->id],
                ['assigned_at' => now()]
            );

            $chargesCreated++;
        }

        $this->command?->info(
            "Secretaries created: {$created} | already assigned (skipped): {$alreadyAssigned} | ".
            "unmatched tehsil/UC (skipped): {$missingTehsilOrUc} | additional charges created: {$chargesCreated} | ".
            "additional charges skipped: {$chargesSkipped}"
        );
    }
}
