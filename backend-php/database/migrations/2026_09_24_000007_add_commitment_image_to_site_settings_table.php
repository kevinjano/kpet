<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Heart-shaped decorative image shown next to "Nuestro compromiso" on
// /sobre-nosotros, replacing the video that used to sit next to "Misión".
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->string('commitmentImageUrl')->nullable()->after('commitmentText');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn('commitmentImageUrl');
        });
    }
};
