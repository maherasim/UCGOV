@extends('pdf.layout', ['docHeaderTitle' => 'DIVORCE/KHULA REGISTRY · CASE FILE'])

@section('content')
    <div class="letterhead">
        <div class="dept">Bakhtawar Shahzad AI Labs Pvt Ltd.</div>
        <div class="sub">Union Council Management System</div>
        <div class="sub">Arbitration Council — Union Council {{ $case->unionCouncil->name }}
            @if($case->unionCouncil->tehsil) | Tehsil {{ $case->unionCouncil->tehsil->name }} @endif
            @if($case->unionCouncil->tehsil?->district) | District {{ $case->unionCouncil->tehsil->district->name }} @endif
        </div>
        <div class="rule"></div>
    </div>

    <div class="doc-title">
        <h1>COMPLETE CASE FILE</h1>
        <div class="subtitle">{{ $case->type === 'divorce' ? 'Divorce (Talaq)' : 'Khula' }} Registration</div>
        <div class="subtitle">Muslim Family Laws Ordinance, 1961 — Sections 7–10</div>
        <div class="rule-thin"></div>
    </div>

    <table class="kv">
        <tr><td class="label">Case Reference</td><td class="value">{{ $case->case_no }}</td></tr>
        <tr><td class="label">Case Type</td><td class="value">{{ $case->type === 'divorce' ? 'DIVORCE (Under Section 7, MFLO 1961)' : 'KHULA (Under Section 10, MFLO 1961)' }}</td></tr>
        <tr><td class="label">Application Date</td><td class="value">{{ $case->receipt_date->format('d F Y') }}</td></tr>
        <tr><td class="label">Petitioner</td><td class="value">{{ $case->divorcer_name }}</td></tr>
        <tr><td class="label">Respondent</td><td class="value">{{ $case->respondent_name }}</td></tr>
        <tr><td class="label">Union Council</td><td class="value">{{ $case->unionCouncil->name }}, Tehsil {{ $case->unionCouncil->tehsil?->name }}</td></tr>
        <tr><td class="label">Case Status</td><td class="value">{{ $statusLabel }}</td></tr>
        <tr><td class="label">Generated</td><td class="value">{{ now()->format('d F Y H:i') }} PKT | UC Governance Platform</td></tr>
    </table>

    @if($case->decision)
        <div class="callout tone-{{ str_starts_with($case->decision->type, 'DISPOSED') ? 'green' : 'blue' }}">
            <b>FILE LOCKED</b>
            Order No. {{ $case->decision->order_no }} | Decided {{ $case->decision->decided_at?->format('d F Y') }} | This case file is closed. Tamper-proof audit trail preserved.
        </div>
    @endif

    <div class="section-header">SECTION 1 — PARTY DETAILS</div>
    <table class="kv">
        <tr><td class="label">Petitioner Name</td><td class="value">{{ $case->divorcer_name }}</td></tr>
        <tr><td class="label">Petitioner CNIC</td><td class="value">{{ $case->divorcer_cnic }}</td></tr>
        <tr><td class="label">Petitioner Phone</td><td class="value">{{ $case->divorcer_phone ?: '—' }}</td></tr>
        <tr><td class="label">Respondent Name</td><td class="value">{{ $case->respondent_name }}</td></tr>
        <tr><td class="label">Respondent CNIC</td><td class="value">{{ $case->respondent_cnic }}</td></tr>
        <tr><td class="label">Respondent Phone</td><td class="value">{{ $case->respondent_phone ?: '—' }}</td></tr>
        @if($case->marriage_date)
            <tr><td class="label">Marriage Date</td><td class="value">{{ $case->marriage_date->format('d F Y') }}</td></tr>
            <tr><td class="label">Nikah Registrar</td><td class="value">{{ $case->nikah_registrar ?: '—' }}</td></tr>
        @endif
        @if($case->mahr_amount)
            <tr><td class="label">Mehr Amount</td><td class="value">{{ $case->mahr_amount }}</td></tr>
        @endif
        @if($case->children_count)
            <tr><td class="label">Children</td><td class="value">{{ $case->children_count }}</td></tr>
        @endif
    </table>
    @if($case->remarks)
        <div class="callout"><b>Initial Remarks</b>{{ $case->remarks }}</div>
    @endif

    <div class="section-header">SECTION 2 — CHRONOLOGICAL PROCEEDINGS</div>
    @if($case->timeline->isEmpty())
        <p style="font-size: 9.5px; color: #6B7280;">No proceedings recorded yet.</p>
    @else
        <table class="doc-checklist">
            <tr><th style="width: 8%;">#</th><th style="width: 15%;">Date</th><th style="width: 20%;">Stage</th><th>Description</th><th style="width: 20%;">By</th></tr>
            @foreach($case->timeline as $i => $t)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $t->event_date->format('d M Y') }}</td>
                    <td>{{ $t->stage }}</td>
                    <td>{{ $t->note }}</td>
                    <td>{{ $t->actor?->name ?? 'System' }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    @if($case->arbitration)
        <div class="section-header">SECTION 3 — ARBITRATION COUNCIL CONSTITUTION</div>
        <table class="kv">
            <tr><td class="label">Husband-side Representative</td><td class="value">{{ $case->arbitration->husband_rep_name }} — CNIC {{ $case->arbitration->husband_rep_cnic }}</td></tr>
            <tr><td class="label">Husband-side Phone / Relation</td><td class="value">{{ $case->arbitration->husband_rep_phone ?: '—' }} / {{ $case->arbitration->husband_rep_designation ?: '—' }}</td></tr>
            <tr><td class="label">Wife-side Representative</td><td class="value">{{ $case->arbitration->wife_rep_name }} — CNIC {{ $case->arbitration->wife_rep_cnic }}</td></tr>
            <tr><td class="label">Wife-side Phone / Relation</td><td class="value">{{ $case->arbitration->wife_rep_phone ?: '—' }} / {{ $case->arbitration->wife_rep_designation ?: '—' }}</td></tr>
        </table>
    @endif

    <div class="section-header">SECTION 4 — HEARING RECORDS</div>
    @if($case->proceedings->isEmpty())
        <p style="font-size: 9.5px; color: #6B7280;">No hearings recorded yet.</p>
    @else
        @foreach($case->proceedings as $i => $p)
            <div class="hearing-block">
                <div class="hearing-title">Hearing {{ $i + 1 }} — {{ $p->date->format('d F Y') }} (Ref: {{ $p->proc_no }})</div>
                <div class="hearing-row"><span class="k">Venue:</span> {{ $p->venue ?: 'UC Office' }} &nbsp;&nbsp; <span class="k">Chairman:</span> {{ $p->chairman_name ?: 'ADLG' }}</div>
                <div class="hearing-row"><span class="k">Petitioner Attendance:</span> {{ $p->petitioner_present ? 'PRESENT' : 'ABSENT' }} (Biometric: {{ $p->petitioner_biometric ? 'Verified' : 'N/A' }})</div>
                <div class="hearing-row"><span class="k">Respondent Attendance:</span> {{ $p->respondent_present ? 'PRESENT' : 'ABSENT' }} (Biometric: {{ $p->respondent_biometric ? 'Verified' : 'N/A' }})</div>
                @if($p->pet_rep_name)<div class="hearing-row"><span class="k">Petitioner Representative:</span> {{ $p->pet_rep_name }} — CNIC {{ $p->pet_rep_cnic }}</div>@endif
                @if($p->res_rep_name)<div class="hearing-row"><span class="k">Respondent Representative:</span> {{ $p->res_rep_name }} — CNIC {{ $p->res_rep_cnic }}</div>@endif
                @if($p->pet_statement)<div class="hearing-row"><span class="k">Petitioner Statement:</span> {{ $p->pet_statement }}</div>@endif
                @if($p->res_statement)<div class="hearing-row"><span class="k">Respondent Statement:</span> {{ $p->res_statement }}</div>@endif
                @if($p->reconciliation)<div class="hearing-row"><span class="k">Reconciliation Effort:</span> {{ $p->reconciliation }}</div>@endif
                @if($p->adjourn_reason)<div class="hearing-row"><span class="k">Adjourned:</span> {{ $p->adjourn_reason }} — Next Hearing: {{ $p->next_hearing_date?->format('d M Y') ?? '—' }}</div>@endif
                @if($p->notice_issued)<div class="hearing-row"><span class="k">Notice:</span> {{ $p->notice_ref }} issued {{ $p->notice_date?->format('d M Y') }} — {{ $p->notice_details }}</div>@endif
                @if($p->adlg_observation)<div class="hearing-row"><span class="k">Chairman Observation:</span> {{ $p->adlg_observation }}</div>@endif
                @if($p->adlg_direction)<div class="hearing-row"><span class="k">Chairman Direction:</span> {{ $p->adlg_direction }}</div>@endif
            </div>
        @endforeach
    @endif

    @if($case->decision)
        <div class="section-header tone-green">SECTION 5 — FINAL ORDER / DECISION</div>
        <table class="kv">
            <tr><td class="label">Decision</td><td class="value">{{ $statusLabel }}</td></tr>
            <tr><td class="label">Order No.</td><td class="value">{{ $case->decision->order_no }}</td></tr>
            <tr><td class="label">Date Decided</td><td class="value">{{ $case->decision->decided_at?->format('d F Y') }}</td></tr>
        </table>
        <div class="callout tone-green">
            <b>Order</b>
            {{ $case->decision->remarks ?: $statusLabel }}
        </div>

        <table class="sig-table">
            <tr>
                <td>
                    <div class="sig-line">
                        <div class="sig-name">Chairman, Arbitration Council / ADLG</div>
                        <div>Date: _______________</div>
                    </div>
                </td>
                <td>
                    <div class="sig-line">
                        <div class="sig-name">Official Stamp / Seal</div>
                        <div>Date: _______________</div>
                    </div>
                </td>
            </tr>
        </table>
    @endif
@endsection
