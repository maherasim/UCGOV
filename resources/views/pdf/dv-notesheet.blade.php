@extends('pdf.layout', ['docHeaderTitle' => 'DIVORCE/KHULA REGISTRY · NOTESHEET'])

@section('content')
    <div class="letterhead">
        <div class="dept">GOVERNMENT OF PUNJAB</div>
        <div class="sub">Local Government &amp; Community Development Department</div>
        <div class="sub">Arbitration Council — Union Council {{ $case->unionCouncil->name }}
            @if($case->unionCouncil->tehsil) | Tehsil {{ $case->unionCouncil->tehsil->name }} @endif
        </div>
        <div class="rule"></div>
    </div>

    <div class="doc-title">
        <h1>RUNNING NOTESHEET</h1>
        <div class="subtitle">{{ $case->type === 'divorce' ? 'Divorce (Talaq)' : 'Khula' }} Registration</div>
        <div class="rule-thin"></div>
    </div>

    <table class="kv">
        <tr><td class="label">Case No.</td><td class="value">{{ $case->case_no }}</td></tr>
        <tr><td class="label">Type</td><td class="value">{{ strtoupper($case->type) }}</td></tr>
        <tr><td class="label">Union Council</td><td class="value">{{ $case->unionCouncil->name }}, Tehsil {{ $case->unionCouncil->tehsil?->name }}</td></tr>
        <tr><td class="label">Petitioner</td><td class="value">{{ $case->divorcer_name }}</td></tr>
        <tr><td class="label">Respondent</td><td class="value">{{ $case->respondent_name }}</td></tr>
        <tr><td class="label">Application Date</td><td class="value">{{ $case->receipt_date->format('d F Y') }}</td></tr>
        <tr><td class="label">Status</td><td class="value">{{ $statusLabel }}</td></tr>
        <tr><td class="label">Days Remaining (90-day period)</td><td class="value">{{ $daysRemaining }}</td></tr>
    </table>

    @if($case->timeline->isNotEmpty())
        <div class="section-header">CHRONOLOGICAL PROCEEDINGS</div>
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

    @if($case->proceedings->isNotEmpty())
        <div class="section-header">HEARING PROCEEDINGS</div>
        @foreach($case->proceedings as $i => $p)
            <div class="hearing-block">
                <div class="hearing-title">Hearing {{ $i + 1 }} — {{ $p->date->format('d F Y') }} (Ref: {{ $p->proc_no }})</div>
                <div class="hearing-row"><span class="k">Petitioner Attendance:</span> {{ $p->petitioner_present ? 'Present (Biometric: ' . ($p->petitioner_biometric ? 'Verified' : 'N/A') . ')' : 'Absent' }}</div>
                <div class="hearing-row"><span class="k">Respondent Attendance:</span> {{ $p->respondent_present ? 'Present (Biometric: ' . ($p->respondent_biometric ? 'Verified' : 'N/A') . ')' : 'Absent' }}</div>
                @if($p->pet_statement)<div class="hearing-row"><span class="k">Petitioner Statement:</span> {{ $p->pet_statement }}</div>@endif
                @if($p->res_statement)<div class="hearing-row"><span class="k">Respondent Statement:</span> {{ $p->res_statement }}</div>@endif
                @if($p->reconciliation)<div class="hearing-row"><span class="k">Reconciliation Effort:</span> {{ $p->reconciliation }}</div>@endif
                @if($p->adjourn_reason)<div class="hearing-row"><span class="k">Adjournment:</span> {{ $p->adjourn_reason }} — Next Hearing: {{ $p->next_hearing_date?->format('d M Y') ?? '—' }}</div>@endif
                @if($p->notice_issued)<div class="hearing-row"><span class="k">Notice Issued:</span> {{ $p->notice_ref }} on {{ $p->notice_date?->format('d M Y') }}</div>@endif
                @if($p->adlg_observation)<div class="hearing-row"><span class="k">ADLG/Chairman Observation:</span> {{ $p->adlg_observation }}</div>@endif
                @if($p->adlg_direction)<div class="hearing-row"><span class="k">ADLG Direction:</span> {{ $p->adlg_direction }}</div>@endif
            </div>
        @endforeach
    @endif

    @if($case->decision)
        <div class="section-header tone-green">FINAL DECISION</div>
        <table class="kv">
            <tr><td class="label">Decision Type</td><td class="value">{{ $case->decision->type }}</td></tr>
            <tr><td class="label">Order No.</td><td class="value">{{ $case->decision->order_no }}</td></tr>
            <tr><td class="label">Date</td><td class="value">{{ $case->decision->decided_at?->format('d F Y') }}</td></tr>
        </table>
        <div class="callout tone-green">
            {{ $case->decision->remarks ?: $statusLabel }}
        </div>
    @endif
@endsection
