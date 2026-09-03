package org.kpet.petshop.Implementations;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.kpet.petshop.Models.Order;
import org.kpet.petshop.Models.OrderItem;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Repositories.OrderRepository;
import org.kpet.petshop.Repositories.ProductRepository;
import org.kpet.petshop.Services.OrderService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Order lifecycle + the central-inventory side effect of confirming payment.
 * See {@link #updateStatus} and {@link #deductStock} for the stock-deduction logic.
 */
@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderServiceImpl(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Override
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Override
    public Optional<Order> getOrderById(Long id) {
        return orderRepository.findById(id);
    }

    @Override
    public Order createOrder(Order order) {
        order.setId(null);
        order.setStatus(Order.PENDING_CONFIRMATION);
        order.setReceiptSent(false);
        return orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order markReceiptSent(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found with ID: " + id));
        order.setReceiptSent(true);
        return orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order updateStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found with ID: " + id));

        // Deduct central stock exactly once, at the moment the admin confirms
        // the payment (not on creation, since an order can be abandoned before then).
        boolean isConfirming = Order.PENDING_CONFIRMATION.equals(order.getStatus())
                && Order.CONFIRMED.equals(status);

        // Cancelling an order that was already CONFIRMED means stock was already
        // deducted for it — give it back. Cancelling straight from
        // PENDING_CONFIRMATION never touched stock, so there's nothing to restore.
        boolean isCancellingConfirmed = Order.CONFIRMED.equals(order.getStatus())
                && Order.CANCELLED.equals(status);

        order.setStatus(status);

        if (isConfirming) {
            deductStock(order.getItems());
        } else if (isCancellingConfirmed) {
            restockItems(order.getItems());
        }

        return orderRepository.save(order);
    }

    // Best-effort: items without a resolvable productId (e.g. legacy orders placed
    // before OrderItem.productId existed) or whose product was since deleted are
    // silently skipped rather than failing the whole status update. Stock is
    // floored at 0 instead of going negative if oversold.
    private void deductStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            if (item.getProductId() == null || item.getQuantity() == null) {
                continue;
            }
            productRepository.findById(item.getProductId()).ifPresent(product -> {
                int currentStock = product.getStock() != null ? product.getStock() : 0;
                int newStock = currentStock - item.getQuantity();
                product.setStock(Math.max(newStock, 0));
                productRepository.save(product);
            });
        }
    }

    private void restockItems(List<OrderItem> items) {
        for (OrderItem item : items) {
            if (item.getProductId() == null || item.getQuantity() == null) {
                continue;
            }
            productRepository.findById(item.getProductId()).ifPresent(product -> {
                int currentStock = product.getStock() != null ? product.getStock() : 0;
                product.setStock(currentStock + item.getQuantity());
                productRepository.save(product);
            });
        }
    }
}
