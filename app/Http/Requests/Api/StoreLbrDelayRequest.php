<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreLbrDelayRequest extends FormRequest
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

            'applicant_name' => ['required', 'string', 'max:255'],
            'applicant_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'applicant_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],

            'secretary_remarks' => ['nullable', 'string'],
        ];
    }
}
