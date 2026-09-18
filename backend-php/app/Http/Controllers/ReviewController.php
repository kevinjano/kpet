<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    public function byProduct($productId)
    {
        return response()->json(
            Review::where('productId', $productId)->orderByDesc('createdAt')->get()
        );
    }

    // Grouped in SQL (not loaded into PHP and grouped in memory) — same
    // output shape as the old RatingSummary: only products with >=1 review.
    public function summary()
    {
        $rows = DB::table('reviews')
            ->select('productId', DB::raw('AVG(rating) as average'), DB::raw('COUNT(*) as count'))
            ->groupBy('productId')
            ->get()
            ->map(fn ($r) => [
                'productId' => $r->productId,
                'average' => (float) $r->average,
                'count' => (int) $r->count,
            ]);

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $rating = (int) ($data['rating'] ?? 0);
        if ($rating < 1 || $rating > 5) {
            return response()->json(['error' => 'La calificación debe ser entre 1 y 5.'], 400);
        }

        $userId = $request->attributes->get('authUserId');
        $productId = $data['productId'] ?? null;

        $duplicate = Review::where('productId', $productId)->where('userId', $userId)->exists();
        if ($duplicate) {
            return response()->json(['error' => 'Ya dejaste una reseña para este producto.'], 400);
        }

        $user = User::find($userId);
        $userName = $user ? trim($user->firstName . ' ' . $user->lastName) : 'Cliente Kpet';

        $review = Review::create([
            'productId' => $productId,
            'userId' => $userId,
            'userName' => $userName,
            'rating' => $rating,
            'comment' => $data['comment'] ?? null,
            'createdAt' => now(),
        ]);

        return response()->json($review);
    }

    public function destroy(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        $role = $request->attributes->get('authRole');
        $authUserId = $request->attributes->get('authUserId');
        $isSelfOrAdmin = strtolower((string) $role) === 'admin' || (string) $authUserId === (string) $review->userId;
        if (!$isSelfOrAdmin) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $review->delete();
        return response()->noContent();
    }
}
