<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'remarks' => ['required', 'string'],
            'nikah_count' => ['nullable', 'integer', 'min:0'],
            'birth_count' => ['nullable', 'integer', 'min:0'],
            'death_count' => ['nullable', 'integer', 'min:0'],
            'complaint_count' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
