<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDklicDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'in:Rules,Punjab Gazette,Government Notification,Circular,SOP,Office Order,Manual,Policy,Form/Template,Training Material,Act,Official Letter'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'content_text' => ['nullable', 'string'],
            'reference_no' => ['nullable', 'string', 'max:120'],
            'issue_date' => ['nullable', 'date'],
            'effective_date' => ['nullable', 'date'],
            'version' => ['nullable', 'string', 'max:20'],
            'audience' => ['required', 'in:All,ADLG,Secretary UC'],
            'priority' => ['required', 'in:normal,urgent'],
            'ack_required' => ['boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:60'],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png'],
        ];
    }
}
