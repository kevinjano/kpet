<?php

namespace App\Models;

use App\Models\Concerns\NaiveDates;
use Illuminate\Database\Eloquent\Model;

class Favorite extends Model
{
    use NaiveDates;

    public $timestamps = false;

    protected $fillable = ['userId', 'productId', 'createdAt'];

    protected $casts = ['userId' => 'integer', 'productId' => 'integer', 'createdAt' => 'datetime'];
}
