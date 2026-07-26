<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ResubmitLbrCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dob' => ['required', 'date', 'before:today'],
            'delay_reason' => ['required', 'string', 'max:255'],

            'child_name' => ['required', 'string', 'max:255'],
            'child_gender' => ['required', 'in:Male,Female,Other'],
            'child_birth_place' => ['required', 'string', 'max:255'],
            'child_birth_type' => ['nullable', 'string', 'max:100'],
            'child_hospital' => ['nullable', 'string', 'max:255'],

            'applicant_name' => ['required', 'string', 'max:255'],
            'applicant_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'applicant_relation' => ['nullable', 'string', 'max:100'],
            'applicant_father_name' => ['required', 'string', 'max:255'],
            'applicant_mother_name' => ['required', 'string', 'max:255'],
            'applicant_address' => ['required', 'string', 'max:255'],
            'applicant_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],

            'secretary_remarks' => ['nullable', 'string'],

            'documents' => ['nullable', 'array'],
            'documents.*' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.cnic' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.photo1' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png'],
            'documents.photo2' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png'],
            'documents.forma' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.slip' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.vacc' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.bform' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.newspaper_notice' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.stamp_paper' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],

            'extra_labels' => ['nullable', 'array'],
            'extra_labels.*' => ['nullable', 'string', 'max:255'],
        ];
    }
}
