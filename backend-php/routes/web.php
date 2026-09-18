<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Uploaded images are physically under public/uploads/, so php artisan
// serve's / a real web server's static-file fallback WOULD serve them
// directly — but that bypasses Laravel entirely, so no CORS header ever
// gets attached, and Chrome's cross-origin-read-blocking (ORB) then refuses
// the image when the frontend and backend are on different origins (e.g.
// local dev: 4200 vs 8091). Explicitly routing this through Laravel
// (mirrors the old WebConfig resource handler, including its 1-year
// immutable cache header — safe since every filename is a random UUID)
// keeps images working regardless of whether frontend/backend end up on
// the same origin in production or not.
Route::get('/uploads/{filename}', function (string $filename) {
    if (!preg_match('/^[a-zA-Z0-9\-]+\.(jpg|jpeg|png|webp|gif)$/', $filename)) {
        abort(404);
    }
    $path = public_path('uploads/' . $filename);
    if (!is_file($path)) {
        abort(404);
    }
    return response()->file($path, [
        'Cache-Control' => 'public, max-age=31536000, immutable',
    ]);
})->middleware(\Illuminate\Http\Middleware\HandleCors::class);
