<?php

namespace App\Models;

use App\Models\Concerns\NaiveDates;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use NaiveDates;

    public $timestamps = false;

    protected $fillable = ['productId', 'userId', 'userName', 'rating', 'comment', 'createdAt'];

    protected $casts = [
        'rating' => 'integer',
        'productId' => 'integer',
        'userId' => 'integer',
        'createdAt' => 'datetime',
    ];
}
