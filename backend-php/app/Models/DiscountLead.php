<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountLead extends Model
{
    public $timestamps = false;

    protected $fillable = ['name', 'email', 'petName', 'petBirthday', 'createdAt'];

    protected $casts = ['petBirthday' => 'date', 'createdAt' => 'datetime'];
}
