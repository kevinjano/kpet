<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    // Same public/admin split as blog: visitors only see published
    // questions, the admin panel (reusing this same endpoint) sees
    // everything so it can prep a question before publishing it.
    public function findAll(Request $request)
    {
        $role = $request->attributes->get('authRole');
        $query = Faq::query();
        if (strtolower((string) $role) !== 'admin') {
            $query->where('published', true);
        }
        return response()->json($query->orderBy('position')->get());
    }

    public function show($id)
    {
        $faq = Faq::find($id);
        if (!$faq) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        return response()->json($faq);
    }

    public function create(Request $request)
    {
        $data = $request->only(['question', 'answer', 'published']);
        $data['createdAt'] = now();
        // New questions land at the end of the list by default — admins
        // reorder afterward with the up/down buttons if they want it
        // somewhere else.
        $data['position'] = (int) (Faq::max('position') ?? 0) + 1;
        $faq = Faq::create($data);
        return response()->json($faq, 201, ['Location' => "/api/faq/{$faq->id}"]);
    }

    public function update(Request $request, $id)
    {
        $faq = Faq::find($id);
        if (!$faq) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $faq->fill($request->only(['question', 'answer', 'published']));
        $faq->save();
        return response()->json($faq);
    }

    public function destroy($id)
    {
        $faq = Faq::find($id);
        if (!$faq) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $faq->delete();
        return response()->noContent();
    }

    // Swaps this question's position with its neighbor — one click moves it
    // one slot up/down in the public list, matching a simple admin mental
    // model instead of exposing raw position numbers to edit by hand.
    public function reorder(Request $request, $id)
    {
        $faq = Faq::find($id);
        if (!$faq) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        $direction = $request->input('direction');
        $neighbor = $direction === 'up'
            ? Faq::where('position', '<', $faq->position)->orderByDesc('position')->first()
            : Faq::where('position', '>', $faq->position)->orderBy('position')->first();

        if (!$neighbor) {
            return response()->json($faq);
        }

        [$faq->position, $neighbor->position] = [$neighbor->position, $faq->position];
        $faq->save();
        $neighbor->save();

        return response()->json($faq);
    }
}
