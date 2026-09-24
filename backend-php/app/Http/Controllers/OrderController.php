<?php

namespace App\Http\Controllers;

use App\Models\DiscountLead;
use App\Models\Order;
use App\Models\Product;
use App\Support\CsvWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function findAll()
    {
        return response()->json(Order::orderByDesc('createdAt')->get());
    }

    private const STATUS_LABELS_ES = [
        Order::PENDING_CONFIRMATION => 'Pendiente a confirmar',
        Order::CONFIRMED => 'Confirmado',
        Order::COMPLETED => 'Finalizado',
        Order::CANCELLED => 'Cancelado',
    ];

    public function export()
    {
        $start = Carbon::now()->startOfMonth();
        $end = Carbon::now()->endOfMonth();
        $monthLabel = $start->format('Y-m');

        $orders = Order::whereBetween('createdAt', [$start, $end])->orderBy('createdAt')->get();

        $headers = ['N° de pedido', 'Fecha', 'Estado', 'Producto', 'Cantidad',
            'Precio unitario (Bs.)', 'Subtotal (Bs.)', 'Total del pedido (Bs.)', 'Comprobante enviado'];

        $csv = "\u{FEFF}" . CsvWriter::row($headers, ';') . "\n";

        foreach ($orders as $o) {
            $fecha = Carbon::parse($o->createdAt)->format('d/m/Y H:i');
            $estado = self::STATUS_LABELS_ES[$o->status] ?? $o->status;
            $comprobante = $o->receiptSent ? 'Sí' : 'No';
            $total = number_format($o->total, 2, '.', '');

            $items = $o->items;
            if (empty($items)) {
                $csv .= CsvWriter::row([$o->id, $fecha, $estado, '', '', '', '', $total, $comprobante], ';') . "\n";
                continue;
            }

            foreach ($items as $item) {
                $unitPrice = $item['unitPrice'] ?? 0;
                $quantity = $item['quantity'] ?? 0;
                $csv .= CsvWriter::row([
                    $o->id, $fecha, $estado, $item['productName'],
                    $quantity, number_format($unitPrice, 2, '.', ''),
                    number_format($unitPrice * $quantity, 2, '.', ''),
                    $total, $comprobante,
                ], ';') . "\n";
            }
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"pedidos-{$monthLabel}.csv\"",
        ]);
    }

    public function show($id)
    {
        $order = Order::find($id);
        if (!$order) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        return response()->json($order);
    }

    public function mine(Request $request)
    {
        $userId = $request->attributes->get('authUserId');
        return response()->json(Order::where('userId', $userId)->orderByDesc('createdAt')->get());
    }

    public function create(Request $request)
    {
        $data = $request->all();
        $items = $data['items'] ?? [];

        // Re-validated against live DB stock — never trusts the frontend
        // cart's cached snapshot, matching OrderServiceImpl.createOrder.
        foreach ($items as $item) {
            $productId = $item['productId'] ?? null;
            $quantity = $item['quantity'] ?? null;
            if ($productId === null || $quantity === null) {
                continue;
            }
            $product = Product::find($productId);
            if ($product && $product->stock !== null && $quantity > $product->stock) {
                return response()->json([
                    'error' => "No hay suficiente stock de \"{$product->name}\" (disponible: {$product->stock}).",
                ], 400);
            }
        }

        $userId = $request->attributes->get('authUserId');

        // The welcome-discount lead is only ever redeemed here — validated
        // server-side (not just trusted from the frontend) so a stale or
        // already-used id can't be replayed onto a second order.
        $discountPercent = null;
        $lead = null;
        $discountLeadId = $data['discountLeadId'] ?? null;
        if ($discountLeadId !== null) {
            $lead = DiscountLead::whereNull('redeemedAt')->find($discountLeadId);
            if ($lead) {
                $discountPercent = $lead->discountPercent;
            }
        }

        $order = Order::create([
            'total' => $data['total'] ?? 0,
            'status' => Order::PENDING_CONFIRMATION,
            'receiptSent' => false,
            'createdAt' => now(),
            'userId' => $userId, // never trusted from the request body
            'discountPercent' => $discountPercent,
        ]);
        $order->syncItems($items);

        if ($lead) {
            $lead->redeemedAt = now();
            $lead->orderId = $order->id;
            $lead->save();
        }

        $order->refresh();

        return response()->json($order, 201, ['Location' => "/api/orders/{$order->id}"]);
    }

    public function markReceiptSent($id)
    {
        $order = Order::find($id);
        if (!$order) {
            return response()->json(['error' => 'No encontrado'], 404);
        }
        $order->receiptSent = true;
        $order->save();
        return response()->json($order);
    }

    public function updateStatus(Request $request, $id)
    {
        $order = Order::find($id);
        if (!$order) {
            return response()->json(['error' => 'No encontrado'], 404);
        }

        $newStatus = $request->input('status');
        $oldStatus = $order->status;

        DB::transaction(function () use ($order, $oldStatus, $newStatus) {
            if ($oldStatus === Order::PENDING_CONFIRMATION && $newStatus === Order::CONFIRMED) {
                $this->deductStock($order->items);
            } elseif ($oldStatus === Order::CONFIRMED && $newStatus === Order::CANCELLED) {
                $this->restockItems($order->items);
            }
            $order->status = $newStatus;
            $order->save();
        });

        $order->refresh();
        return response()->json($order);
    }

    private function deductStock(array $items): void
    {
        foreach ($items as $item) {
            if (($item['productId'] ?? null) !== null && ($item['quantity'] ?? null) !== null) {
                Product::deductStock($item['productId'], $item['quantity']);
            }
        }
    }

    private function restockItems(array $items): void
    {
        foreach ($items as $item) {
            if (($item['productId'] ?? null) !== null && ($item['quantity'] ?? null) !== null) {
                Product::restockProduct($item['productId'], $item['quantity']);
            }
        }
    }
}
