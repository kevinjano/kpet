<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->dateTime('createdAt', 6)->index();
            $table->boolean('receiptSent');
            $table->string('status')->index();
            $table->double('total');
            $table->unsignedBigInteger('userId')->nullable();
        });

        // Embeddable value table (order line snapshots) — no own id/PK,
        // productId/productName/unitPrice are frozen at checkout time and
        // never re-read from the live Product row afterward.
        Schema::create('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('order_id')->index();
            $table->string('productName')->nullable();
            $table->integer('quantity')->nullable();
            $table->double('unitPrice')->nullable();
            $table->unsignedBigInteger('productId')->nullable();
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
