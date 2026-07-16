<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdlgRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('adlg')?->id;

        return [
            'tehsil_id' => ['required', 'integer', 'exists:tehsils,id'],
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'cnic' => ['nullable', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'grade' => ['nullable', 'string', 'max:50'],
        ];
    }
}
