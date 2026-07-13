<?php

namespace Database\Seeders;

use App\Models\CaseArbitration;
use App\Models\CaseDecision;
use App\Models\CaseNotice;
use App\Models\CaseTimelineEvent;
use App\Models\DvCase;
use App\Models\UnionCouncil;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DvCaseSeeder extends Seeder
{
    protected array $husbandNames = [
        'Tariq Mehmood', 'Usman Ghani', 'Shahbaz Anwar', 'Imran Butt', 'Kashif Hussain',
        'Amjad Ali', 'Munir Shah', 'Zafar Iqbal', 'Rizwan Sadiq', 'Aamir Latif',
    ];

    protected array $wifeNames = [
        'Rukhsana Bibi', 'Zainab Fatima', 'Saima Noreen', 'Asma Naz', 'Tahira Kausar',
        'Raheela Bano', 'Farzana Yousaf', 'Nasreen Akhtar', 'Samina Kausar', 'Rabia Sultana',
    ];

    // Weighted so most cases are mid-workflow, with a healthy tail of disposed ones.
    protected array $statusPool = [
        'SUBMITTED', 'SUBMITTED', 'SUBMITTED',
        'SEEN', 'SEEN',
        'NOTICE_ISSUED', 'NOTICE_ISSUED', 'NOTICE_ISSUED',
        'ARB_CONSTITUTED', 'ARB_CONSTITUTED',
        'DISPOSED_RECONCILED', 'DISPOSED_RECONCILED',
        'DISPOSED_EFFECTIVE', 'DISPOSED_EFFECTIVE',
        'FILED_NON_RESPONSE',
    ];

    protected int $caseSeq = 1;

    public function run(): void
    {
        if (DvCase::count() > 0) {
            return;
        }

        $ucs = UnionCouncil::whereHas('secretaryProfile')->with(['secretaryProfile.user', 'tehsil.adlgProfiles'])->get();

        if ($ucs->isEmpty()) {
            return;
        }

        foreach (range(1, 40) as $i) {
            $uc = $ucs->random();
            $secretary = $uc->secretaryProfile->user;
            $adlgId = optional($uc->tehsil->adlgProfiles->first())->user_id;

            $status = $adlgId ? $this->statusPool[array_rand($this->statusPool)] : 'SUBMITTED';
            $type = random_int(0, 1) ? 'divorce' : 'khula';

            $this->createCase($uc, $secretary->id, $adlgId, $type, $status);
        }
    }

    protected function createCase(UnionCouncil $uc, int $secretaryId, ?int $adlgId, string $type, string $status): void
    {
        $receiptDaysAgo = random_int(5, 110);
        $receiptDate = Carbon::now()->subDays($receiptDaysAgo);

        $husband = $this->husbandNames[array_rand($this->husbandNames)];
        $wife = $this->wifeNames[array_rand($this->wifeNames)];

        $prefix = $type === 'divorce' ? 'DV' : 'KH';
        $caseNo = sprintf('%s-%d-%03d', $prefix, now()->year, $this->caseSeq++);

        $case = DvCase::create([
            'case_no' => $caseNo,
            'type' => $type,
            'status' => $status,
            'union_council_id' => $uc->id,
            'secretary_id' => $secretaryId,
            'adlg_id' => $adlgId,
            'divorcer_name' => $type === 'divorce' ? $husband : $wife,
            'divorcer_cnic' => $this->fakeCnic(),
            'divorcer_phone' => $this->fakePhone(),
            'respondent_name' => $type === 'divorce' ? $wife : $husband,
            'respondent_cnic' => $this->fakeCnic(),
            'respondent_phone' => $this->fakePhone(),
            'address' => $uc->name,
            'receipt_date' => $receiptDate->toDateString(),
            'attachment_ok' => true,
            'remarks' => 'Registered at ' . $uc->name,
        ]);

        $timelineDate = $receiptDate->copy();
        CaseTimelineEvent::create([
            'dv_case_id' => $case->id,
            'stage' => 'SUBMITTED',
            'event_date' => $timelineDate->toDateString(),
            'actor_user_id' => $secretaryId,
            'note' => 'Case submitted to ADLG',
        ]);

        if ($status === 'SUBMITTED') {
            return;
        }

        $timelineDate->addDays(random_int(1, 3));
        CaseTimelineEvent::create([
            'dv_case_id' => $case->id,
            'stage' => 'SEEN',
            'event_date' => $timelineDate->toDateString(),
            'actor_user_id' => $adlgId,
            'note' => 'Reviewed by ADLG',
        ]);

        if ($status === 'SEEN') {
            return;
        }

        $timelineDate->addDays(random_int(2, 5));
        $noticeDate = $timelineDate->copy();
        $hearingDate = $noticeDate->copy()->addDays(14);
        CaseNotice::create([
            'dv_case_id' => $case->id,
            'notice_no' => 'NTC-' . now()->year . '-' . str_pad((string) $case->id, 3, '0', STR_PAD_LEFT),
            'issue_date' => $noticeDate->toDateString(),
            'hearing_date' => $hearingDate->toDateString(),
            'attachment_ok' => true,
        ]);
        CaseTimelineEvent::create([
            'dv_case_id' => $case->id,
            'stage' => 'NOTICE_ISSUED',
            'event_date' => $noticeDate->toDateString(),
            'actor_user_id' => $adlgId,
            'note' => 'Notice issued to parties',
        ]);

        if ($status === 'NOTICE_ISSUED') {
            return;
        }

        $timelineDate->addDays(random_int(5, 10));
        CaseArbitration::create([
            'dv_case_id' => $case->id,
            'husband_rep_name' => 'Representative of ' . $husband,
            'husband_rep_cnic' => $this->fakeCnic(),
            'husband_rep_phone' => $this->fakePhone(),
            'husband_rep_designation' => 'Family Member',
            'wife_rep_name' => 'Representative of ' . $wife,
            'wife_rep_cnic' => $this->fakeCnic(),
            'wife_rep_phone' => $this->fakePhone(),
            'wife_rep_designation' => 'Family Member',
            'constituted_at' => $timelineDate,
        ]);
        CaseTimelineEvent::create([
            'dv_case_id' => $case->id,
            'stage' => 'ARB_CONSTITUTED',
            'event_date' => $timelineDate->toDateString(),
            'actor_user_id' => $secretaryId,
            'note' => 'Arbitration Council constituted',
        ]);

        if ($status === 'ARB_CONSTITUTED') {
            return;
        }

        $timelineDate->addDays(random_int(10, 20));
        $remarks = match ($status) {
            'DISPOSED_RECONCILED' => 'Parties reconciled.',
            'DISPOSED_EFFECTIVE' => $type === 'divorce' ? 'Divorce declared effective.' : 'Khula declared effective.',
            default => 'Respondent did not appear; case filed.',
        };

        CaseDecision::create([
            'dv_case_id' => $case->id,
            'type' => $status,
            'order_no' => 'ORD-' . now()->year . '-' . str_pad((string) $case->id, 3, '0', STR_PAD_LEFT),
            'decided_at' => $timelineDate->toDateString(),
            'remarks' => $remarks,
        ]);
        CaseTimelineEvent::create([
            'dv_case_id' => $case->id,
            'stage' => $status,
            'event_date' => $timelineDate->toDateString(),
            'actor_user_id' => $adlgId,
            'note' => $remarks,
        ]);
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
