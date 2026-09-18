<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Distributor extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'name', 'city', 'address', 'description', 'phone',
        'whatsappNumber', 'imageUrl', 'mapUrl', 'active',
    ];

    protected $casts = ['active' => 'boolean'];

    protected $appends = ['distributorProducts'];

    public function items()
    {
        return $this->hasMany(DistributorProductItem::class, 'distributor_id');
    }

    // Shape matches the old DistributorProduct entity as the frontend already
    // consumes it: {id, quantity, product: {...full Product...}}.
    public function getDistributorProductsAttribute(): array
    {
        if (!$this->exists) {
            return [];
        }
        return $this->items()->with('product')->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'product' => $item->product,
            ])
            ->all();
    }

    // productQuantities is the write-only {productId, quantity}[] input shape
    // the frontend sends on create/update — resolved into real
    // DistributorProductItem rows referencing existing Products.
    public function syncProductQuantities(array $productQuantities): void
    {
        $this->items()->delete();
        foreach ($productQuantities as $pq) {
            $product = Product::find($pq['productId']);
            if (!$product) {
                throw new \InvalidArgumentException("El producto con id {$pq['productId']} ya no existe.");
            }
            $this->items()->create(['product_id' => $product->id, 'quantity' => $pq['quantity'] ?? 0]);
        }
    }
}
