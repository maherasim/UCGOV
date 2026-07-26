<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'remarks' => ['required', 'string'],
            'nikah_count' => ['nullable', 'integer', 'min:0'],
            'birth_count' => ['nullable', 'integer', 'min:0'],
            'death_count' => ['nullable', 'integer', 'min:0'],
            'complaint_count' => ['nullable', 'integer', 'min:0'],
            'custom_fields' => ['nullable', 'array'],
            'custom_fields.*.label' => ['required_with:custom_fields', 'string', 'max:100'],
            'custom_fields.*.value' => ['nullable', 'string', 'max:500'],

            // Values answering fields the ADLG has defined for this tehsil (see
            // ReportFieldDefinition) — kept separate from the secretary's own
            // ad-hoc custom_fields above, merged together in the controller.
            'field_responses' => ['nullable', 'array'],
            'field_responses.*.field_definition_id' => ['required_with:field_responses', 'integer'],
            'field_responses.*.value' => ['nullable', 'string', 'max:500'],

            'attachment' => ['nullable', 'file', 'max:10240'],
        ];
    }
}
