<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('distributors', function (Blueprint $table) {
            $table->id();
            $table->boolean('active')->index();
            $table->string('address')->nullable();
            $table->string('city')->index();
            $table->text('description')->nullable();
            $table->string('imageUrl')->nullable();
            $table->string('mapUrl')->nullable();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('whatsappNumber')->nullable();
        });

        // Real child entity (has its own id + FK to Product) — owned
        // unidirectionally by Distributor; Product has no back-reference.
        Schema::create('distributor_product_items', function (Blueprint $table) {
            $table->id();
            $table->integer('quantity');
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedBigInteger('distributor_id')->nullable()->index();
            $table->foreign('product_id')->references('id')->on('products');
            $table->foreign('distributor_id')->references('id')->on('distributors')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('distributor_product_items');
        Schema::dropIfExists('distributors');
    }
};
