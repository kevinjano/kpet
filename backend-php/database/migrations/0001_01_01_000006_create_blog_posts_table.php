<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->text('content')->nullable();
            $table->dateTime('createdAt', 6);
            $table->date('eventDate')->nullable();
            $table->string('imageUrl')->nullable();
            $table->boolean('published')->index();
            $table->string('title');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
