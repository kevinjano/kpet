<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use Illuminate\Http\Request;

class BlogPostController extends Controller
{
    // Public visitors only get published posts (the old backend leaked
    // drafts to anyone who called this endpoint — fixed here). The admin
    // panel reuses this same endpoint to manage drafts, so when the caller
    // is authenticated as Admin (JwtAuthenticate already parsed the token
    // even though this route itself is public), unpublished posts stay
    // visible to them.
    public function findAll(Request $request)
    {
        $role = $request->attributes->get('authRole');
        $query = BlogPost::query();
        if (strtolower((string) $role) !== 'admin') {
            $query->where('published', true);
        }
        return response()->json($query->orderByDesc('createdAt')->get());
    }

    public function show($id)
    {
        $post = BlogPost::find($id);
        if (!$post) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        return response()->json($post);
    }

    public function create(Request $request)
    {
        $data = $request->only(['title', 'content', 'imageUrl', 'videoUrl', 'externalUrl', 'eventDate', 'published']);
        $data['createdAt'] = now();
        $post = BlogPost::create($data);
        return response()->json($post, 201, ['Location' => "/api/blog/{$post->id}"]);
    }

    public function update(Request $request, $id)
    {
        $post = BlogPost::find($id);
        if (!$post) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $post->fill($request->only(['title', 'content', 'imageUrl', 'videoUrl', 'externalUrl', 'eventDate', 'published']));
        $post->save();
        return response()->json($post);
    }

    public function destroy($id)
    {
        $post = BlogPost::find($id);
        if (!$post) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $post->delete();
        return response()->noContent();
    }
}
