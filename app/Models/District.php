<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class District extends Model
{
    protected $fillable = ['division_id', 'name'];

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    public function tehsils(): HasMany
    {
        return $this->hasMany(Tehsil::class);
    }
}
