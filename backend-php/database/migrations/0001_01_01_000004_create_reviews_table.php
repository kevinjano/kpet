<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->string('comment', 1000)->nullable();
            $table->dateTime('createdAt', 6);
            $table->unsignedBigInteger('productId')->index();
            $table->integer('rating');
            $table->unsignedBigInteger('userId');
            $table->string('userName');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
