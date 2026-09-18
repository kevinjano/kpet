<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'name', 'description', 'price', 'salePrice', 'onSale',
        'category', 'stock', 'imageUrl', 'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'onSale' => 'boolean',
        'price' => 'float',
        'salePrice' => 'float',
        'stock' => 'integer',
    ];

    // product_images has no order column (no @OrderColumn on the old
    // Hibernate @ElementCollection either) — order isn't guaranteed here,
    // same as before.
    protected $appends = ['imageUrls'];

    public function getImageUrlsAttribute(): array
    {
        if (!$this->exists) {
            return [];
        }
        return DB::table('product_images')->where('product_id', $this->id)->pluck('image_url')->all();
    }

    // Full-replace semantics — matches ProductServiceImpl.updateProduct,
    // which reassigns the whole Hibernate-managed collection on every save.
    public function syncImageUrls(array $urls): void
    {
        DB::table('product_images')->where('product_id', $this->id)->delete();
        $rows = array_map(fn ($url) => ['product_id' => $this->id, 'image_url' => $url], $urls);
        if ($rows) {
            DB::table('product_images')->insert($rows);
        }
    }

    // Atomic UPDATE (not read-then-write) so two orders confirming the same
    // product at once can't lose an update — floors at 0 instead of going
    // negative if oversold, mirroring ProductRepository.deductStock's CASE.
    public static function deductStock(int $productId, int $quantity): void
    {
        DB::update(
            'UPDATE products SET stock = CASE WHEN stock >= ? THEN stock - ? ELSE 0 END WHERE id = ?',
            [$quantity, $quantity, $productId]
        );
    }

    public static function restockProduct(int $productId, int $quantity): void
    {
        DB::update('UPDATE products SET stock = stock + ? WHERE id = ?', [$quantity, $productId]);
    }
}
