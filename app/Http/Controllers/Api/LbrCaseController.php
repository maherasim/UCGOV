<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RegisterLbrCertificateRequest;
use App\Http\Requests\Api\ReviewLbrCaseRequest;
use App\Http\Requests\Api\StoreLbrCaseRequest;
use App\Http\Resources\LbrCaseResource;
use App\Models\AuditLog;
use App\Models\LbrCase;
use App\Models\LbrDocument;
use App\Models\LbrTimelineEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class LbrCaseController extends Controller
{
    public const DOC_LABELS = [
        'cnic' => 'Applicant CNIC (copy)',
        'slip' => 'Hospital Birth Slip',
        'vacc' => 'Vaccination Card',
        'bform' => 'Child B-Form / CNIC / Smart Card / Passport',
        'photo1' => 'Child Photograph (1st)',
        'photo2' => 'Child Photograph (2nd)',
        'forma' => 'Form A',
    ];

    protected function relations(): array
    {
        return ['unionCouncil', 'secretary', 'adlg', 'documents', 'timeline.actor'];
    }

    public function indexForSecretary(Request $request)
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;

        $cases = LbrCase::where('union_council_id', $ucId)
            ->with(['unionCouncil', 'secretary', 'adlg'])
            ->latest('created_at')
            ->get();

        return LbrCaseResource::collection($cases);
    }

    public function showForSecretary(Request $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnUc($request, $lbrCase);

        return new LbrCaseResource($lbrCase->load($this->relations()));
    }

    public function storeForSecretary(StoreLbrCaseRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $dob = Carbon::parse($request->input('dob'));
        $age = round($dob->floatDiffInYears(now()), 1);

        $lbrId = 'LBR-'.now()->year.'-'.str_pad((string) (LbrCase::count() + 1), 4, '0', STR_PAD_LEFT);

        $case = DB::transaction(function () use ($request, $user, $uc, $dob, $age, $lbrId) {
            $case = LbrCase::create([
                'lbr_id' => $lbrId,
                'status' => 'FORWARDED',
                'category' => $request->string('category')->toString(),
                'union_council_id' => $uc->id,
                'secretary_id' => $user->id,
                'adlg_id' => optional($uc->tehsil->adlgProfiles()->first())->user_id,
                'dob' => $dob->toDateString(),
                'age_at_application' => $age,
                'delay_reason' => $request->string('delay_reason')->toString(),
                'child_name' => $request->string('child_name')->toString(),
                'child_gender' => $request->string('child_gender')->toString(),
                'child_birth_place' => $request->input('child_birth_place'),
                'child_birth_type' => $request->input('child_birth_type', 'Hospital'),
                'child_hospital' => $request->input('child_hospital'),
                'applicant_name' => $request->string('applicant_name')->toString(),
                'applicant_cnic' => $request->string('applicant_cnic')->toString(),
                'applicant_relation' => $request->input('applicant_relation', 'Father'),
                'applicant_father_name' => $request->input('applicant_father_name'),
                'applicant_mother_name' => $request->input('applicant_mother_name'),
                'applicant_address' => $request->input('applicant_address'),
                'applicant_phone' => $request->input('applicant_phone'),
                'secretary_remarks' => $request->input('secretary_remarks'),
            ]);

            foreach (self::DOC_LABELS as $key => $label) {
                if ($request->hasFile("documents.{$key}")) {
                    $path = $request->file("documents.{$key}")->store('lbr-documents', 'public');
                    LbrDocument::create([
                        'lbr_case_id' => $case->id,
                        'doc_key' => $key,
                        'label' => $label,
                        'file_path' => $path,
                        'uploaded_at' => now(),
                    ]);
                }
            }

            LbrTimelineEvent::create([
                'lbr_case_id' => $case->id,
                'stage' => 'FORWARDED',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $user->id,
                'note' => "Application submitted. LBR-ID: {$lbrId}. Forwarded electronically to ADLG.",
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LBR_SUBMITTED',
                'entity_type' => 'LbrCase',
                'entity_id' => $case->id,
                'note' => "LBR case submitted: {$lbrId} by {$user->name}",
            ]);

            return $case;
        });

        return new LbrCaseResource($case->load($this->relations()));
    }

    public function registerCertificate(RegisterLbrCertificateRequest $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnUc($request, $lbrCase);
        abort_unless($lbrCase->status === 'APPROVED', 422, 'ADLG approval is required before registration.');
        abort_if($lbrCase->locked, 422, 'This case file is locked.');

        DB::transaction(function () use ($request, $lbrCase) {
            $lbrCase->update([
                'certificate_no' => $request->string('certificate_no')->toString(),
                'certificate_date' => $request->input('certificate_date'),
                'certificate_remarks' => $request->input('certificate_remarks'),
                'status' => 'REGISTERED',
                'locked' => true,
                'locked_at' => now(),
            ]);

            LbrTimelineEvent::create([
                'lbr_case_id' => $lbrCase->id,
                'stage' => 'REGISTERED',
                'event_date' => $request->input('certificate_date'),
                'actor_user_id' => $request->user()->id,
                'note' => "Birth Certificate {$request->string('certificate_no')} issued. File locked. LBR-ID permanently linked.",
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LBR_REGISTERED',
                'entity_type' => 'LbrCase',
                'entity_id' => $lbrCase->id,
                'note' => "Birth Certificate {$request->string('certificate_no')} issued for {$lbrCase->lbr_id}. File locked.",
            ]);
        });

        return new LbrCaseResource($lbrCase->fresh($this->relations()));
    }

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = LbrCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil', 'secretary', 'adlg']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return LbrCaseResource::collection($query->latest('created_at')->get());
    }

    public function showForAdlg(Request $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnTehsil($request, $lbrCase);

        return new LbrCaseResource($lbrCase->load($this->relations()));
    }

    public function review(ReviewLbrCaseRequest $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnTehsil($request, $lbrCase);
        abort_unless($lbrCase->status === 'FORWARDED', 422, 'This case has already been decided.');

        DB::transaction(function () use ($request, $lbrCase) {
            $action = $request->string('action')->toString();

            $lbrCase->update([
                'status' => $action,
                'adlg_id' => $request->user()->id,
                'adlg_observations' => $request->string('observations')->toString(),
                'adlg_order_no' => $action === 'APPROVED' ? $request->input('order_no') : null,
            ]);

            $messages = [
                'APPROVED' => 'Application APPROVED by ADLG. Order: '.$request->input('order_no'),
                'REJECTED' => 'Application REJECTED by ADLG. Reason: '.$request->string('observations'),
                'RETURNED' => 'Returned for Correction by ADLG. Reason: '.$request->string('observations'),
            ];

            LbrTimelineEvent::create([
                'lbr_case_id' => $lbrCase->id,
                'stage' => $action,
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => $messages[$action],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LBR_'.$action,
                'entity_type' => 'LbrCase',
                'entity_id' => $lbrCase->id,
                'note' => "{$lbrCase->lbr_id} {$action} by ADLG",
            ]);
        });

        return new LbrCaseResource($lbrCase->fresh($this->relations()));
    }

    public function notesheet(Request $request, LbrCase $lbrCase)
    {
        if ($request->user()->role === 'adlg') {
            $this->authorizeOwnTehsil($request, $lbrCase);
        } else {
            $this->authorizeOwnUc($request, $lbrCase);
        }

        $lbrCase->load($this->relations());
        $lines = [];
        $lines[] = 'GOVERNMENT OF PUNJAB';
        $lines[] = 'LOCAL GOVERNMENT & COMMUNITY DEVELOPMENT DEPARTMENT';
        $lines[] = "UNION COUNCIL {$lbrCase->unionCouncil->name}, TEHSIL {$lbrCase->unionCouncil->tehsil?->name}";
        $lines[] = '';
        $lines[] = str_repeat('=', 68);
        $lines[] = 'DELAYED BIRTH REGISTRATION — OFFICIAL NOTESHEET';
        $lines[] = 'Punjab Local Government (Birth Registration) Rules';
        $lines[] = str_repeat('=', 68);
        $lines[] = '';
        $lines[] = "LBR-ID     : {$lbrCase->lbr_id}";
        $lines[] = 'Category   : '.($lbrCase->category === '1-7' ? '1–7 Years' : 'Over 7 Years');
        $lines[] = 'Status     : '.(LbrCaseResource::STATUS_LABELS[$lbrCase->status] ?? $lbrCase->status);
        $lines[] = 'Generated  : '.now()->toDateTimeString();
        $lines[] = '';
        $lines[] = 'SECTION 1 — CHILD DETAILS';
        $lines[] = str_repeat('-', 68);
        $lines[] = "Name         : {$lbrCase->child_name}";
        $lines[] = "Gender       : {$lbrCase->child_gender}";
        $lines[] = 'Date of Birth: '.$lbrCase->dob->toDateString();
        $lines[] = "Age at App.  : {$lbrCase->age_at_application} years";
        $lines[] = 'Birth Place  : '.($lbrCase->child_birth_place ?: '—');
        $lines[] = "Birth Type   : {$lbrCase->child_birth_type}";
        if ($lbrCase->child_hospital) $lines[] = "Hospital     : {$lbrCase->child_hospital}";
        $lines[] = '';
        $lines[] = 'SECTION 2 — APPLICANT DETAILS';
        $lines[] = str_repeat('-', 68);
        $lines[] = "Name         : {$lbrCase->applicant_name}";
        $lines[] = "Relation     : {$lbrCase->applicant_relation}";
        $lines[] = "CNIC         : {$lbrCase->applicant_cnic}";
        if ($lbrCase->applicant_father_name) $lines[] = "Father's Name: {$lbrCase->applicant_father_name}";
        if ($lbrCase->applicant_mother_name) $lines[] = "Mother's Name: {$lbrCase->applicant_mother_name}";
        if ($lbrCase->applicant_address) $lines[] = "Address      : {$lbrCase->applicant_address}";
        if ($lbrCase->applicant_phone) $lines[] = "Phone        : {$lbrCase->applicant_phone}";
        $lines[] = '';
        $lines[] = 'SECTION 3 — REASON FOR DELAY';
        $lines[] = str_repeat('-', 68);
        $lines[] = $lbrCase->delay_reason;
        if ($lbrCase->secretary_remarks) {
            $lines[] = '';
            $lines[] = "Secretary Remarks: {$lbrCase->secretary_remarks}";
        }
        $lines[] = '';
        $lines[] = 'SECTION 4 — DOCUMENT CHECKLIST';
        $lines[] = str_repeat('-', 68);
        foreach (self::DOC_LABELS as $key => $label) {
            $doc = $lbrCase->documents->firstWhere('doc_key', $key);
            $mandatory = in_array($key, ['cnic', 'photo1', 'photo2', 'forma'], true);
            $mark = $doc ? '[x] ' : '[ ] ';
            $lines[] = $mark.$label.($mandatory ? ' (MANDATORY)' : '').($doc ? ' — Uploaded '.$doc->uploaded_at->toDateString() : '');
        }
        $lines[] = '';
        $lines[] = 'SECTION 5 — SECRETARY UC VERIFICATION';
        $lines[] = str_repeat('-', 68);
        $lines[] = "Secretary UC : {$lbrCase->secretary?->name}";
        $lines[] = "UC           : {$lbrCase->unionCouncil->name}, Tehsil {$lbrCase->unionCouncil->tehsil?->name}";
        $lines[] = 'Forwarded On : '.$lbrCase->created_at->toDateString();
        $lines[] = 'Signature    : _________________________   Date: ____________';
        $lines[] = '';
        $lines[] = 'SECTION 6 — ADLG REVIEW & DECISION';
        $lines[] = str_repeat('-', 68);
        if ($lbrCase->adlg_observations) {
            $lines[] = 'ADLG Observations:';
            $lines[] = $lbrCase->adlg_observations;
            $lines[] = '';
            $lines[] = 'Decision     : '.(LbrCaseResource::STATUS_LABELS[$lbrCase->status] ?? $lbrCase->status);
            if ($lbrCase->adlg_order_no) $lines[] = "Order No.    : {$lbrCase->adlg_order_no}";
            $lines[] = 'ADLG Signature: _________________________   Date: ____________';
            $lines[] = 'Stamp        : [OFFICIAL STAMP]';
        } else {
            $lines[] = 'Pending ADLG review.';
        }
        if ($lbrCase->certificate_no) {
            $lines[] = '';
            $lines[] = 'SECTION 7 — BIRTH CERTIFICATE';
            $lines[] = str_repeat('-', 68);
            $lines[] = "Certificate No: {$lbrCase->certificate_no}";
            $lines[] = 'Certificate Date: '.$lbrCase->certificate_date?->toDateString();
            $lines[] = '[FILE LOCKED — No further modifications permitted]';
        }

        $content = implode("\n", $lines);
        $filename = "Notesheet_{$lbrCase->lbr_id}.txt";

        return response($content, 200, [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    protected function authorizeOwnUc(Request $request, LbrCase $lbrCase): void
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;
        abort_unless($lbrCase->union_council_id === $ucId, 403);
    }

    protected function authorizeOwnTehsil(Request $request, LbrCase $lbrCase): void
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($lbrCase->unionCouncil->tehsil_id === $tehsilId, 403);
    }
}
