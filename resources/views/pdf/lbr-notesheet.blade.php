@extends('pdf.layout', ['docHeaderTitle' => 'BIRTH REGISTRATION (LBR) · NOTESHEET'])

@section('content')
    <div class="letterhead">
        <div class="dept">GOVERNMENT OF PUNJAB</div>
        <div class="sub">Local Government &amp; Community Development Department</div>
        <div class="sub">Union Council {{ $lbrCase->unionCouncil->name }}
            @if($lbrCase->unionCouncil->tehsil) | Tehsil {{ $lbrCase->unionCouncil->tehsil->name }} @endif
        </div>
        <div class="rule"></div>
    </div>

    <div class="doc-title">
        <h1>DELAYED BIRTH REGISTRATION — OFFICIAL NOTESHEET</h1>
        <div class="subtitle">Punjab Local Government (Birth Registration) Rules</div>
        <div class="rule-thin"></div>
    </div>

    <table class="kv">
        <tr><td class="label">LBR-ID</td><td class="value">{{ $lbrCase->lbr_id }}</td></tr>
        <tr><td class="label">Category</td><td class="value">{{ $lbrCase->category === '1-7' ? '1–7 Years' : 'Over 7 Years' }}</td></tr>
        <tr><td class="label">Status</td><td class="value">{{ $statusLabel }}</td></tr>
        <tr><td class="label">Generated</td><td class="value">{{ now()->format('d F Y H:i') }} PKT | UC Governance Platform</td></tr>
    </table>

    <div class="section-header">SECTION 1 — CHILD DETAILS</div>
    <table class="kv">
        <tr><td class="label">Name</td><td class="value">{{ $lbrCase->child_name }}</td></tr>
        <tr><td class="label">Gender</td><td class="value">{{ $lbrCase->child_gender }}</td></tr>
        <tr><td class="label">Date of Birth</td><td class="value">{{ $lbrCase->dob->format('d F Y') }}</td></tr>
        <tr><td class="label">Age at Application</td><td class="value">{{ $lbrCase->age_at_application }} years</td></tr>
        <tr><td class="label">Birth Place</td><td class="value">{{ $lbrCase->child_birth_place ?: '—' }}</td></tr>
        <tr><td class="label">Birth Type</td><td class="value">{{ $lbrCase->child_birth_type ?: '—' }}</td></tr>
        @if($lbrCase->child_hospital)
            <tr><td class="label">Hospital</td><td class="value">{{ $lbrCase->child_hospital }}</td></tr>
        @endif
    </table>

    <div class="section-header">SECTION 2 — APPLICANT &amp; PARENTS DETAILS</div>
    <table class="kv">
        <tr><td class="label">Applicant Name</td><td class="value">{{ $lbrCase->applicant_name }}</td></tr>
        <tr><td class="label">Relation to Child</td><td class="value">{{ $lbrCase->applicant_relation ?: '—' }}</td></tr>
        <tr><td class="label">Applicant CNIC</td><td class="value">{{ $lbrCase->applicant_cnic }}</td></tr>
        <tr><td class="label">Applicant Phone</td><td class="value">{{ $lbrCase->applicant_phone ?: '—' }}</td></tr>
        <tr><td class="label">Address</td><td class="value">{{ $lbrCase->applicant_address ?: '—' }}</td></tr>
        <tr><td class="label">Father's Name</td><td class="value">{{ $lbrCase->applicant_father_name ?: '—' }}</td></tr>
        <tr><td class="label">Mother's Name</td><td class="value">{{ $lbrCase->applicant_mother_name ?: '—' }}</td></tr>
    </table>

    <div class="section-header">SECTION 3 — REASON FOR DELAY</div>
    <div class="callout">
        {{ $lbrCase->delay_reason }}
    </div>
    @if($lbrCase->secretary_remarks)
        <div class="callout tone-blue">
            <b>Secretary Remarks</b>
            {{ $lbrCase->secretary_remarks }}
        </div>
    @endif

    <div class="section-header">SECTION 4 — DOCUMENT CHECKLIST</div>
    <table class="doc-checklist">
        <tr><th style="width: 8%;">Status</th><th>Document</th><th style="width: 16%;">Requirement</th><th style="width: 20%;">Uploaded</th></tr>
        @foreach($docLabels as $key => $label)
            @php($doc = $lbrCase->documents->firstWhere('doc_key', $key))
            @php($mandatory = in_array($key, ['cnic', 'photo1', 'photo2', 'forma'], true))
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
        <tr><td class="label">Secretary</td><td class="value">{{ $lbrCase->secretary?->name ?? '—' }}</td></tr>
        <tr><td class="label">Union Council</td><td class="value">{{ $lbrCase->unionCouncil->name }}, Tehsil {{ $lbrCase->unionCouncil->tehsil?->name }}</td></tr>
        <tr><td class="label">Forwarded On</td><td class="value">{{ $lbrCase->created_at->format('d F Y') }}</td></tr>
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

    <div class="section-header {{ $lbrCase->adlg_observations ? 'tone-green' : '' }}">SECTION 6 — ADLG REVIEW &amp; DECISION</div>
    @if($lbrCase->adlg_observations)
        <table class="kv">
            <tr><td class="label">Decision</td><td class="value">{{ $statusLabel }}</td></tr>
            @if($lbrCase->adlg_order_no)
                <tr><td class="label">Order No.</td><td class="value">{{ $lbrCase->adlg_order_no }}</td></tr>
            @endif
        </table>
        <div class="callout tone-green">
            <b>ADLG Observations</b>
            {{ $lbrCase->adlg_observations }}
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

    @if($lbrCase->certificate_no)
        <div class="section-header tone-purple">SECTION 7 — BIRTH CERTIFICATE</div>
        <table class="kv">
            <tr><td class="label">Certificate No.</td><td class="value">{{ $lbrCase->certificate_no }}</td></tr>
            <tr><td class="label">Certificate Date</td><td class="value">{{ $lbrCase->certificate_date?->format('d F Y') }}</td></tr>
        </table>
        <div class="callout tone-green">
            <b>FILE LOCKED</b>
            No further modifications permitted. Tamper-proof audit trail preserved.
        </div>
    @endif
@endsection
