<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

// Mirrors the old FileStorageService's extension allow-list backed by an
// actual magic-byte sniff (never trust the extension alone) and a fully
// random UUID filename (no path traversal / overwrite / collision risk).
//
// Unlike the old version, every upload is now converted to WebP (regardless
// of what was uploaded) and downscaled to at most 1600px on the longest
// side — WebP at quality 85 is visually near-lossless but a fraction of the
// size of the equivalent PNG/JPG, which matters a lot on the cheap shared
// hosting plan this is deploying to (less disk, less bandwidth per page
// load). Transparency (PNG logos, QR codes) is preserved. If GD can't
// decode the upload for some reason, it falls back to storing the original
// bytes untouched rather than failing the upload outright.
class FileStorageService
{
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private const MAX_DIMENSION = 1600;
    private const WEBP_QUALITY = 85;

    public function store(UploadedFile $file): string
    {
        if (!$file->isValid() || $file->getSize() === 0) {
            throw new \InvalidArgumentException('No se envió ningún archivo.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException("Unsupported file type: {$extension}");
        }

        $bytes = file_get_contents($file->getRealPath());
        if (!$this->looksLikeImage($bytes)) {
            throw new \InvalidArgumentException('El archivo no es una imagen válida');
        }

        $dir = public_path('uploads');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $webp = $this->convertToWebp($bytes);
        $filename = Str::uuid()->toString() . ($webp ? '.webp' : '.' . $extension);
        $destination = $dir . DIRECTORY_SEPARATOR . $filename;
        file_put_contents($destination, $webp ?? $bytes);

        return '/uploads/' . $filename;
    }

    private function looksLikeImage(string $bytes): bool
    {
        if (strncmp($bytes, "\x89PNG", 4) === 0) return true;
        if (strncmp($bytes, "\xFF\xD8\xFF", 3) === 0) return true;
        if (strncmp($bytes, 'GIF8', 4) === 0) return true;
        if (strlen($bytes) >= 12 && substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WEBP') return true;
        return false;
    }

    // Exposed for the one-off kpet:images-to-webp console command, which
    // re-runs this exact same conversion against files already on disk.
    public function convertToWebp(string $bytes): ?string
    {
        $image = @imagecreatefromstring($bytes);
        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width > self::MAX_DIMENSION || $height > self::MAX_DIMENSION) {
            $scale = self::MAX_DIMENSION / max($width, $height);
            $newWidth = (int) round($width * $scale);
            $newHeight = (int) round($height * $scale);

            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        } else {
            imagealphablending($image, false);
            imagesavealpha($image, true);
        }

        ob_start();
        $ok = imagewebp($image, null, self::WEBP_QUALITY);
        $out = ob_get_clean();
        imagedestroy($image);

        return $ok && $out ? $out : null;
    }
}
