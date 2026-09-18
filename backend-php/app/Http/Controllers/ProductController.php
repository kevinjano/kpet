<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Support\CsvWriter;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function findAll()
    {
        return response()->json(Product::all());
    }

    public function show($id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        return response()->json($product);
    }

    public function create(Request $request)
    {
        $data = $request->all();
        $product = Product::create($this->scalarFields($data, true));
        $product->syncImageUrls($data['imageUrls'] ?? []);
        $product->refresh();
        return response()->json($product, 201, ['Location' => "/api/products/{$product->id}"]);
    }

    public function update(Request $request, $id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $data = $request->all();
        $product->fill($this->scalarFields($data, false));
        $product->save();
        $product->syncImageUrls($data['imageUrls'] ?? []);
        $product->refresh();
        return response()->json($product);
    }

    private function scalarFields(array $data, bool $isCreate): array
    {
        $fields = array_intersect_key($data, array_flip([
            'name', 'description', 'price', 'salePrice', 'onSale', 'category', 'stock', 'imageUrl', 'active',
        ]));
        if ($isCreate && !array_key_exists('active', $fields)) {
            $fields['active'] = true;
        }
        return $fields;
    }

    public function destroy($id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $product->delete();
        return response()->noContent();
    }

    private const EXPORT_HEADERS = ['id', 'name', 'description', 'price', 'salePrice', 'onSale', 'category', 'stock', 'active'];

    public function export()
    {
        $csv = CsvWriter::row(self::EXPORT_HEADERS) . "\n";
        foreach (Product::orderBy('id')->cursor() as $p) {
            $csv .= CsvWriter::row([
                $p->id, $p->name, $p->description, $p->price,
                $p->salePrice === null ? '' : $p->salePrice,
                $p->onSale ? 'true' : 'false',
                $p->category, $p->stock, $p->active ? 'true' : 'false',
            ]) . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="productos-kpet.csv"',
        ]);
    }

    public function import(Request $request)
    {
        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No se envió ningún archivo.'], 400);
        }

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);
            return response()->json(['created' => 0, 'updated' => 0, 'errors' => []]);
        }

        $created = 0;
        $updated = 0;
        $errors = [];
        $rowNum = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            if (count($row) === 1 && trim($row[0]) === '') {
                continue;
            }
            try {
                $cols = [];
                foreach ($headers as $i => $header) {
                    $cols[trim($header)] = $row[$i] ?? null;
                }

                $id = $cols['id'] ?? null;
                $existing = ($id !== null && trim((string) $id) !== '') ? Product::find(trim($id)) : null;

                $product = $existing ?? new Product(['active' => true]);

                if (array_key_exists('name', $cols)) $product->name = $cols['name'];
                if (array_key_exists('description', $cols)) $product->description = $cols['description'];
                if (array_key_exists('category', $cols)) $product->category = $cols['category'];
                if (array_key_exists('price', $cols) && trim((string) $cols['price']) !== '') {
                    $product->price = (float) $cols['price'];
                }
                if (array_key_exists('salePrice', $cols)) {
                    $product->salePrice = trim((string) $cols['salePrice']) === '' ? null : (float) $cols['salePrice'];
                }
                if (array_key_exists('onSale', $cols) && $cols['onSale'] !== null && trim((string) $cols['onSale']) !== '') {
                    $product->onSale = strtolower(trim($cols['onSale'])) === 'true';
                }
                if (array_key_exists('active', $cols) && $cols['active'] !== null && trim((string) $cols['active']) !== '') {
                    $product->active = strtolower(trim($cols['active'])) === 'true';
                }
                if (array_key_exists('stock', $cols) && trim((string) $cols['stock']) !== '') {
                    $product->stock = (int) $cols['stock'];
                }

                $product->save();
                $existing ? $updated++ : $created++;
            } catch (\Throwable $e) {
                $errors[] = "Fila {$rowNum}: {$e->getMessage()}";
            }
        }

        fclose($handle);

        return response()->json(['created' => $created, 'updated' => $updated, 'errors' => $errors]);
    }
}
