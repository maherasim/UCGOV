<?php

namespace App\Http\Requests\Api;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDgPerformaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $divisionId = $this->user()->dgProfile->division_id;

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'report_type' => ['required', 'in:onetime,daily'],
            'deadline' => ['nullable', 'date'],
            // mode is immutable once created — not accepted here.
            'excel_template' => ['nullable', 'file', 'max:10240'],
            'fields' => ['nullable', 'array'],
            'fields.*.label' => ['required_with:fields', 'string', 'max:120'],
            'fields.*.type' => ['required_with:fields', 'in:number,text,date'],
            'target_all_adlgs' => ['required', 'boolean'],
            'target_adlg_ids' => ['required_if:target_all_adlgs,false', 'array', 'min:1'],
            'target_adlg_ids.*' => [
                'integer',
                function ($attribute, $value, $fail) use ($divisionId) {
                    $valid = User::where('id', $value)
                        ->where('role', 'adlg')
                        ->whereHas('adlgProfile.tehsil.district', fn ($q) => $q->where('division_id', $divisionId))
                        ->exists();
                    if (! $valid) {
                        $fail('One of the selected ADLGs is not in your division.');
                    }
                },
            ],
        ];
    }
}
