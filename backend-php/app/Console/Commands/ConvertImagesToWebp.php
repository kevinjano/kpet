<?php

namespace App\Console\Commands;

use App\Services\FileStorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// One-off cleanup: everything uploaded before FileStorageService started
// converting to WebP on the way in is still sitting on disk as the
// original (heavier) JPG/PNG. This walks public/uploads/, converts each
// non-webp file in place, and rewrites every DB reference to it (product
// photos, blog images, distributor photos, site logo/QR/banners) so
// nothing links to a dangling old filename.
class ConvertImagesToWebp extends Command
{
    protected $signature = 'kpet:images-to-webp';
    protected $description = 'Convert every already-uploaded image under public/uploads to WebP and update all DB references';

    public function handle(FileStorageService $storage): int
    {
        $dir = public_path('uploads');
        $files = collect(glob($dir . DIRECTORY_SEPARATOR . '*'))
            ->filter(fn ($path) => is_file($path) && !str_ends_with(strtolower($path), '.webp'));

        if ($files->isEmpty()) {
            $this->info('Nada que convertir — no hay imágenes fuera de WebP.');
            return self::SUCCESS;
        }

        $converted = 0;
        $skipped = 0;
        $bytesBefore = 0;
        $bytesAfter = 0;

        foreach ($files as $path) {
            $oldFilename = basename($path);
            $oldUrl = '/uploads/' . $oldFilename;
            $originalSize = filesize($path);

            $bytes = file_get_contents($path);
            $webp = $storage->convertToWebp($bytes);

            if (!$webp) {
                $this->warn("  Omitido (no se pudo convertir): {$oldFilename}");
                $skipped++;
                continue;
            }

            $newFilename = Str::uuid()->toString() . '.webp';
            $newUrl = '/uploads/' . $newFilename;
            file_put_contents($dir . DIRECTORY_SEPARATOR . $newFilename, $webp);

            $this->updateReferences($oldUrl, $newUrl);

            unlink($path);

            $newSize = strlen($webp);
            $bytesBefore += $originalSize;
            $bytesAfter += $newSize;
            $converted++;
            $this->line("  {$oldFilename} → {$newFilename} (" . $this->formatKb($originalSize) . ' → ' . $this->formatKb($newSize) . ')');
        }

        $this->newLine();
        $this->info("Convertidas: {$converted}, omitidas: {$skipped}");
        if ($bytesBefore > 0) {
            $savedPct = round((1 - $bytesAfter / $bytesBefore) * 100);
            $this->info('Peso total: ' . $this->formatKb($bytesBefore) . ' → ' . $this->formatKb($bytesAfter) . " ({$savedPct}% menos)");
        }

        return self::SUCCESS;
    }

    private function updateReferences(string $oldUrl, string $newUrl): void
    {
        DB::table('products')->where('imageUrl', $oldUrl)->update(['imageUrl' => $newUrl]);
        DB::table('product_images')->where('image_url', $oldUrl)->update(['image_url' => $newUrl]);
        DB::table('distributors')->where('imageUrl', $oldUrl)->update(['imageUrl' => $newUrl]);
        DB::table('blog_posts')->where('imageUrl', $oldUrl)->update(['imageUrl' => $newUrl]);
        DB::table('site_settings')->where('logoUrl', $oldUrl)->update(['logoUrl' => $newUrl]);
        DB::table('site_settings')->where('qrCodeUrl', $oldUrl)->update(['qrCodeUrl' => $newUrl]);
        DB::table('site_settings_banners')->where('banner_url', $oldUrl)->update(['banner_url' => $newUrl]);
    }

    private function formatKb(int $bytes): string
    {
        return number_format($bytes / 1024, 1) . ' KB';
    }
}
