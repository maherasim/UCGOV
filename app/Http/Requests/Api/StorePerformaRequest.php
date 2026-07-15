<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StorePerformaRequest extends FormRequest
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
            'mode' => ['required', 'in:excel,form'],
            'report_type' => ['required', 'in:onetime,daily'],
            'deadline' => ['nullable', 'date'],
            'excel_template' => ['required_if:mode,excel', 'file', 'max:10240'],
            'fields' => ['required_if:mode,form', 'array', 'min:1'],
            'fields.*.label' => ['required_with:fields', 'string', 'max:120'],
            'fields.*.type' => ['required_with:fields', 'in:number,text,date'],
        ];
    }
}
