<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CompleteLbrApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'child_birth_place' => ['nullable', 'string', 'max:255'],
            'child_birth_type' => ['nullable', 'string', 'max:100'],
            'child_hospital' => ['nullable', 'string', 'max:255'],

            'applicant_relation' => ['nullable', 'string', 'max:100'],
            'applicant_father_name' => ['nullable', 'string', 'max:255'],
            'applicant_mother_name' => ['nullable', 'string', 'max:255'],
            'applicant_address' => ['nullable', 'string', 'max:255'],

            'secretary_remarks' => ['nullable', 'string'],

            'documents' => ['required', 'array'],
            'documents.cnic' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.photo1' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png'],
            'documents.photo2' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png'],
            'documents.forma' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.slip' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.vacc' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.bform' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
        ];
    }
}
