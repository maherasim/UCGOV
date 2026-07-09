<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreNewsletterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'priority' => ['required', 'in:normal,urgent,info'],
            'attachment' => ['nullable', 'file', 'max:10240'],
            'options' => ['required', 'array', 'min:1'],
            'options.*' => ['required', 'string', 'max:120'],
        ];
    }
}
