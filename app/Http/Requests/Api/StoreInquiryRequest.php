<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreInquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'union_council_id' => ['nullable', 'integer', 'exists:union_councils,id'],
            'remarks' => ['required', 'string'],
            'file' => ['required', 'file', 'max:10240'],
        ];
    }
}
