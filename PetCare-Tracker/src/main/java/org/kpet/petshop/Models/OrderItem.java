package org.kpet.petshop.Models;

import jakarta.persistence.Embeddable;

/**
 * A line item within an {@link Order}, snapshotted at checkout time — productName
 * and unitPrice are copies, not live references, so later edits to the Product
 * (price change, rename) don't retroactively alter past orders.
 */
@Embeddable
public class OrderItem {

    // Nullable: older orders placed before this field existed won't have one,
    // and stock deduction simply skips items it can't resolve back to a product.
    private Long productId;
    private String productName;
    private Integer quantity;
    private Double unitPrice;

    public OrderItem() {
    }

    public OrderItem(Long productId, String productName, Integer quantity, Double unitPrice) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }
}
