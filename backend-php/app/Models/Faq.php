<?php

namespace App\Models;

use App\Models\Concerns\NaiveDates;
use Illuminate\Database\Eloquent\Model;

class Faq extends Model
{
    use NaiveDates;

    public $timestamps = false;

    protected $fillable = ['question', 'answer', 'published', 'position', 'createdAt'];

    protected $casts = [
        'published' => 'boolean',
        'position' => 'integer',
        'createdAt' => 'datetime',
    ];
}
