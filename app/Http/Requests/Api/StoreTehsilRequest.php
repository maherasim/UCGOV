<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTehsilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'district_id' => ['required', 'integer', 'exists:districts,id'],
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('tehsils')->where('district_id', $this->input('district_id')),
            ],
        ];
    }
}
