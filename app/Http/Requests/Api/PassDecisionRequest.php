<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class PassDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:DISPOSED_RECONCILED,DISPOSED_EFFECTIVE,FILED_NON_RESPONSE'],
            'order_no' => ['required', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
