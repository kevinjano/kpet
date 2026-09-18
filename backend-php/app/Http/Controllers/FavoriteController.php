<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function mine(Request $request)
    {
        $userId = $request->attributes->get('authUserId');
        $productIds = Favorite::where('userId', $userId)->pluck('productId');
        return response()->json(Product::whereIn('id', $productIds)->get());
    }

    // Idempotent add — no duplicate error, no toggle-off, purely additive.
    public function add(Request $request, $productId)
    {
        $userId = $request->attributes->get('authUserId');
        $exists = Favorite::where('userId', $userId)->where('productId', $productId)->exists();
        if (!$exists) {
            Favorite::create(['userId' => $userId, 'productId' => $productId, 'createdAt' => now()]);
        }
        return response()->noContent();
    }

    public function remove(Request $request, $productId)
    {
        $userId = $request->attributes->get('authUserId');
        Favorite::where('userId', $userId)->where('productId', $productId)->delete();
        return response()->noContent();
    }
}
