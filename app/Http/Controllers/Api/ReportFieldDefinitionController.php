<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreReportFieldDefinitionRequest;
use App\Http\Resources\ReportFieldDefinitionResource;
use App\Models\AuditLog;
use App\Models\ReportFieldDefinition;
use Illuminate\Http\Request;

class ReportFieldDefinitionController extends Controller
{
    /** ADLG's own tehsil — both active and inactive, so they can see what they've turned off. */
    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $fields = ReportFieldDefinition::where('tehsil_id', $tehsilId)
            ->with('adlg')
            ->latest()
            ->get();

        return ReportFieldDefinitionResource::collection($fields);
    }

    /** Secretary's own tehsil — active fields only, to render on the daily report form. */
    public function indexForSecretary(Request $request)
    {
        $tehsilId = $request->user()->secretaryProfile->unionCouncil->tehsil_id;

        $fields = ReportFieldDefinition::where('tehsil_id', $tehsilId)
            ->where('active', true)
            ->oldest()
            ->get();

        return ReportFieldDefinitionResource::collection($fields);
    }

    public function store(StoreReportFieldDefinitionRequest $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $field = ReportFieldDefinition::create([
            'tehsil_id' => $tehsilId,
            'adlg_id' => $request->user()->id,
            'label' => $request->string('label')->toString(),
            'active' => true,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'REPORT_FIELD_CREATED',
            'entity_type' => 'ReportFieldDefinition',
            'entity_id' => $field->id,
            'note' => "Daily report field \"{$field->label}\" added by {$request->user()->name}",
        ]);

        return new ReportFieldDefinitionResource($field->load('adlg'));
    }

    public function toggleActive(Request $request, ReportFieldDefinition $reportFieldDefinition)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($reportFieldDefinition->tehsil_id === $tehsilId, 403);

        $reportFieldDefinition->update(['active' => ! $reportFieldDefinition->active]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $reportFieldDefinition->active ? 'REPORT_FIELD_REACTIVATED' : 'REPORT_FIELD_DEACTIVATED',
            'entity_type' => 'ReportFieldDefinition',
            'entity_id' => $reportFieldDefinition->id,
            'note' => "Daily report field \"{$reportFieldDefinition->label}\" ".($reportFieldDefinition->active ? 'reactivated' : 'deactivated'),
        ]);

        return new ReportFieldDefinitionResource($reportFieldDefinition->load('adlg'));
    }
}
