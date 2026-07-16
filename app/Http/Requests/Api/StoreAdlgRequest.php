<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreAdlgRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tehsil_id' => ['required', 'integer', 'exists:tehsils,id'],
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'cnic' => ['nullable', 'regex:/^\d{5}-\d{7}-\d{1}$/'],
            'phone' => ['nullable', 'regex:/^\d{4}-\d{7}$/'],
            'grade' => ['nullable', 'string', 'max:50'],
        ];
    }
}
