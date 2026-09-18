<?php

namespace App\Http\Controllers;

use App\Models\Distributor;
use Illuminate\Http\Request;

class DistributorController extends Controller
{
    public function findAll()
    {
        return response()->json(Distributor::all());
    }

    public function show($id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        return response()->json($distributor);
    }

    public function create(Request $request)
    {
        $data = $request->all();
        $distributor = Distributor::create($this->scalarFields($data, true));
        $distributor->syncProductQuantities($data['productQuantities'] ?? []);
        $distributor->refresh();
        return response()->json($distributor, 201, ['Location' => "/api/distributors/{$distributor->id}"]);
    }

    public function update(Request $request, $id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $data = $request->all();
        $distributor->fill($this->scalarFields($data, false));
        $distributor->save();
        if (array_key_exists('productQuantities', $data) && $data['productQuantities'] !== null) {
            $distributor->syncProductQuantities($data['productQuantities']);
        }
        $distributor->refresh();
        return response()->json($distributor);
    }

    private function scalarFields(array $data, bool $isCreate): array
    {
        $fields = array_intersect_key($data, array_flip([
            'name', 'city', 'address', 'description', 'phone', 'whatsappNumber', 'imageUrl', 'mapUrl', 'active',
        ]));
        if ($isCreate && !array_key_exists('active', $fields)) {
            $fields['active'] = true;
        }
        return $fields;
    }

    public function destroy($id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $distributor->delete();
        return response()->noContent();
    }
}
