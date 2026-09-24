<?php

namespace App\Http\Controllers;

use App\Models\Distributor;
use App\Support\CsvWriter;
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

    // A shipment (or a manual correction — quantity may be negative) to this
    // distributor. Folds into their running stock and appends to the
    // permanent history below, so re-stocking after a confirmed sale no
    // longer requires re-editing the distributor's whole product list.
    public function recordStockMovement(Request $request, $id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $productId = (int) $request->input('productId');
        $quantity = (int) $request->input('quantity');
        if (!$productId || $quantity === 0) {
            return response()->json(['error' => 'Producto y cantidad son obligatorios.'], 400);
        }
        if (!\App\Models\Product::where('id', $productId)->exists()) {
            return response()->json(['error' => 'El producto seleccionado no existe.'], 400);
        }

        $distributor->recordStockMovement($productId, $quantity);
        $distributor->refresh();
        return response()->json($distributor);
    }

    public function stockHistory($id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $movements = $distributor->stockMovements()->with('product')->orderByDesc('createdAt')->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'quantity' => $m->quantity,
                'createdAt' => $m->createdAt,
                'product' => $m->product,
            ]);
        return response()->json($movements);
    }

    private const STOCK_HISTORY_HEADERS = ['Fecha', 'Producto', 'Cantidad'];

    public function exportStockHistory($id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        $csv = "\u{FEFF}" . CsvWriter::row(self::STOCK_HISTORY_HEADERS, ';') . "\n";
        foreach ($distributor->stockMovements()->with('product')->orderBy('createdAt')->cursor() as $m) {
            $csv .= CsvWriter::row([
                $m->createdAt?->format('d/m/Y H:i'),
                $m->product->name ?? "Producto #{$m->product_id}",
                $m->quantity,
            ], ';') . "\n";
        }

        $filename = 'historial-stock-' . str($distributor->name)->slug() . '.csv';
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function destroy($id)
    {
        $distributor = Distributor::find($id);
        if (!$distributor) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        // The production DB's FK on distributor_product_items.distributor_id
        // (inherited from the old Hibernate schema) doesn't cascade, so the
        // child rows must be deleted explicitly first — same as
        // syncProductQuantities() already does on update.
        $distributor->items()->delete();
        $distributor->delete();
        return response()->noContent();
    }
}
