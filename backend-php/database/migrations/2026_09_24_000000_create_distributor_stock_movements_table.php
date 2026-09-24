<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// One row per stock shipment/correction the admin records for a distributor
// — the running quantity on distributor_product_items is the current
// total; this table is the append-only log of how it got there ("tal fecha
// se le envió tanta cantidad").
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('distributor_stock_movements', function (Blueprint $table) {
            $table->id();
            // Signed bigint (not unsignedBigInteger) to match distributors.id
            // and products.id — those tables came from the old Hibernate
            // schema's dump, where the PK columns were never marked unsigned.
            $table->bigInteger('distributor_id');
            $table->bigInteger('product_id');
            $table->integer('quantity');
            $table->dateTime('createdAt', 6);
            $table->foreign('distributor_id')->references('id')->on('distributors')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('distributor_stock_movements');
    }
};
