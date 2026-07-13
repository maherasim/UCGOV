<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReviewLbrCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'in:APPROVED,REJECTED,RETURNED'],
            'observations' => ['required', 'string'],
            'order_no' => ['nullable', 'string', 'max:255', 'required_if:action,APPROVED'],
        ];
    }
}
