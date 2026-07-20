<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {
        margin: 95px 34px 70px 34px;
    }

    * { box-sizing: border-box; }

    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 10px;
        color: #1F2937;
        line-height: 1.45;
    }

    .doc-header {
        position: fixed;
        top: -70px;
        left: 0;
        right: 0;
        height: 26px;
        background-color: #1E3A8A;
        color: #ffffff;
        font-size: 7.5px;
        padding: 8px 10px;
        text-align: center;
    }

    .doc-footer {
        position: fixed;
        bottom: -50px;
        left: 0;
        right: 0;
        height: 22px;
        background-color: #1E3A8A;
        color: #ffffff;
        font-size: 7.5px;
        padding: 6px 10px;
        text-align: center;
    }

    .letterhead {
        text-align: center;
        margin-bottom: 10px;
    }
    .letterhead .dept { font-size: 18px; font-weight: bold; color: #1E3A8A; margin-bottom: 2px; }
    .letterhead .sub { font-size: 10px; color: #374151; }
    .letterhead .rule { border-top: 2px solid #1E3A8A; margin: 8px 0; }

    .doc-title { text-align: center; margin: 14px 0 4px; }
    .doc-title h1 { font-size: 16px; color: #111827; margin: 0; }
    .doc-title .subtitle { font-size: 10px; color: #4B5563; margin-top: 3px; }
    .doc-title .rule-thin { border-top: 1px solid #D1D5DB; margin: 10px 0; }

    table.kv { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    table.kv tr { border-bottom: 1px solid #E5E7EB; }
    table.kv tr:nth-child(even) td { background-color: #F9FAFB; }
    table.kv td { padding: 5px 8px; font-size: 9.5px; vertical-align: top; }
    table.kv td.label { width: 34%; font-weight: bold; color: #374151; background-color: #EEF2F9; }
    table.kv td.value { color: #111827; }

    .section-header {
        color: #ffffff;
        font-size: 10.5px;
        font-weight: bold;
        padding: 6px 10px;
        margin: 14px 0 8px;
        background-color: #1E3A8A;
    }
    .section-header.tone-green { background-color: #047857; }
    .section-header.tone-navy { background-color: #1E3A8A; }
    .section-header.tone-purple { background-color: #6D28D9; }

    .callout {
        border: 1px solid #D1D5DB;
        background-color: #F9FAFB;
        padding: 8px 10px;
        margin-bottom: 10px;
        font-size: 9.5px;
    }
    .callout.tone-amber { border-color: #F59E0B; background-color: #FFFBEB; color: #92400E; }
    .callout.tone-green { border-color: #10B981; background-color: #ECFDF5; color: #065F46; }
    .callout.tone-red { border-color: #EF4444; background-color: #FEF2F2; color: #991B1B; }
    .callout.tone-blue { border-color: #3B82F6; background-color: #EFF6FF; color: #1E40AF; }
    .callout b { display: block; margin-bottom: 3px; }

    table.doc-checklist { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    table.doc-checklist th {
        background-color: #1E3A8A; color: #fff; font-size: 8.5px; padding: 5px 6px; text-align: left;
    }
    table.doc-checklist td { padding: 5px 6px; font-size: 9px; border-bottom: 1px solid #E5E7EB; }
    table.doc-checklist tr:nth-child(even) td { background-color: #F9FAFB; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
    .badge-green { background-color: #D1FAE5; color: #065F46; }
    .badge-gray { background-color: #E5E7EB; color: #374151; }
    .badge-red { background-color: #FEE2E2; color: #991B1B; }

    .sig-table { width: 100%; margin-top: 16px; }
    .sig-table td { width: 50%; font-size: 9px; vertical-align: top; padding-right: 20px; }
    .sig-line { border-top: 1px solid #111827; margin-top: 26px; padding-top: 4px; }
    .sig-name { font-weight: bold; color: #1E3A8A; }

    .hearing-block { border: 1px solid #E5E7EB; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
    .hearing-title { font-weight: bold; color: #1E3A8A; font-size: 9.5px; margin-bottom: 4px; }
    .hearing-row { font-size: 9px; margin-bottom: 2px; }
    .hearing-row .k { font-weight: bold; color: #374151; }
</style>
</head>
<body>

<div class="doc-header">
    UNION COUNCIL MANAGEMENT SYSTEM &nbsp;|&nbsp; {{ $docHeaderTitle ?? '' }} &nbsp;|&nbsp; CONFIDENTIAL — OFFICIAL USE ONLY
</div>
<div class="doc-footer">
    Bakhtawar Shahzad AI Labs Pvt Ltd. &nbsp;|&nbsp; Union Council Management System &nbsp;|&nbsp; Generated {{ now()->format('d M Y H:i') }}
</div>

<script type="text/php">
if (isset($pdf)) {
    $font = $fontMetrics->getFont("Helvetica", "bold");
    $pdf->page_text(520, 785, "Page {PAGE_NUM} of {PAGE_COUNT}", $font, 7.5, array(1, 1, 1));
}
</script>

@yield('content')

</body>
</html>
