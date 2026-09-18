<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Singleton row — id is always hard-pinned to 1 in the application
        // layer (SiteSettingsController), never auto-incremented.
        Schema::create('site_settings', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('logoUrl')->nullable();
            $table->string('storeName');
            $table->string('whatsappNumber');
            $table->text('aboutText')->nullable();
            $table->string('contactEmail')->nullable();
            $table->string('instagramUrl')->nullable();
            $table->string('tiktokUrl')->nullable();
            $table->string('youtubeUrl')->nullable();
            $table->string('qrCodeUrl')->nullable();
        });

        // Ordered value list (has an explicit position column, unlike
        // product_images) — banners must render in the order the admin set.
        Schema::create('site_settings_banners', function (Blueprint $table) {
            $table->unsignedBigInteger('site_settings_id');
            $table->string('banner_url')->nullable();
            $table->integer('position');
            $table->primary(['site_settings_id', 'position']);
            $table->foreign('site_settings_id')->references('id')->on('site_settings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings_banners');
        Schema::dropIfExists('site_settings');
    }
};
