<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Optional Instagram/TikTok link — when set, the storefront sends visitors
// straight to that post instead of opening the in-site detail view.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('externalUrl')->nullable()->after('videoUrl');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropColumn('externalUrl');
        });
    }
};
