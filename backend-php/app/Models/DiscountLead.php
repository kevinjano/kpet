<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountLead extends Model
{
    public $timestamps = false;

    protected $fillable = ['name', 'email', 'petName', 'petBirthday', 'discountPercent', 'createdAt', 'redeemedAt', 'orderId'];

    protected $casts = [
        'petBirthday' => 'date',
        'createdAt' => 'datetime',
        'redeemedAt' => 'datetime',
        'discountPercent' => 'integer',
        'orderId' => 'integer',
    ];
}
