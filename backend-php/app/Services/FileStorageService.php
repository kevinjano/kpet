<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

// Mirrors the old FileStorageService: extension allow-list backed by an
// actual magic-byte sniff (never trust the extension alone), a fully random
// UUID filename (no path traversal / overwrite / collision risk), and a
// downscale to at most 1600px on the longest side, format preserved (so PNG
// logos/QR codes keep transparency) — falls back to storing the original
// bytes untouched if GD can't decode/re-encode the format.
class FileStorageService
{
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private const MAX_DIMENSION = 1600;

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

        $filename = Str::uuid()->toString() . '.' . $extension;
        $destination = $dir . DIRECTORY_SEPARATOR . $filename;

        $resized = $this->resizeIfNeeded($bytes, $extension);
        file_put_contents($destination, $resized ?? $bytes);

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

    private function resizeIfNeeded(string $bytes, string $extension): ?string
    {
        $image = @imagecreatefromstring($bytes);
        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width <= self::MAX_DIMENSION && $height <= self::MAX_DIMENSION) {
            imagedestroy($image);
            return null;
        }

        $scale = self::MAX_DIMENSION / max($width, $height);
        $newWidth = (int) round($width * $scale);
        $newHeight = (int) round($height * $scale);

        $resized = imagecreatetruecolor($newWidth, $newHeight);
        if (in_array($extension, ['png', 'gif'], true)) {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);

        ob_start();
        match ($extension) {
            'png' => imagepng($resized),
            'gif' => imagegif($resized),
            'webp' => imagewebp($resized),
            default => imagejpeg($resized, null, 90),
        };
        $out = ob_get_clean();
        imagedestroy($resized);

        return $out ?: null;
    }
}
