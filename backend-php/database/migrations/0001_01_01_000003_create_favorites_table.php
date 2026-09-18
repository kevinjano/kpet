<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->dateTime('createdAt', 6);
            $table->unsignedBigInteger('productId');
            $table->unsignedBigInteger('userId')->index();
            $table->unique(['userId', 'productId']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
