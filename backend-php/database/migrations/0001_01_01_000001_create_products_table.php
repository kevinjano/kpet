<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->boolean('active')->index();
            $table->string('category')->index();
            $table->text('description')->nullable();
            $table->string('imageUrl')->nullable();
            $table->string('name');
            $table->boolean('onSale');
            $table->double('price');
            $table->double('salePrice')->nullable();
            $table->integer('stock');
        });

        // No own id/PK — a Hibernate @ElementCollection value table, managed
        // as a plain string list on Product (no explicit order column, so
        // order is not guaranteed and isn't relied on by the frontend).
        Schema::create('product_images', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->index();
            $table->string('image_url')->nullable();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
    }
};
