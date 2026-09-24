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

    public function stockMovements()
    {
        return $this->hasMany(DistributorStockMovement::class, 'distributor_id');
    }

    // Records one shipment/correction ("tal fecha se le envió tanta
    // cantidad") and folds it into the distributor's running quantity for
    // that product — negative quantities allowed, for corrections. Floors
    // the running total at 0 rather than letting it go negative.
    public function recordStockMovement(int $productId, int $quantity): void
    {
        $this->stockMovements()->create([
            'product_id' => $productId,
            'quantity' => $quantity,
            'createdAt' => now(),
        ]);

        $item = $this->items()->where('product_id', $productId)->first();
        if ($item) {
            $item->quantity = max(0, $item->quantity + $quantity);
            $item->save();
        } elseif ($quantity > 0) {
            $this->items()->create(['product_id' => $productId, 'quantity' => $quantity]);
        }
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
