package org.kpet.petshop.Services;

import org.kpet.petshop.Models.Order;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Manages the checkout-to-fulfillment order workflow
 * (PENDING_CONFIRMATION -> CONFIRMED -> COMPLETED; see Order's status constants).
 * updateStatus() also owns the one-time central-stock deduction that fires on
 * the PENDING_CONFIRMATION -> CONFIRMED transition (see OrderServiceImpl).
 */
@Service
public interface OrderService {

    List<Order> getAllOrders();

    Optional<Order> getOrderById(Long id);

    Order createOrder(Order order);

    Order markReceiptSent(Long id);

    Order updateStatus(Long id, String status);
}
