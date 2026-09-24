<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Optional background photo behind the purple gradient on two cards: the
// Home "Síguenos en redes" card and the Sobre Nosotros contact card.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->string('followCardImageUrl')->nullable()->after('categoryImageAccesorios');
            $table->string('contactCardImageUrl')->nullable()->after('followCardImageUrl');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['followCardImageUrl', 'contactCardImageUrl']);
        });
    }
};
