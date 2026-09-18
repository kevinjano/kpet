<?php

namespace App\Models\Concerns;

// The old backend serialized java.time.LocalDateTime as a bare
// "2026-09-16T06:57:15.420350" string with no timezone marker, and the
// Angular frontend's date pipe displays that verbatim (no conversion).
// Eloquent's default serializeDate() appends a "Z" (marking the value as
// UTC), which makes the frontend re-interpret and shift it into the
// browser's local zone — wrong, since these are naive local timestamps,
// not real UTC instants. Stripping the "Z" keeps the exact same displayed
// value as before.
trait NaiveDates
{
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s.u');
    }
}
