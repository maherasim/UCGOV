<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSecretaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tehsilId = $this->user()->adlgProfile->tehsil_id;
        $userId = $this->route('secretary')?->id;

        return [
            'union_council_id' => [
                'required', 'integer',
                Rule::exists('union_councils', 'id')->where('tehsil_id', $tehsilId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'cnic' => ['nullable', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'father_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
