package org.kpet.petshop.Controllers;

import jakarta.persistence.EntityNotFoundException;
import org.kpet.petshop.Models.Order;
import org.kpet.petshop.Repositories.OrderRepository;
import org.kpet.petshop.Services.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
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

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(value = "/create", produces = "application/json", method = RequestMethod.POST)
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        Order saved = orderService.createOrder(order);
        return ResponseEntity.created(URI.create("/api/orders/" + saved.getId())).body(saved);
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
