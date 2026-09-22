<?php

namespace App\Models;

use App\Models\Concerns\NaiveDates;
use Illuminate\Database\Eloquent\Model;

class BlogPost extends Model
{
    use NaiveDates;

    public $timestamps = false;

    protected $fillable = ['title', 'content', 'imageUrl', 'videoUrl', 'externalUrl', 'eventDate', 'published', 'createdAt'];

    protected $casts = [
        'published' => 'boolean',
        // Explicit format (not the bare 'date' cast) so this serializes as a
        // plain "2026-09-24" — matching java.time.LocalDate's JSON shape,
        // which the admin's <input type="date"> and the storefront's date
        // pipe both expect. A datetime string here would shift by a day in
        // some timezones since JS parses "date-only" vs "date+time-no-zone"
        // strings differently.
        'eventDate' => 'date:Y-m-d',
        'createdAt' => 'datetime',
    ];
}
