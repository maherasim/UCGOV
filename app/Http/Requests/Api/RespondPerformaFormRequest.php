<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RespondPerformaFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'values' => ['required', 'array', 'min:1'],
            'values.*' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
