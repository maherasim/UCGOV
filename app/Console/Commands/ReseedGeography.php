<?php

namespace App\Console\Commands;

use App\Models\District;
use App\Models\Division;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use Database\Seeders\PunjabGeographySeeder;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class ReseedGeography extends Command
{
    protected $signature = 'geography:reseed {--force : Skip the confirmation prompt}';

    protected $description = 'Delete all existing Divisions/Districts/Tehsils/Union Councils and reseed fresh from the real Punjab geography data (database/data/punjab_union_councils.json). Refuses to delete anything still referenced by a real Secretary, ADLG, case, report, or attendance record.';

    public function handle(): int
    {
        $this->warn('This will DELETE every existing Division, District, Tehsil, and Union Council, then reseed fresh from the real Punjab data.');
        $this->line('Note: any Secretary currently assigned to a deleted Union Council will become unassigned (their account is kept, just unlinked) — reassign them afterward via the app.');

        if (! $this->option('force') && ! $this->confirm('Continue?')) {
            $this->info('Cancelled — nothing was changed.');

            return self::SUCCESS;
        }

        try {
            DB::transaction(function () {
                UnionCouncil::query()->delete();
                Tehsil::query()->delete();
                District::query()->delete();
                Division::query()->delete();
            });
        } catch (QueryException $e) {
            $this->error('Could not delete — some records still depend on the existing geography:');
            $this->error($e->getMessage());
            $this->newLine();
            $this->line('This means a Divorce/Khula case, LBR case, daily report, attendance record, movement log,'.
                ' or ADLG profile still references one of the existing Union Councils or Tehsils. Reassign or'.
                ' remove those first, or run `php artisan migrate:fresh --seed --force` for a full wipe instead.');

            return self::FAILURE;
        }

        $this->info('Old geography deleted. Seeding fresh from the real Punjab data...');
        (new PunjabGeographySeeder())->run();

        $this->info('Done — '.Division::count().' divisions, '.District::count().' districts, '.
            Tehsil::count().' tehsils, '.UnionCouncil::count().' union councils.');

        return self::SUCCESS;
    }
}
