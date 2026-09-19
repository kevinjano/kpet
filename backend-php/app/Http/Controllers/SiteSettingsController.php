<?php

namespace App\Http\Controllers;

use App\Models\SiteSettings;
use Illuminate\Http\Request;

class SiteSettingsController extends Controller
{
    // Lazy-creates the singleton row (id always 1) on first read, same as
    // the old SiteSettingsServiceImpl.
    public function show()
    {
        $settings = SiteSettings::find(1);
        if (!$settings) {
            $settings = SiteSettings::create([
                'id' => 1,
                'storeName' => 'Kpet',
                'logoUrl' => null,
                'whatsappNumber' => '',
            ]);
        }
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $data = $request->all();
        $settings = SiteSettings::find(1);
        $fields = $request->only([
            'storeName', 'logoUrl', 'whatsappNumber', 'aboutText', 'address', 'mapUrl',
            'instagramUrl', 'tiktokUrl', 'youtubeUrl', 'contactEmail', 'qrCodeUrl',
        ]);
        $fields['id'] = 1; // hard-pinned, regardless of what's sent

        if ($settings) {
            $settings->fill($fields);
            $settings->save();
        } else {
            $settings = SiteSettings::create($fields);
        }

        if (array_key_exists('bannerUrls', $data)) {
            $settings->syncBannerUrls($data['bannerUrls'] ?? []);
        }
        $settings->refresh();

        return response()->json($settings);
    }
}
