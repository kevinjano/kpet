<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DistributorProductItem extends Model
{
    public $timestamps = false;
    protected $table = 'distributor_product_items';

    protected $fillable = ['distributor_id', 'product_id', 'quantity'];

    protected $casts = ['quantity' => 'integer'];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
