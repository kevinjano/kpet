<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The 3 big category "cards" on the homepage (Perros/Gatos/Accesorios) —
// each links to /tienda pre-filtered, image editable from admin
// Configuración instead of hardcoded in the frontend.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->string('categoryImagePerros')->nullable()->after('discountImageUrl');
            $table->string('categoryImageGatos')->nullable()->after('categoryImagePerros');
            $table->string('categoryImageAccesorios')->nullable()->after('categoryImageGatos');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['categoryImagePerros', 'categoryImageGatos', 'categoryImageAccesorios']);
        });
    }
};
