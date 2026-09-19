<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

// Same shape as FileStorageService (extension allow-list backed by an
// actual magic-byte sniff, fully random UUID filename) but for the blog's
// short-video uploads instead of images — no resizing/webp conversion here,
// video re-encoding needs ffmpeg, which is out of scope; the file is stored
// as-is, so keeping clips genuinely short/phone-sized is on the admin.
class VideoStorageService
{
    private const ALLOWED_EXTENSIONS = ['mp4', 'webm', 'mov'];

    public function store(UploadedFile $file): string
    {
        if (!$file->isValid() || $file->getSize() === 0) {
            throw new \InvalidArgumentException('No se envió ningún archivo.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException("Formato de video no soportado: {$extension}");
        }

        $header = file_get_contents($file->getRealPath(), false, null, 0, 12);
        if (!$this->looksLikeVideo($header, $extension)) {
            throw new \InvalidArgumentException('El archivo no es un video válido');
        }

        $dir = public_path('uploads');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = Str::uuid()->toString() . '.' . $extension;
        $file->move($dir, $filename);

        return '/uploads/' . $filename;
    }

    private function looksLikeVideo(string $header, string $extension): bool
    {
        // MP4/MOV (ISO base media format): bytes 4-7 spell "ftyp".
        if (in_array($extension, ['mp4', 'mov'], true)) {
            return strlen($header) >= 8 && substr($header, 4, 4) === 'ftyp';
        }
        // WebM (Matroska/EBML): starts with the fixed 4-byte EBML magic number.
        if ($extension === 'webm') {
            return strncmp($header, "\x1A\x45\xDF\xA3", 4) === 0;
        }
        return false;
    }
}
