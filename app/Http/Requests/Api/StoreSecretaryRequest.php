<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSecretaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tehsilId = $this->user()->adlgProfile->tehsil_id;

        return [
            'union_council_id' => [
                'required', 'integer',
                Rule::exists('union_councils', 'id')->where('tehsil_id', $tehsilId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'cnic' => ['nullable', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'father_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
