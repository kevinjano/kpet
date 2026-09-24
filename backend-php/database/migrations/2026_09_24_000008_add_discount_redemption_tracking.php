<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ties a discount lead to the order it was actually used on, so a lead can
// only be redeemed once and the admin can see, per order, whether the
// welcome discount applies.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discount_leads', function (Blueprint $table) {
            $table->integer('discountPercent')->nullable()->after('petBirthday');
            $table->dateTime('redeemedAt', 6)->nullable()->after('createdAt');
            $table->unsignedBigInteger('orderId')->nullable()->after('redeemedAt');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->integer('discountPercent')->nullable()->after('total');
        });
    }

    public function down(): void
    {
        Schema::table('discount_leads', function (Blueprint $table) {
            $table->dropColumn(['discountPercent', 'redeemedAt', 'orderId']);
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('discountPercent');
        });
    }
};
