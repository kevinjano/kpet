<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Leads captured by the "10% off your first order" modal shown to
// logged-out first-time visitors.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discount_leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('petName')->nullable();
            $table->date('petBirthday')->nullable();
            $table->dateTime('createdAt', 6);
        });

        Schema::table('site_settings', function (Blueprint $table) {
            $table->boolean('discountEnabled')->default(false)->after('qrCodeUrl');
            $table->integer('discountPercent')->default(10)->after('discountEnabled');
            $table->string('discountImageUrl')->nullable()->after('discountPercent');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_leads');
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['discountEnabled', 'discountPercent', 'discountImageUrl']);
        });
    }
};
