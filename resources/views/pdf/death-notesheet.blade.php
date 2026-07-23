@extends('pdf.layout', ['docHeaderTitle' => 'LATE DEATH REGISTRATION (LDR) · NOTESHEET'])

@section('content')
    <div class="letterhead">
        <div class="dept">Bakhtawar Shahzad AI Labs Pvt Ltd.</div>
        <div class="sub">Union Council Management System</div>
        <div class="sub">Union Council {{ $deathCase->unionCouncil->name }}
            @if($deathCase->unionCouncil->tehsil) | Tehsil {{ $deathCase->unionCouncil->tehsil->name }} @endif
        </div>
        <div class="rule"></div>
    </div>

    <div class="doc-title">
        <h1>LATE DEATH REGISTRATION — OFFICIAL NOTESHEET</h1>
        <div class="subtitle">Punjab Local Government (Registration of Births and Deaths) Rules, 2025 — Rules 12, 13 &amp; 15</div>
        <div class="rule-thin"></div>
    </div>

    <table class="kv">
        <tr><td class="label">LDR-ID</td><td class="value">{{ $deathCase->death_id }}</td></tr>
        <tr><td class="label">Category</td><td class="value">{{ \App\Http\Resources\DeathCaseResource::CATEGORY_LABELS[$deathCase->category] ?? $deathCase->category }}</td></tr>
        <tr><td class="label">Status</td><td class="value">{{ $statusLabel }}</td></tr>
        <tr><td class="label">Generated</td><td class="value">{{ now()->format('d F Y H:i') }} PKT | Union Council Management System</td></tr>
    </table>

    <div class="section-header">SECTION 1 — DECEASED DETAILS</div>
    <table class="kv">
        <tr><td class="label">Name</td><td class="value">{{ $deathCase->deceased_name }}</td></tr>
        <tr><td class="label">Gender</td><td class="value">{{ $deathCase->deceased_gender }}</td></tr>
        <tr><td class="label">Date of Death</td><td class="value">{{ $deathCase->date_of_death->format('d F Y') }}</td></tr>
        <tr><td class="label">Age of Delay at Application</td><td class="value">{{ $deathCase->age_at_application }} years</td></tr>
        <tr><td class="label">CNIC / Birth Certificate</td><td class="value">{{ $deathCase->deceased_cnic ?: '—' }}</td></tr>
        <tr><td class="label">Cause of Death</td><td class="value">{{ $deathCase->cause_of_death ?: '—' }}</td></tr>
        <tr><td class="label">Place of Death</td><td class="value">{{ $deathCase->place_of_death ?: '—' }}</td></tr>
        <tr><td class="label">Burial Place</td><td class="value">{{ $deathCase->burial_place ?: '—' }}</td></tr>
    </table>

    <div class="section-header">SECTION 2 — APPLICANT (RELATIVE) DETAILS</div>
    <table class="kv">
        <tr><td class="label">Applicant Name</td><td class="value">{{ $deathCase->applicant_name }}</td></tr>
        <tr><td class="label">Relation to Deceased</td><td class="value">{{ $deathCase->applicant_relation }}</td></tr>
        <tr><td class="label">Applicant CNIC</td><td class="value">{{ $deathCase->applicant_cnic }}</td></tr>
        <tr><td class="label">Applicant Phone</td><td class="value">{{ $deathCase->applicant_phone ?: '—' }}</td></tr>
        <tr><td class="label">Address</td><td class="value">{{ $deathCase->applicant_address ?: '—' }}</td></tr>
    </table>

    @if($deathCase->category === 'ABROAD')
        <div class="section-header">SECTION 2B — DEATH ABROAD DETAILS (RULE 15)</div>
        <table class="kv">
            <tr><td class="label">Country of Death</td><td class="value">{{ $deathCase->country_of_death ?: '—' }}</td></tr>
            <tr><td class="label">Passport No.</td><td class="value">{{ $deathCase->passport_no ?: '—' }}</td></tr>
        </table>
    @endif

    @if($deathCase->category === '7+')
        <div class="section-header">SECTION 2C — COURT DECREE (RULE 13)</div>
        <table class="kv">
            <tr><td class="label">Decree No.</td><td class="value">{{ $deathCase->court_decree_no ?: '—' }}</td></tr>
            <tr><td class="label">Decree Date</td><td class="value">{{ $deathCase->court_decree_date?->format('d F Y') ?: '—' }}</td></tr>
            <tr><td class="label">Court</td><td class="value">{{ $deathCase->court_name ?: '—' }}</td></tr>
        </table>
        <div class="callout tone-amber">
            Registration under Rule 13 is granted on the strength of the court decree cited above — no
            administrative committee decision applies to this category.
        </div>
    @endif

    <div class="section-header">SECTION 3 — REASON FOR DELAY</div>
    <div class="callout">
        {{ $deathCase->delay_reason }}
    </div>
    @if($deathCase->secretary_remarks)
        <div class="callout tone-blue">
            <b>Secretary Remarks</b>
            {{ $deathCase->secretary_remarks }}
        </div>
    @endif

    <div class="section-header">SECTION 4 — DOCUMENT CHECKLIST</div>
    <table class="doc-checklist">
        <tr><th style="width: 8%;">Status</th><th>Document</th><th style="width: 16%;">Requirement</th><th style="width: 20%;">Uploaded</th></tr>
        @foreach($docLabels as $key => $label)
            @php($doc = $deathCase->documents->firstWhere('doc_key', $key))
            @php($mandatory = in_array($key, $requiredDocKeys, true) || ($deathCase->category === '7+' && $key === 'court_decree') || ($deathCase->category === 'ABROAD' && in_array($key, ['passport_copy', 'visa_copy'], true)))
            <tr>
                <td>
                    @if($doc)
                        <span class="badge badge-green">UPLOADED</span>
                    @else
                        <span class="badge {{ $mandatory ? 'badge-red' : 'badge-gray' }}">MISSING</span>
                    @endif
                </td>
                <td>{{ $label }}</td>
                <td>{{ $mandatory ? 'Mandatory' : 'Optional' }}</td>
                <td>{{ $doc ? $doc->uploaded_at->format('d M Y') : '—' }}</td>
            </tr>
        @endforeach
    </table>

    <div class="section-header">SECTION 5 — SECRETARY UC VERIFICATION</div>
    <table class="kv">
        <tr><td class="label">Secretary</td><td class="value">{{ $deathCase->secretary?->name ?? '—' }}</td></tr>
        <tr><td class="label">Union Council</td><td class="value">{{ $deathCase->unionCouncil->name }}, Tehsil {{ $deathCase->unionCouncil->tehsil?->name }}</td></tr>
        <tr><td class="label">Forwarded On</td><td class="value">{{ $deathCase->created_at->format('d F Y') }}</td></tr>
    </table>
    <table class="sig-table">
        <tr>
            <td>
                <div class="sig-line">
                    <div class="sig-name">Secretary, Union Council</div>
                    <div>Date: _______________</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="section-header {{ $deathCase->adlg_observations ? 'tone-green' : '' }}">SECTION 6 — ADLG REVIEW (MEMBER / SECRETARY, RULE 12(3))</div>
    @if($deathCase->adlg_observations)
        <table class="kv">
            <tr><td class="label">Decision</td><td class="value">{{ $statusLabel }}</td></tr>
            @if($deathCase->adlg_order_no)
                <tr><td class="label">Order No.</td><td class="value">{{ $deathCase->adlg_order_no }}</td></tr>
            @endif
        </table>
        <div class="callout tone-green">
            <b>ADLG Observations</b>
            {{ $deathCase->adlg_observations }}
        </div>
        <table class="sig-table">
            <tr>
                <td>
                    <div class="sig-line">
                        <div class="sig-name">Assistant Director Local Government</div>
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
    @else
        <div class="callout tone-amber">Pending ADLG review.</div>
    @endif

    @if($deathCase->category !== '7+')
        <div class="section-header {{ $deathCase->ddlg_observations ? 'tone-purple' : '' }}">SECTION 7 — DDLG COMMITTEE DECISION (RULE 12(3))</div>
        <div class="callout">
            Committee: Deputy Director (Convener) · Assistant Director of Tehsil (Member/Secretary) ·
            Official of Registration Office (Member) · Representative of NADRA (Member).
        </div>
        @if($deathCase->ddlg_observations)
            <table class="kv">
                <tr><td class="label">Decision</td><td class="value">{{ $statusLabel }}</td></tr>
                @if($deathCase->ddlg_order_no)
                    <tr><td class="label">Order No.</td><td class="value">{{ $deathCase->ddlg_order_no }}</td></tr>
                @endif
            </table>
            <div class="callout tone-blue">
                <b>DDLG Committee Observations</b>
                {{ $deathCase->ddlg_observations }}
            </div>
            <table class="sig-table">
                <tr>
                    <td>
                        <div class="sig-line">
                            <div class="sig-name">Deputy Director Local Government (Convener)</div>
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
        @else
            <div class="callout tone-amber">Pending DDLG committee approval.</div>
        @endif
    @endif

    @if($deathCase->certificate_no)
        <div class="section-header tone-purple">SECTION 8 — DEATH CERTIFICATE</div>
        <table class="kv">
            <tr><td class="label">Certificate No.</td><td class="value">{{ $deathCase->certificate_no }}</td></tr>
            <tr><td class="label">Certificate Date</td><td class="value">{{ $deathCase->certificate_date?->format('d F Y') }}</td></tr>
        </table>
        <div class="callout tone-green">
            <b>FILE LOCKED</b>
            No further modifications permitted. Entry made in red ink in the concerned register per Rule 12(12)/15(7). Tamper-proof audit trail preserved.
        </div>
    @endif
@endsection
