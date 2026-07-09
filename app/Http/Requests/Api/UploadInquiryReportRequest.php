<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UploadInquiryReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'report_file' => ['required', 'file', 'max:10240'],
            'report_remarks' => ['nullable', 'string'],
        ];
    }
}
