<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class SiteSettings extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $fillable = [
        'storeName', 'logoUrl', 'whatsappNumber', 'aboutText', 'missionText', 'visionText', 'commitmentText', 'commitmentImageUrl', 'aboutVideoUrl', 'aboutImageUrl', 'address', 'mapUrl',
        'instagramUrl', 'facebookUrl', 'tiktokUrl', 'youtubeUrl', 'contactEmail', 'qrCodeUrl',
        'discountEnabled', 'discountPercent', 'discountImageUrl',
        'categoryImagePerros', 'categoryImageGatos', 'categoryImageAccesorios',
        'followCardImageUrl', 'contactCardImageUrl',
    ];

    protected $casts = ['discountEnabled' => 'boolean', 'discountPercent' => 'integer'];

    protected $appends = ['bannerUrls'];

    public function getBannerUrlsAttribute(): array
    {
        if (!$this->exists) {
            return [];
        }
        return DB::table('site_settings_banners')
            ->where('site_settings_id', $this->id)
            ->orderBy('position')
            ->pluck('banner_url')
            ->all();
    }

    // Ordered replace — position 0..n-1 preserves the admin's chosen order,
    // matching the old @OrderColumn behavior.
    public function syncBannerUrls(array $urls): void
    {
        DB::table('site_settings_banners')->where('site_settings_id', $this->id)->delete();
        $rows = [];
        foreach (array_values($urls) as $position => $url) {
            $rows[] = ['site_settings_id' => $this->id, 'banner_url' => $url, 'position' => $position];
        }
        if ($rows) {
            DB::table('site_settings_banners')->insert($rows);
        }
    }
}
