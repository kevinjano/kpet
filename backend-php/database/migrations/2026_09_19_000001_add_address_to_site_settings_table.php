<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Central store's own address/map link — same shape as Distributor's
// address/mapUrl, shown on the "Conócenos" section of the homepage.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->string('address')->nullable()->after('storeName');
            $table->string('mapUrl')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['address', 'mapUrl']);
        });
    }
};
