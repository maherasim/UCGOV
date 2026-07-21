<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passkeys\Contracts\PasskeyUser;
use Laravel\Passkeys\PasskeyAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'role',
        'name',
        'username',
        'email',
        'password',
        'cnic',
        'phone',
        'device_gmail',
        'avatar_path',
        'active',
        'bio_enrolled',
        'first_login',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
            'bio_enrolled' => 'boolean',
            'first_login' => 'boolean',
        ];
    }

    public function adlgProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(AdlgProfile::class);
    }

    public function ddlgProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DdlgProfile::class);
    }

    public function secretaryProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(SecretaryProfile::class);
    }

    public function dvCases(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DvCase::class, 'secretary_id');
    }

    public function adlgCases(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DvCase::class, 'adlg_id');
    }

    public function auditLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Most accounts here (ADLG/Secretary) have no email — use the login username
     * instead so the OS-level fingerprint prompt shows something meaningful.
     */
    public function getPasskeyUsername(): string
    {
        return $this->username ?? $this->email ?? (string) $this->getAuthIdentifier();
    }
}
