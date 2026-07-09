<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdlgProfile;
use App\Models\SecretaryProfile;

class ProfileSubmissionController extends Controller
{
    /**
     * First-login profile submissions awaiting SA review (ADLG/Secretary self-service
     * profile completion is a later phase, so this is empty until that ships).
     */
    public function index()
    {
        $adlgSubmissions = AdlgProfile::with(['user', 'tehsil'])
            ->whereNotNull('profile_completed_at')
            ->get()
            ->map(fn (AdlgProfile $p) => [
                'type' => 'adlg',
                'name' => $p->user->name,
                'tehsil' => $p->tehsil->name,
                'submitted_at' => $p->profile_completed_at,
            ]);

        $secSubmissions = SecretaryProfile::with(['user', 'unionCouncil'])
            ->whereNotNull('profile_completed_at')
            ->get()
            ->map(fn (SecretaryProfile $p) => [
                'type' => 'sec',
                'name' => $p->user->name,
                'union_council' => $p->unionCouncil?->name,
                'submitted_at' => $p->profile_completed_at,
            ]);

        return response()->json(
            $adlgSubmissions->concat($secSubmissions)->sortByDesc('submitted_at')->values()
        );
    }
}
