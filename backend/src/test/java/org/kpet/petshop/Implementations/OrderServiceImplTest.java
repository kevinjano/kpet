package org.kpet.petshop.Implementations;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.kpet.petshop.Models.Order;
import org.kpet.petshop.Models.OrderItem;
import org.kpet.petshop.Repositories.OrderRepository;
import org.kpet.petshop.Repositories.ProductRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests (repositories mocked, no DB) for the order-status transition
 * rules in updateStatus — specifically which transitions do/don't touch
 * central stock. See Order.java's status-workflow comment for the intended
 * rules this locks in.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    private OrderServiceImpl orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderServiceImpl(orderRepository, productRepository);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Order orderWith(String status, OrderItem... items) {
        Order order = new Order();
        order.setId(1L);
        order.setStatus(status);
        order.setItems(List.of(items));
        order.setTotal(0.0);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        return order;
    }

    @Test
    void confirmingAPendingOrder_deductsStockForEachItem() {
        orderWith(Order.PENDING_CONFIRMATION,
                new OrderItem(10L, "Bofe", 2, 15.0),
                new OrderItem(20L, "Traquea", 1, 8.0));

        orderService.updateStatus(1L, Order.CONFIRMED);

        verify(productRepository).deductStock(10L, 2);
        verify(productRepository).deductStock(20L, 1);
        verify(productRepository, never()).restockProduct(any(), anyInt());
    }

    @Test
    void cancellingAConfirmedOrder_restocksEveryItem() {
        orderWith(Order.CONFIRMED, new OrderItem(10L, "Bofe", 3, 15.0));

        orderService.updateStatus(1L, Order.CANCELLED);

        verify(productRepository).restockProduct(10L, 3);
        verify(productRepository, never()).deductStock(any(), anyInt());
    }

    @Test
    void cancellingAPendingOrder_neverTouchedStockSoDoesNotRestock() {
        // Stock is only deducted once an order is CONFIRMED — cancelling
        // straight from PENDING_CONFIRMATION must not give back stock that
        // was never taken.
        orderWith(Order.PENDING_CONFIRMATION, new OrderItem(10L, "Bofe", 3, 15.0));

        orderService.updateStatus(1L, Order.CANCELLED);

        verify(productRepository, never()).restockProduct(any(), anyInt());
        verify(productRepository, never()).deductStock(any(), anyInt());
    }

    @Test
    void confirmingAnAlreadyConfirmedOrder_doesNotDeductStockAgain() {
        // Guards against double-deducting if the same transition is
        // triggered twice (e.g. a duplicate admin click).
        orderWith(Order.CONFIRMED, new OrderItem(10L, "Bofe", 3, 15.0));

        orderService.updateStatus(1L, Order.CONFIRMED);

        verify(productRepository, never()).deductStock(any(), anyInt());
    }

    @Test
    void itemsWithoutAResolvableProductId_areSkipped() {
        // Legacy order items (placed before OrderItem.productId existed)
        // shouldn't blow up the whole status update.
        OrderItem legacyItem = new OrderItem(null, "Old item", 1, 10.0);
        orderWith(Order.PENDING_CONFIRMATION, legacyItem);

        orderService.updateStatus(1L, Order.CONFIRMED);

        verify(productRepository, never()).deductStock(any(), anyInt());
    }

    @Test
    void updateStatus_persistsTheNewStatus() {
        orderWith(Order.PENDING_CONFIRMATION, new OrderItem(10L, "Bofe", 1, 15.0));

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        orderService.updateStatus(1L, Order.CONFIRMED);

        verify(orderRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(Order.CONFIRMED);
    }
}
