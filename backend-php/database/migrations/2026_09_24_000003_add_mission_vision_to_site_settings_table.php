<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// For the new standalone /sobre-nosotros page — aboutText already covers
// "qué es Kiara petnutri", these two cover the rest the client asked for.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->text('missionText')->nullable()->after('aboutText');
            $table->text('visionText')->nullable()->after('missionText');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['missionText', 'visionText']);
        });
    }
};
