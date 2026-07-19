<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class AddProceedingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'venue' => ['nullable', 'string', 'max:255'],

            'petitioner_present' => ['boolean'],
            'respondent_present' => ['boolean'],
            'petitioner_biometric' => ['boolean'],
            'respondent_biometric' => ['boolean'],

            // A party marked present must have a photo on record — this is the actual
            // proof; the checkbox alone isn't. Nobody photographs a party who isn't there.
            'petitioner_photo' => ['required_if:petitioner_present,1', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
            'respondent_photo' => ['required_if:respondent_present,1', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],

            'pet_rep_name' => ['nullable', 'string', 'max:255'],
            'pet_rep_cnic' => ['nullable', 'string', 'max:15'],
            'res_rep_name' => ['nullable', 'string', 'max:255'],
            'res_rep_cnic' => ['nullable', 'string', 'max:15'],

            'pet_statement' => ['nullable', 'string'],
            'res_statement' => ['nullable', 'string'],
            'reconciliation' => ['nullable', 'string'],

            'adjourned' => ['boolean'],
            'adjourn_reason' => ['nullable', 'string', 'required_if:adjourned,1'],
            'next_hearing_date' => ['nullable', 'date', 'required_if:adjourned,1'],

            'notice_issued' => ['boolean'],
            'notice_ref' => ['nullable', 'string', 'max:255', 'required_if:notice_issued,1'],
            'notice_date' => ['nullable', 'date', 'required_if:notice_issued,1'],
            'notice_details' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'petitioner_photo.required_if' => 'A photo of the petitioner is required when marking them present.',
            'respondent_photo.required_if' => 'A photo of the respondent is required when marking them present.',
        ];
    }
}
