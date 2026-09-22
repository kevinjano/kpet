<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Google-signed-in accounts have no password of their own, and are matched
// by this id (the token's "sub" claim) rather than email+password. Raw SQL
// for the nullability change instead of Schema::change() — that needs
// doctrine/dbal, which isn't installed here.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('googleId')->nullable()->unique()->after('email');
        });
        DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('googleId');
        });
        DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL');
    }
};
