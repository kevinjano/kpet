package org.kpet.petshop.Models;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A checkout placed via the central store cart (WhatsApp + QR flow). Distributor
 * purchases are a separate, unrelated flow (see DistributorDetailComponent) that
 * never creates an Order — they go straight to the distributor's own WhatsApp
 * with no backend order-tracking or stock deduction.
 */
@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_orders_status", columnList = "status"),
        @Index(name = "idx_orders_created_at", columnList = "createdAt")
})
public class Order {

    // Order status workflow: PENDING_CONFIRMATION -> CONFIRMED -> COMPLETED,
    // or PENDING_CONFIRMATION/CONFIRMED -> CANCELLED at any point before
    // COMPLETED (see OrderServiceImpl.updateStatus — the PENDING_CONFIRMATION
    // -> CONFIRMED transition is what triggers central stock deduction, once;
    // cancelling a CONFIRMED order restores that stock).
    public static final String PENDING_CONFIRMATION = "PENDING_CONFIRMATION";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String COMPLETED = "COMPLETED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    private Long id;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "order_items", joinColumns = @JoinColumn(name = "order_id"))
    private List<OrderItem> items = new ArrayList<>();

    @Column(nullable = false)
    private Double total;

    @Column(nullable = false)
    private String status = PENDING_CONFIRMATION;

    @Column(nullable = false)
    private boolean receiptSent = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Order() {
    }

    public Order(Long id, List<OrderItem> items, Double total, String status, boolean receiptSent, LocalDateTime createdAt) {
        this.id = id;
        this.items = items != null ? items : new ArrayList<>();
        this.total = total;
        this.status = status != null ? status : PENDING_CONFIRMATION;
        this.receiptSent = receiptSent;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items != null ? items : new ArrayList<>();
    }

    public Double getTotal() {
        return total;
    }

    public void setTotal(Double total) {
        this.total = total;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isReceiptSent() {
        return receiptSent;
    }

    public void setReceiptSent(boolean receiptSent) {
        this.receiptSent = receiptSent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
