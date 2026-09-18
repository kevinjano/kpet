<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Column names/casing match the live schema Hibernate generated on the old
// Spring Boot backend exactly (verified via DESCRIBE on the real kpet DB),
// not Laravel's usual snake_case convention — this table is reused as-is,
// not recreated, so the shape has to line up byte-for-byte.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('firstName');
            $table->string('lastName');
            $table->string('noTel');
            $table->string('password');
            $table->string('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
