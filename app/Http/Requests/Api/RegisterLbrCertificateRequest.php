<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RegisterLbrCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'certificate_no' => ['required', 'string', 'max:255'],
            'certificate_date' => ['required', 'date'],
            'certificate_remarks' => ['nullable', 'string'],
        ];
    }
}
