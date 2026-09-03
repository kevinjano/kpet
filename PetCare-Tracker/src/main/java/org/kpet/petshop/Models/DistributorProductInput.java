package org.kpet.petshop.Models;

// Write-only shape the frontend sends to set a distributor's catalog: which
// products it carries and how many units of each it currently has.
public class DistributorProductInput {

    private Long productId;
    private Integer quantity;

    public DistributorProductInput() {
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
