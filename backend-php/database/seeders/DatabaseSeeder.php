<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\SiteSettings;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

// Mirrors DemoDataSeeder — idempotent (safe to run again), only fills in
// what's missing. Not run against the live kpet DB (already has real data);
// this is for setting up a fresh/staging database.
//
// SECURITY: admin123/cliente123 are public (in source control) — delete
// these accounts or change their passwords before a real production launch.
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (!User::where('email', 'admin@kpet.com')->exists()) {
            User::create([
                'firstName' => 'Admin', 'lastName' => 'Kpet', 'email' => 'admin@kpet.com',
                'noTel' => '514-000-0000', 'password' => Hash::make('admin123'), 'role' => User::ROLE_ADMIN,
            ]);
        }

        if (!User::where('email', 'cliente@kpet.com')->exists()) {
            User::create([
                'firstName' => 'Juan', 'lastName' => 'Perez', 'email' => 'cliente@kpet.com',
                'noTel' => '514-111-1111', 'password' => Hash::make('cliente123'), 'role' => User::ROLE_CLIENT,
            ]);
        }

        if (!SiteSettings::find(1)) {
            SiteSettings::create([
                'id' => 1, 'storeName' => 'Kpet', 'logoUrl' => '/assets/images/kpet-logo.png',
                'whatsappNumber' => '15145551234',
            ]);
        }

        if (Product::count() === 0) {
            $demo = [
                ['name' => 'Alimento Perro Adulto 15kg', 'price' => 45, 'salePrice' => null, 'onSale' => false, 'category' => 'Perros', 'stock' => 20],
                ['name' => 'Alimento Gato Adulto 10kg', 'price' => 38, 'salePrice' => null, 'onSale' => false, 'category' => 'Gatos', 'stock' => 15],
                ['name' => 'Snacks Dentales para Perros', 'price' => 8.5, 'salePrice' => 6.5, 'onSale' => true, 'category' => 'Perros', 'stock' => 40],
                ['name' => 'Arena Sanitaria Aglomerante 10kg', 'price' => 18, 'salePrice' => null, 'onSale' => false, 'category' => 'Novedades', 'stock' => 25],
                ['name' => 'Cama Acolchada para Mascotas', 'price' => 25, 'salePrice' => 19.9, 'onSale' => true, 'category' => 'Novedades', 'stock' => 10],
            ];
            foreach ($demo as $p) {
                Product::create($p + ['description' => null, 'imageUrl' => null, 'active' => true]);
            }
        }
    }
}
