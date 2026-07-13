<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDvCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'case_no' => ['required', 'string', 'max:255', 'unique:dv_cases,case_no'],
            'type' => ['required', 'in:divorce,khula'],
            'divorcer_name' => ['required', 'string', 'max:255'],
            'divorcer_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'divorcer_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'respondent_name' => ['required', 'string', 'max:255'],
            'respondent_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'respondent_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'marriage_date' => ['nullable', 'date'],
            'nikah_registrar' => ['nullable', 'string', 'max:255'],
            'mahr_amount' => ['nullable', 'string', 'max:255'],
            'children_count' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'receipt_date' => ['required', 'date'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
