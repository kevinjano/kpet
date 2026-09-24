<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DistributorStockMovement extends Model
{
    public $timestamps = false;

    protected $fillable = ['distributor_id', 'product_id', 'quantity', 'createdAt'];

    protected $casts = ['quantity' => 'integer', 'createdAt' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
