<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RespondNewsletterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'newsletter_option_id' => [
                'required', 'integer',
                Rule::exists('newsletter_options', 'id')->where('newsletter_id', $this->route('newsletter')?->id),
            ],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
