<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class IssueNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notice_no' => ['required', 'string', 'max:255'],
            'issue_date' => ['required', 'date'],
            'hearing_date' => ['required', 'date', 'after_or_equal:issue_date'],
        ];
    }
}
