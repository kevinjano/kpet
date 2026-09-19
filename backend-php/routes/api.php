<?php

use App\Http\Controllers\BlogPostController;
use App\Http\Controllers\DistributorController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SiteSettingsController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Route order/grouping mirrors SecurityConfig's rule precedence in the old
// Spring Boot backend as closely as Laravel's routing allows — see the
// migration catalog for the exact original rule table. "role:Admin,Client"
// stands in for a plain "must be authenticated" check since those are the
// only two roles that exist.

// ---------- Users ----------
Route::post('/users/create', [UserController::class, 'create']);
Route::post('/users/login', [UserController::class, 'login']);
Route::get('/users/findAll', [UserController::class, 'findAll'])->middleware('role:Admin');
Route::get('/users/{id}', [UserController::class, 'show'])->middleware('role:Admin,Client');
Route::put('/users/update/{id}', [UserController::class, 'update'])->middleware('role:Admin,Client');
Route::put('/users/{id}/password', [UserController::class, 'updatePassword'])->middleware('role:Admin,Client');
Route::delete('/users/delete/{id}', [UserController::class, 'destroy'])->middleware('role:Admin,Client');

// ---------- Products ----------
Route::get('/products/export', [ProductController::class, 'export'])->middleware('role:Admin');
Route::get('/products/findAll', [ProductController::class, 'findAll']);
Route::get('/products/{id}', [ProductController::class, 'show'])->where('id', '[0-9]+');
Route::post('/products/create', [ProductController::class, 'create'])->middleware('role:Admin');
Route::post('/products/import', [ProductController::class, 'import'])->middleware('role:Admin');
Route::put('/products/update/{id}', [ProductController::class, 'update'])->middleware('role:Admin');
Route::delete('/products/delete/{id}', [ProductController::class, 'destroy'])->middleware('role:Admin');

// ---------- Orders ----------
Route::get('/orders/findAll', [OrderController::class, 'findAll'])->middleware('role:Admin');
Route::get('/orders/export', [OrderController::class, 'export'])->middleware('role:Admin');
Route::get('/orders/mine', [OrderController::class, 'mine'])->middleware('role:Admin,Client');
Route::get('/orders/{id}', [OrderController::class, 'show'])->middleware('role:Admin')->where('id', '[0-9]+');
Route::post('/orders/create', [OrderController::class, 'create']);
Route::put('/orders/{id}/receipt-sent', [OrderController::class, 'markReceiptSent']);
Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus'])->middleware('role:Admin');

// ---------- Favorites ----------
Route::get('/favorites/mine', [FavoriteController::class, 'mine'])->middleware('role:Admin,Client');
Route::post('/favorites/add/{productId}', [FavoriteController::class, 'add'])->middleware('role:Admin,Client');
Route::post('/favorites/remove/{productId}', [FavoriteController::class, 'remove'])->middleware('role:Admin,Client');

// ---------- Reviews ----------
Route::get('/reviews/product/{productId}', [ReviewController::class, 'byProduct']);
Route::get('/reviews/summary', [ReviewController::class, 'summary']);
Route::post('/reviews', [ReviewController::class, 'store'])->middleware('role:Admin,Client');
Route::post('/reviews/remove/{id}', [ReviewController::class, 'destroy'])->middleware('role:Admin,Client');

// ---------- Distributors ----------
Route::get('/distributors/findAll', [DistributorController::class, 'findAll']);
Route::get('/distributors/{id}', [DistributorController::class, 'show']);
Route::post('/distributors/create', [DistributorController::class, 'create'])->middleware('role:Admin');
Route::put('/distributors/update/{id}', [DistributorController::class, 'update'])->middleware('role:Admin');
Route::delete('/distributors/delete/{id}', [DistributorController::class, 'destroy'])->middleware('role:Admin');

// ---------- Blog ----------
Route::get('/blog/findAll', [BlogPostController::class, 'findAll']);
Route::get('/blog/{id}', [BlogPostController::class, 'show']);
Route::post('/blog/create', [BlogPostController::class, 'create'])->middleware('role:Admin');
Route::put('/blog/update/{id}', [BlogPostController::class, 'update'])->middleware('role:Admin');
Route::delete('/blog/delete/{id}', [BlogPostController::class, 'destroy'])->middleware('role:Admin');

// ---------- FAQ ----------
Route::get('/faq/findAll', [FaqController::class, 'findAll']);
Route::get('/faq/{id}', [FaqController::class, 'show']);
Route::post('/faq/create', [FaqController::class, 'create'])->middleware('role:Admin');
Route::put('/faq/update/{id}', [FaqController::class, 'update'])->middleware('role:Admin');
Route::put('/faq/{id}/reorder', [FaqController::class, 'reorder'])->middleware('role:Admin');
Route::delete('/faq/delete/{id}', [FaqController::class, 'destroy'])->middleware('role:Admin');

// ---------- Settings ----------
Route::get('/settings', [SiteSettingsController::class, 'show']);
Route::put('/settings/update', [SiteSettingsController::class, 'update'])->middleware('role:Admin');

// ---------- Uploads ----------
Route::post('/upload', [UploadController::class, 'upload'])->middleware('role:Admin');
