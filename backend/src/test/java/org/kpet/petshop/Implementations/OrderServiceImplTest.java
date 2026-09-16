package org.kpet.petshop.Implementations;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.kpet.petshop.Models.Order;
import org.kpet.petshop.Models.OrderItem;
import org.kpet.petshop.Models.Product;
import org.kpet.petshop.Repositories.OrderRepository;
import org.kpet.petshop.Repositories.ProductRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
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
        // lenient: the stock-rejection tests throw before ever reaching
        // save(), which would otherwise trip Mockito's unnecessary-stubbing
        // check on this shared setup stub.
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
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

    @Test
    void createOrder_forMoreThanAvailableStock_isRejectedAndNeverSaved() {
        Product product = new Product(10L, "Bofe de Res", "desc", 15.0, null, false, "Perros", 5, null, true);
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        Order order = new Order();
        order.setItems(List.of(new OrderItem(10L, "Bofe de Res", 6, 15.0)));
        order.setTotal(90.0);

        assertThatThrownBy(() -> orderService.createOrder(order))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Bofe de Res");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void createOrder_withinAvailableStock_succeeds() {
        Product product = new Product(10L, "Bofe de Res", "desc", 15.0, null, false, "Perros", 5, null, true);
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        Order order = new Order();
        order.setItems(List.of(new OrderItem(10L, "Bofe de Res", 3, 15.0)));
        order.setTotal(45.0);

        Order saved = orderService.createOrder(order);

        assertThat(saved.getStatus()).isEqualTo(Order.PENDING_CONFIRMATION);
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void createOrder_forAProductThatNoLongerExists_isNotBlockedByStockCheck() {
        // No stub for productRepository.findById(999L) — defaults to empty(),
        // same as a deleted product. The stock check should just skip it
        // rather than rejecting the whole order.
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        Order order = new Order();
        order.setItems(List.of(new OrderItem(999L, "Old product", 2, 10.0)));
        order.setTotal(20.0);

        Order saved = orderService.createOrder(order);

        assertThat(saved.getStatus()).isEqualTo(Order.PENDING_CONFIRMATION);
    }
}
