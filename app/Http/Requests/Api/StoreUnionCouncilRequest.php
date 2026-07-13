<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnionCouncilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tehsilId = $this->user()->adlgProfile->tehsil_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'uc_no' => ['nullable', 'integer', Rule::unique('union_councils')->where('tehsil_id', $tehsilId)],
            'code' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'geofence_radius' => ['nullable', 'integer', 'min:20', 'max:2000'],
        ];
    }
}
