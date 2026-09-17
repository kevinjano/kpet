package org.kpet.petshop.Controllers;

import jakarta.persistence.EntityNotFoundException;
import org.kpet.petshop.Models.Order;
import org.kpet.petshop.Models.OrderItem;
import org.kpet.petshop.Repositories.OrderRepository;
import org.kpet.petshop.Services.OrderService;
import org.kpet.petshop.Util.CsvWriter;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * REST surface for the order workflow. createOrder() is called right after the
 * WhatsApp message is sent from the cart (see CartComponent.checkoutOnWhatsapp) —
 * it's fire-and-forget from the frontend's perspective: a failure here doesn't
 * block the sale since the WhatsApp message already went out.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;

    public OrderController(OrderService orderService, OrderRepository orderRepository) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    // Admin only (see SecurityConfig). Pinned to GET specifically: a bare
    // @RequestMapping here would also answer POST/PUT/DELETE, which
    // SecurityConfig only locks to ADMIN for GET on this path.
    @GetMapping(value = "/findAll", produces = "application/json")
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    private static final List<String> ORDER_CSV_HEADERS = List.of(
            "N° de pedido", "Fecha", "Estado", "Producto", "Cantidad",
            "Precio unitario (Bs.)", "Subtotal (Bs.)", "Total del pedido (Bs.)", "Comprobante enviado");

    private static final Map<String, String> STATUS_LABELS_ES = Map.of(
            Order.PENDING_CONFIRMATION, "Pendiente a confirmar",
            Order.CONFIRMED, "Confirmado",
            Order.COMPLETED, "Finalizado",
            Order.CANCELLED, "Cancelado"
    );

    // Admin only (see SecurityConfig — "/export" is a single path segment
    // under /api/orders/**, already covered by the existing ADMIN-only
    // GET .../"/api/orders/*" rule, same as /api/products/export). Always
    // the current calendar month — "descargar el historial del mes" — not a
    // date range picker, so this stays a one-click download.
    //
    // One row per order ITEM rather than cramming every product into one
    // cell — Excel can only split a cell into columns along one delimiter,
    // so a "2x Bofe; 1x Traquea" cell reads as a single blob, not separate
    // values. Semicolon-delimited (see CsvWriter) since a comma-delimited
    // file opens as one giant column A on Excel set to a Spanish locale, and
    // a UTF-8 BOM up front so accented headers/values don't show as mojibake
    // when Excel opens the file directly instead of through an import wizard.
    @GetMapping("/export")
    public ResponseEntity<String> exportOrders() {
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime start = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime end = currentMonth.atEndOfMonth().atTime(23, 59, 59);

        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(start) && !o.getCreatedAt().isAfter(end))
                .sorted(Comparator.comparing(Order::getCreatedAt))
                .toList();

        DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        StringBuilder csv = new StringBuilder();
        csv.append('﻿');
        csv.append(CsvWriter.row(';', ORDER_CSV_HEADERS.toArray(new String[0]))).append("\n");

        for (Order o : orders) {
            String fecha = o.getCreatedAt().format(dateFormat);
            String estado = STATUS_LABELS_ES.getOrDefault(o.getStatus(), o.getStatus());
            String comprobante = o.isReceiptSent() ? "Sí" : "No";
            String total = formatAmount(o.getTotal());

            if (o.getItems().isEmpty()) {
                csv.append(CsvWriter.row(';',
                        String.valueOf(o.getId()), fecha, estado, "", "", "", "", total, comprobante
                )).append("\n");
                continue;
            }

            for (OrderItem item : o.getItems()) {
                double unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : 0;
                int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                csv.append(CsvWriter.row(';',
                        String.valueOf(o.getId()),
                        fecha,
                        estado,
                        item.getProductName(),
                        String.valueOf(quantity),
                        formatAmount(unitPrice),
                        formatAmount(unitPrice * quantity),
                        total,
                        comprobante
                )).append("\n");
            }
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("pedidos-" + currentMonth + ".csv").build());
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv.toString());
    }

    private String formatAmount(double amount) {
        return String.format(Locale.US, "%.2f", amount);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // A logged-in customer's own order history ("Mis pedidos" in Mi Perfil).
    // Authenticated-only (see SecurityConfig) — every Client sees just their
    // own orders, scoped by the authenticated principal, never a client-supplied id.
    @GetMapping(value = "/mine", produces = "application/json")
    public List<Order> getMyOrders(Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // Public (guest checkout never needs an account — see SecurityConfig), but
    // if the caller happens to be logged in, the order is tagged with their id
    // so it shows up under "Mis pedidos" later. Never trusted from the request
    // body — always read from the authenticated principal, not client input.
    @RequestMapping(value = "/create", produces = "application/json", method = RequestMethod.POST)
    public ResponseEntity<?> createOrder(@RequestBody Order order, Authentication authentication) {
        if (authentication != null) {
            order.setUserId(Long.valueOf(authentication.getName()));
        }
        try {
            Order saved = orderService.createOrder(order);
            return ResponseEntity.created(URI.create("/api/orders/" + saved.getId())).body(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @RequestMapping(value = "/{id}/receipt-sent", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<Order> markReceiptSent(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.markReceiptSent(id));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @RequestMapping(value = "/{id}/status", produces = "application/json", method = RequestMethod.PUT)
    public ResponseEntity<Order> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(orderService.updateStatus(id, body.get("status")));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
