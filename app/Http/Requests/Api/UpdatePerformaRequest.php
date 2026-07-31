<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePerformaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
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
        ];
    }
}
