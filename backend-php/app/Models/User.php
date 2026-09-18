<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    public $timestamps = false;

    protected $fillable = ['firstName', 'lastName', 'email', 'noTel', 'password', 'role'];

    // Mirrors the old backend's @JsonProperty(WRITE_ONLY) on User.password —
    // accepted on input, never serialized back out.
    protected $hidden = ['password'];

    const ROLE_ADMIN = 'Admin';
    const ROLE_CLIENT = 'Client';
}
