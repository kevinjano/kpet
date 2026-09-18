<?php

namespace App\Models;

use App\Models\Concerns\NaiveDates;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    use NaiveDates;

    public $timestamps = false;

    protected $fillable = ['total', 'status', 'receiptSent', 'createdAt', 'userId'];

    protected $casts = [
        'receiptSent' => 'boolean',
        'total' => 'float',
        'userId' => 'integer',
        'createdAt' => 'datetime',
    ];

    protected $appends = ['items'];

    const PENDING_CONFIRMATION = 'PENDING_CONFIRMATION';
    const CONFIRMED = 'CONFIRMED';
    const COMPLETED = 'COMPLETED';
    const CANCELLED = 'CANCELLED';

    public function getItemsAttribute(): array
    {
        if (!$this->exists) {
            return [];
        }
        return DB::table('order_items')->where('order_id', $this->id)
            ->select('productId', 'productName', 'quantity', 'unitPrice')
            ->get()
            ->map(fn ($row) => [
                'productId' => $row->productId,
                'productName' => $row->productName,
                'quantity' => $row->quantity,
                'unitPrice' => $row->unitPrice,
            ])
            ->all();
    }

    // Order items are a frozen snapshot written once at checkout — nothing
    // ever updates them in place, so this is only ever called right after
    // the parent Order row is first created.
    public function syncItems(array $items): void
    {
        DB::table('order_items')->where('order_id', $this->id)->delete();
        $rows = array_map(fn ($item) => [
            'order_id' => $this->id,
            'productId' => $item['productId'] ?? null,
            'productName' => $item['productName'] ?? null,
            'quantity' => $item['quantity'] ?? null,
            'unitPrice' => $item['unitPrice'] ?? null,
        ], $items);
        if ($rows) {
            DB::table('order_items')->insert($rows);
        }
    }
}
