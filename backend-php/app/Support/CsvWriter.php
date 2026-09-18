<?php

namespace App\Support;

// Same escaping rule as the old CsvWriter: quote a field only when it
// actually needs it (contains the delimiter, a quote, or a newline).
class CsvWriter
{
    public static function row(array $fields, string $delimiter = ','): string
    {
        $escaped = array_map(function ($field) use ($delimiter) {
            $value = $field === null ? '' : (string) $field;
            if (str_contains($value, $delimiter) || str_contains($value, '"') || str_contains($value, "\n")) {
                $value = '"' . str_replace('"', '""', $value) . '"';
            }
            return $value;
        }, $fields);

        return implode($delimiter, $escaped);
    }
}
