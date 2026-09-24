<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "Nuestro compromiso" — the 4th content block on /sobre-nosotros, about
// responsible use of animal byproducts, alongside qué-es/misión/visión.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->text('commitmentText')->nullable()->after('visionText');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn('commitmentText');
        });
    }
};
