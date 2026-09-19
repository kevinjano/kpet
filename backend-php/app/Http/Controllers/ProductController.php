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

    // Spanish, semicolon-delimited, one value per cell — same reasoning as
    // the orders export: Excel under a Spanish locale uses ',' as the
    // decimal separator, so it treats ';' as the list separator, not ','.
    // A comma-delimited file there dumps every value into column A instead
    // of splitting it into cells. Header/boolean text stays understandable
    // in Spanish; import() below accepts both this and the old
    // English/comma shape so older exported files still round-trip.
    private const EXPORT_HEADERS = ['ID', 'Nombre', 'Descripción', 'Precio (Bs.)', 'Precio de oferta (Bs.)', 'En oferta', 'Categoría', 'Stock', 'Activo'];

    public function export()
    {
        $csv = "\u{FEFF}" . CsvWriter::row(self::EXPORT_HEADERS, ';') . "\n";
        foreach (Product::orderBy('id')->cursor() as $p) {
            $csv .= CsvWriter::row([
                $p->id, $p->name, $p->description,
                number_format($p->price, 2, '.', ''),
                $p->salePrice === null ? '' : number_format($p->salePrice, 2, '.', ''),
                $p->onSale ? 'Sí' : 'No',
                $p->category, $p->stock, $p->active ? 'Sí' : 'No',
            ], ';') . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="productos-kpet.csv"',
        ]);
    }

    // Spanish header (current export) → internal field name; also accepts
    // the old English headers so a file exported before this change still
    // imports correctly.
    private const IMPORT_HEADER_MAP = [
        'id' => 'id',
        'nombre' => 'name', 'name' => 'name',
        'descripción' => 'description', 'descripcion' => 'description', 'description' => 'description',
        'precio (bs.)' => 'price', 'precio' => 'price', 'price' => 'price',
        'precio de oferta (bs.)' => 'salePrice', 'precio de oferta' => 'salePrice', 'saleprice' => 'salePrice',
        'en oferta' => 'onSale', 'onsale' => 'onSale',
        'categoría' => 'category', 'categoria' => 'category', 'category' => 'category',
        'stock' => 'stock',
        'activo' => 'active', 'active' => 'active',
    ];

    private static function parseBoolCell(string $value): bool
    {
        $value = strtolower(trim($value));
        return $value === 'true' || $value === 'sí' || $value === 'si';
    }

    public function import(Request $request)
    {
        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No se envió ningún archivo.'], 400);
        }

        $raw = file_get_contents($request->file('file')->getRealPath());
        $raw = preg_replace('/^\x{FEFF}/u', '', $raw); // strip UTF-8 BOM if present
        $firstLine = strtok($raw, "\n") ?: '';
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';

        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $raw);
        rewind($handle);

        $rawHeaders = fgetcsv($handle, 0, $delimiter);
        if ($rawHeaders === false) {
            fclose($handle);
            return response()->json(['created' => 0, 'updated' => 0, 'errors' => []]);
        }
        // Map each column to its internal field name (id/name/price/...),
        // recognizing either the current Spanish headers or the older
        // English ones — unrecognized columns are simply ignored.
        $fieldByIndex = array_map(
            fn ($h) => self::IMPORT_HEADER_MAP[strtolower(trim($h))] ?? null,
            $rawHeaders
        );

        $created = 0;
        $updated = 0;
        $errors = [];
        $rowNum = 1;

        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            $rowNum++;
            if (count($row) === 1 && trim($row[0]) === '') {
                continue;
            }
            try {
                $cols = [];
                foreach ($fieldByIndex as $i => $field) {
                    if ($field !== null) {
                        $cols[$field] = $row[$i] ?? null;
                    }
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
                    $product->onSale = self::parseBoolCell($cols['onSale']);
                }
                if (array_key_exists('active', $cols) && $cols['active'] !== null && trim((string) $cols['active']) !== '') {
                    $product->active = self::parseBoolCell($cols['active']);
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
