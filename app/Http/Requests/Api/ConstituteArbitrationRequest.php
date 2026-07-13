<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ConstituteArbitrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'husband_rep_name' => ['required', 'string', 'max:255'],
            'husband_rep_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'husband_rep_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'husband_rep_designation' => ['nullable', 'string', 'max:255'],
            'wife_rep_name' => ['required', 'string', 'max:255'],
            'wife_rep_cnic' => ['required', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'wife_rep_phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'wife_rep_designation' => ['nullable', 'string', 'max:255'],
        ];
    }
}
