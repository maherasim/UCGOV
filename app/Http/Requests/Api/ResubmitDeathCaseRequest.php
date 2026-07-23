<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ResubmitDeathCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_of_death' => ['required', 'date', 'before:today'],
            'delay_reason' => ['required', 'string', 'max:255'],

            'deceased_name' => ['required', 'string', 'max:255'],
            'deceased_gender' => ['required', 'in:Male,Female,Other'],
            'deceased_cnic' => ['nullable', 'string', 'max:20'],
            'cause_of_death' => ['nullable', 'string', 'max:255'],
            'place_of_death' => ['nullable', 'string', 'max:255'],
            'burial_place' => ['nullable', 'string', 'max:255'],

            'applicant_name' => ['required', 'string', 'max:255'],
            'applicant_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'applicant_relation' => ['required', 'string', 'max:100'],
            'applicant_address' => ['required', 'string', 'max:255'],
            'applicant_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],

            'secretary_remarks' => ['nullable', 'string'],

            'court_decree_no' => ['nullable', 'string', 'max:255'],
            'court_decree_date' => ['nullable', 'date'],
            'court_name' => ['nullable', 'string', 'max:255'],

            'country_of_death' => ['nullable', 'string', 'max:255'],
            'passport_no' => ['nullable', 'string', 'max:50'],

            'documents' => ['nullable', 'array'],
            'documents.affidavit' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.cnic_deceased' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.cnic_applicant' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.death_slip' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.burial_slip' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.court_decree' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.passport_copy' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.visa_copy' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'documents.other_doc' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
        ];
    }
}
